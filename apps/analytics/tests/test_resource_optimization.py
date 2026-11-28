"""Regression tests for memory, caching, lazy loading, and scanner resource optimizations."""

from datetime import datetime
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.api.auth import SlidingWindowRateLimiter
from app.config import settings
from app.data import cache as cache_mod
from app.data.cache import MarketDataCache, _is_closed_market_session_fresh
from app.data.nse_calendar import IST, get_market_status
from app.data.providers.base import MarketDataResult
from app.engine import artifact_store, indicators, intraday_signals as isig, scanner as sc
from app.main import app
from app.models.common import DataQualitySummary, MarketDataProvenance


def _make_daily_df(end_date: str = "2026-11-20", periods: int = 90, seed: int = 1) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range(end=end_date, periods=periods)
    close = np.linspace(1000.0, 1450.0, periods) + rng.normal(0, 4.0, periods)
    open_ = close - 4.0
    high = np.maximum(open_, close) + 6.0
    low = np.minimum(open_, close) - 4.0
    vol = np.full(periods, 1_200_000, dtype=np.int64)
    open_[-1] = close[-2] + 2.0
    close[-1] = close[-2] + 28.0
    high[-1] = close[-1] + 4.0
    low[-1] = open_[-1] - 2.0
    vol[-1] = 2_800_000
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates,
    )


def _make_intraday_df() -> pd.DataFrame:
    prior = pd.date_range("2026-11-20 09:15", periods=20, freq="15min")
    today = pd.date_range("2026-11-23 09:15", periods=22, freq="15min")
    idx = prior.append(today)
    n = len(idx)
    close = np.linspace(995.0, 1020.0, n)
    open_ = close - 1.0
    high = close + 2.0
    low = open_ - 2.0
    vol = np.full(n, 60_000, dtype=np.int64)
    open_[24] = close[23] + 0.5
    close[24] = close[23] + 18.0
    high[24] = close[24] + 2.0
    low[24] = open_[24] - 1.0
    vol[24] = 350_000
    close[25:] = close[24] + np.linspace(2.0, 20.0, n - 25)
    high[25:] = close[25:] + 3.0
    low[25:] = close[25:] - 2.0
    open_[25:] = close[25:] - 1.0
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=idx,
    )


def test_lazy_provider_registry_skips_yfinance_under_upstox():
    analytics_root = str(Path(__file__).resolve().parents[1])
    code = (
        "import sys; "
        "import app.main; "
        "from app.data.providers.registry import get_provider; "
        "p = get_provider('upstox'); "
        "loaded = [m for m in ('yfinance', 'curl_cffi', 'bs4', 'requests') if m in sys.modules]; "
        "assert not loaded, f'Unexpected eager imports: {loaded}'; "
        "assert p.capabilities.provider_id == 'upstox'; "
        "yf = get_provider('yfinance'); "
        "assert yf.capabilities.provider_id == 'yfinance'"
    )
    env = {**os.environ, "MARKET_DATA_PROVIDER": "upstox", "PYTHONPATH": analytics_root}
    proc = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env=env, timeout=30)
    assert proc.returncode == 0, f"Subprocess failed:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}"


