"""Unit tests for strictly causal technical indicators and look-ahead prevention."""

import numpy as np
import pandas as pd
from app.engine.indicators import compute_indicators, compute_support_resistance_levels


def _make_sample_ohlcv(n: int = 250, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2024-01-01", periods=n, freq="B")
    close = np.maximum(50.0, 1000.0 + np.cumsum(rng.normal(1.5, 12.0, size=n)))
    open_ = np.maximum(40.0, close - rng.normal(0.5, 5.0, size=n))
    high = np.maximum(open_, close) + np.abs(rng.normal(6.0, 3.0, size=n))
    low = np.maximum(10.0, np.minimum(open_, close) - np.abs(rng.normal(4.5, 2.0, size=n)))
    volume = rng.integers(500_000, 3_500_000, size=n)
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
        index=dates,
    )


def _make_multi_day_intraday(days: int = 3) -> pd.DataFrame:
    rng = np.random.default_rng(99)
    timestamps = []
    for d in pd.bdate_range("2026-11-02", periods=days):
        day_ts = pd.date_range(
            f"{d.strftime('%Y-%m-%d')} 09:15:00",
            f"{d.strftime('%Y-%m-%d')} 15:15:00",
            freq="15min",
        )
        timestamps.extend(day_ts)
    n = len(timestamps)
    close = 500.0 + np.cumsum(rng.normal(0.2, 2.0, size=n))
    open_ = close - rng.normal(0.0, 0.8, size=n)
    high = np.maximum(open_, close) + np.abs(rng.normal(1.2, 0.5, size=n))
    low = np.minimum(open_, close) - np.abs(rng.normal(1.2, 0.5, size=n))
    volume = rng.integers(100_000, 900_000, size=n)
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
        index=pd.DatetimeIndex(timestamps),
    )


def test_compute_indicators_columns_warmup_and_ranges():
    df = _make_sample_ohlcv(250)
    ind = compute_indicators(df, is_intraday=False)

    expected_cols = [
        "EMA_9", "EMA_20", "EMA_50", "EMA_200",
        "SMA_20", "SMA_50", "SMA_200",
        "RSI_14", "MACD_Line", "MACD_Signal", "MACD_Hist",
        "BB_Middle", "BB_Upper", "BB_Lower", "BB_Width", "BB_PctB",
        "ATR_14", "ADX_14", "Plus_DI", "Minus_DI",
        "Vol_SMA_20", "Vol_Ratio_20", "VWAP",
        "Prior_High_20", "Prior_Low_20",
    ]
    for col in expected_cols:
        assert col in ind.columns, f"Missing indicator column {col}"

    # Warm-up bars must remain NaN (no .bfill() look-ahead!)
    assert pd.isna(ind["ATR_14"].iloc[0])
    assert pd.isna(ind["RSI_14"].iloc[0])
    assert pd.isna(ind["EMA_20"].iloc[0])

    valid_rsi = ind["RSI_14"].dropna()
    assert len(valid_rsi) > 200
    assert (valid_rsi >= 0.0).all() and (valid_rsi <= 100.0).all()
    assert (ind["ATR_14"].dropna() > 0.0).all()
    assert (ind["BB_Upper"].dropna() >= ind["BB_Lower"].dropna()).all()


