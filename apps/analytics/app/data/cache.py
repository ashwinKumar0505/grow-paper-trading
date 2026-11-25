"""Provider-, Symbol-, Interval-, and Adjustment-Aware Two-Tier Cache with Sidecar Metadata."""

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import threading
import time
from typing import Any, Dict, Optional, Tuple
import pandas as pd
from cachetools import TTLCache

from app.config import settings
from app.data.nse_calendar import IST


class TokenBucketRateLimiter:
    """Thread-safe token-bucket rate limiter for upstream market-data provider requests."""

    def __init__(self, rate_per_sec: float = 8.0, capacity: float = 16.0):
        self.rate = max(0.5, float(rate_per_sec))
        self.capacity = max(1.0, float(capacity))
        self.tokens = self.capacity
        self.last_refill = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, tokens: float = 1.0, timeout: Optional[float] = None) -> bool:
        deadline = (time.monotonic() + timeout) if timeout is not None else None
        while True:
            with self._lock:
                now = time.monotonic()
                elapsed = now - self.last_refill
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_refill = now
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True
                wait_time = (tokens - self.tokens) / self.rate
            if deadline is not None and time.monotonic() >= deadline:
                return False
            time.sleep(min(wait_time, 0.25))


@dataclass
class CacheEntryMeta:
    """Metadata describing a cached OHLCV entry and its freshness."""

    provider_id: str
    symbol: str
    interval: str
    adjustment_policy: str
    fetched_at_epoch: float
    fetched_at_utc: str
    fetched_at_ist: str
    last_completed_candle_ts: Optional[str]
    cache_layer: str  # MEMORY_CACHE | DISK_CACHE_FRESH | DISK_CACHE_STALE
    is_ttl_expired: bool