def test_closed_market_session_complete_cache_reuse(tmp_path, monkeypatch):
    sat_ist = IST.localize(datetime(2026, 11, 21, 10, 0, 0))
    after_close_epoch = IST.localize(datetime(2026, 11, 20, 16, 0, 0)).timestamp()
    mid_session_epoch = IST.localize(datetime(2026, 11, 20, 11, 0, 0)).timestamp()

    assert _is_closed_market_session_fresh(after_close_epoch, "2026-11-20 15:15:00", now_ist=sat_ist) is True
    assert _is_closed_market_session_fresh(mid_session_epoch, "2026-11-20 15:15:00", now_ist=sat_ist) is False

    # End-to-end MarketDataCache check with expired 240s intraday TTL on Saturday
    cache = MarketDataCache(cache_dir=str(tmp_path))
    idx = pd.date_range("2026-11-20 09:15", periods=25, freq="15min")
    df = pd.DataFrame(
        {"Open": 100.0, "High": 102.0, "Low": 99.0, "Close": 101.0, "Volume": 50_000},
        index=idx,
    )
    cache.set_ohlcv(
        "RELIANCE",
        df,
        interval="15m",
        provider_id="upstox",
        adjustment_policy="SPLIT_ADJUSTED_ONLY",
        last_completed_candle_ts="2026-11-20 15:15:00",
        cache_in_memory=False,
    )
    _, meta_path, _ = cache._paths_for("upstox", "RELIANCE", "15m", "SPLIT_ADJUSTED_ONLY")
    sidecar = json.loads(meta_path.read_text(encoding="utf-8"))
    sidecar["fetched_at_epoch"] = after_close_epoch
    meta_path.write_text(json.dumps(sidecar), encoding="utf-8")

    monkeypatch.setattr(cache_mod, "get_market_status", lambda now=None: get_market_status(sat_ist))
    monkeypatch.setattr(cache_mod.time, "time", lambda: sat_ist.timestamp())

    hit, meta = cache.get_ohlcv(
        "RELIANCE",
        interval="15m",
        provider_id="upstox",
        adjustment_policy="SPLIT_ADJUSTED_ONLY",
        cache_in_memory=False,
        allow_closed_market_session_reuse=True,
    )
    assert hit is not None and len(hit) == 25
    assert meta is not None and meta.cache_layer == "DISK_CACHE_FRESH"

    miss, _ = cache.get_ohlcv(
        "RELIANCE",
        interval="15m",
        provider_id="upstox",
        adjustment_policy="SPLIT_ADJUSTED_ONLY",
        cache_in_memory=False,
        allow_closed_market_session_reuse=False,
    )
    assert miss is None


def test_cache_memory_bounds_and_prune_expired(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "CACHE_MEM_DAILY_MAXSIZE", 3)
    cache = MarketDataCache(cache_dir=str(tmp_path))
    df = _make_daily_df(periods=40)
    for i in range(6):
        cache.set_ohlcv(f"SYM{i}", df, interval="1d", provider_id="upstox", cache_in_memory=True)
    assert len(cache._mem_daily) <= 3

    cache.set_ohlcv("DISKONLY", df, interval="1d", provider_id="upstox", cache_in_memory=False)
    assert all("DISKONLY" not in k for k in cache._mem_daily.keys())
    stats = cache.stats()
    assert stats["daily_entries"] <= 3
    assert isinstance(cache.prune_expired(), dict)


def test_sliding_window_rate_limiter_bounds_and_pruning():
    limiter = SlidingWindowRateLimiter(max_keys=100)
    for i in range(130):
        assert limiter.check(f"ip-{i}", max_requests=5, window_seconds=0.1) is True
    assert len(limiter._hits) <= 101
    time.sleep(0.15)
    removed = limiter.prune_expired(window_seconds=0.1)
    assert removed >= 1
    assert len(limiter._hits) == 0


def test_chunked_swing_scanner_matches_full_batch_parity(monkeypatch):
    symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"]
    data_map = {sym: _make_daily_df(seed=idx + 1) for idx, sym in enumerate(symbols)}

    class FakeConstituent:
        def __init__(self, symbol: str):
            self.symbol = symbol
            self.name = f"{symbol} Ltd"
            self.sector = "IT" if symbol in ("TCS", "INFY") else "Financials"
            self.tier = "NIFTY_50"

    fake_universe = [FakeConstituent(s) for s in symbols]
    chunk_sizes: list[int] = []

    def fake_fetch_batch_daily(
        symbols,
        period: str = "1y",
        force_refresh: bool = False,
        min_bars: int = 30,
        policy=None,
    ):
        chunk_sizes.append(len(symbols))
        out = {}
        for symbol in symbols:
            df = data_map[symbol]
            prov = MarketDataProvenance(
                provider_id="mock",
                provider_display_name="Mock Provider",
                price_adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
                fetched_at_ist="2026-11-20 16:00:00 IST",
                last_completed_candle_ts="2026-11-20 15:30:00",
                data_freshness="FRESH",
                is_stale=False,
                cache_layer="DISK_CACHE_FRESH",
            )
            qual = DataQualitySummary(
                is_valid=True, total_rows_raw=len(df), completed_rows_usable=len(df)
            )
            out[symbol] = MarketDataResult(
                symbol=symbol,
                interval="1d",
                status="OK",
                df=df.copy(),
                partial_candle=None,
                provenance=prov,
                quality=qual,
            )
        return out

    monkeypatch.setattr(sc, "load_nifty500_universe", lambda: fake_universe)
    monkeypatch.setattr(sc.data_provider, "fetch_batch_daily_ohlcv_results", fake_fetch_batch_daily)
    monkeypatch.setattr(sc.data_provider, "fetch_live_quotes", lambda syms: {})
    monkeypatch.setattr(sc, "get_market_status", lambda now=None: get_market_status(IST.localize(datetime(2026, 11, 21, 10, 0, 0))))

    monkeypatch.setattr(settings, "SCANNER_BATCH_SIZE", 2)
    monkeypatch.setattr(settings, "SCANNER_MAX_WORKERS", 2)
    chunked = sc.run_swing_scanner(universe_limit=6, force_refresh=True)
    assert chunk_sizes == [2, 2, 2]

    monkeypatch.setattr(settings, "SCANNER_BATCH_SIZE", 50)
    full = sc.run_swing_scanner(universe_limit=6, force_refresh=True)

    assert chunked.total_scanned == full.total_scanned == 6
    assert chunked.scan_coverage.coverage_pct == full.scan_coverage.coverage_pct == 100.0
    assert chunked.scan_coverage.is_partial_coverage is False
    assert len(chunked.signals) == 6
    assert sorted((s.symbol, s.technical_setup_score, s.primary_strategy) for s in chunked.signals) == sorted(
        (s.symbol, s.technical_setup_score, s.primary_strategy) for s in full.signals
    )


