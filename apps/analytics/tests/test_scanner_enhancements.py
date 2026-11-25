"""Unit tests for non-breaking Swing & Intraday scanner live clarity & actionability enhancements."""

from datetime import datetime
import time
import httpx
import numpy as np
import pandas as pd
import pytest

from app.config import settings
from app.data.cache import MarketDataCache, TokenBucketRateLimiter
from app.data.nse_calendar import IST
from app.data.providers.base import LiveQuote, MarketDataResult
from app.data.providers.upstox_adapter import UpstoxMarketDataProvider
from app.data.providers.upstox_client import UpstoxHttpClient
from app.engine import intraday_signals as isig
from app.engine import scanner as sc
from app.engine import scoring
from app.models.common import DataQualitySummary, MarketDataProvenance
from app.models.signals import IntradaySignalItem, SwingSignalItem


def _make_daily_uptrend_df(end_date: str = "2026-11-20", periods: int = 90) -> pd.DataFrame:
    """Create deterministic daily OHLCV ending on `end_date` that triggers swing setups."""
    dates = pd.bdate_range(end=end_date, periods=periods)
    close = np.linspace(1000.0, 1450.0, periods)
    open_ = close - 4.0
    high = close + 6.0
    low = open_ - 4.0
    vol = np.full(periods, 1_000_000, dtype=np.int64)
    # Strong breakout close on the final completed bar
    open_[-1] = close[-2] + 2.0
    close[-1] = close[-2] + 28.0
    high[-1] = close[-1] + 4.0
    low[-1] = open_[-1] - 2.0
    vol[-1] = 2_800_000
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates,
    )


def _make_intraday_session_df(session_bars: int = 18, base_price: float = 1000.0) -> pd.DataFrame:
    """Create 2 days of 15m bars: 20 warmup bars on prior session + `session_bars` on 2026-11-23."""
    prior_ts = pd.date_range("2026-11-20 09:15", periods=20, freq="15min")
    today_ts = pd.date_range("2026-11-23 09:15", periods=session_bars, freq="15min")
    idx = prior_ts.append(today_ts)
    n = len(idx)
    close = np.full(n, base_price, dtype=float)
    open_ = np.full(n, base_price, dtype=float)
    high = np.full(n, base_price + 2.0, dtype=float)
    low = np.full(n, base_price - 2.0, dtype=float)
    vol = np.full(n, 50_000, dtype=np.int64)
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=idx,
    )


def _make_intraday_signal_stub(
    symbol: str,
    entry_time_ist: str,
    score: float,
    is_open: bool,
) -> IntradaySignalItem:
    return IntradaySignalItem(
        id=f"{symbol}-{entry_time_ist[11:16].replace(':', '')}",
        symbol=symbol,
        name=symbol,
        sector="IT",
        strategy_id="INTRADAY_MOMENTUM_IGNITION",
        strategy_name="15m Range Breakout & Volume Ignition",
        technical_setup_score=score,
        current_price=1010.0,
        vwap=1005.0,
        entry_price=1000.0,
        entry_execution_model="NEXT_BAR_OPEN_WITH_SLIPPAGE",
        entry_time_ist=entry_time_ist,
        target_exit_price=1030.0,
        estimated_exit_time_ist="Est. 11:30 IST",
        actual_exit_price=None if is_open else 1029.0,
        actual_exit_time_ist=None if is_open else "2026-11-23 11:00 IST",
        stop_loss=985.0,
        risk_reward_ratio=2.0,
        pnl_pct=1.0 if is_open else 2.8,
        signal_status="PROJECTED_EXIT_PENDING" if is_open else "COMPLETED_TARGET_HIT",
        is_projected_exit=is_open,
        entry_freshness="FRESH" if is_open else "CLOSED",
        status_badge_text="OPEN" if is_open else "COMPLETED — TARGET HIT",
        reasoning="Test",
    )


