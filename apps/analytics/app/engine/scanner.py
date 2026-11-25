"""Bounded-Concurrency NIFTY 500 Swing & Intraday Scanner with Accurate Coverage & Deduplication."""

import asyncio
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError, as_completed
from datetime import date, datetime, timedelta
import logging
import threading
import time
from typing import Dict, List, Literal, Optional

from app.config import settings
from app.data.cache import market_cache
from app.data.nifty500_constituents import UNIVERSE_VERSION, load_nifty500_universe
from app.data.nse_calendar import get_market_status, get_next_trading_day, get_now_ist
from app.data.provider import data_provider
from app.data.providers.base import DataUsagePolicy, MarketDataResult
from app.engine.scoring import (
    evaluate_intraday_session_signals,
    evaluate_swing_candidate,
    get_validated_strategy_stats,
)
from app.engine.strategies import STRATEGY_ENGINE_VERSION
from app.models.common import AnalysisEngineMetadata, ScanCoverageMetrics
from app.models.signals import (
    IntradayScannerResponse,
    IntradaySignalItem,
    SwingScannerResponse,
    SwingSignalItem,
)

logger = logging.getLogger(__name__)

# Single-flight scan locks preventing concurrent overlapping heavy scans
_swing_scan_lock = threading.Lock()
_intraday_scan_lock = threading.Lock()
_intraday_scheduler_running = threading.Lock()


def _select_universe_symbols(universe_limit: int) -> List[str]:
    """Select exact top-N eligible NIFTY 500 symbols ordered by liquidity tier (never silently expands)."""
    universe = load_nifty500_universe()
    capped = max(1, min(int(universe_limit), len(universe)))
    return [c.symbol for c in universe[:capped]]


def _aggregate_provenance(results: Dict[str, MarketDataResult]):
    """Summarize freshness, staleness, and latest fetch timestamp across fetched symbols."""
    valid_results = [r for r in results.values() if r.df is not None and r.status in ("OK", "STALE_CACHE")]
    stale_count = sum(1 for r in valid_results if r.provenance.is_stale)
    fetch_ts = max(
        (r.provenance.fetched_at_ist for r in valid_results if r.provenance.fetched_at_ist),
        default=None,
    )
    if not valid_results:
        return stale_count, fetch_ts, "UNAVAILABLE", True
    if stale_count == len(valid_results):
        return stale_count, fetch_ts, "STALE", True
    if stale_count > 0:
        return stale_count, fetch_ts, "STALE", True
    is_rt = data_provider.capabilities.is_realtime
    return 0, fetch_ts, ("FRESH" if is_rt else "DELAYED"), False


def _classify_live_entry_status(
    live_price: float,
    suggested_buy_price: float,
    target_sell_price: float,
    stop_loss: float,
) -> Literal["IN_ENTRY_ZONE", "EXTENDED", "TARGET_HIT", "STOP_BREACHED"]:
    """Classify live price relative to confirmed EOD swing entry, target, and stop levels."""
    if live_price >= target_sell_price:
        return "TARGET_HIT"
    if live_price <= stop_loss:
        return "STOP_BREACHED"
    if live_price > suggested_buy_price:
        pct_above = ((live_price - suggested_buy_price) / max(suggested_buy_price, 1e-6)) * 100.0
        target_dist = target_sell_price - suggested_buy_price
        moved_ratio = ((live_price - suggested_buy_price) / target_dist) if target_dist > 0 else 0.0
        if moved_ratio > 0.50 or pct_above > 3.5:
            return "EXTENDED"
    return "IN_ENTRY_ZONE"


