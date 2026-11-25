"""FastAPI Router for Tradedia Rule-Based Stock Analytics, Scanners, and Walk-Forward Backtests."""

import asyncio
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.api.auth import enforce_entitlement, enforce_rate_limit, resolve_auth_context
from app.config import settings
from app.data.cache import market_cache
from app.data.nifty500_constituents import (
    get_stock_info,
    get_universe_metadata,
    load_nifty500_universe,
    search_stocks,
)
from app.data.nse_calendar import get_market_calendar_contract, get_market_status
from app.data.provider import data_provider
from app.data.providers.base import DataUsagePolicy
from app.data.providers.registry import list_registered_providers
from app.engine.backtest_metrics import METRIC_DEFINITIONS
from app.engine.backtester import (
    build_unvalidated_backtest_report,
    get_validated_backtest_report,
    run_universe_backtest,
)
from app.engine.scanner import run_intraday_scanner, run_swing_scanner
from app.engine.stock_analyzer import analyze_single_stock
from app.engine.strategies import (
    STRATEGY_ENGINE_VERSION,
    compute_strategy_config_hash,
    serialize_strategy_parameters,
)
from app.models.backtest import BacktestReportResponse
from app.models.common import AnalysisEngineMetadata, AuthContext
from app.models.market import (
    FinancialPeriodRow,
    MarketCalendarContract,
    MarketStatusResponse,
    StockConstituent,
    StockFinancialsResponse,
)
from app.models.signals import (
    IntradayScannerResponse,
    StockAnalysisResponse,
    SwingScannerResponse,
)