def test_swing_signal_dates_preserve_legacy_and_skip_weekend_and_holiday():
    # Friday 2026-11-20 -> actionable Monday 2026-11-23
    df_fri = _make_daily_uptrend_df(end_date="2026-11-20")
    item_fri = scoring.evaluate_swing_candidate("RELIANCE", df_fri)
    assert item_fri is not None
    assert item_fri.last_updated_date == "2026-11-20"
    assert item_fri.signal_confirmed_date == "2026-11-20"
    assert item_fri.actionable_session_date == "2026-11-23"
    # Existing fields remain untouched for backward compatibility
    assert item_fri.suggested_buy_price == item_fri.current_price
    assert "2026-11-20" in item_fri.suggested_buy_date
    assert item_fri.live_price is None
    assert item_fri.live_entry_status is None

    # Monday 2026-11-23 -> 2026-11-24 is NSE holiday (Guru Nanak Jayanti) -> actionable 2026-11-25
    df_mon = _make_daily_uptrend_df(end_date="2026-11-23")
    item_mon = scoring.evaluate_swing_candidate("RELIANCE", df_mon)
    assert item_mon is not None
    assert item_mon.signal_confirmed_date == "2026-11-23"
    assert item_mon.actionable_session_date == "2026-11-25"


def test_swing_live_entry_status_classifications():
    # Entry=1000, Target=1100 (+10%), Stop=950 (-5%)
    assert sc._classify_live_entry_status(1005.0, 1000.0, 1100.0, 950.0) == "IN_ENTRY_ZONE"
    assert sc._classify_live_entry_status(980.0, 1000.0, 1100.0, 950.0) == "IN_ENTRY_ZONE"
    # > +3.5% above entry (1036 -> +3.6%, even though 36% of target distance)
    assert sc._classify_live_entry_status(1036.0, 1000.0, 1100.0, 950.0) == "EXTENDED"
    # > 50% of distance to target (Target=1040 -> 50% is 1020; 1021 is +2.1% < 3.5% but >50% of distance)
    assert sc._classify_live_entry_status(1021.0, 1000.0, 1040.0, 980.0) == "EXTENDED"
    # Target hit
    assert sc._classify_live_entry_status(1100.0, 1000.0, 1100.0, 950.0) == "TARGET_HIT"
    assert sc._classify_live_entry_status(1125.0, 1000.0, 1100.0, 950.0) == "TARGET_HIT"
    # Stop breached
    assert sc._classify_live_entry_status(950.0, 1000.0, 1100.0, 950.0) == "STOP_BREACHED"
    assert sc._classify_live_entry_status(920.0, 1000.0, 1100.0, 950.0) == "STOP_BREACHED"