def _enrich_swing_signals_with_live_quotes(
    signals: List[SwingSignalItem],
    now_ist: datetime,
    timeout_seconds: float = 2.0,
) -> None:
    """
    Attach live LTP and entry-zone status to returned swing signals during market hours using
    a batched, cached, timeout-capped quote lookup. Silently leaves live_* fields as None on failure.
    """
    if not signals:
        return
    try:
        quotes = data_provider.fetch_live_quotes(
            [item.symbol for item in signals],
            timeout_seconds=timeout_seconds,
        )
    except Exception as exc:
        logger.debug("Swing live quote enrichment skipped due to error: %s", exc)
        return

    if not quotes:
        return

    fallback_ts = now_ist.strftime("%Y-%m-%d %H:%M:%S IST")
    for item in signals:
        q = quotes.get(item.symbol)
        if q is None or q.price <= 0:
            continue
        lp = round(float(q.price), 2)
        item.live_price = lp
        item.live_price_change_from_signal_pct = round(
            ((lp - item.suggested_buy_price) / max(item.suggested_buy_price, 1e-6)) * 100.0, 2
        )
        item.live_entry_status = _classify_live_entry_status(
            lp, item.suggested_buy_price, item.target_sell_price, item.stop_loss
        )
        item.live_quote_timestamp_ist = q.timestamp_ist or fallback_ts