def test_indicators_strictly_causal_even_during_warmup():
    """Verify NO indicator value at ANY bar t changes when future bars > t are altered."""
    df_full = _make_sample_ohlcv(250)
    df_mutated = df_full.copy()
    # Drastically alter bars 5..249 to catch any .bfill() leakage into bars 0..4 and t=150
    df_mutated.iloc[151:, :] = df_mutated.iloc[151:, :] * 3.0

    ind_full = compute_indicators(df_full, is_intraday=False)
    ind_trunc = compute_indicators(df_full.iloc[:151].copy(), is_intraday=False)
    ind_mut = compute_indicators(df_mutated, is_intraday=False)

    check_cols = [
        "EMA_20", "EMA_50", "EMA_200", "RSI_14", "MACD_Hist",
        "ATR_14", "ADX_14", "Plus_DI", "Minus_DI", "VWAP", "Prior_High_20", "BB_PctB",
    ]
    for col in check_cols:
        v1 = float(ind_full[col].iloc[150])
        v2 = float(ind_trunc[col].iloc[150])
        v3 = float(ind_mut[col].iloc[150])
        assert np.isclose(v1, v2, rtol=1e-12), f"Look-ahead leak in {col}: {v1} != {v2}"
        assert np.isclose(v1, v3, rtol=1e-12), f"Future mutation leak in {col}: {v1} != {v3}"

    # Verify early bar ATR is NOT backfilled from bar 9
    df_early_mut = df_full.copy()
    df_early_mut.iloc[9:, df_early_mut.columns.get_loc("High")] *= 5.0
    ind_orig_e = compute_indicators(df_full, is_intraday=False)
    ind_mut_e = compute_indicators(df_early_mut, is_intraday=False)
    assert pd.isna(ind_orig_e["ATR_14"].iloc[0]) and pd.isna(ind_mut_e["ATR_14"].iloc[0])
    assert pd.isna(ind_orig_e["ATR_14"].iloc[5]) and pd.isna(ind_mut_e["ATR_14"].iloc[5])


def test_intraday_vwap_and_orb_reset_per_session_and_causal():
    df = _make_multi_day_intraday(days=3)
    ind = compute_indicators(df, is_intraday=True)

    # First 2 bars of every session MUST have NaN ORB_High (opening range not yet completed)
    for d in sorted(set(ind.index.date)):
        day_df = ind[ind.index.date == d]
        assert day_df["Session_Bar_Index"].iloc[0] == 0
        assert day_df["Session_Bar_Index"].iloc[1] == 1
        assert pd.isna(day_df["ORB_High"].iloc[0])
        assert pd.isna(day_df["ORB_High"].iloc[1])
        expected_orb = float(day_df["High"].iloc[:2].max())
        assert np.allclose(day_df["ORB_High"].iloc[2:].to_numpy(), expected_orb)

        # VWAP resets on bar 0 of each session to that bar's typical price
        tp0 = (day_df["High"].iloc[0] + day_df["Low"].iloc[0] + day_df["Close"].iloc[0]) / 3.0
        assert np.isclose(day_df["VWAP"].iloc[0], tp0, rtol=1e-9)

    # Strict causality: truncating intraday series at bar k gives identical ORB & VWAP at bar k
    for k in (0, 1, 2, 10, 26, 27, 40):
        ind_trunc = compute_indicators(df.iloc[: k + 1].copy(), is_intraday=True)
        v_full = ind["ORB_High"].iloc[k]
        v_trunc = ind_trunc["ORB_High"].iloc[k]
        if pd.isna(v_full):
            assert pd.isna(v_trunc)
        else:
            assert np.isclose(v_full, v_trunc, rtol=1e-12)
        assert np.isclose(ind["VWAP"].iloc[k], ind_trunc["VWAP"].iloc[k], rtol=1e-12)


def test_support_resistance_levels_strictly_causal():
    df = compute_indicators(_make_sample_ohlcv(200))
    sup_at_120, res_at_120 = compute_support_resistance_levels(df, num_levels=3, as_of_idx=120)

    df_future_shock = df.copy()
    df_future_shock.iloc[121:, :4] *= 2.5
    sup_shocked, res_shocked = compute_support_resistance_levels(
        df_future_shock, num_levels=3, as_of_idx=120
    )

    assert sup_at_120 == sup_shocked
    assert res_at_120 == res_shocked
    close_120 = float(df["Close"].iloc[120])
    assert all(s < close_120 for s in sup_at_120)
    assert all(r > close_120 for r in res_at_120)