def test_swing_live_quote_enrichment_single_batch_cache_and_closed_market(tmp_path, monkeypatch):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(sc, "market_cache", cache)
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "live-quote-test-token")
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", False)
    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_ADJUSTED_ONLY")

    df_fri = _make_daily_uptrend_df(end_date="2026-11-20")
    # Downtrending flat DataFrame that does NOT trigger bullish swing setups
    flat_dates = pd.bdate_range(end="2026-11-20", periods=90)
    flat_close = np.linspace(1500.0, 1100.0, 90)
    df_bear = pd.DataFrame(
        {
            "Open": flat_close + 5.0,
            "High": flat_close + 8.0,
            "Low": flat_close - 5.0,
            "Close": flat_close,
            "Volume": np.full(90, 200_000, dtype=np.int64),
        },
        index=flat_dates,
    )
    quote_requests = []

    def handler(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        if "/v2/market-quote/quotes" in url:
            quote_requests.append(url)
            keys_param = req.url.params.get("instrument_key", "")
            keys = [k for k in keys_param.split(",") if k]
            data = {}
            for idx_k, ikey in enumerate(keys):
                # Map deterministic live prices across the 3 matched symbols
                ltp = [1485.0, 1650.0, 1300.0][idx_k % 3]
                data[f"NSE_EQ:SYM{idx_k}"] = {
                    "instrument_token": ikey,
                    "last_price": ltp,
                    "last_trade_time": "2026-11-23T13:25:00+05:30",
                }
            return httpx.Response(200, json={"status": "success", "data": data})
        return httpx.Response(404)

    limiter = TokenBucketRateLimiter(rate_per_sec=100.0, capacity=100.0)
    http_client = UpstoxHttpClient(limiter=limiter, transport=httpx.MockTransport(handler))
    up_prov = UpstoxMarketDataProvider(cache=cache, limiter=limiter, client=http_client)
    monkeypatch.setattr(sc.data_provider, "_provider", up_prov)

    def _fake_daily_batch(symbols, period="2y", force_refresh=False, min_bars=50, policy=None):
        out = {}
        for idx_s, sym in enumerate(symbols):
            use_df = df_fri if idx_s < 3 else df_bear
            out[sym] = MarketDataResult(
                symbol=sym,
                interval="1d",
                status="OK",
                df=use_df,
                partial_candle=None,
                provenance=MarketDataProvenance(
                    provider_id="upstox",
                    provider_display_name="Upstox",
                    data_freshness="FRESH",
                    is_stale=False,
                    cache_layer="MEMORY_CACHE",
                ),
                quality=DataQualitySummary(is_valid=True, total_rows_raw=len(use_df), completed_rows_usable=len(use_df)),
            )
        return out

    monkeypatch.setattr(sc.data_provider, "fetch_batch_daily_ohlcv_results", _fake_daily_batch)

    # 1. During LIVE NSE market hours (Mon 2026-11-23 13:25 IST)
    live_now = IST.localize(datetime(2026, 11, 23, 13, 25, 0))
    monkeypatch.setattr(sc, "get_now_ist", lambda: live_now)

    resp = sc.run_swing_scanner(universe_limit=6, min_score=50.0, result_limit=3)
    assert resp.status == "OK"
    assert resp.data_as_of_date == "2026-11-20"
    assert resp.actionable_session_date == "2026-11-23"
    assert len(resp.signals) == 3
    # Executed in a SINGLE batched quote call for ONLY the 3 returned signals (not all 6 scanned)
    assert len(quote_requests) == 1
    assert len(quote_requests[0].split("instrument_key=")[1].split("%2C")) == 3

    for sig in resp.signals:
        assert sig.signal_confirmed_date == "2026-11-20"
        assert sig.actionable_session_date == "2026-11-23"
        assert sig.live_price is not None and sig.live_price > 0
        assert sig.live_price_change_from_signal_pct is not None
        assert sig.live_entry_status in ("IN_ENTRY_ZONE", "EXTENDED", "TARGET_HIT", "STOP_BREACHED")
        assert sig.live_quote_timestamp_ist == "2026-11-23 13:25:00 IST"

    # 2. Immediate second scan reuses 60s in-memory quote cache (0 additional quote HTTP calls)
    resp2 = sc.run_swing_scanner(universe_limit=6, min_score=50.0, result_limit=3)
    assert len(quote_requests) == 1
    assert all(s.live_price is not None for s in resp2.signals)

    # 3. When market is CLOSED (Mon 2026-11-23 16:00 IST): 0 quote calls & live_* fields are None
    up_prov._quote_cache.clear()
    closed_now = IST.localize(datetime(2026, 11, 23, 16, 0, 0))
    monkeypatch.setattr(sc, "get_now_ist", lambda: closed_now)
    resp_closed = sc.run_swing_scanner(universe_limit=6, min_score=50.0, result_limit=3)
    assert len(quote_requests) == 1  # No new call made when closed
    assert all(s.live_price is None for s in resp_closed.signals)
    assert all(s.live_entry_status is None for s in resp_closed.signals)
    assert all(s.live_price_change_from_signal_pct is None for s in resp_closed.signals)
    assert all(s.live_quote_timestamp_ist is None for s in resp_closed.signals)


def test_swing_live_quote_timeout_and_error_fallback_graceful(tmp_path, monkeypatch):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(sc, "market_cache", cache)
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "timeout-test-token")
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", False)
    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_ADJUSTED_ONLY")

    df_fri = _make_daily_uptrend_df(end_date="2026-11-20")

    def failing_handler(req: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Simulated Upstox quote timeout")

    limiter = TokenBucketRateLimiter(rate_per_sec=100.0, capacity=100.0)
    http_client = UpstoxHttpClient(limiter=limiter, retry_attempts=3, transport=httpx.MockTransport(failing_handler))
    up_prov = UpstoxMarketDataProvider(cache=cache, limiter=limiter, client=http_client)
    monkeypatch.setattr(sc.data_provider, "_provider", up_prov)

    def _fake_daily_batch(symbols, period="2y", force_refresh=False, min_bars=50, policy=None):
        return {
            sym: MarketDataResult(
                symbol=sym,
                interval="1d",
                status="OK",
                df=df_fri,
                partial_candle=None,
                provenance=MarketDataProvenance(
                    provider_id="upstox", provider_display_name="Upstox", data_freshness="FRESH", is_stale=False
                ),
                quality=DataQualitySummary(is_valid=True, total_rows_raw=len(df_fri), completed_rows_usable=len(df_fri)),
            )
            for sym in symbols
        }

    monkeypatch.setattr(sc.data_provider, "fetch_batch_daily_ohlcv_results", _fake_daily_batch)
    monkeypatch.setattr(sc, "get_now_ist", lambda: IST.localize(datetime(2026, 11, 23, 13, 30, 0)))

    t0 = time.monotonic()
    resp = sc.run_swing_scanner(universe_limit=4, min_score=50.0, result_limit=3)
    elapsed = time.monotonic() - t0

    assert resp.status == "OK"
    assert len(resp.signals) == 3
    assert elapsed < 2.0
    for sig in resp.signals:
        assert sig.live_price is None
        assert sig.live_price_change_from_signal_pct is None
        assert sig.live_entry_status is None
        assert sig.live_quote_timestamp_ist is None


def test_intraday_live_sort_order_vs_closed_and_zero_extra_network_calls(tmp_path, monkeypatch):
    monkeypatch.setattr(sc, "market_cache", MarketDataCache(cache_dir=str(tmp_path)))
    df_15m = _make_intraday_session_df(session_bars=12)

    quote_calls = 0

    def _forbid_quote_fetch(*args, **kwargs):
        nonlocal quote_calls
        quote_calls += 1
        raise AssertionError("Intraday scanner must NOT make extra live quote network calls")

    monkeypatch.setattr(sc.data_provider, "fetch_live_quotes", _forbid_quote_fetch)

    def _fake_intra_batch(symbols, period="5d", interval="15m", force_refresh=False, min_bars=20, policy=None):
        return {
            sym: MarketDataResult(
                symbol=sym,
                interval="15m",
                status="OK",
                df=df_15m,
                partial_candle=None,
                provenance=MarketDataProvenance(
                    provider_id="upstox", provider_display_name="Upstox", data_freshness="FRESH", is_stale=False
                ),
                quality=DataQualitySummary(is_valid=True, total_rows_raw=len(df_15m), completed_rows_usable=len(df_15m)),
            )
            for sym in symbols
        }

    monkeypatch.setattr(sc.data_provider, "fetch_batch_intraday_ohlcv_results", _fake_intra_batch)

    target_syms = sc._select_universe_symbols(4)
    sym_closed_hi, sym_open_old, sym_open_new_low, sym_open_new_hi = target_syms
    stubs_by_sym = {
        sym_closed_hi: [_make_intraday_signal_stub(sym_closed_hi, "2026-11-23 09:45 IST", score=92.0, is_open=False)],
        sym_open_old: [_make_intraday_signal_stub(sym_open_old, "2026-11-23 11:00 IST", score=84.0, is_open=True)],
        sym_open_new_low: [_make_intraday_signal_stub(sym_open_new_low, "2026-11-23 13:15 IST", score=78.0, is_open=True)],
        sym_open_new_hi: [_make_intraday_signal_stub(sym_open_new_hi, "2026-11-23 13:15 IST", score=86.0, is_open=True)],
    }
    monkeypatch.setattr(
        sc,
        "evaluate_intraday_session_signals",
        lambda sym, df, is_live, stats, prov: list(stubs_by_sym.get(sym, [])),
    )

    # 1. LIVE market hours: Open first, then newest entry_time_ist, then technical_setup_score
    monkeypatch.setattr(sc, "get_now_ist", lambda: IST.localize(datetime(2026, 11, 23, 13, 30, 0)))
    resp_live = sc.run_intraday_scanner(universe_limit=4, result_limit=10)
    assert quote_calls == 0
    assert [s.symbol for s in resp_live.signals] == [sym_open_new_hi, sym_open_new_low, sym_open_old, sym_closed_hi]

    # 2. CLOSED market review: preserves score-first sort order
    monkeypatch.setattr(sc, "get_now_ist", lambda: IST.localize(datetime(2026, 11, 23, 16, 0, 0)))
    resp_closed = sc.run_intraday_scanner(universe_limit=4, result_limit=10)
    assert quote_calls == 0
    assert [s.symbol for s in resp_closed.signals] == [sym_closed_hi, sym_open_new_hi, sym_open_old, sym_open_new_low]


def test_intraday_entry_freshness_live_rr_and_live_holding_window_expiry(monkeypatch):
    # Case 1: Signal triggers near end of session -> FRESH (<=2 bars) with valid live R:R
    df_fresh = _make_intraday_session_df(session_bars=10, base_price=1000.0)
    # Trigger on bar 8 (second-to-last bar, index 20 + 8 = 28 -> entry on bar 29 = 1 bar elapsed = 15 min)
    trigger_bar_fresh = 28

    def _eval_fresh(df_ind, idx):
        if idx == trigger_bar_fresh:
            return {"INTRADAY_MOMENTUM_IGNITION": {"triggered": True, "direction": "BULLISH", "reason": "Test fresh"}}
        return {"INTRADAY_MOMENTUM_IGNITION": {"triggered": False, "direction": "NEUTRAL", "reason": ""}}

    monkeypatch.setattr(isig, "evaluate_intraday_strategies_at_index", _eval_fresh)
    sigs_fresh = isig.evaluate_intraday_session_signals("TCS", df_fresh, is_market_live=True, validated_stats={})
    assert len(sigs_fresh) == 1
    s1 = sigs_fresh[0]
    assert s1.is_projected_exit is True
    assert s1.bars_since_entry == 1
    assert s1.minutes_since_entry == 15
    assert s1.entry_freshness == "FRESH"
    assert s1.live_risk_reward_ratio is not None and s1.live_risk_reward_ratio > 0

    # Case 2: Signal triggers on the latest bar itself -> 0 bars / 0 mins -> FRESH
    trigger_bar_now = len(df_fresh) - 1
    monkeypatch.setattr(
        isig,
        "evaluate_intraday_strategies_at_index",
        lambda df_ind, idx: {
            "INTRADAY_MOMENTUM_IGNITION": {
                "triggered": idx == trigger_bar_now,
                "direction": "BULLISH" if idx == trigger_bar_now else "NEUTRAL",
                "reason": "Just triggered",
            }
        },
    )
    sigs_now = isig.evaluate_intraday_session_signals("TCS", df_fresh, is_market_live=True, validated_stats={})
    assert len(sigs_now) == 1
    assert sigs_now[0].bars_since_entry == 0
    assert sigs_now[0].minutes_since_entry == 0
    assert sigs_now[0].entry_freshness == "FRESH"

    # Case 3: Signal triggered 4 bars ago (< max_holding_bars=12) -> IN_PROGRESS
    trigger_bar_prog = len(df_fresh) - 5  # subsequent_indices has 4 bars -> 60 mins
    monkeypatch.setattr(
        isig,
        "evaluate_intraday_strategies_at_index",
        lambda df_ind, idx: {
            "INTRADAY_MOMENTUM_IGNITION": {
                "triggered": idx == trigger_bar_prog,
                "direction": "BULLISH" if idx == trigger_bar_prog else "NEUTRAL",
                "reason": "Running setup",
            }
        },
    )
    sigs_prog = isig.evaluate_intraday_session_signals("TCS", df_fresh, is_market_live=True, validated_stats={})
    assert len(sigs_prog) == 1
    assert sigs_prog[0].is_projected_exit is True
    assert sigs_prog[0].bars_since_entry == 4
    assert sigs_prog[0].minutes_since_entry == 60
    assert sigs_prog[0].entry_freshness == "IN_PROGRESS"

    # Case 4: Live max_holding_bars (12 bars for INTRADAY_MOMENTUM_IGNITION) fully elapsed without stop/target hit
    # Session has 18 bars; trigger on session bar 2 (index 22), so 15 subsequent bars >= 12 -> must close!
    # Also trigger a fresh afternoon signal on bar 36 (session bar 16) -> must be picked up after expiry!
    df_exp = _make_intraday_session_df(session_bars=18, base_price=1000.0)
    morning_trig_idx = 22
    afternoon_trig_idx = 36

    monkeypatch.setattr(
        isig,
        "evaluate_intraday_strategies_at_index",
        lambda df_ind, idx: {
            "INTRADAY_MOMENTUM_IGNITION": {
                "triggered": idx in (morning_trig_idx, afternoon_trig_idx),
                "direction": "BULLISH" if idx in (morning_trig_idx, afternoon_trig_idx) else "NEUTRAL",
                "reason": "Holding window test",
            }
        },
    )
    sigs_exp = isig.evaluate_intraday_session_signals("TCS", df_exp, is_market_live=True, validated_stats={})
    assert len(sigs_exp) == 2

    expired_sig, fresh_afternoon_sig = sigs_exp[0], sigs_exp[1]
    assert expired_sig.is_projected_exit is False
    assert expired_sig.signal_status == "COMPLETED_SQUARE_OFF_1515"
    assert expired_sig.status_badge_text == "COMPLETED — HOLDING WINDOW EXPIRED"
    assert expired_sig.entry_freshness == "CLOSED"
    assert expired_sig.bars_since_entry is None
    assert expired_sig.minutes_since_entry is None
    assert expired_sig.live_risk_reward_ratio is None
    assert expired_sig.actual_exit_price is not None
    assert expired_sig.actual_exit_time_ist is not None

    assert fresh_afternoon_sig.is_projected_exit is True
    assert fresh_afternoon_sig.bars_since_entry == 1
    assert fresh_afternoon_sig.minutes_since_entry == 15
    assert fresh_afternoon_sig.entry_freshness == "FRESH"

    # Case 5: Open signal where latest close is >= target or <= stop (signal bar close reference edge case) -> live_rr is None
    df_edge = _make_intraday_session_df(session_bars=6, base_price=1000.0)
    monkeypatch.setattr(
        isig,
        "evaluate_intraday_strategies_at_index",
        lambda df_ind, idx: {
            "INTRADAY_MOMENTUM_IGNITION": {
                "triggered": idx == len(df_edge) - 1,
                "direction": "BULLISH" if idx == len(df_edge) - 1 else "NEUTRAL",
                "reason": "Edge RR check",
            }
        },
    )
    sigs_edge = isig.evaluate_intraday_session_signals("TCS", df_edge, is_market_live=True, validated_stats={})
    assert len(sigs_edge) == 1
    assert sigs_edge[0].live_risk_reward_ratio == round(
        (sigs_edge[0].target_exit_price - sigs_edge[0].current_price)
        / max(sigs_edge[0].current_price - sigs_edge[0].stop_loss, 0.01),
        2,
    )


def test_upstox_fetch_live_quotes_chunks_in_batches_of_50(tmp_path, monkeypatch):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "chunk-test-token")
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", False)

    chunk_sizes = []

    def handler(req: httpx.Request) -> httpx.Response:
        keys = [k for k in req.url.params.get("instrument_key", "").split(",") if k]
        chunk_sizes.append(len(keys))
        data = {
            f"NSE_EQ:K{i}": {"instrument_token": k, "last_price": 500.0 + i, "timestamp": "2026-11-23T13:30:00+05:30"}
            for i, k in enumerate(keys)
        }
        return httpx.Response(200, json={"status": "success", "data": data})

    limiter = TokenBucketRateLimiter(rate_per_sec=100.0, capacity=100.0)
    http_client = UpstoxHttpClient(limiter=limiter, transport=httpx.MockTransport(handler))
    up_prov = UpstoxMarketDataProvider(cache=cache, limiter=limiter, client=http_client)

    syms = sc._select_universe_symbols(55)
    quotes = up_prov.fetch_live_quotes(syms, timeout_seconds=2.0)
    assert chunk_sizes == [50, 5]
    assert len(quotes) == 55
    # Second call served entirely from 60s TTL cache (0 extra calls)
    quotes_cached = up_prov.fetch_live_quotes(syms, timeout_seconds=2.0)
    assert chunk_sizes == [50, 5]
    assert len(quotes_cached) == 55