def run_swing_scanner(
    universe_limit: Optional[int] = None,
    min_score: float = 60.0,
    signal_type_filter: Optional[str] = None,
    force_refresh: bool = False,
    result_limit: Optional[int] = None,
    min_confidence: Optional[float] = None,
) -> SwingScannerResponse:
    """
    Scan requested NIFTY 500 symbols with bounded concurrency, strict coverage accounting,
    and single-flight deduplication. Never claims full 500-stock coverage if fewer were analyzed.
    """
    threshold = min_confidence if min_confidence is not None else min_score
    req_limit = universe_limit or settings.SWING_SCANNER_DEFAULT_UNIVERSE_LIMIT
    cap_results = result_limit if result_limit is not None else settings.SWING_SCANNER_DEFAULT_RESULT_LIMIT

    with _swing_scan_lock:
        t0 = time.monotonic()
        universe = load_nifty500_universe()
        eligible_universe_size = len(universe)
        symbols = _select_universe_symbols(req_limit)

        policy = DataUsagePolicy(
            purpose="CURRENT_MARKET_SCREENING",
            allow_delayed_data=settings.ALLOW_DELAYED_DATA,
            allow_stale_cache_fallback=settings.ALLOW_STALE_CACHE_FALLBACK,
            require_production_approved_provider=settings.effective_require_production_approved_provider,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        )
        res_map = data_provider.fetch_batch_daily_ohlcv_results(
            symbols=symbols,
            period="2y",
            force_refresh=force_refresh,
            min_bars=60,
            policy=policy,
        )

        validated_stats, overall_val_status = get_validated_strategy_stats()
        skip_reasons: Counter = Counter()
        failed_count = 0
        fetched_count = 0
        analyzed_count = 0
        usable_results: Dict[str, MarketDataResult] = {}

        for sym in symbols:
            r = res_map.get(sym)
            if r is None or r.status == "PROVIDER_UNAVAILABLE":
                failed_count += 1
                skip_reasons["provider_unavailable"] += 1
            elif r.status in ("INSUFFICIENT_HISTORY", "INVALID_DATA", "UNSUPPORTED_SYMBOL"):
                skip_reasons[r.status.lower()] += 1
            elif r.df is not None and len(r.df) >= 60:
                fetched_count += 1
                usable_results[sym] = r
            else:
                skip_reasons["insufficient_history"] += 1

        candidates: List[SwingSignalItem] = []
        latest_data_date = "N/A"
        timeout_sec = settings.SCANNER_SYMBOL_TIMEOUT_SECONDS

        with ThreadPoolExecutor(max_workers=settings.SCANNER_MAX_WORKERS) as pool:
            fut_to_sym = {
                pool.submit(
                    evaluate_swing_candidate,
                    sym,
                    r.df,
                    validated_stats,
                    overall_val_status,
                    r.provenance,
                    r.quality,
                ): sym
                for sym, r in usable_results.items()
            }
            for fut in as_completed(fut_to_sym):
                sym = fut_to_sym[fut]
                try:
                    item = fut.result(timeout=timeout_sec)
                    analyzed_count += 1
                    if item is not None and item.technical_setup_score >= threshold:
                        if signal_type_filter and signal_type_filter != "ALL":
                            if item.signal_type != signal_type_filter:
                                continue
                        candidates.append(item)
                        if latest_data_date == "N/A" or item.last_updated_date > latest_data_date:
                            latest_data_date = item.last_updated_date
                except FuturesTimeoutError:
                    failed_count += 1
                    skip_reasons["evaluation_timeout"] += 1
                    logger.warning("Swing evaluation timed out for %s", sym)
                except Exception as exc:
                    failed_count += 1
                    skip_reasons["evaluation_error"] += 1
                    logger.warning("Swing evaluation error for %s: %s", sym, exc)

        if latest_data_date == "N/A" and usable_results:
            latest_data_date = max(
                str(r.df.index[-1])[:10] for r in usable_results.values() if r.df is not None
            )

        candidates.sort(
            key=lambda x: (
                1 if x.signal_type == "CONFIRMED_SIGNAL" else 0,
                x.technical_setup_score,
                x.empirical_win_rate_oos_pct if x.empirical_win_rate_oos_pct is not None else -1.0,
                x.risk_reward_ratio,
            ),
            reverse=True,
        )
        matching_total = len(candidates)
        returned = candidates[:cap_results] if cap_results and cap_results > 0 else candidates
        for idx, item in enumerate(returned, start=1):
            item.rank = idx

        stale_cnt, fetch_ts, freshness, is_stale = _aggregate_provenance(res_map)
        stocks_skipped = max(0, len(symbols) - analyzed_count - failed_count)
        coverage_pct = round((analyzed_count / max(1, len(symbols))) * 100.0, 2)
        is_partial = analyzed_count < len(symbols) or len(symbols) < eligible_universe_size

        coverage = ScanCoverageMetrics(
            universe_version=UNIVERSE_VERSION,
            requested_universe_size=req_limit,
            eligible_universe_size=eligible_universe_size,
            stocks_attempted=len(symbols),
            stocks_fetched=fetched_count,
            stocks_analyzed=analyzed_count,
            stocks_skipped=stocks_skipped,
            skip_reasons=dict(skip_reasons),
            stocks_failed=failed_count,
            stocks_using_stale_data=stale_cnt,
            matching_signals_count=matching_total,
            returned_signals_count=len(returned),
            applied_result_limit=cap_results,
            coverage_pct=coverage_pct,
            is_partial_coverage=is_partial,
        )

        caps = data_provider.capabilities
        if analyzed_count == 0:
            resp_status = "PROVIDER_UNAVAILABLE"
        elif is_stale:
            resp_status = "STALE_DATA"
        elif analyzed_count < len(symbols):
            resp_status = "PARTIAL_RESULTS"
        else:
            resp_status = "OK"

        engine_meta = AnalysisEngineMetadata(
            strategy_version=STRATEGY_ENGINE_VERSION,
            data_source=f"{caps.provider_id} ({settings.PRICE_ADJUSTMENT_POLICY})",
            data_limitations=[
                *caps.limitations,
                "Technical Setup Score (0-100) is a deterministic rule-based heuristic, not a calibrated win probability.",
                f"Analyzed {analyzed_count} of {len(symbols)} attempted stocks ({eligible_universe_size} in bundled NIFTY 500).",
            ],
        )

        now_ist = get_now_ist()
        m_status = get_market_status(now_ist)
        actionable_session_date: Optional[str] = None
        if latest_data_date != "N/A":
            try:
                actionable_session_date = get_next_trading_day(date.fromisoformat(latest_data_date)).isoformat()
            except ValueError:
                actionable_session_date = None

        if m_status.is_market_open and returned:
            _enrich_swing_signals_with_live_quotes(returned, now_ist, timeout_seconds=2.0)

        resp = SwingScannerResponse(
            status=resp_status,  # type: ignore[arg-type]
            scan_timestamp_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            data_as_of_date=latest_data_date,
            actionable_session_date=actionable_session_date,
            fetch_timestamp_ist=fetch_ts,
            data_provider=caps.display_name,
            data_delay_minutes=caps.estimated_delay_minutes,
            data_freshness=freshness,  # type: ignore[arg-type]
            is_stale=is_stale,
            total_universe_count=eligible_universe_size,
            total_scanned=analyzed_count,
            bullish_signals_found=matching_total,
            scan_duration_seconds=round(time.monotonic() - t0, 2),
            scan_coverage=coverage,
            validation_status=overall_val_status,
            strategy_version=STRATEGY_ENGINE_VERSION,
            engine_metadata=engine_meta,
            methodology_disclaimer=(
                "Rule-based technical screening over completed NSE daily candles. "
                "Reference entry, target, and stop levels are ATR-based rules, not guaranteed outcomes or investment advice."
            ),
            signals=returned,
        )
        market_cache.save_json_artifact(f"latest_swing_scan_{caps.provider_id}", resp.model_dump())
        if caps.provider_id == "yfinance":
            market_cache.save_json_artifact("latest_swing_scan", resp.model_dump())
        return resp


