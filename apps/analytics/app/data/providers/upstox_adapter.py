"""Upstox Market-Data Provider adapter using read-only Analytics Token (V3 candles + V2 fundamentals)."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
from cachetools import TTLCache
import pandas as pd

from app.config import settings
from app.data.cache import CacheEntryMeta, MarketDataCache, TokenBucketRateLimiter, market_cache, rate_limiter
from app.data.nifty500_constituents import get_stock_info, is_valid_nse_symbol, resolve_nse_symbol_alias
from app.data.nse_calendar import IST, MARKET_CLOSE_TIME, MARKET_OPEN_TIME, get_now_ist, is_trading_day
from app.data.providers.base import (
    DataUsagePolicy,
    FinancialsResult,
    LiveQuote,
    MarketDataProvider,
    MarketDataResult,
    ProviderCapabilities,
    ProviderNotConfiguredError,
    ProviderPolicyViolationError,
)
from app.data.providers.upstox_client import UpstoxAuthError, UpstoxHttpClient
from app.data.providers.upstox_financials import fetch_upstox_financials
from app.data.providers.upstox_instruments import UpstoxInstrumentResolver
from app.data.quality import validate_and_normalize_ohlcv
from app.models.common import DataQualitySummary, MarketDataProvenance
from app.models.market import StockConstituent

logger = logging.getLogger(__name__)

_INTERVAL_TO_V3: Dict[str, Tuple[str, int, int]] = {
    "1d": ("days", 1, 3650),
    "5m": ("minutes", 5, 28),
    "15m": ("minutes", 15, 28),
    "30m": ("minutes", 30, 85),
    "60m": ("minutes", 60, 85),
    "1h": ("hours", 1, 85),
}

_PERIOD_LOOKBACK_DAYS: Dict[str, int] = {
    "1d": 2,
    "5d": 10,
    "10d": 16,
    "1mo": 35,
    "3mo": 95,
    "6mo": 190,
    "1y": 370,
    "2y": 740,
    "3y": 1105,
    "5y": 1835,
}


def parse_upstox_candles_to_df(
    historical_candles: List[List[Any]],
    intraday_candles: List[List[Any]],
    is_intraday: bool,
) -> Optional[pd.DataFrame]:
    """
    Combine Upstox V3 historical + intraday candles into an ascending, deduplicated,
    timezone-naive IST OHLCV DataFrame. Intraday bars take precedence on overlapping dates/timestamps.
    """
    rows_by_key: Dict[Any, Tuple[pd.Timestamp, float, float, float, float, int]] = {}

    def _ingest(raw_list: List[List[Any]]) -> None:
        for bar in raw_list:
            if not isinstance(bar, (list, tuple)) or len(bar) < 6:
                continue
            ts = pd.to_datetime(bar[0], errors="coerce")
            if pd.isna(ts):
                continue
            if ts.tzinfo is not None:
                ts = ts.tz_convert(IST).tz_localize(None)
            try:
                o, h, l, c, v = float(bar[1]), float(bar[2]), float(bar[3]), float(bar[4]), int(round(float(bar[5])))
            except (TypeError, ValueError):
                continue
            if is_intraday:
                dedupe_key: Any = ts
                norm_ts = ts
            else:
                dedupe_key = ts.date()
                norm_ts = pd.Timestamp(ts.date())
            rows_by_key[dedupe_key] = (norm_ts, o, h, l, c, v)

    _ingest(historical_candles)
    _ingest(intraday_candles)
    if not rows_by_key:
        return None

    ordered = sorted(rows_by_key.values(), key=lambda r: r[0])
    index = pd.DatetimeIndex([r[0] for r in ordered])
    return pd.DataFrame(
        {
            "Open": [r[1] for r in ordered],
            "High": [r[2] for r in ordered],
            "Low": [r[3] for r in ordered],
            "Close": [r[4] for r in ordered],
            "Volume": [r[5] for r in ordered],
        },
        index=index,
    )


def _date_chunks(start_date: date, end_date: date, max_days: int) -> List[Tuple[date, date]]:
    if start_date > end_date:
        return []
    chunks: List[Tuple[date, date]] = []
    cursor = start_date
    while cursor <= end_date:
        chunk_end = min(end_date, cursor + timedelta(days=max_days))
        chunks.append((cursor, chunk_end))
        cursor = chunk_end + timedelta(days=1)
    return chunks


class UpstoxMarketDataProvider(MarketDataProvider):
    """
    Upstox Market-Data adapter powered strictly by the read-only Analytics Token.
    Preserves corporate-action honesty: never mislabels Upstox candles as dividend-adjusted.
    """

    def __init__(
        self,
        cache: Optional[MarketDataCache] = None,
        limiter: Optional[TokenBucketRateLimiter] = None,
        client: Optional[UpstoxHttpClient] = None,
    ):
        self._cache = cache or market_cache
        self._limiter = limiter or rate_limiter
        self._client = client or UpstoxHttpClient(limiter=self._limiter)
        self._resolver = UpstoxInstrumentResolver(self._client)
        self._failed_download_ts: TTLCache = TTLCache(maxsize=256, ttl=1800)
        self._quote_lock = threading.Lock()
        self._quote_cache: TTLCache = TTLCache(maxsize=256, ttl=60)

    def prune_caches(self) -> None:
        with self._quote_lock:
            self._quote_cache.expire()
            self._failed_download_ts.expire()
        self._resolver.prune_cache()

    def close(self) -> None:
        self._client.close()

    @property
    def capabilities(self) -> ProviderCapabilities:
        token_configured = self._client.has_analytics_token()
        commercial_approved = bool(token_configured and settings.UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED)
        if commercial_approved:
            tier = "UPSTOX_ANALYTICS_TOKEN_COMMERCIAL_USE_ATTESTED"
        elif token_configured:
            tier = "UPSTOX_ANALYTICS_TOKEN_NON_COMMERCIAL_REDISTRIBUTION_UNVERIFIED"
        else:
            tier = "UPSTOX_ANALYTICS_TOKEN_NOT_CONFIGURED"

        return ProviderCapabilities(
            provider_id="upstox",
            display_name="Upstox Market Data API (Analytics Token)",
            supports_daily_ohlcv=True,
            supports_intraday_ohlcv=True,
            supported_intraday_intervals=("5m", "15m", "30m", "60m"),
            supports_stock_info=True,
            supports_constituents=False,
            supports_financials=True,
            supports_adjusted_prices=False,
            is_realtime=token_configured,
            estimated_delay_minutes=0 if token_configured else None,
            licensing_tier=tier,
            production_approved=commercial_approved,
            limitations=(
                "Uses read-only Upstox Analytics Token (UPSTOX_ANALYTICS_TOKEN); daily OAuth tokens are not substituted.",
                "Upstox V3 historical candles are NOT verified as cash-dividend-adjusted (not proven equivalent to Yahoo auto_adjust=True).",
                "Shared Upstox account rate limits (50 req/s, 500 req/min, 2000 req/30min) apply across both Node and Python services.",
                "Commercial redistribution rights are not assumed merely because an Analytics Token works.",
            ),
        )

    def enforce_policy(self, policy: DataUsagePolicy) -> None:
        super().enforce_policy(policy)
        if policy.adjustment_policy == "SPLIT_AND_DIVIDEND_ADJUSTED":
            raise ProviderPolicyViolationError(
                "Upstox historical candles are not verified as split-and-dividend adjusted "
                "(equivalent to Yahoo Finance auto_adjust=True). Run live corporate-action verification "
                "with UPSTOX_ANALYTICS_TOKEN or explicitly set PRICE_ADJUSTMENT_POLICY to "
                "SPLIT_ADJUSTED_ONLY or UNADJUSTED_RAW before running affected analytics/backtests."
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
            "Upstox V3 historical candles (split/bonus-adjusted exchange series; cash dividends not retroactively adjusted)."
            if adjustment_policy == "SPLIT_ADJUSTED_ONLY"
            else "Upstox V3 historical candles treated under explicit UNADJUSTED_RAW policy."
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
        now_ist: Optional[datetime] = None,
    ) -> MarketDataResult:
        validated = validate_and_normalize_ohlcv(
            raw_df=raw_df,
            interval=interval,
            min_bars=min_bars,
            now_ist=now_ist,
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
                error_message="; ".join(validated.quality.issues) or "No usable Upstox OHLCV bars.",
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
            quality=DataQualitySummary(is_valid=False, total_rows_raw=0, completed_rows_usable=0, issues=[message]),
            error_message=message,
        )

    def _download_symbol_candles(
        self,
        clean_symbol: str,
        interval: str,
        period: str,
        include_intraday_today: bool,
        now_ist: datetime,
    ) -> Optional[pd.DataFrame]:
        inst = self._resolver.resolve(clean_symbol)
        if inst is None:
            return None
        spec = _INTERVAL_TO_V3.get(interval)
        if spec is None:
            return None
        unit, iv_num, max_chunk_days = spec
        lookback_days = _PERIOD_LOOKBACK_DAYS.get(period, 740 if interval == "1d" else 10)
        end_d = now_ist.date()
        start_d = end_d - timedelta(days=lookback_days)

        historical: List[List[Any]] = []
        for c_start, c_end in _date_chunks(start_d, end_d, max_chunk_days):
            candles = self._client.get_historical_candles(
                inst.instrument_key, unit, iv_num, c_end.isoformat(), c_start.isoformat()
            )
            historical.extend(candles)

        intraday: List[List[Any]] = []
        if include_intraday_today and is_trading_day(end_d) and now_ist.time() >= MARKET_OPEN_TIME:
            intraday = self._client.get_intraday_candles(inst.instrument_key, unit, iv_num)

        return parse_upstox_candles_to_df(historical, intraday, is_intraday=(interval != "1d"))

    def _fetch_single_ohlcv(
        self,
        symbol: str,
        interval: str,
        period: str,
        force_refresh: bool,
        min_bars: int,
        policy: DataUsagePolicy,
        is_batch: bool = False,
    ) -> MarketDataResult:
        self.enforce_policy(policy)
        clean = resolve_nse_symbol_alias(symbol)
        adj_policy = policy.adjustment_policy
        if not is_valid_nse_symbol(clean):
            return self._unavailable_result(clean, interval, adj_policy, "UNSUPPORTED_SYMBOL", f"Invalid NSE symbol '{symbol}'.")

        key = self._cache.build_key("upstox", clean, interval, adj_policy)
        use_mem_cache = not is_batch
        with self._cache.get_key_lock(key):
            if not force_refresh:
                cached_df, meta = self._cache.get_ohlcv(
                    clean,
                    interval,
                    "upstox",
                    adj_policy,
                    allow_stale_disk=False,
                    cache_in_memory=use_mem_cache,
                    allow_closed_market_session_reuse=True,
                )
                if cached_df is not None and meta is not None:
                    res = self._package_validated(clean, interval, cached_df, min_bars, adj_policy, meta, meta.cache_layer)
                    if res.status in ("OK", "STALE_CACHE"):
                        return res

            if not force_refresh and (
                policy.purpose in ("HISTORICAL_BACKTEST", "EDUCATIONAL_HISTORICAL_REPLAY")
                or settings.EDUCATIONAL_REPLAY_MODE
            ):
                disk_df, disk_meta = self._cache.get_ohlcv(
                    clean,
                    interval,
                    "upstox",
                    adj_policy,
                    allow_stale_disk=True,
                    cache_in_memory=use_mem_cache,
                )
                if disk_df is not None and disk_meta is not None:
                    res = self._package_validated(clean, interval, disk_df, min_bars, adj_policy, disk_meta, disk_meta.cache_layer)
                    if disk_meta.is_ttl_expired:
                        res.provenance.is_stale = True
                        res.provenance.data_freshness = "STALE"
                        if res.status == "OK":
                            res.status = "STALE_CACHE"
                    return res

            error_detail: Optional[str] = None
            if not settings.EDUCATIONAL_REPLAY_MODE:
                now_ist = get_now_ist()
                include_today = (
                    True
                    if interval != "1d"
                    else (not is_batch or now_ist.time() >= MARKET_CLOSE_TIME)
                )
                try:
                    raw = self._download_symbol_candles(clean, interval, period, include_today, now_ist)
                    if raw is not None and not raw.empty:
                        res = self._package_validated(clean, interval, raw, min_bars, adj_policy, None, "LIVE_PROVIDER", now_ist)
                        if res.df is not None and res.quality.is_valid:
                            saved = self._cache.set_ohlcv(
                                clean, res.df, interval=interval, provider_id="upstox",
                                adjustment_policy=adj_policy,
                                last_completed_candle_ts=res.provenance.last_completed_candle_ts,
                                cache_in_memory=use_mem_cache,
                            )
                            res.provenance.fetched_at_utc = saved.fetched_at_utc
                            res.provenance.fetched_at_ist = saved.fetched_at_ist
                            return res
                        if res.status == "INSUFFICIENT_HISTORY":
                            return res
                    else:
                        error_detail = f"No Upstox instrument mapping or {interval} candles returned for '{clean}'."
                except (ProviderNotConfiguredError, UpstoxAuthError) as exc:
                    error_detail = str(exc)
                    if not policy.allow_stale_cache_fallback:
                        raise
                except Exception as exc:
                    error_detail = str(exc)
                    logger.warning("Upstox fetch failed for %s (%s): %s", clean, interval, exc)

            if policy.allow_stale_cache_fallback:
                stale_df, stale_meta = self._cache.get_ohlcv(clean, interval, "upstox", adj_policy, allow_stale_disk=True)
                if stale_df is not None and stale_meta is not None:
                    res = self._package_validated(clean, interval, stale_df, min_bars, adj_policy, stale_meta, "DISK_CACHE_STALE")
                    res.provenance.is_stale = True
                    res.provenance.data_freshness = "STALE"
                    if res.status == "OK":
                        res.status = "STALE_CACHE"
                    return res

            return self._unavailable_result(
                clean, interval, adj_policy, "PROVIDER_UNAVAILABLE",
                error_detail or f"Upstox provider unavailable and no valid Upstox cached data exists for {clean}.",
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
        return self._fetch_single_ohlcv(symbol, "1d", period, force_refresh, min_bars, active_policy, is_batch=False)

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
        return self._fetch_single_ohlcv(symbol, interval, period, force_refresh, min_bars, active_policy, is_batch=False)

    def _fetch_batch(
        self,
        symbols: List[str],
        interval: str,
        period: str,
        force_refresh: bool,
        min_bars: int,
        policy: DataUsagePolicy,
    ) -> Dict[str, MarketDataResult]:
        self.enforce_policy(policy)
        adj_policy = policy.adjustment_policy
        results: Dict[str, MarketDataResult] = {}
        to_fetch: List[str] = []

        for raw_sym in symbols:
            clean = resolve_nse_symbol_alias(raw_sym)
            if not is_valid_nse_symbol(clean):
                results[clean] = self._unavailable_result(clean, interval, adj_policy, "UNSUPPORTED_SYMBOL", f"Invalid NSE symbol '{raw_sym}'.")
                continue
            if not force_refresh:
                cached_df, meta = self._cache.get_ohlcv(
                    clean,
                    interval,
                    "upstox",
                    adj_policy,
                    allow_stale_disk=False,
                    cache_in_memory=False,
                    allow_closed_market_session_reuse=True,
                )
                if cached_df is not None and meta is not None:
                    res = self._package_validated(clean, interval, cached_df, min_bars, adj_policy, meta, meta.cache_layer)
                    if res.status in ("OK", "STALE_CACHE"):
                        results[clean] = res
                        continue
            to_fetch.append(clean)

        if not to_fetch:
            return results

        # Fail fast if Analytics Token is missing and no Upstox disk cache exists
        if not settings.EDUCATIONAL_REPLAY_MODE and not self._client.has_analytics_token():
            for sym in to_fetch:
                results[sym] = self._fetch_single_ohlcv(sym, interval, period, force_refresh, min_bars, policy, is_batch=True)
            return results

        workers = max(1, min(int(settings.UPSTOX_MAX_CONCURRENCY), len(to_fetch)))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            fut_map = {
                pool.submit(self._fetch_single_ohlcv, sym, interval, period, force_refresh, min_bars, policy, True): sym
                for sym in to_fetch
            }
            for fut in as_completed(fut_map):
                sym = fut_map[fut]
                try:
                    results[sym] = fut.result()
                except Exception as exc:
                    results[sym] = self._unavailable_result(sym, interval, adj_policy, "PROVIDER_UNAVAILABLE", str(exc))
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
        return self._fetch_batch(symbols, "1d", period, force_refresh, min_bars, active_policy)

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
        return self._fetch_batch(symbols, interval, period, force_refresh, min_bars, active_policy)

    def fetch_stock_info(self, symbol: str) -> Optional[StockConstituent]:
        return get_stock_info(symbol)

    @staticmethod
    def _parse_quote_timestamp_ist(raw_ts: Any, fallback_ist: str) -> str:
        if raw_ts is None or raw_ts == "":
            return fallback_ist
        try:
            num = float(raw_ts)
            if num > 1e12:
                num /= 1000.0
            if num > 1e9:
                return datetime.fromtimestamp(num, tz=timezone.utc).astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST")
        except (TypeError, ValueError, OSError):
            pass
        try:
            parsed = pd.to_datetime(raw_ts, errors="coerce")
            if pd.notna(parsed):
                if parsed.tzinfo is not None:
                    parsed = parsed.tz_convert(IST)
                else:
                    parsed = IST.localize(parsed.to_pydatetime())
                return parsed.strftime("%Y-%m-%d %H:%M:%S IST")
        except Exception:
            pass
        return fallback_ist

    def fetch_live_quotes(
        self,
        symbols: List[str],
        timeout_seconds: float = 2.0,
    ) -> Dict[str, LiveQuote]:
        """
        Fetch batched Upstox live quotes for the requested symbols with a 60s in-memory TTL cache
        and strict overall timeout budget (<= timeout_seconds). Never raises; returns {} or partial
        quotes on failure/timeout so scanner latency is never impacted.
        """
        if not symbols or settings.EDUCATIONAL_REPLAY_MODE or not self._client.has_analytics_token():
            return {}

        # Deduplicate while preserving requested canonical symbol mapping
        norm_pairs: List[Tuple[str, str]] = []
        seen_clean = set()
        for raw_sym in symbols:
            clean = resolve_nse_symbol_alias(raw_sym)
            if clean in seen_clean:
                continue
            seen_clean.add(clean)
            norm_pairs.append((raw_sym, clean))

        quotes: Dict[str, LiveQuote] = {}
        uncached_clean: List[str] = []
        with self._quote_lock:
            for raw_sym, clean in norm_pairs:
                cached = self._quote_cache.get(clean)
                if cached is not None:
                    quotes[clean] = cached
                    if raw_sym != clean:
                        quotes[raw_sym] = cached
                else:
                    uncached_clean.append(clean)

        if not uncached_clean:
            return quotes

        # Resolve strictly from local bundled NIFTY 500 ISIN map (0 network calls)
        key_to_clean: Dict[str, str] = {}
        clean_set = set(uncached_clean)
        ordered_keys: List[str] = []
        for clean in uncached_clean:
            inst = self._resolver.resolve(clean, allow_remote=False)
            if inst is not None:
                key_to_clean[inst.instrument_key] = clean
                ordered_keys.append(inst.instrument_key)

        if not ordered_keys:
            return quotes

        chunk_size = 50
        deadline = time.monotonic() + max(0.15, float(timeout_seconds))
        fallback_ist = get_now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
        raw_by_clean = {clean: raw for raw, clean in norm_pairs}

        for i in range(0, len(ordered_keys), chunk_size):
            remaining = deadline - time.monotonic()
            if remaining <= 0.05:
                logger.debug("Upstox live quote enrichment hit %.2fs timeout cap; returning partial quotes.", timeout_seconds)
                break
            chunk_keys = ordered_keys[i : i + chunk_size]
            try:
                payload = self._client.get_full_quotes(
                    chunk_keys,
                    timeout_seconds=remaining,
                    max_attempts=1,
                )
            except Exception as exc:
                logger.debug("Upstox batched live quotes unavailable (silent fallback): %s", exc)
                break

            if not isinstance(payload, dict):
                continue

            for resp_key, entry in payload.items():
                if not isinstance(entry, dict):
                    continue
                token_key = str(entry.get("instrument_token") or "").strip()
                matched_clean = key_to_clean.get(token_key) or key_to_clean.get(str(resp_key).strip())
                if matched_clean is None:
                    raw_sym_candidate = str(entry.get("symbol") or "").strip()
                    if not raw_sym_candidate and ":" in str(resp_key):
                        raw_sym_candidate = str(resp_key).split(":", 1)[1].strip()
                    if raw_sym_candidate:
                        cand_clean = resolve_nse_symbol_alias(raw_sym_candidate)
                        if cand_clean in clean_set:
                            matched_clean = cand_clean
                if matched_clean is None:
                    continue

                raw_lp = entry.get("last_price")
                try:
                    lp = float(raw_lp)
                except (TypeError, ValueError):
                    continue
                if lp <= 0:
                    continue

                ts_ist = self._parse_quote_timestamp_ist(
                    entry.get("last_trade_time") or entry.get("timestamp"),
                    fallback_ist,
                )
                lq = LiveQuote(price=round(lp, 2), timestamp_ist=ts_ist)
                with self._quote_lock:
                    self._quote_cache[matched_clean] = lq
                quotes[matched_clean] = lq
                orig_raw = raw_by_clean.get(matched_clean)
                if orig_raw and orig_raw != matched_clean:
                    quotes[orig_raw] = lq

        return quotes

    def fetch_financials_result(self, symbol: str, force_refresh: bool = False) -> FinancialsResult:
        return fetch_upstox_financials(symbol, self._client, self._resolver, self._cache, force_refresh)
