"""Unit tests for pattern detection, live/backtest strategy parity, ORB, and zero look-ahead."""

import numpy as np
import pandas as pd
from app.engine.indicators import compute_indicators
from app.engine.patterns import detect_patterns_at_index
from app.engine.strategies import (
    INTRADAY_STRATEGIES,
    SWING_STRATEGIES,
    compute_intraday_trigger_arrays,
    compute_swing_trigger_arrays,
    evaluate_intraday_strategies_at_index,
    evaluate_swing_strategies_at_index,
)


def _create_bullish_breakout_series(n: int = 120) -> pd.DataFrame:
    dates = pd.date_range("2025-01-01", periods=n, freq="B")
    base = np.zeros(n)
    cur = 500.0
    for i in range(n - 2):
        cur += np.sin(i * 0.3) * 1.5 + 0.15
        base[i] = cur

    base[-2] = base[-3] - 2.0
    base[-1] = max(base[:-2]) + 5.0

    open_ = base - 1.0
    close = base + 1.0
    open_[-2] = close[-3] + 1.0
    close[-2] = open_[-2] - 3.0
    open_[-1] = close[-2] - 0.5
    close[-1] = max(close[:-2]) + 4.0
    high = np.maximum(open_, close) + 1.5
    low = np.minimum(open_, close) - 1.5
    high[-1] = close[-1] + 0.5
    low[-1] = open_[-1] - 0.5
    vol = np.full(n, 1_000_000, dtype=np.int64)
    vol[-1] = 2_500_000

    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates,
    )


def _create_intraday_orb_series() -> pd.DataFrame:
    """Two full NSE trading sessions (09:15-15:15 IST) with a clean Day-2 ORB breakout at 10:30."""
    ts_day1 = pd.date_range("2026-11-05 09:15:00", "2026-11-05 15:15:00", freq="15min")
    ts_day2 = pd.date_range("2026-11-06 09:15:00", "2026-11-06 15:15:00", freq="15min")
    idx = ts_day1.append(ts_day2)
    n = len(idx)

    # Oscillating Day-1 prices so RSI stays healthy (~55-65)
    base = np.array([1000.0 + np.sin(i * 0.6) * 4.0 + i * 0.15 for i in range(n)], dtype=float)
    open_ = base - 0.8
    close = base + 0.8
    high = np.maximum(open_, close) + 1.2
    low = np.minimum(open_, close) - 1.2
    vol = np.full(n, 200_000, dtype=np.int64)

    # Day-2 opening range (bars 25 & 26, i.e., 09:15 and 09:30 IST): ceiling around 1012
    d2 = len(ts_day1)
    open_[d2], close[d2], high[d2], low[d2] = 1005.0, 1008.0, 1010.0, 1004.0
    open_[d2 + 1], close[d2 + 1], high[d2 + 1], low[d2 + 1] = 1008.0, 1006.0, 1011.0, 1005.0
    # Bar 27 (09:45): stays inside ORB
    open_[d2 + 2], close[d2 + 2], high[d2 + 2], low[d2 + 2] = 1006.0, 1008.0, 1009.5, 1005.5
    # Bar 28 (10:00): clean ORB breakout strictly above 1011.0, above VWAP & EMA20, RSI in [53,75], 2.1x vol
    open_[d2 + 3], close[d2 + 3], high[d2 + 3], low[d2 + 3] = 1009.0, 1011.8, 1012.2, 1008.5
    vol[d2 + 3] = 450_000

    # Bar near 15:00 (past 14:45 cutoff) — also has breakout price, MUST NOT trigger!
    late_idx = d2 + 23  # 15:00 IST
    open_[late_idx], close[late_idx], high[late_idx], low[late_idx] = 1015.0, 1025.0, 1025.5, 1014.5
    vol[late_idx] = 600_000

    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=idx,
    )


