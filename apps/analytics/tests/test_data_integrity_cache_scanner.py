"""Unit tests for data quality validation, cache correctness, provider abstraction, universe, and scan coverage."""

from datetime import datetime
import os
import threading
import time
import numpy as np
import pandas as pd
import pytest

from app.data.cache import MarketDataCache
from app.data.nifty500_constituents import (
    NIFTY_50_SYMBOLS,
    NIFTY_NEXT_50_SYMBOLS,
    get_stock_info,
    get_universe_metadata,
    load_nifty500_universe,
)
from app.data.nse_calendar import IST
from app.data.providers.base import DataUsagePolicy, ProviderNotConfiguredError, ProviderPolicyViolationError
from app.data.providers.registry import get_provider
from app.data.providers.yfinance_adapter import YFinanceMarketDataProvider
from app.data.quality import validate_and_normalize_ohlcv


def test_universe_has_no_dummies_no_duplicates_and_disjoint_tiers():
    universe = load_nifty500_universe()
    syms = [c.symbol for c in universe]
    assert len(syms) == len(set(syms))
    assert "DUMMYHEG" not in syms
    assert all(not s.startswith("DUMMY") for s in syms)
    assert len(NIFTY_50_SYMBOLS & NIFTY_NEXT_50_SYMBOLS) == 0

    meta = get_universe_metadata()
    assert meta.point_in_time_history_available is False
    assert "survivorship" in meta.survivorship_bias_disclosure.lower()

    # Reject malformed ticker paths (previously bypassed by `or "-" in clean`)
    assert get_stock_info("---") is None
    assert get_stock_info("../etc/passwd") is None
    assert get_stock_info("DUMMYHEG") is None
    assert get_stock_info("RELIANCE") is not None


def test_data_quality_filters_invalid_ohlc_dups_neg_vol_and_excludes_partial_candle():
    # Include duplicate timestamp, invalid High < Close, negative volume, NaN, and today's in-progress candle
    dates = pd.DatetimeIndex([
        "2026-11-02", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09"
    ])
    raw = pd.DataFrame(
        {
            "Open": [100.0, 100.0, 101.0, 102.0, np.nan, 104.0, 105.0],
            "High": [105.0, 105.0, 99.0, 106.0, 107.0, 108.0, 109.0],   # Nov 3 invalid: High 99 < Open 101
            "Low": [98.0, 98.0, 97.0, 100.0, 101.0, 103.0, 104.0],
            "Close": [102.0, 102.0, 103.0, 104.0, 105.0, 106.0, 107.0],
            "Volume": [1000, 1000, 1000, -50, 1000, 1000, 1000],         # Nov 4 negative volume
        },
        index=dates,
    )
    # Current time is Monday Nov 9 at 11:00 IST -> Nov 9 daily candle is IN-PROGRESS (partial)!
    now_live = IST.localize(datetime(2026, 11, 9, 11, 0, 0))
    res = validate_and_normalize_ohlcv(raw, interval="1d", min_bars=2, now_ist=now_live, exclude_partial_candle=True)

    assert res.quality.duplicate_timestamps_removed == 1
    assert res.quality.invalid_ohlc_rows_removed == 1
    assert res.quality.negative_volume_rows_removed == 1
    assert res.quality.partial_candle_excluded is True
    assert res.partial_candle is not None
    assert res.df_completed is not None
    # Valid completed rows: Nov 2 and Nov 6 (Nov 9 excluded as partial)
    assert len(res.df_completed) == 2
    assert str(res.df_completed.index[-1])[:10] == "2026-11-06"
    assert res.is_stale is False  # Last completed trading day on Mon 11:00 AM is Fri Nov 6


def test_cache_keys_ttl_stale_non_promotion_and_invalidation(tmp_path):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    dates = pd.bdate_range("2026-01-01", periods=35)
    df = pd.DataFrame(
        {"Open": 100.0, "High": 102.0, "Low": 99.0, "Close": 101.0, "Volume": 100_000},
        index=dates,
    )

    # Adjustment-policy and provider isolation
    cache.set_ohlcv("RELIANCE", df, interval="1d", provider_id="yfinance", adjustment_policy="SPLIT_AND_DIVIDEND_ADJUSTED")
    df_raw, _ = cache.get_ohlcv("RELIANCE", interval="1d", provider_id="yfinance", adjustment_policy="UNADJUSTED_RAW")
    assert df_raw is None  # Must NOT mix adjusted and unadjusted series!

    # Force disk entry to be expired/stale by modifying sidecar + clearing memory
    cache._mem_daily.clear()
    _, meta_path, _ = cache._paths_for("yfinance", "RELIANCE", "1d", "SPLIT_AND_DIVIDEND_ADJUSTED")
    import json
    m = json.loads(meta_path.read_text())
    m["fetched_at_epoch"] = time.time() - 999_999
    meta_path.write_text(json.dumps(m))

    # Strict TTL check rejects expired disk file when allow_stale_disk=False
    df_fresh, meta_fresh = cache.get_ohlcv("RELIANCE", interval="1d", allow_stale_disk=False)
    assert df_fresh is None and meta_fresh is None

    # Explicit stale fallback returns DISK_CACHE_STALE and MUST NOT promote to fresh memory cache
    df_stale, meta_stale = cache.get_ohlcv("RELIANCE", interval="1d", allow_stale_disk=True)
    assert df_stale is not None and meta_stale is not None
    assert meta_stale.cache_layer == "DISK_CACHE_STALE"
    assert meta_stale.is_ttl_expired is True
    assert len(cache._mem_daily) == 0  # Stale disk was NOT promoted to fresh memory!

    cache.invalidate_symbol("RELIANCE", interval="1d")
    df_after, _ = cache.get_ohlcv("RELIANCE", interval="1d", allow_stale_disk=True)
    assert df_after is None