def test_atr_fmax_and_intraday_precomputed_masks_parity():
    df_daily = _make_daily_df(periods=120, seed=7)
    ind = indicators.compute_indicators(df_daily)
    prev_close = df_daily["Close"].shift(1)
    expected_tr = pd.concat(
        [
            df_daily["High"] - df_daily["Low"],
            (df_daily["High"] - prev_close).abs(),
            (df_daily["Low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    expected_atr = expected_tr.ewm(alpha=1.0 / 14.0, min_periods=10, adjust=False).mean()
    np.testing.assert_allclose(ind["ATR_14"].to_numpy(), expected_atr.to_numpy(), equal_nan=True, rtol=1e-12)

    df_intra = _make_intraday_df()
    fast = isig.evaluate_intraday_session_signals("RELIANCE", df_intra, is_market_live=False)

    orig_eval = isig.evaluate_intraday_strategies_at_index
    try:
        isig.evaluate_intraday_strategies_at_index = lambda d, i: orig_eval(d, i)
        slow = isig.evaluate_intraday_session_signals("RELIANCE", df_intra, is_market_live=False)
    finally:
        isig.evaluate_intraday_strategies_at_index = orig_eval

    assert [(s.strategy_name, s.entry_time, s.entry_price, s.status) for s in fast] == [
        (s.strategy_name, s.entry_time, s.entry_price, s.status) for s in slow
    ]


def test_artifact_store_mtime_cache_invalidates_on_change(tmp_path, monkeypatch):
    temp_cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(artifact_store, "market_cache", temp_cache)
    artifact_store._report_cache_key = None

    load_calls = 0
    orig_load = temp_cache.load_json_artifact

    def counting_load(name: str):
        nonlocal load_calls
        load_calls += 1
        return orig_load(name)

    monkeypatch.setattr(temp_cache, "load_json_artifact", counting_load)

    target = temp_cache.artifacts_dir / "backtest_report_upstox.json"
    target.write_text(json.dumps({"invalid": 1}), encoding="utf-8")

    _, r1 = artifact_store.get_validated_backtest_report(active_provider_id="upstox")
    _, r2 = artifact_store.get_validated_backtest_report(active_provider_id="upstox")
    assert r1 == r2 and load_calls == 1

    # Mutate artifact file -> cache key (mtime_ns, size) invalidates and reloads
    time.sleep(0.02)
    target.write_text(json.dumps({"invalid": 2, "extra": "changed"}), encoding="utf-8")
    artifact_store.get_validated_backtest_report(active_provider_id="upstox")
    assert load_calls == 2


def test_health_endpoint_includes_memory_metrics():
    client = TestClient(app)
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "memory" in body and "rss_mb" in body["memory"]
    assert "cache_memory_entries" in body
    assert "daily_entries" in body["cache_memory_entries"]
    assert "intraday_entries" in body["cache_memory_entries"]