router = APIRouter(prefix="/api/v1", tags=["Tradedia Rule-Based Stock Analytics API"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Return service health, provider capabilities, calendar version, and validation state."""
    m_status = get_market_status()
    caps = data_provider.capabilities
    pid = caps.provider_id.lower()
    if pid == "yfinance":
        cached_daily = len([p for p in market_cache.daily_dir.glob("*.csv") if not p.name.startswith("upstox_")])
        cached_intra = len([p for p in market_cache.intraday_dir.glob("*_15m*.csv") if not p.name.startswith("upstox_")])
    else:
        cached_daily = len(list(market_cache.daily_dir.glob(f"{pid}_*.csv")))
        cached_intra = len(list(market_cache.intraday_dir.glob(f"{pid}_*_15m_*.csv")))
    report, val_reason = get_validated_backtest_report()
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "auth_mode": settings.effective_auth_mode,
        "analysis_engine_type": "RULE_BASED_TECHNICAL_ANALYTICS",
        "uses_ai_or_ml": False,
        "strategy_version": STRATEGY_ENGINE_VERSION,
        "strategy_config_hash": compute_strategy_config_hash(),
        "provider": caps.provider_id,
        "provider_production_approved": caps.production_approved,
        "provider_is_realtime": caps.is_realtime,
        "provider_estimated_delay_minutes": caps.estimated_delay_minutes,
        "provider_licensing_tier": caps.licensing_tier,
        "provider_supports_adjusted_prices": caps.supports_adjusted_prices,
        "provider_token_configured": bool(settings.UPSTOX_ANALYTICS_TOKEN.strip()) if pid == "upstox" else True,
        "price_adjustment_policy": settings.PRICE_ADJUSTMENT_POLICY,
        "nifty500_constituents_count": len(load_nifty500_universe()),
        "cached_daily_stocks": cached_daily,
        "cached_intraday_stocks": cached_intra,
        "backtest_validation_status": report.validation_status if report else "UNVALIDATED",
        "backtest_validation_note": val_reason,
        "market_status": m_status.model_dump(),
    }


@router.get("/market/status", response_model=MarketStatusResponse)
async def get_nse_market_status() -> MarketStatusResponse:
    """Return current NSE India market status in IST and intraday scanner state."""
    return get_market_status()


@router.get("/market/calendar", response_model=MarketCalendarContract)
async def get_nse_market_calendar() -> MarketCalendarContract:
    """Return unified NSE market calendar contract for synchronization with Express/React."""
    return get_market_calendar_contract()


@router.get("/metadata/methodology")
async def get_methodology_metadata() -> Dict[str, Any]:
    """Return transparent metadata describing engine type, strategies, metrics, and data limits."""
    caps = data_provider.capabilities
    univ_meta = get_universe_metadata()
    engine_meta = AnalysisEngineMetadata(
        strategy_version=STRATEGY_ENGINE_VERSION,
        data_source=caps.display_name,
        data_limitations=[*caps.limitations, univ_meta.survivorship_bias_disclosure],
    )
    return {
        "engine_metadata": engine_meta.model_dump(),
        "universe_metadata": univ_meta.model_dump(),
        "provider_capabilities": {
            "provider_id": caps.provider_id,
            "display_name": caps.display_name,
            "is_realtime": caps.is_realtime,
            "estimated_delay_minutes": caps.estimated_delay_minutes,
            "licensing_tier": caps.licensing_tier,
            "production_approved": caps.production_approved,
            "supports_adjusted_prices": caps.supports_adjusted_prices,
            "supports_financials": caps.supports_financials,
            "registered_providers": list_registered_providers(),
        },
        "signal_policy": {
            "public_stock_signals_enabled": settings.ENABLE_PUBLIC_STOCK_SIGNALS,
            "signal_classification_mode": settings.SIGNAL_CLASSIFICATION_MODE,
        },
        "strategies": serialize_strategy_parameters(),
        "metric_definitions": METRIC_DEFINITIONS,
    }


@router.get("/stocks/search", response_model=List[StockConstituent])
async def search_nse_stocks(
    q: str = Query(default="", description="Symbol, company name, or sector query"),
    limit: int = Query(default=25, ge=1, le=500),
) -> List[StockConstituent]:
    """Search bundled NSE NIFTY 500 constituents by symbol, company name, or industry sector."""
    return search_stocks(q, limit=limit)


@router.get("/stocks/universe")
async def get_nifty500_universe() -> Dict[str, Any]:
    """Return the validated bundled NSE NIFTY 500 stock list with version & survivorship metadata."""
    universe = load_nifty500_universe()
    sectors = sorted({c.sector for c in universe})
    return {
        "total_count": len(universe),
        "universe_metadata": get_universe_metadata().model_dump(),
        "sectors": sectors,
        "stocks": [c.model_dump() for c in universe],
    }


@router.get("/scanner/swing", response_model=SwingScannerResponse)
@router.post("/scanner/swing", response_model=SwingScannerResponse)
async def scan_swing_bullish_stocks(
    request: Request,
    universe_limit: int = Query(
        default=settings.SWING_SCANNER_DEFAULT_UNIVERSE_LIMIT,
        ge=1,
        le=500,
        description="Number of NIFTY 500 constituents to attempt scanning",
    ),
    min_score: float = Query(
        default=60.0,
        ge=0.0,
        le=100.0,
        description="Minimum heuristic Technical Setup Score (0-100)",
    ),
    min_confidence: Optional[float] = Query(
        default=None,
        ge=0.0,
        le=100.0,
        description="Deprecated alias for min_score (heuristic Technical Setup Score)",
    ),
    result_limit: int = Query(
        default=settings.SWING_SCANNER_DEFAULT_RESULT_LIMIT,
        ge=1,
        le=500,
        description="Maximum number of ranked signals returned",
    ),
    signal_type: Literal["ALL", "CONFIRMED_SIGNAL", "PROJECTED_SETUP"] = Query(
        default="ALL",
        description="Filter by signal type: ALL, CONFIRMED_SIGNAL, or PROJECTED_SETUP",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Force network refresh instead of fresh cache (restricted tier when auth active)",
    ),
    auth: AuthContext = Depends(resolve_auth_context),
) -> SwingScannerResponse:
    """Run deterministic rule-based Daily Swing Scanner with transparent coverage reporting."""
    enforce_rate_limit(request, auth, bucket="scanner_swing", expensive=force_refresh or universe_limit > 100)
    if force_refresh:
        enforce_entitlement(auth, min_tier="PRO")
    elif universe_limit > 100 and settings.effective_auth_mode != "disabled_dev_only":
        enforce_entitlement(auth, min_tier="PRO")

    return await asyncio.to_thread(
        run_swing_scanner,
        universe_limit=universe_limit,
        min_score=min_score,
        signal_type_filter=signal_type,
        force_refresh=force_refresh,
        result_limit=result_limit,
        min_confidence=min_confidence,
    )


@router.get("/scanner/intraday", response_model=IntradayScannerResponse)
@router.post("/scanner/intraday", response_model=IntradayScannerResponse)
async def scan_intraday_opportunities(
    request: Request,
    universe_limit: int = Query(
        default=settings.INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT,
        ge=1,
        le=500,
        description="Number of NIFTY 500 constituents to attempt for 15m intraday setups",
    ),
    result_limit: int = Query(
        default=settings.INTRADAY_SCANNER_DEFAULT_RESULT_LIMIT,
        ge=1,
        le=200,
        description="Maximum number of intraday signals returned",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Request live 15m refresh during 09:15-15:30 IST (restricted tier when auth active)",
    ),
    include_last_session_when_closed: bool = Query(
        default=True,
        description="When closed, return completed session review from the latest available session",
    ),
    auth: AuthContext = Depends(resolve_auth_context),
) -> IntradayScannerResponse:
    """Run deterministic 15-minute Intraday Scanner with unified execution rules and coverage metrics."""
    enforce_rate_limit(request, auth, bucket="scanner_intraday", expensive=force_refresh)
    if force_refresh:
        enforce_entitlement(auth, min_tier="PRO")

    return await asyncio.to_thread(
        run_intraday_scanner,
        universe_limit=universe_limit,
        force_refresh=force_refresh,
        include_last_session_when_closed=include_last_session_when_closed,
        result_limit=result_limit,
    )


@router.get("/stocks/{symbol}/analysis", response_model=StockAnalysisResponse)
async def get_individual_stock_analysis(
    request: Request,
    symbol: str,
    force_refresh: bool = Query(default=False, description="Bypass fresh cache and re-fetch"),
    auth: AuthContext = Depends(resolve_auth_context),
) -> StockAnalysisResponse:
    """Return rule-based technical analysis, Technical Setup Score, provenance, and policy-controlled output."""
    enforce_rate_limit(request, auth, bucket="stock_analysis", expensive=force_refresh)
    if force_refresh:
        enforce_entitlement(auth, min_tier="PRO")

    info = get_stock_info(symbol)
    if not info:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "UNSUPPORTED_SYMBOL",
                "message": f"Invalid or unsupported NSE symbol '{symbol}'.",
            },
        )

    policy = DataUsagePolicy(
        purpose="INDIVIDUAL_STOCK_ANALYSIS",
        allow_delayed_data=settings.ALLOW_DELAYED_DATA,
        allow_stale_cache_fallback=settings.ALLOW_STALE_CACHE_FALLBACK,
        require_production_approved_provider=settings.effective_require_production_approved_provider,
        adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
    )
    res = await asyncio.to_thread(
        data_provider.fetch_daily_ohlcv_result,
        info.symbol,
        "2y",
        force_refresh,
        55,
        policy,
    )

    if res.status == "UNSUPPORTED_SYMBOL":
        raise HTTPException(
            status_code=400,
            detail={"error_code": "UNSUPPORTED_SYMBOL", "message": res.error_message or "Unsupported symbol."},
        )
    if res.status == "INSUFFICIENT_HISTORY":
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "INSUFFICIENT_HISTORY",
                "message": res.error_message or f"Insufficient history for '{info.symbol}'.",
                "completed_rows": res.quality.completed_rows_usable,
                "required_rows": 55,
            },
        )
    if res.status in ("PROVIDER_UNAVAILABLE", "INVALID_DATA") or res.df is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "PROVIDER_UNAVAILABLE",
                "message": res.error_message or f"Market data unavailable for '{info.symbol}'.",
            },
        )

    return await asyncio.to_thread(
        analyze_single_stock,
        info.symbol,
        res.df,
        res.provenance,
        res.quality,
    )


@router.get("/stocks/{symbol}/financials", response_model=StockFinancialsResponse)
async def get_stock_financials(
    request: Request,
    symbol: str,
    force_refresh: bool = Query(default=False, description="Ignore 24h cache and re-fetch"),
    auth: AuthContext = Depends(resolve_auth_context),
) -> StockFinancialsResponse:
    """Return yearly and quarterly revenue/net profit in INR with explicit availability and freshness."""
    enforce_rate_limit(request, auth, bucket="stock_financials", expensive=force_refresh)
    info = get_stock_info(symbol)
    if not info:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "UNSUPPORTED_SYMBOL", "message": f"Invalid NSE symbol '{symbol}'."},
        )
    res = await asyncio.to_thread(data_provider.fetch_financials_result, info.symbol, force_refresh)
    return StockFinancialsResponse(
        symbol=res.symbol,
        currency=res.currency,
        status=res.status,
        available=res.available,
        source=res.source,
        fetched_at_ist=res.fetched_at_ist,
        is_stale=res.is_stale,
        yearly=[FinancialPeriodRow(**r) for r in res.yearly],
        quarterly=[FinancialPeriodRow(**r) for r in res.quarterly],
        key_stats=res.key_stats,
        message=res.message,
        data_provenance=res.provenance,
    )


@router.get("/backtest/report", response_model=BacktestReportResponse)
async def get_backtest_report(
    request: Request,
    auth: AuthContext = Depends(resolve_auth_context),
) -> BacktestReportResponse:
    """
    Return the version-verified Walk-Forward Out-of-Sample backtest report.
    Never returns incompatible legacy artifacts or executes hidden network fetches on GET;
    returns an explicit UNVALIDATED report with null metrics when no compatible artifact exists.
    """
    enforce_rate_limit(request, auth, bucket="backtest_report", expensive=False)
    report, reason = get_validated_backtest_report()
    if report is not None:
        return report
    return build_unvalidated_backtest_report(reason or "No validated backtest artifact available.")


@router.post("/backtest/run", response_model=BacktestReportResponse)
async def trigger_fresh_backtest(
    request: Request,
    sample_size: int = Query(
        default=100,
        ge=20,
        le=500,
        description="Number of NIFTY 500 stocks to include in walk-forward backtest",
    ),
    num_folds: int = Query(
        default=settings.WALK_FORWARD_DEFAULT_FOLDS,
        ge=2,
        le=8,
        description="Number of chronological non-overlapping walk-forward folds",
    ),
    walk_forward_mode: Literal["EXPANDING", "ROLLING"] = Query(
        default=settings.WALK_FORWARD_MODE,
        description="Chronological window methodology: EXPANDING or ROLLING",
    ),
    auth: AuthContext = Depends(resolve_auth_context),
) -> BacktestReportResponse:
    """Execute a reproducible multi-fold walk-forward backtest (Admin/Service restricted)."""
    enforce_rate_limit(request, auth, bucket="backtest_run", expensive=True)
    enforce_entitlement(auth, min_tier="ADMIN", required_roles=["admin", "quant", "service"])

    universe = load_nifty500_universe()
    symbols = [c.symbol for c in universe[:sample_size]]
    policy = DataUsagePolicy(
        purpose="HISTORICAL_BACKTEST",
        allow_delayed_data=True,
        allow_stale_cache_fallback=True,
        require_production_approved_provider=False,
        adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
    )
    daily_res = await asyncio.to_thread(
        data_provider.fetch_batch_daily_ohlcv_results, symbols, "2y", False, 80, policy
    )
    intra_res = await asyncio.to_thread(
        data_provider.fetch_batch_intraday_ohlcv_results, symbols[: min(sample_size, 100)], "5d", "15m", False, 20, policy
    )

    daily_map = {s: r.df for s, r in daily_res.items() if r.df is not None and r.quality.is_valid}
    intra_map = {s: r.df for s, r in intra_res.items() if r.df is not None and r.quality.is_valid}
    exclusions = {
        "daily_excluded_or_missing": sample_size - len(daily_map),
        "intraday_excluded_or_missing": min(sample_size, 100) - len(intra_map),
    }

    return await asyncio.to_thread(
        run_universe_backtest,
        daily_map,
        intra_map,
        True,
        num_folds,
        walk_forward_mode,
        None,
        None,
        False,
        data_provider.provider_name,
        exclusions,
    )