def run_intraday_scanner(
    universe_limit: Optional[int] = None,
    force_refresh: bool = False,
    include_last_session_when_closed: bool = True,
    result_limit: Optional[int] = None,
) -> IntradayScannerResponse:
    """
    Scan configured NSE stocks for 15-minute intraday setups using shared strategy/execution
    rules, honest coverage accounting, and single-flight deduplication.
    """
    req_limit = universe_limit or settings.INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT
    cap_results = result_limit if result_limit is not None else settings.INTRADAY_SCANNER_DEFAULT_RESULT_LIMIT

    with _intraday_scan_lock:
        now_ist = get_now_ist()
        m_status = get_market_status(now_ist)
        is_live = m_status.is_market_open
        caps = data_provider.capabilities
        universe = load_nifty500_universe()
        eligible_universe_size = len(universe)
        symbols = _select_universe_symbols(req_limit)
        validated_stats, overall_val_status = get_validated_strategy_stats()

        engine_meta = AnalysisEngineMetadata(
            strategy_version=STRATEGY_ENGINE_VERSION,
            data_source=f"{caps.provider_id} (15m {settings.PRICE_ADJUSTMENT_POLICY})",
            data_limitations=[
                *caps.limitations,
                "A 5-minute refresh cadence does NOT produce real-time data when the upstream provider delivers delayed bars.",
            ],
        )

        if not is_live and not include_last_session_when_closed:
            empty_cov = ScanCoverageMetrics(
                universe_version=UNIVERSE_VERSION,
                requested_universe_size=req_limit,
                eligible_universe_size=eligible_universe_size,
                stocks_attempted=0,
                stocks_fetched=0,
                stocks_analyzed=0,
                stocks_skipped=0,
                stocks_failed=0,
                stocks_using_stale_data=0,
                matching_signals_count=0,
                returned_signals_count=0,
                applied_result_limit=cap_results,
                coverage_pct=0.0,
                is_partial_coverage=True,
            )
            return IntradayScannerResponse(
                status="PAUSED_CLOSED",
                scan_timestamp_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
                market_status=m_status,
                scanner_state="PAUSED_MARKET_CLOSED",
                session_date=m_status.last_completed_trading_session_date,
                data_provider=caps.display_name,
                data_delay_minutes=caps.estimated_delay_minutes,
                data_freshness="DELAYED" if not caps.is_realtime else "FRESH",
                is_stale=False,
                total_scanned=0,
                active_signals_count=0,
                completed_trades_count=0,
                scan_coverage=empty_cov,
                validation_status=overall_val_status,
                strategy_version=STRATEGY_ENGINE_VERSION,
                engine_metadata=engine_meta,
                data_delay_notice=(
                    "NSE market is closed. Live intraday scanning is paused until the next session (09:15 IST)."
                ),
                signals=[],
            )

        policy = DataUsagePolicy(
            purpose="CURRENT_MARKET_SCREENING",
            allow_delayed_data=settings.ALLOW_DELAYED_DATA,
            allow_stale_cache_fallback=settings.ALLOW_STALE_CACHE_FALLBACK,
            require_production_approved_provider=settings.effective_require_production_approved_provider,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        )
        should_fetch_fresh = is_live and force_refresh
        res_map = data_provider.fetch_batch_intraday_ohlcv_results(
            symbols=symbols,
            period="5d",
            interval="15m",
            force_refresh=should_fetch_fresh,
            min_bars=20,
            policy=policy,
        )

        skip_reasons: Counter = Counter()
        failed_count = 0
        fetched_count = 0
        analyzed_count = 0
        usable_results: Dict[str, MarketDataResult] = {}

        for sym in symbols:
            r = res_map.get(sym)
            if r is None or r.status == "PROVIDER_UNAVAILABLE":
                failed_count += 1
                skip_reasons["provider_unavailable"] += 1
            elif r.status in ("INSUFFICIENT_HISTORY", "INVALID_DATA", "UNSUPPORTED_SYMBOL"):
                skip_reasons[r.status.lower()] += 1
            elif r.df is not None and len(r.df) >= 20:
                fetched_count += 1
                usable_results[sym] = r
            else:
                skip_reasons["insufficient_history"] += 1

        all_signals: List[IntradaySignalItem] = []
        session_date_str = m_status.last_completed_trading_session_date
        timeout_sec = settings.SCANNER_SYMBOL_TIMEOUT_SECONDS

        with ThreadPoolExecutor(max_workers=settings.SCANNER_MAX_WORKERS) as pool:
            fut_to_sym = {
                pool.submit(
                    evaluate_intraday_session_signals,
                    sym,
                    r.df,
                    is_live,
                    validated_stats,
                    r.provenance,
                ): sym
                for sym, r in usable_results.items()
            }
            for fut in as_completed(fut_to_sym):
                sym = fut_to_sym[fut]
                try:
                    sig_list = fut.result(timeout=timeout_sec)
                    analyzed_count += 1
                    if sig_list:
                        all_signals.extend(sig_list)
                except FuturesTimeoutError:
                    failed_count += 1
                    skip_reasons["evaluation_timeout"] += 1
                except Exception as exc:
                    failed_count += 1
                    skip_reasons["evaluation_error"] += 1
                    logger.warning("Intraday evaluation failed for %s: %s", sym, exc)

        if usable_results:
            session_date_str = max(
                str(r.df.index[-1].date()) for r in usable_results.values() if r.df is not None
            )

        if is_live:
            all_signals.sort(
                key=lambda s: (1 if s.is_projected_exit else 0, s.entry_time_ist, s.technical_setup_score),
                reverse=True,
            )
        else:
            all_signals.sort(
                key=lambda s: (s.technical_setup_score, 1 if s.is_projected_exit else 0, s.entry_time_ist),
                reverse=True,
            )
        matching_total = len(all_signals)
        returned = all_signals[:cap_results] if cap_results and cap_results > 0 else all_signals
        active_cnt = sum(1 for s in returned if s.is_projected_exit)
        completed_cnt = sum(1 for s in returned if not s.is_projected_exit)

        stale_cnt, fetch_ts, freshness, is_stale = _aggregate_provenance(res_map)
        stocks_skipped = max(0, len(symbols) - analyzed_count - failed_count)
        coverage = ScanCoverageMetrics(
            universe_version=UNIVERSE_VERSION,
            requested_universe_size=req_limit,
            eligible_universe_size=eligible_universe_size,
            stocks_attempted=len(symbols),
            stocks_fetched=fetched_count,
            stocks_analyzed=analyzed_count,
            stocks_skipped=stocks_skipped,
            skip_reasons=dict(skip_reasons),
            stocks_failed=failed_count,
            stocks_using_stale_data=stale_cnt,
            matching_signals_count=matching_total,
            returned_signals_count=len(returned),
            applied_result_limit=cap_results,
            coverage_pct=round((analyzed_count / max(1, len(symbols))) * 100.0, 2),
            is_partial_coverage=analyzed_count < len(symbols) or len(symbols) < eligible_universe_size,
        )

        next_refresh = (
            (now_ist + timedelta(seconds=settings.INTRADAY_REFRESH_SECONDS)).strftime("%Y-%m-%d %H:%M:%S IST")
            if is_live
            else None
        )
        delay_str = (
            f"estimated ~{caps.estimated_delay_minutes} min exchange delay"
            if not caps.is_realtime
            else "licensed real-time feed"
        )
        delay_notice = (
            f"LIVE MARKET HOURS ({caps.display_name}, {delay_str}): Scanner refreshes every "
            f"{settings.INTRADAY_REFRESH_SECONDS // 60} minutes. Refresh cadence does NOT remove provider feed delay."
            if is_live
            else f"MARKET CLOSED ({m_status.session_phase}): Live scanner paused. "
            f"Showing completed session review for {session_date_str} ({analyzed_count}/{len(symbols)} attempted stocks analyzed)."
        )

        if analyzed_count == 0:
            resp_status = "PROVIDER_UNAVAILABLE"
        elif is_stale:
            resp_status = "STALE_DATA"
        elif not is_live:
            resp_status = "PAUSED_CLOSED"
        elif analyzed_count < len(symbols):
            resp_status = "PARTIAL_RESULTS"
        else:
            resp_status = "OK"

        resp = IntradayScannerResponse(
            status=resp_status,  # type: ignore[arg-type]
            scan_timestamp_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            fetch_timestamp_ist=fetch_ts,
            market_status=m_status,
            scanner_state="ACTIVE_SCANNING" if is_live else "PAUSED_MARKET_CLOSED",
            session_date=session_date_str,
            next_auto_refresh_ist=next_refresh,
            data_provider=caps.display_name,
            data_delay_minutes=caps.estimated_delay_minutes,
            data_freshness=freshness,  # type: ignore[arg-type]
            is_stale=is_stale,
            total_scanned=analyzed_count,
            active_signals_count=active_cnt,
            completed_trades_count=completed_cnt,
            scan_coverage=coverage,
            validation_status=overall_val_status,
            strategy_version=STRATEGY_ENGINE_VERSION,
            engine_metadata=engine_meta,
            data_delay_notice=delay_notice,
            signals=returned,
        )
        market_cache.save_json_artifact(f"latest_intraday_scan_{caps.provider_id}", resp.model_dump())
        if caps.provider_id == "yfinance":
            market_cache.save_json_artifact("latest_intraday_scan", resp.model_dump())
        return resp


async def intraday_auto_scheduler_loop(stop_event: asyncio.Event) -> None:
    """
    Non-overlapping background scheduler respecting NSE market hours and clean cancellation.
    Uses unified `settings.INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT` and skips if a prior run is still active.
    """
    logger.info(
        "Intraday scheduler started (interval=%ds, universe_limit=%d).",
        settings.INTRADAY_REFRESH_SECONDS,
        settings.INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT,
    )
    while not stop_event.is_set():
        try:
            m_status = get_market_status()
            if m_status.is_market_open:
                if _intraday_scheduler_running.acquire(blocking=False):
                    try:
                        logger.info("Scheduled intraday scan starting (%s).", m_status.current_time_ist)
                        await asyncio.to_thread(
                            run_intraday_scanner,
                            settings.INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT,
                            True,
                            True,
                            settings.INTRADAY_SCANNER_DEFAULT_RESULT_LIMIT,
                        )
                    finally:
                        _intraday_scheduler_running.release()
                else:
                    logger.warning("Skipping overlapping scheduled intraday scan; prior run still active.")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Scheduled intraday scan failed: %s", exc)

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=float(settings.INTRADAY_REFRESH_SECONDS))
        except asyncio.TimeoutError:
            continue
