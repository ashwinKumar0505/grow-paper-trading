"""Yahoo Finance (yfinance) development/research market-data adapter for NSE (.NS) equities."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional, TypeVar
from cachetools import TTLCache
import numpy as np
import pandas as pd
import yfinance as yf

from app.config import settings
from app.data.cache import CacheEntryMeta, MarketDataCache, TokenBucketRateLimiter, market_cache, rate_limiter
from app.data.nifty500_constituents import get_stock_info, is_valid_nse_symbol, resolve_nse_symbol_alias
from app.data.nse_calendar import IST
from app.data.providers.base import (
    DataUsagePolicy,
    FinancialsResult,
    MarketDataProvider,
    MarketDataResult,
    ProviderCapabilities,
)
from app.data.providers.yfinance_financials import fetch_yfinance_financials
from app.data.quality import validate_and_normalize_ohlcv
from app.models.common import DataQualitySummary, MarketDataProvenance
from app.models.market import StockConstituent

logger = logging.getLogger(__name__)
T = TypeVar("T")


def _run_with_retry(fn: Callable[[], T], attempts: int, base_backoff: float) -> T:
    last_exc: Optional[Exception] = None
    for attempt in range(max(1, attempts)):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            if attempt + 1 < attempts:
                time.sleep(base_backoff * (2 ** attempt))
    assert last_exc is not None
    raise last_exc


class YFinanceMarketDataProvider(MarketDataProvider):
    """
    Development/research adapter powered by Yahoo Finance (.NS).
    Explicitly marked non-realtime (~15m exchange delay) and NOT production-approved.
    """

    def __init__(
        self,
        cache: Optional[MarketDataCache] = None,
        limiter: Optional[TokenBucketRateLimiter] = None,
    ):
        self._cache = cache or market_cache
        self._limiter = limiter or rate_limiter
        self._fail_lock = threading.Lock()
        self._failed_download_ts: TTLCache = TTLCache(maxsize=256, ttl=1800)

    def prune_caches(self) -> None:
        with self._fail_lock:
            self._failed_download_ts.expire()

    @property
    def capabilities(self) -> ProviderCapabilities:
        approved = bool(settings.PROVIDER_PRODUCTION_APPROVED_OVERRIDE)
        realtime = bool(settings.PROVIDER_IS_REALTIME_OVERRIDE)
        delay_min = max(0, int(settings.PROVIDER_ESTIMATED_DELAY_MINUTES))
        return ProviderCapabilities(
            provider_id="yfinance",
            display_name="Yahoo Finance (.NS Adapter)",
            supports_daily_ohlcv=True,
            supports_intraday_ohlcv=True,
            supported_intraday_intervals=("5m", "15m", "30m", "60m"),
            supports_stock_info=True,
            supports_constituents=False,
            supports_financials=True,
            supports_adjusted_prices=True,
            is_realtime=realtime,
            estimated_delay_minutes=delay_min,
            licensing_tier=(
                "TESTING_OVERRIDE_ENABLED"
                if approved
                else "DEVELOPMENT_RESEARCH_ONLY_UNLICENSED_FOR_COMMERCIAL_REDISTRIBUTION"
            ),
            production_approved=approved,
            limitations=(
                "Intraday 15m history is typically capped to ~60 days (default 5d fetch).",
                "Adjusted prices (auto_adjust=True) retroactively adjust historical splits and dividends.",
            ),
        )

    def _default_policy(self, purpose: str) -> DataUsagePolicy:
        return DataUsagePolicy(
            purpose=purpose,  # type: ignore[arg-type]
            allow_delayed_data=settings.ALLOW_DELAYED_DATA,
            allow_stale_cache_fallback=settings.ALLOW_STALE_CACHE_FALLBACK,
            require_production_approved_provider=settings.effective_require_production_approved_provider,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        )

    def _build_provenance(
        self,
        adjustment_policy: str,
        cache_meta: Optional[CacheEntryMeta],
        last_completed_ts: Optional[str],
        staleness_days: Optional[int],
        is_stale: bool,
        has_partial_excluded: bool,
        cache_layer: str,
    ) -> MarketDataProvenance:
        caps = self.capabilities
        if cache_layer == "UNAVAILABLE":
            freshness = "UNAVAILABLE"
        elif is_stale or cache_layer == "DISK_CACHE_STALE":
            freshness = "STALE"
        elif not caps.is_realtime:
            freshness = "DELAYED"
        else:
            freshness = "FRESH"

        fetched_utc = cache_meta.fetched_at_utc if cache_meta else None
        fetched_ist = cache_meta.fetched_at_ist if cache_meta else None
        if cache_layer == "LIVE_PROVIDER" and not fetched_utc:
            now_utc = datetime.now(timezone.utc)
            fetched_utc = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
            fetched_ist = now_utc.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST")

        adj_note = (
            "auto_adjust=True: OHLC bars are retroactively adjusted for splits and dividends."
            if adjustment_policy == "SPLIT_AND_DIVIDEND_ADJUSTED"
            else "auto_adjust=False: Raw unadjusted exchange OHLC bars."
        )
        return MarketDataProvenance(
            provider_id=caps.provider_id,
            provider_display_name=caps.display_name,
            is_realtime=caps.is_realtime,
            estimated_delay_minutes=caps.estimated_delay_minutes,
            price_adjustment_policy=adjustment_policy,  # type: ignore[arg-type]
            adjustment_note=adj_note,
            fetched_at_utc=fetched_utc,
            fetched_at_ist=fetched_ist,
            last_completed_candle_ts=last_completed_ts,
            data_freshness=freshness,  # type: ignore[arg-type]
            is_stale=bool(is_stale or cache_layer == "DISK_CACHE_STALE"),
            staleness_trading_days=staleness_days,
            has_partial_candle_excluded=has_partial_excluded,
            cache_layer=cache_layer,  # type: ignore[arg-type]
            production_approved=caps.production_approved,
        )

    def _package_validated(
        self,
        symbol: str,
        interval: str,
        raw_df: Optional[pd.DataFrame],
        min_bars: int,
        adjustment_policy: str,
        cache_meta: Optional[CacheEntryMeta],
        cache_layer: str,
    ) -> MarketDataResult:
        validated = validate_and_normalize_ohlcv(
            raw_df=raw_df,
            interval=interval,
            min_bars=min_bars,
            exclude_partial_candle=True,
        )
        prov = self._build_provenance(
            adjustment_policy=adjustment_policy,
            cache_meta=cache_meta,
            last_completed_ts=validated.last_completed_ts,
            staleness_days=validated.staleness_trading_days,
            is_stale=validated.is_stale,
            has_partial_excluded=validated.quality.partial_candle_excluded,
            cache_layer=cache_layer,
        )
        if validated.df_completed is None or len(validated.df_completed) == 0:
            return MarketDataResult(
                symbol=symbol,
                interval=interval,
                status="INVALID_DATA",
                df=None,
                partial_candle=validated.partial_candle,
                provenance=prov,
                quality=validated.quality,
                error_message="; ".join(validated.quality.issues) or "No usable OHLCV bars.",
            )
        if not validated.quality.is_valid:
            return MarketDataResult(
                symbol=symbol,
                interval=interval,
                status="INSUFFICIENT_HISTORY",
                df=validated.df_completed,
                partial_candle=validated.partial_candle,
                provenance=prov,
                quality=validated.quality,
                error_message="; ".join(validated.quality.issues),
            )
        status = "STALE_CACHE" if prov.is_stale else "OK"
        return MarketDataResult(
            symbol=symbol,
            interval=interval,
            status=status,  # type: ignore[arg-type]
            df=validated.df_completed,
            partial_candle=validated.partial_candle,
            provenance=prov,
            quality=validated.quality,
        )

    def _unavailable_result(
        self,
        symbol: str,
        interval: str,
        adjustment_policy: str,
        status: str,
        message: str,
    ) -> MarketDataResult:
        prov = self._build_provenance(
            adjustment_policy=adjustment_policy,
            cache_meta=None,
            last_completed_ts=None,
            staleness_days=None,
            is_stale=True,
            has_partial_excluded=False,
            cache_layer="UNAVAILABLE",
        )
        return MarketDataResult(
            symbol=symbol,
            interval=interval,
            status=status,  # type: ignore[arg-type]
            df=None,
            partial_candle=None,
            provenance=prov,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=0,
                completed_rows_usable=0,
                issues=[message],
            ),
            error_message=message,
        )

    def _fetch_single_ohlcv(
        self,
        symbol: str,
        interval: str,
        period: str,
        force_refresh: bool,
        min_bars: int,
        policy: DataUsagePolicy,
    ) -> MarketDataResult:
        self.enforce_policy(policy)
        clean = resolve_nse_symbol_alias(symbol)
        adj_policy = policy.adjustment_policy
        if not is_valid_nse_symbol(clean):
            return self._unavailable_result(
                clean, interval, adj_policy, "UNSUPPORTED_SYMBOL", f"Invalid NSE symbol '{symbol}'."
            )

        key = self._cache.build_key(self.capabilities.provider_id, clean, interval, adj_policy)
        with self._cache.get_key_lock(key):
            # 1. Check fresh cache (TTL-enforced)
            if not force_refresh:
                cached_df, meta = self._cache.get_ohlcv(
                    clean, interval, self.capabilities.provider_id, adj_policy, allow_stale_disk=False
                )
                if cached_df is not None and meta is not None:
                    res = self._package_validated(
                        clean, interval, cached_df, min_bars, adj_policy, meta, meta.cache_layer
                    )
                    if res.status in ("OK", "STALE_CACHE"):
                        return res

            # 2. Fetch live from yfinance (unless educational replay mode disables network)
            if not settings.EDUCATIONAL_REPLAY_MODE:
                auto_adjust = adj_policy == "SPLIT_AND_DIVIDEND_ADJUSTED"
                yf_ticker = f"{clean}.NS"
                try:
                    self._limiter.acquire(1.0, timeout=settings.SCANNER_SYMBOL_TIMEOUT_SECONDS)

                    def _do_fetch() -> pd.DataFrame:
                        ticker = yf.Ticker(yf_ticker)
                        return ticker.history(period=period, interval=interval, auto_adjust=auto_adjust)

                    raw = _run_with_retry(
                        _do_fetch,
                        attempts=settings.PROVIDER_RETRY_ATTEMPTS,
                        base_backoff=settings.PROVIDER_RETRY_BACKOFF_SECONDS,
                    )
                    res = self._package_validated(
                        clean, interval, raw, min_bars, adj_policy, None, "LIVE_PROVIDER"
                    )
                    if res.df is not None and res.quality.is_valid:
                        meta_saved = self._cache.set_ohlcv(
                            clean,
                            res.df,
                            interval=interval,
                            provider_id=self.capabilities.provider_id,
                            adjustment_policy=adj_policy,
                            last_completed_candle_ts=res.provenance.last_completed_candle_ts,
                        )
                        res.provenance.fetched_at_utc = meta_saved.fetched_at_utc
                        res.provenance.fetched_at_ist = meta_saved.fetched_at_ist
                        return res
                    if res.status == "INSUFFICIENT_HISTORY":
                        return res
                except Exception as exc:
                    logger.warning("yfinance fetch failed for %s (%s): %s", yf_ticker, interval, exc)

            # 3. Policy-controlled explicit stale disk fallback (never silently disguised as fresh)
            if policy.allow_stale_cache_fallback:
                stale_df, stale_meta = self._cache.get_ohlcv(
                    clean, interval, self.capabilities.provider_id, adj_policy, allow_stale_disk=True
                )
                if stale_df is not None and stale_meta is not None:
                    res = self._package_validated(
                        clean, interval, stale_df, min_bars, adj_policy, stale_meta, "DISK_CACHE_STALE"
                    )
                    res.provenance.is_stale = True
                    res.provenance.data_freshness = "STALE"
                    if res.status == "OK":
                        res.status = "STALE_CACHE"
                    return res

            return self._unavailable_result(
                clean,
                interval,
                adj_policy,
                "PROVIDER_UNAVAILABLE",
                f"Upstream provider '{self.capabilities.provider_id}' unavailable and no valid cached data exists for {clean}.",
            )

    def fetch_daily_ohlcv_result(
        self,
        symbol: str,
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        active_policy = policy or self._default_policy("INDIVIDUAL_STOCK_ANALYSIS")
        return self._fetch_single_ohlcv(symbol, "1d", period, force_refresh, min_bars, active_policy)

    def fetch_intraday_ohlcv_result(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        active_policy = policy or self._default_policy("CURRENT_MARKET_SCREENING")
        return self._fetch_single_ohlcv(symbol, interval, period, force_refresh, min_bars, active_policy)

    def _fetch_batch(
        self,
        symbols: List[str],
        interval: str,
        period: str,
        force_refresh: bool,
        min_bars: int,
        policy: DataUsagePolicy,
        chunk_size: int = 35,
    ) -> Dict[str, MarketDataResult]:
        """Batch fetch with fresh-cache lookup, bounded chunked downloads, and explicit stale fallback."""
        self.enforce_policy(policy)
        adj_policy = policy.adjustment_policy
        results: Dict[str, MarketDataResult] = {}
        to_download: List[str] = []

        for raw_sym in symbols:
            clean = resolve_nse_symbol_alias(raw_sym)
            if not is_valid_nse_symbol(clean):
                results[clean] = self._unavailable_result(
                    clean, interval, adj_policy, "UNSUPPORTED_SYMBOL", f"Invalid NSE symbol '{raw_sym}'."
                )
                continue
            if not force_refresh:
                cached_df, meta = self._cache.get_ohlcv(
                    clean, interval, self.capabilities.provider_id, adj_policy, allow_stale_disk=False
                )
                if cached_df is not None and meta is not None:
                    res = self._package_validated(
                        clean, interval, cached_df, min_bars, adj_policy, meta, meta.cache_layer
                    )
                    if res.status in ("OK", "STALE_CACHE"):
                        results[clean] = res
                        continue
                fail_key = f"{clean}:{interval}"
                last_fail = self._failed_download_ts.get(fail_key, 0.0)
                if (time.time() - last_fail) < 1800.0:
                    results[clean] = self._unavailable_result(clean, interval, adj_policy, "INVALID_DATA", f"Recent negative cache hit for {clean}.")
                    continue
            to_download.append(clean)

        # In educational replay / historical backtest mode without force_refresh, check disk cache directly
        if to_download and not force_refresh and (
            policy.purpose in ("HISTORICAL_BACKTEST", "EDUCATIONAL_HISTORICAL_REPLAY")
            or settings.EDUCATIONAL_REPLAY_MODE
        ):
            still_missing: List[str] = []
            for sym in to_download:
                stale_df, stale_meta = self._cache.get_ohlcv(
                    sym, interval, self.capabilities.provider_id, adj_policy, allow_stale_disk=True
                )
                if stale_df is not None and stale_meta is not None:
                    res = self._package_validated(
                        sym, interval, stale_df, min_bars, adj_policy, stale_meta, stale_meta.cache_layer
                    )
                    if stale_meta.is_ttl_expired:
                        res.provenance.is_stale = True
                        res.provenance.data_freshness = "STALE"
                        if res.status == "OK":
                            res.status = "STALE_CACHE"
                    results[sym] = res
                else:
                    still_missing.append(sym)
            to_download = still_missing

        # Download remaining missing/expired symbols in bounded chunks
        if to_download and not settings.EDUCATIONAL_REPLAY_MODE:
            auto_adjust = adj_policy == "SPLIT_AND_DIVIDEND_ADJUSTED"
            for i in range(0, len(to_download), chunk_size):
                chunk = to_download[i : i + chunk_size]
                yf_tickers = [f"{s}.NS" for s in chunk]
                self._limiter.acquire(2.0, timeout=settings.SCANNER_SYMBOL_TIMEOUT_SECONDS)
                try:
                    batch_df = _run_with_retry(
                        lambda: yf.download(
                            tickers=yf_tickers,
                            period=period,
                            interval=interval,
                            group_by="ticker",
                            auto_adjust=auto_adjust,
                            progress=False,
                            threads=True,
                            timeout=settings.SCANNER_SYMBOL_TIMEOUT_SECONDS,
                        ),
                        attempts=settings.PROVIDER_RETRY_ATTEMPTS,
                        base_backoff=settings.PROVIDER_RETRY_BACKOFF_SECONDS,
                    )
                    if batch_df is not None and not batch_df.empty:
                        if len(chunk) == 1:
                            s = chunk[0]
                            res = self._package_validated(
                                s, interval, batch_df, min_bars, adj_policy, None, "LIVE_PROVIDER"
                            )
                            if res.df is not None and res.quality.is_valid:
                                saved = self._cache.set_ohlcv(
                                    s, res.df, interval, self.capabilities.provider_id, adj_policy,
                                    res.provenance.last_completed_candle_ts,
                                )
                                res.provenance.fetched_at_utc = saved.fetched_at_utc
                                res.provenance.fetched_at_ist = saved.fetched_at_ist
                            results[s] = res
                        elif isinstance(batch_df.columns, pd.MultiIndex):
                            top_level = set(batch_df.columns.get_level_values(0))
                            for s in chunk:
                                t_key = f"{s}.NS"
                                if t_key in top_level:
                                    sub = batch_df[t_key]
                                    res = self._package_validated(
                                        s, interval, sub, min_bars, adj_policy, None, "LIVE_PROVIDER"
                                    )
                                    if res.df is not None and res.quality.is_valid:
                                        saved = self._cache.set_ohlcv(
                                            s, res.df, interval, self.capabilities.provider_id, adj_policy,
                                            res.provenance.last_completed_candle_ts,
                                        )
                                        res.provenance.fetched_at_utc = saved.fetched_at_utc
                                        res.provenance.fetched_at_ist = saved.fetched_at_ist
                                    results[s] = res
                except Exception as exc:
                    logger.warning("Batch %s download failed (chunk %s): %s", interval, chunk[0], exc)

        # Fallback to explicit stale disk cache or record structured failure for every missing symbol
        unresolved = [s for s in to_download if s not in results or results[s].status == "INVALID_DATA"]
        for s in unresolved:
            if policy.allow_stale_cache_fallback:
                stale_df, stale_meta = self._cache.get_ohlcv(
                    s, interval, self.capabilities.provider_id, adj_policy, allow_stale_disk=True
                )
                if stale_df is not None and stale_meta is not None:
                    res = self._package_validated(
                        s, interval, stale_df, min_bars, adj_policy, stale_meta, "DISK_CACHE_STALE"
                    )
                    res.provenance.is_stale = True
                    res.provenance.data_freshness = "STALE"
                    if res.status == "OK":
                        res.status = "STALE_CACHE"
                    results[s] = res
                    continue
            if s not in results:
                self._failed_download_ts[f"{s}:{interval}"] = time.time()
                results[s] = self._unavailable_result(
                    s,
                    interval,
                    adj_policy,
                    "PROVIDER_UNAVAILABLE",
                    f"Failed to retrieve {interval} market data for {s}.",
                )

        return results

    def fetch_batch_daily_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        active_policy = policy or self._default_policy("CURRENT_MARKET_SCREENING")
        return self._fetch_batch(symbols, "1d", period, force_refresh, min_bars, active_policy, chunk_size=40)

    def fetch_batch_intraday_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        active_policy = policy or self._default_policy("CURRENT_MARKET_SCREENING")
        return self._fetch_batch(symbols, interval, period, force_refresh, min_bars, active_policy, chunk_size=35)

    def fetch_stock_info(self, symbol: str) -> Optional[StockConstituent]:
        return get_stock_info(symbol)

    def fetch_financials_result(self, symbol: str, force_refresh: bool = False) -> FinancialsResult:
        """Fetch yearly and quarterly financials from yfinance with explicit cache freshness."""
        return fetch_yfinance_financials(symbol, self._cache, self._limiter, force_refresh)