def test_detect_bullish_patterns_and_strategies():
    raw_df = _create_bullish_breakout_series(120)
    ind_df = compute_indicators(raw_df, is_intraday=False)
    patterns = detect_patterns_at_index(ind_df, -1)

    pat_names = [p.name for p in patterns]
    assert any("Breakout" in name or "Engulfing" in name or "Marubozu" in name for name in pat_names)

    evals = evaluate_swing_strategies_at_index(ind_df, -1, patterns)
    assert set(evals.keys()) == set(SWING_STRATEGIES.keys())
    assert evals["BREAKOUT_VOLUME_CONFIRM"]["triggered"] is True


def test_live_and_backtest_swing_strategy_exact_parity():
    """Every one of the 9 swing strategies must match bit-for-bit between live and backtest evaluators."""
    rng = np.random.default_rng(123)
    n = 140
    dates = pd.date_range("2025-01-01", periods=n, freq="B")
    close = np.maximum(100.0, 500.0 + np.cumsum(rng.normal(1.2, 7.0, size=n)))
    open_ = close - rng.normal(0.3, 3.0, size=n)
    high = np.maximum(open_, close) + np.abs(rng.normal(4.0, 2.0, size=n))
    low = np.minimum(open_, close) - np.abs(rng.normal(4.0, 2.0, size=n))
    vol = rng.integers(300_000, 3_000_000, size=n)
    ind = compute_indicators(
        pd.DataFrame({"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol}, index=dates),
        is_intraday=False,
    )

    masks = compute_swing_trigger_arrays(ind)
    for idx in range(55, n):
        live_eval = evaluate_swing_strategies_at_index(ind, idx)
        for sid in SWING_STRATEGIES:
            assert bool(live_eval[sid]["triggered"]) == bool(masks[sid][idx]), (
                f"Parity mismatch for {sid} at bar {idx}"
            )


def test_intraday_orb_behavior_cutoff_and_exact_parity():
    """ORB must not fire on bars 0-1, fires cleanly on genuine ORB breakout, blocks post-14:45, and matches backtest."""
    df_intra = _create_intraday_orb_series()
    ind_intra = compute_indicators(df_intra, is_intraday=True)
    masks = compute_intraday_trigger_arrays(ind_intra)

    d2 = 25  # Day-2 09:15 bar
    # Opening range bars 0 & 1 of Day-2 MUST NOT trigger ORB
    assert masks["INTRADAY_ORB_VWAP_BREAKOUT"][d2] is np.bool_(False)
    assert masks["INTRADAY_ORB_VWAP_BREAKOUT"][d2 + 1] is np.bool_(False)
    # Genuine ORB breakout bar at Day-2 10:00 MUST trigger
    assert masks["INTRADAY_ORB_VWAP_BREAKOUT"][d2 + 3] is np.bool_(True)
    # Post-14:45 cutoff bar (15:00 IST) MUST NOT trigger any intraday strategy
    for sid in INTRADAY_STRATEGIES:
        assert masks[sid][d2 + 23] is np.bool_(False), f"{sid} violated 14:45 cutoff"

    # Bit-for-bit parity between live single-index and vectorized backtest arrays
    for idx in range(20, len(ind_intra)):
        live_eval = evaluate_intraday_strategies_at_index(ind_intra, idx)
        for sid in INTRADAY_STRATEGIES:
            assert bool(live_eval[sid]["triggered"]) == bool(masks[sid][idx]), (
                f"Intraday parity mismatch for {sid} at bar {idx}"
            )


def test_future_candles_never_alter_earlier_signals():
    """Look-ahead regression: modifying future candles after t cannot alter signals at <= t."""
    df_orig = _create_bullish_breakout_series(120)
    df_shocked = df_orig.copy()
    df_shocked.iloc[91:, :4] *= 4.0
    df_shocked.iloc[91:, 4] *= 10

    ind_orig = compute_indicators(df_orig, is_intraday=False)
    ind_shocked = compute_indicators(df_shocked, is_intraday=False)

    masks_orig = compute_swing_trigger_arrays(ind_orig)
    masks_shocked = compute_swing_trigger_arrays(ind_shocked)

    for sid in SWING_STRATEGIES:
        assert np.array_equal(masks_orig[sid][:91], masks_shocked[sid][:91]), (
            f"Look-ahead leak in strategy {sid}"
        )