def test_provider_abstraction_policy_and_licensed_stubs(monkeypatch):
    from app.config import settings

    yf_prov = get_provider("yfinance")
    # Default testing override active
    assert yf_prov.capabilities.production_approved is True
    assert yf_prov.capabilities.is_realtime is True
    assert yf_prov.capabilities.estimated_delay_minutes == 0

    # When override is disabled, strict production policy blocks yfinance
    monkeypatch.setattr(settings, "PROVIDER_PRODUCTION_APPROVED_OVERRIDE", False)
    monkeypatch.setattr(settings, "PROVIDER_IS_REALTIME_OVERRIDE", False)
    monkeypatch.setattr(settings, "PROVIDER_ESTIMATED_DELAY_MINUTES", 15)
    assert yf_prov.capabilities.is_realtime is False
    assert yf_prov.capabilities.production_approved is False

    strict_policy = DataUsagePolicy(
        purpose="CURRENT_MARKET_SCREENING",
        require_production_approved_provider=True,
    )
    with pytest.raises(ProviderPolicyViolationError):
        yf_prov.enforce_policy(strict_policy)

    for licensed_id in ("angel_one", "fyers", "truedata", "kite"):
        stub = get_provider(licensed_id)
        with pytest.raises(ProviderNotConfiguredError):
            stub.fetch_daily_ohlcv_result("RELIANCE")

    upstox_prov = get_provider("upstox")
    assert upstox_prov.capabilities.provider_id == "upstox"
    assert upstox_prov.capabilities.production_approved is False
    with pytest.raises(ProviderPolicyViolationError):
        upstox_prov.fetch_daily_ohlcv_result("RELIANCE")


def test_scanner_coverage_reporting_and_duplicate_scan_serialization(tmp_path, monkeypatch):
    from app.engine import scanner as sc
    from app.data.providers.base import MarketDataResult
    from app.models.common import DataQualitySummary, MarketDataProvenance
    monkeypatch.setattr(sc, "market_cache", MarketDataCache(cache_dir=str(tmp_path)))

    dates = pd.bdate_range("2025-01-01", periods=100)
    ok_df = pd.DataFrame(
        {
            "Open": np.linspace(100, 150, 100),
            "High": np.linspace(102, 153, 100),
            "Low": np.linspace(98, 148, 100),
            "Close": np.linspace(101, 152, 100),
            "Volume": np.full(100, 1_000_000, dtype=np.int64),
        },
        index=dates,
    )

    overlap_detected = False
    active_calls = 0
    guard = threading.Lock()

    def _fake_batch(symbols, period="2y", force_refresh=False, min_bars=50, policy=None):
        nonlocal overlap_detected, active_calls
        with guard:
            active_calls += 1
            if active_calls > 1:
                overlap_detected = True
        time.sleep(0.05)
        with guard:
            active_calls -= 1

        out = {}
        for i, sym in enumerate(symbols):
            if i == 0:
                out[sym] = MarketDataResult(
                    symbol=sym,
                    interval="1d",
                    status="PROVIDER_UNAVAILABLE",
                    df=None,
                    partial_candle=None,
                    provenance=MarketDataProvenance(
                        provider_id="mock", provider_display_name="Mock", data_freshness="UNAVAILABLE", is_stale=True
                    ),
                    quality=DataQualitySummary(is_valid=False, total_rows_raw=0, completed_rows_usable=0),
                )
            else:
                out[sym] = MarketDataResult(
                    symbol=sym,
                    interval="1d",
                    status="STALE_CACHE" if i == 1 else "OK",
                    df=ok_df,
                    partial_candle=None,
                    provenance=MarketDataProvenance(
                        provider_id="mock",
                        provider_display_name="Mock",
                        data_freshness="STALE" if i == 1 else "DELAYED",
                        is_stale=(i == 1),
                        cache_layer="DISK_CACHE_STALE" if i == 1 else "LIVE_PROVIDER",
                    ),
                    quality=DataQualitySummary(is_valid=True, total_rows_raw=100, completed_rows_usable=100),
                )
        return out

    monkeypatch.setattr(sc.data_provider, "fetch_batch_daily_ohlcv_results", _fake_batch)

    results = []
    threads = [
        threading.Thread(target=lambda: results.append(sc.run_swing_scanner(universe_limit=5, min_score=0.0, result_limit=2)))
        for _ in range(2)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert overlap_detected is False  # Single-flight lock serialized concurrent scans
    assert len(results) == 2
    cov = results[0].scan_coverage
    assert cov.requested_universe_size == 5
    assert cov.stocks_attempted == 5
    assert cov.stocks_failed == 1
    assert cov.stocks_analyzed == 4
    assert cov.stocks_using_stale_data == 1
    assert cov.applied_result_limit == 2
    assert cov.returned_signals_count <= 2
    assert cov.is_partial_coverage is True
