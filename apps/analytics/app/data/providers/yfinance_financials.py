"""Yahoo Finance company financials parser and cached fetcher helper."""

from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import yfinance as yf

from app.config import settings
from app.data.cache import MarketDataCache, TokenBucketRateLimiter
from app.data.nse_calendar import IST
from app.data.providers.base import FinancialsResult

logger = logging.getLogger(__name__)

_REVENUE_KEYS = ["Total Revenue", "Operating Revenue", "Revenue"]
_PROFIT_KEYS = [
    "Net Income",
    "Net Income Common Stockholders",
    "Net Income From Continuing Operation Net Minority Interest",
]
_OP_PROFIT_KEYS = ["Operating Income", "EBIT", "Total Operating Income As Reported"]


def _epoch_to_ist(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST")


def _safe_attr(obj: Any, name: str) -> Any:
    try:
        return getattr(obj, name)
    except Exception:
        return None


def _num(v: Any) -> Optional[float]:
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 2)
    except (TypeError, ValueError):
        return None


def _pct(v: Any) -> Optional[float]:
    f = _num(v)
    return round(f * 100.0, 2) if f is not None else None


def _pick(df: pd.DataFrame, keys: List[str], col: Any) -> Optional[float]:
    for k in keys:
        if k in df.index:
            val = _num(df.at[k, col])
            if val is not None:
                return val
    return None


def _income_rows(df: Optional[pd.DataFrame], yearly: bool) -> List[Dict[str, Any]]:
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return []
    rows: List[Dict[str, Any]] = []
    for col in df.columns:
        try:
            end = pd.to_datetime(col)
        except Exception:
            continue
        revenue = _pick(df, _REVENUE_KEYS, col)
        profit = _pick(df, _PROFIT_KEYS, col)
        if revenue is None and profit is None:
            continue
        if yearly:
            fy = end.year if end.month <= 3 else end.year + 1
            label = f"FY{str(fy)[-2:]}"
        else:
            label = end.strftime("%b %y")
        rows.append(
            {
                "period": label,
                "end_date": end.strftime("%Y-%m-%d"),
                "revenue": revenue,
                "net_profit": profit,
                "operating_profit": _pick(df, _OP_PROFIT_KEYS, col),
                "profit_margin_pct": round(profit / revenue * 100.0, 2)
                if revenue and profit is not None
                else None,
            }
        )
    rows.sort(key=lambda r: r["end_date"])
    return rows[-6:] if yearly else rows[-8:]


def fetch_yfinance_financials(
    symbol: str,
    cache: MarketDataCache,
    limiter: TokenBucketRateLimiter,
    force_refresh: bool = False,
) -> FinancialsResult:
    """Fetch yearly & quarterly financials with strict 24h TTL and explicit stale fallback."""
    clean = symbol.strip().upper().replace(".NS", "")
    artifact_name = f"financials_yfinance_{clean}"
    cached = cache.load_json_artifact(artifact_name)
    if cached is None:
        legacy = cache.load_json_artifact(f"financials_{clean}")
        if legacy and legacy.get("provider_id", "yfinance") == "yfinance":
            cached = legacy
    elif cached.get("provider_id", "yfinance") != "yfinance":
        cached = None

    if cached and not force_refresh:
        fetched_at = float(cached.get("_fetched_at", 0))
        if (time.time() - fetched_at) <= settings.FINANCIALS_TTL_SECONDS and (
            cached.get("yearly") or cached.get("quarterly")
        ):
            return FinancialsResult(
                symbol=clean,
                status="OK",
                available=True,
                source=str(cached.get("source", "Yahoo Finance (company filings)")),
                fetched_at_ist=_epoch_to_ist(fetched_at),
                is_stale=False,
                yearly=cached.get("yearly", []),
                quarterly=cached.get("quarterly", []),
                key_stats=cached.get("key_stats", {}),
            )

    yearly: List[Dict[str, Any]] = []
    quarterly: List[Dict[str, Any]] = []
    key_stats: Dict[str, Optional[float]] = {}
    if not settings.EDUCATIONAL_REPLAY_MODE:
        try:
            limiter.acquire(1.0, timeout=settings.SCANNER_SYMBOL_TIMEOUT_SECONDS)
            ticker = yf.Ticker(f"{clean}.NS")
            yearly = _income_rows(_safe_attr(ticker, "income_stmt"), yearly=True)
            quarterly = _income_rows(_safe_attr(ticker, "quarterly_income_stmt"), yearly=False)
            info = _safe_attr(ticker, "info") or {}
            if isinstance(info, dict):
                key_stats = {
                    "market_cap": _num(info.get("marketCap")),
                    "pe_ratio": _num(info.get("trailingPE")),
                    "profit_margin_pct": _pct(info.get("profitMargins")),
                    "revenue_growth_pct": _pct(info.get("revenueGrowth")),
                    "earnings_growth_pct": _pct(info.get("earningsGrowth")),
                    "dividend_yield_pct": _num(info.get("dividendYield")),
                    "week52_high": _num(info.get("fiftyTwoWeekHigh")),
                    "week52_low": _num(info.get("fiftyTwoWeekLow")),
                }
        except Exception as exc:
            logger.warning("Failed to fetch financials for %s: %s", clean, exc)

    if yearly or quarterly:
        now_epoch = time.time()
        payload = {
            "provider_id": "yfinance",
            "symbol": clean,
            "currency": "INR",
            "available": True,
            "source": "Yahoo Finance (company filings; unverified third-party aggregator)",
            "yearly": yearly,
            "quarterly": quarterly,
            "key_stats": key_stats,
            "message": "",
            "_fetched_at": now_epoch,
        }
        try:
            cache.save_json_artifact(artifact_name, payload)
        except Exception:
            pass
        return FinancialsResult(
            symbol=clean,
            status="OK",
            available=True,
            source=payload["source"],
            fetched_at_ist=_epoch_to_ist(now_epoch),
            is_stale=False,
            yearly=yearly,
            quarterly=quarterly,
            key_stats=key_stats,
        )

    if cached and settings.ALLOW_STALE_CACHE_FALLBACK and (cached.get("yearly") or cached.get("quarterly")):
        fetched_at = float(cached.get("_fetched_at", 0))
        return FinancialsResult(
            symbol=clean,
            status="STALE_DATA",
            available=True,
            source=str(cached.get("source", "Yahoo Finance (cached)")),
            fetched_at_ist=_epoch_to_ist(fetched_at),
            is_stale=True,
            yearly=cached.get("yearly", []),
            quarterly=cached.get("quarterly", []),
            key_stats=cached.get("key_stats", {}),
            message="Serving stale cached financials because upstream provider fetch was unavailable.",
        )

    return FinancialsResult(
        symbol=clean,
        status="UNAVAILABLE",
        available=False,
        source="Yahoo Finance (company filings)",
        message="Company financial statements are currently unavailable from the configured provider.",
    )