def _atomic_write_text(target_path: Path, text: str) -> None:
    """Write text atomically via temporary file rename to prevent partial/corrupted files."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(target_path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp_name, target_path)
    except Exception:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise


def _epoch_to_iso(epoch: float) -> Tuple[str, str]:
    dt_utc = datetime.fromtimestamp(epoch, tz=timezone.utc)
    dt_ist = dt_utc.astimezone(IST)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ"), dt_ist.strftime("%Y-%m-%d %H:%M:%S IST")


class MarketDataCache:
    """
    Two-tier (in-memory TTL + atomic disk CSV + JSON metadata sidecar) market-data cache.

    Key invariants:
    - Cache keys incorporate provider_id, symbol, interval, and adjustment_policy.
    - Stale disk entries are NEVER promoted into the fresh in-memory TTL cache.
    - Per-key locks prevent concurrent thundering-herd writes and torn reads.
    """

    def __init__(self, cache_dir: Optional[str] = None):
        base = Path(cache_dir or settings.CACHE_DIR)
        self.base_dir = base
        self.daily_dir = base / "raw_ohlcv" / "daily"
        self.intraday_dir = base / "raw_ohlcv" / "intraday"
        self.meta_dir = base / "raw_ohlcv" / "meta"
        self.artifacts_dir = base / "artifacts"
        for d in (self.daily_dir, self.intraday_dir, self.meta_dir, self.artifacts_dir):
            d.mkdir(parents=True, exist_ok=True)

        self._mem_daily: TTLCache = TTLCache(maxsize=600, ttl=settings.DAILY_DATA_TTL_SECONDS)
        self._mem_intraday: TTLCache = TTLCache(maxsize=600, ttl=settings.INTRADAY_DATA_TTL_SECONDS)
        self._lock = threading.Lock()
        self._key_locks: Dict[str, threading.Lock] = {}

    def get_key_lock(self, key: str) -> threading.Lock:
        """Return a dedicated mutex for single-flight protection on a specific cache key."""
        with self._lock:
            if key not in self._key_locks:
                self._key_locks[key] = threading.Lock()
            return self._key_locks[key]

    @staticmethod
    def build_key(
        provider_id: str,
        symbol: str,
        interval: str,
        adjustment_policy: str,
    ) -> str:
        clean = symbol.strip().upper().replace(".NS", "")
        return f"{provider_id.lower()}::{clean}::{interval}::{adjustment_policy}"

    def _paths_for(
        self,
        provider_id: str,
        symbol: str,
        interval: str,
        adjustment_policy: str,
    ) -> Tuple[Path, Path, Optional[Path]]:
        """Return (csv_path, meta_path, legacy_csv_path)."""
        clean = symbol.strip().upper().replace(".NS", "")
        if adjustment_policy == "SPLIT_AND_DIVIDEND_ADJUSTED":
            safe_adj = "adj"
        elif adjustment_policy == "SPLIT_ADJUSTED_ONLY":
            safe_adj = "split_adj"
        else:
            safe_adj = "raw"
        prov = provider_id.lower()

        if interval == "1d":
            legacy_path = self.daily_dir / f"{clean}.csv"
            if prov == "yfinance" and safe_adj == "adj":
                csv_path = legacy_path
            else:
                csv_path = self.daily_dir / f"{prov}_{clean}_{safe_adj}.csv"
            meta_path = self.meta_dir / f"{prov}_{clean}_1d_{safe_adj}.meta.json"
            return csv_path, meta_path, (legacy_path if prov == "yfinance" and safe_adj == "adj" else None)

        legacy_path = self.intraday_dir / f"{clean}_{interval}.csv"
        if prov == "yfinance" and safe_adj == "adj":
            csv_path = legacy_path
        else:
            csv_path = self.intraday_dir / f"{prov}_{clean}_{interval}_{safe_adj}.csv"
        meta_path = self.meta_dir / f"{prov}_{clean}_{interval}_{safe_adj}.meta.json"
        return csv_path, meta_path, (legacy_path if prov == "yfinance" and safe_adj == "adj" else None)

    def _ttl_for(self, interval: str) -> int:
        return settings.DAILY_DATA_TTL_SECONDS if interval == "1d" else settings.INTRADAY_DATA_TTL_SECONDS

    def _mem_store_for(self, interval: str) -> TTLCache:
        return self._mem_daily if interval == "1d" else self._mem_intraday

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        provider_id: str = "yfinance",
        adjustment_policy: str = "SPLIT_AND_DIVIDEND_ADJUSTED",
        allow_stale_disk: bool = False,
    ) -> Tuple[Optional[pd.DataFrame], Optional[CacheEntryMeta]]:
        """
        Retrieve cached OHLCV DataFrame and metadata.
        Fresh entries are returned from memory or fresh disk; stale disk entries are returned
        ONLY when `allow_stale_disk=True` and are never promoted to fresh memory cache.
        """
        key = self.build_key(provider_id, symbol, interval, adjustment_policy)
        mem = self._mem_store_for(interval)
        ttl = self._ttl_for(interval)

        with self._lock:
            entry = mem.get(key)
            if entry is not None:
                df_mem, meta_mem = entry
                if (time.time() - meta_mem.fetched_at_epoch) <= ttl:
                    return df_mem.copy(), CacheEntryMeta(
                        **{**meta_mem.__dict__, "cache_layer": "MEMORY_CACHE", "is_ttl_expired": False}
                    )

        csv_path, meta_path, legacy_path = self._paths_for(
            provider_id, symbol, interval, adjustment_policy
        )
        target_csv = csv_path if csv_path.exists() else (legacy_path if legacy_path and legacy_path.exists() else None)
        if target_csv is None:
            return None, None

        # Read metadata sidecar if present, else infer from file mtime (legacy cache files)
        meta_dict: Dict[str, Any] = {}
        if meta_path.exists():
            try:
                meta_dict = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                meta_dict = {}

        fetched_epoch = float(meta_dict.get("fetched_at_epoch") or target_csv.stat().st_mtime)
        # Verify adjustment policy & provider match if sidecar exists
        if meta_dict:
            if (
                meta_dict.get("provider_id") != provider_id.lower()
                or meta_dict.get("adjustment_policy") != adjustment_policy
                or meta_dict.get("interval") != interval
            ):
                return None, None

        age = time.time() - fetched_epoch
        is_expired = age > ttl
        if is_expired and not allow_stale_disk:
            return None, None

        try:
            df = pd.read_csv(target_csv, index_col=0, parse_dates=True)
        except Exception:
            return None, None
        if df.empty:
            return None, None

        utc_iso, ist_iso = _epoch_to_iso(fetched_epoch)
        last_ts = meta_dict.get("last_completed_candle_ts")
        if last_ts is None and len(df.index) > 0:
            last_ts = str(df.index[-1])[:19]

        layer = "DISK_CACHE_STALE" if is_expired else "DISK_CACHE_FRESH"
        meta = CacheEntryMeta(
            provider_id=provider_id.lower(),
            symbol=symbol.strip().upper().replace(".NS", ""),
            interval=interval,
            adjustment_policy=adjustment_policy,
            fetched_at_epoch=fetched_epoch,
            fetched_at_utc=utc_iso,
            fetched_at_ist=ist_iso,
            last_completed_candle_ts=last_ts,
            cache_layer=layer,
            is_ttl_expired=is_expired,
        )

        # CRITICAL: Only cache in memory if fresh (never promote stale disk files to fresh memory)
        if not is_expired:
            with self._lock:
                mem[key] = (df.copy(), meta)

        return df.copy(), meta

    def set_ohlcv(
        self,
        symbol: str,
        df: pd.DataFrame,
        interval: str = "1d",
        provider_id: str = "yfinance",
        adjustment_policy: str = "SPLIT_AND_DIVIDEND_ADJUSTED",
        last_completed_candle_ts: Optional[str] = None,
    ) -> CacheEntryMeta:
        """Persist validated OHLCV DataFrame atomically to memory and disk with sidecar metadata."""
        clean = symbol.strip().upper().replace(".NS", "")
        key = self.build_key(provider_id, clean, interval, adjustment_policy)
        fetched_epoch = time.time()
        utc_iso, ist_iso = _epoch_to_iso(fetched_epoch)
        last_ts = last_completed_candle_ts or (str(df.index[-1])[:19] if len(df.index) > 0 else None)

        meta = CacheEntryMeta(
            provider_id=provider_id.lower(),
            symbol=clean,
            interval=interval,
            adjustment_policy=adjustment_policy,
            fetched_at_epoch=fetched_epoch,
            fetched_at_utc=utc_iso,
            fetched_at_ist=ist_iso,
            last_completed_candle_ts=last_ts,
            cache_layer="MEMORY_CACHE",
            is_ttl_expired=False,
        )

        csv_path, meta_path, _ = self._paths_for(provider_id, clean, interval, adjustment_policy)
        mem = self._mem_store_for(interval)
        with self._lock:
            mem[key] = (df.copy(), meta)

        try:
            csv_text = df.to_csv()
            _atomic_write_text(csv_path, csv_text)
            meta_payload = {
                "provider_id": meta.provider_id,
                "symbol": meta.symbol,
                "interval": meta.interval,
                "adjustment_policy": meta.adjustment_policy,
                "fetched_at_epoch": meta.fetched_at_epoch,
                "fetched_at_utc": meta.fetched_at_utc,
                "fetched_at_ist": meta.fetched_at_ist,
                "last_completed_candle_ts": meta.last_completed_candle_ts,
                "row_count": len(df),
            }
            _atomic_write_text(meta_path, json.dumps(meta_payload, indent=2))
        except Exception:
            pass

        return meta

    def invalidate_symbol(
        self,
        symbol: str,
        interval: Optional[str] = None,
        provider_id: str = "yfinance",
        adjustment_policy: str = "SPLIT_AND_DIVIDEND_ADJUSTED",
    ) -> None:
        """Invalidate memory and disk cache entries for a symbol."""
        clean = symbol.strip().upper().replace(".NS", "")
        intervals = [interval] if interval else ["1d", "15m"]
        for iv in intervals:
            key = self.build_key(provider_id, clean, iv, adjustment_policy)
            mem = self._mem_store_for(iv)
            with self._lock:
                mem.pop(key, None)
            csv_path, meta_path, _ = self._paths_for(provider_id, clean, iv, adjustment_policy)
            for p in (csv_path, meta_path):
                if p.exists():
                    try:
                        p.unlink()
                    except OSError:
                        pass

    # Backward-compatible helper wrappers
    def get_daily_df(self, symbol: str, allow_stale_disk: bool = False) -> Optional[pd.DataFrame]:
        df, _ = self.get_ohlcv(
            symbol=symbol,
            interval="1d",
            provider_id=settings.MARKET_DATA_PROVIDER,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
            allow_stale_disk=allow_stale_disk,
        )
        return df

    def set_daily_df(self, symbol: str, df: pd.DataFrame) -> None:
        if df is None or df.empty:
            return
        self.set_ohlcv(
            symbol=symbol,
            df=df,
            interval="1d",
            provider_id=settings.MARKET_DATA_PROVIDER,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        )

    def get_intraday_df(self, symbol: str, allow_stale_disk: bool = False) -> Optional[pd.DataFrame]:
        df, _ = self.get_ohlcv(
            symbol=symbol,
            interval="15m",
            provider_id=settings.MARKET_DATA_PROVIDER,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
            allow_stale_disk=allow_stale_disk,
        )
        return df

    def set_intraday_df(self, symbol: str, df: pd.DataFrame) -> None:
        if df is None or df.empty:
            return
        self.set_ohlcv(
            symbol=symbol,
            df=df,
            interval="15m",
            provider_id=settings.MARKET_DATA_PROVIDER,
            adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        )

    def save_json_artifact(self, name: str, payload: Dict[str, Any]) -> Path:
        path = self.artifacts_dir / f"{name}.json"
        _atomic_write_text(path, json.dumps(payload, indent=2))
        return path

    def load_json_artifact(self, name: str) -> Optional[Dict[str, Any]]:
        path = self.artifacts_dir / f"{name}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None


rate_limiter = TokenBucketRateLimiter(rate_per_sec=settings.RATE_LIMIT_REQUESTS_PER_SECOND)
market_cache = MarketDataCache()
