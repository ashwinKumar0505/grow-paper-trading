"""Single-Source-of-Truth Causal Strategy Evaluators (Shared Live & Backtest)."""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from app.data.nse_calendar import INTRADAY_ENTRY_CUTOFF_TIME
from app.engine.patterns import compute_bullish_confirmed_pattern_masks, detect_patterns_at_index
from app.engine.strategy_definitions import (
    ALL_STRATEGIES,
    INTRADAY_STRATEGIES,
    STRATEGY_ENGINE_VERSION,
    SWING_STRATEGIES,
    StrategyDefinition,
    compute_strategy_config_hash,
    serialize_strategy_parameters,
)
from app.models.signals import PatternDetection


def compute_swing_trigger_arrays(
    df: pd.DataFrame,
    pattern_masks: Optional[Dict[str, np.ndarray]] = None,
) -> Dict[str, np.ndarray]:
    """
    Single-source-of-truth strictly causal boolean trigger arrays for all 9 swing strategies.
    Zero `.bfill()`; warmup bars (< 50) or bars with NaN required inputs are strictly False.
    """
    n = len(df)
    if df is None or n < 55:
        return {k: np.zeros(max(0, n), dtype=bool) for k in SWING_STRATEGIES}

    c = df["Close"].to_numpy(dtype=float)
    o = df["Open"].to_numpy(dtype=float)
    h = df["High"].to_numpy(dtype=float)
    l = df["Low"].to_numpy(dtype=float)
    rng = np.maximum(h - l, 1e-6)
    close_pos = (c - l) / rng

    pc = df["Close"].shift(1).to_numpy(dtype=float)
    ema20 = df["EMA_20"].to_numpy(dtype=float)
    ema50 = df["EMA_50"].to_numpy(dtype=float)
    ema200 = df["EMA_200"].to_numpy(dtype=float)
    sma200 = df["SMA_200"].combine_first(df["EMA_200"]).to_numpy(dtype=float)
    ema50_prev5 = df["EMA_50"].shift(5).to_numpy(dtype=float)

    rsi = df["RSI_14"].to_numpy(dtype=float)
    prev_rsi = df["RSI_14"].shift(1).to_numpy(dtype=float)
    min_rsi_3 = df["RSI_14"].shift(1).rolling(3, min_periods=3).min().to_numpy(dtype=float)

    macd_line = df["MACD_Line"].to_numpy(dtype=float)
    macd_sig = df["MACD_Signal"].to_numpy(dtype=float)
    macd_hist = df["MACD_Hist"].to_numpy(dtype=float)
    prev_macd_hist = df["MACD_Hist"].shift(1).to_numpy(dtype=float)

    adx = df["ADX_14"].to_numpy(dtype=float)
    plus_di = df["Plus_DI"].to_numpy(dtype=float)
    minus_di = df["Minus_DI"].to_numpy(dtype=float)
    vol_ratio = df["Vol_Ratio_20"].to_numpy(dtype=float)
    vwap = df["VWAP"].to_numpy(dtype=float)

    bb_pctb = df["BB_PctB"].to_numpy(dtype=float)
    avg_bb_width_15 = df["BB_Width"].shift(1).rolling(15, min_periods=10).mean().to_numpy(dtype=float)
    prior_high_20 = df["Prior_High_20"].to_numpy(dtype=float)
    recent_high_close = df["Close"].shift(1).rolling(10, min_periods=5).max().to_numpy(dtype=float)

    eligible = np.arange(n) >= 50

    s1 = (
        eligible
        & np.isfinite(ema20) & np.isfinite(ema50) & np.isfinite(ema200) & np.isfinite(ema50_prev5)
        & np.isfinite(rsi) & np.isfinite(plus_di) & np.isfinite(minus_di)
        & (c > ema20) & (ema20 > ema50) & (ema50 > ema200)
        & (ema50 > ema50_prev5)
        & (c > o)
        & ((l <= ema20 * 1.022) | (c <= ema20 * 1.035))
        & (rsi >= 50.0) & (rsi <= 68.5)
        & (plus_di > minus_di)
    )

    s2 = (
        eligible
        & np.isfinite(macd_line) & np.isfinite(macd_sig) & np.isfinite(macd_hist) & np.isfinite(prev_macd_hist)
        & np.isfinite(ema50) & np.isfinite(ema200) & np.isfinite(adx) & np.isfinite(plus_di) & np.isfinite(minus_di) & np.isfinite(vol_ratio)
        & (macd_line > macd_sig)
        & (macd_hist > 0)
        & (macd_hist > prev_macd_hist)
        & ((prev_macd_hist <= 0) | (macd_hist > prev_macd_hist * 1.12))
        & (c > ema50) & (ema50 > ema200)
        & (adx >= 20.0)
        & (plus_di > minus_di)
        & (vol_ratio >= 1.15)
    )

    s3 = (
        eligible
        & np.isfinite(sma200) & np.isfinite(ema50) & np.isfinite(min_rsi_3)
        & np.isfinite(rsi) & np.isfinite(prev_rsi) & np.isfinite(pc)
        & (c > sma200)
        & (c >= ema50 * 0.99)
        & (min_rsi_3 >= 36.0) & (min_rsi_3 <= 51.0)
        & (rsi >= prev_rsi + 2.5)
        & (rsi >= 48.0) & (rsi <= 64.0)
        & (c > o)
        & (c > pc)
    )

    s4 = (
        eligible
        & np.isfinite(prior_high_20) & np.isfinite(pc) & np.isfinite(vol_ratio)
        & np.isfinite(adx) & np.isfinite(plus_di) & np.isfinite(minus_di) & np.isfinite(rsi)
        & (c > prior_high_20)
        & (pc <= prior_high_20 * 1.005)
        & (vol_ratio >= 1.35)
        & (adx >= 20.0)
        & (plus_di > minus_di)
        & (rsi >= 53.0) & (rsi <= 75.0)
        & (close_pos >= 0.65)
    )

    s5 = (
        eligible
        & np.isfinite(bb_pctb) & np.isfinite(avg_bb_width_15) & np.isfinite(ema20) & np.isfinite(ema50)
        & np.isfinite(macd_hist) & np.isfinite(vol_ratio)
        & (bb_pctb >= 0.80)
        & (avg_bb_width_15 <= 14.0)
        & (c > ema20) & (ema20 > ema50)
        & (macd_hist > 0)
        & (vol_ratio >= 1.25)
        & (c > o)
    )

    s6 = (
        eligible
        & np.isfinite(ema20) & np.isfinite(ema50) & np.isfinite(ema200)
        & np.isfinite(recent_high_close) & np.isfinite(pc) & np.isfinite(rsi)
        & np.isfinite(plus_di) & np.isfinite(minus_di)
        & (c > ema20) & (ema20 > ema50) & (ema50 > ema200)
        & (recent_high_close > c * 1.008)
        & (l <= ema20 * 1.014)
        & (c > o)
        & (c > pc)
        & (rsi >= 50.0) & (rsi <= 67.0)
        & (plus_di > minus_di)
    )

    s7 = (
        eligible
        & np.isfinite(vwap) & np.isfinite(ema20) & np.isfinite(ema50)
        & np.isfinite(vol_ratio) & np.isfinite(plus_di) & np.isfinite(minus_di)
        & (c > vwap)
        & (c > ema20) & (ema20 > ema50)
        & (vol_ratio >= 1.30)
        & ((plus_di - minus_di) >= 6.0)
        & (c > o)
        & (close_pos >= 0.65)
    )

    # Shared confirmed pattern detector (exact parity with detect_patterns_at_index!)
    if pattern_masks is None:
        pattern_masks = compute_bullish_confirmed_pattern_masks(df)
    s8 = (
        eligible
        & pattern_masks["any_bullish_confirmed"]
        & np.isfinite(ema50) & np.isfinite(rsi) & np.isfinite(vol_ratio)
        & (c > ema50)
        & (rsi >= 48.0) & (rsi <= 72.0)
        & (vol_ratio >= 1.10)
    )

    indiv_count = (
        s1.astype(int) + s2.astype(int) + s3.astype(int) + s4.astype(int)
        + s5.astype(int) + s6.astype(int) + s7.astype(int) + s8.astype(int)
    )

    s9 = (
        eligible
        & (indiv_count >= 3)
        & np.isfinite(ema20) & np.isfinite(ema50) & np.isfinite(ema200) & np.isfinite(ema50_prev5)
        & np.isfinite(vwap) & np.isfinite(adx) & np.isfinite(plus_di) & np.isfinite(minus_di)
        & np.isfinite(rsi) & np.isfinite(macd_line) & np.isfinite(macd_sig)
        & np.isfinite(macd_hist) & np.isfinite(prev_macd_hist) & np.isfinite(vol_ratio)
        & (c > ema20) & (ema20 > ema50) & (ema50 > ema200)
        & (ema50 > ema50_prev5)
        & (c > vwap)
        & (adx >= 21.0)
        & ((plus_di - minus_di) >= 7.0)
        & (rsi >= 53.0) & (rsi <= 71.0)
        & (macd_line > macd_sig)
        & (macd_hist > prev_macd_hist)
        & (vol_ratio >= 1.25)
        & (close_pos >= 0.70)
    )

    return {
        "EMA_SMA_GOLDEN_PULLBACK": s1,
        "MACD_MOMENTUM_SURGE": s2,
        "RSI_SUPPORT_BOUNCE": s3,
        "BREAKOUT_VOLUME_CONFIRM": s4,
        "BOLLINGER_SQUEEZE_BREAKOUT": s5,
        "BREAKOUT_RETEST_SUPPORT": s6,
        "VWAP_ACCUMULATION_TREND": s7,
        "CANDLESTICK_PATTERN_CONFIRM": s8,
        "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE": s9,
    }


def compute_intraday_trigger_arrays(df: pd.DataFrame) -> Dict[str, np.ndarray]:
    """
    Single-source-of-truth strictly causal trigger arrays for all 3 intraday 15m strategies.
    Uses genuine per-session Opening Range High (`ORB_High` from first 2 completed bars)
    and enforces intraday session entry cutoff (<= 14:45 IST) to prevent overnight holding.
    """
    n = len(df)
    if df is None or n < 20:
        return {k: np.zeros(max(0, n), dtype=bool) for k in INTRADAY_STRATEGIES}

    c = df["Close"].to_numpy(dtype=float)
    o = df["Open"].to_numpy(dtype=float)
    h = df["High"].to_numpy(dtype=float)
    l = df["Low"].to_numpy(dtype=float)
    rng = np.maximum(h - l, 1e-6)
    close_pos = (c - l) / rng

    pc = df["Close"].shift(1).to_numpy(dtype=float)
    vwap = df["VWAP"].to_numpy(dtype=float)
    ema9 = df["EMA_9"].to_numpy(dtype=float)
    ema20 = df["EMA_20"].to_numpy(dtype=float)
    ema50 = df["EMA_50"].to_numpy(dtype=float)
    rsi = df["RSI_14"].to_numpy(dtype=float)
    macd_hist = df["MACD_Hist"].to_numpy(dtype=float)
    prev_macd_hist = df["MACD_Hist"].shift(1).to_numpy(dtype=float)
    adx = df["ADX_14"].to_numpy(dtype=float)
    plus_di = df["Plus_DI"].to_numpy(dtype=float)
    minus_di = df["Minus_DI"].to_numpy(dtype=float)
    vol_ratio = df["Vol_Ratio_20"].to_numpy(dtype=float)
    prior_high_20 = df["Prior_High_20"].to_numpy(dtype=float)

    # Genuine causal session opening range & session bar index
    if "ORB_High" in df.columns and "Session_Bar_Index" in df.columns:
        orb_high = df["ORB_High"].to_numpy(dtype=float)
        session_bar_idx = df["Session_Bar_Index"].to_numpy(dtype=int)
    else:
        session_dates = pd.Series(df.index.date, index=df.index)
        s_idx = session_dates.groupby(session_dates).cumcount()
        orb_seed = df["High"].where(s_idx < 2)
        orb_high = (
            orb_seed.groupby(session_dates)
            .cummax()
            .groupby(session_dates)
            .ffill()
            .where(s_idx >= 2)
            .to_numpy(dtype=float)
        )
        session_bar_idx = s_idx.to_numpy(dtype=int)

    # Enforce regular-session entry cutoff (<= 14:45 IST) so intraday trades cannot bleed overnight
    within_entry_cutoff = np.array(
        [ts.time() <= INTRADAY_ENTRY_CUTOFF_TIME if hasattr(ts, "time") else True for ts in df.index],
        dtype=bool,
    )
    eligible = (np.arange(n) >= 15) & within_entry_cutoff

    # 1. Genuine 15m Opening Range & Session VWAP Breakout (ONLY after first 2 session bars!)
    i1 = (
        eligible
        & (session_bar_idx >= 2)
        & np.isfinite(orb_high) & np.isfinite(vwap) & np.isfinite(ema20)
        & np.isfinite(vol_ratio) & np.isfinite(rsi)
        & (c > orb_high)
        & (c > vwap)
        & (c > ema20)
        & (vol_ratio >= 1.25)
        & (rsi >= 53.0) & (rsi <= 75.0)
        & (c > o)
    )

    # 2. Session VWAP & EMA-9 Pullback Bounce
    i2 = (
        eligible
        & (session_bar_idx >= 1)
        & np.isfinite(vwap) & np.isfinite(ema9) & np.isfinite(ema20)
        & np.isfinite(pc) & np.isfinite(macd_hist) & np.isfinite(prev_macd_hist) & np.isfinite(rsi)
        & (c > vwap)
        & (c > ema9) & (ema9 >= ema20)
        & (l <= np.maximum(ema9, vwap) * 1.006)
        & (c > o)
        & (c > pc)
        & (macd_hist >= prev_macd_hist)
        & (rsi >= 50.0) & (rsi <= 68.0)
    )

    # 3. 15m Range Breakout & Volume Ignition
    i3 = (
        eligible
        & (session_bar_idx >= 1)
        & np.isfinite(prior_high_20) & np.isfinite(vwap) & np.isfinite(ema20) & np.isfinite(ema50)
        & np.isfinite(vol_ratio) & np.isfinite(adx) & np.isfinite(plus_di) & np.isfinite(minus_di)
        & (c > prior_high_20)
        & (c > vwap)
        & (c > ema20) & (ema20 > ema50)
        & (vol_ratio >= 1.40)
        & (adx >= 21.0)
        & (plus_di > minus_di)
        & (close_pos >= 0.70)
    )

    return {
        "INTRADAY_ORB_VWAP_BREAKOUT": i1,
        "INTRADAY_VWAP_EMA9_PULLBACK": i2,
        "INTRADAY_MOMENTUM_IGNITION": i3,
    }


def evaluate_swing_strategies_at_index(
    df: pd.DataFrame,
    idx: int = -1,
    patterns: Optional[List[PatternDetection]] = None,
) -> Dict[str, Dict[str, object]]:
    """
    Evaluate all 9 swing strategies at bar `idx` using the EXACT same shared trigger engine
    as the backtester (`compute_swing_trigger_arrays` on `df.iloc[:idx + 1]`).
    """
    if df is None or len(df) < 55:
        return {}
    if idx < 0:
        idx = len(df) + idx
    if idx < 50 or idx >= len(df):
        return {}

    scoped = df.iloc[: idx + 1]
    if idx >= 60:
        tail_scoped = scoped.iloc[idx - 59 :]
        tail_idx = len(tail_scoped) - 1
        masks = compute_swing_trigger_arrays(tail_scoped)
        t = {k: bool(v[tail_idx]) for k, v in masks.items()}
    else:
        masks = compute_swing_trigger_arrays(scoped)
        t = {k: bool(v[idx]) for k, v in masks.items()}
    row = scoped.iloc[idx]

    c = float(row["Close"])
    ema20 = float(row["EMA_20"]) if pd.notna(row["EMA_20"]) else c
    ema50 = float(row["EMA_50"]) if pd.notna(row["EMA_50"]) else c
    ema200 = float(row["EMA_200"]) if pd.notna(row["EMA_200"]) else c
    sma200 = float(row["SMA_200"]) if pd.notna(row["SMA_200"]) else ema200
    rsi = float(row["RSI_14"]) if pd.notna(row["RSI_14"]) else 50.0
    macd_line = float(row["MACD_Line"]) if pd.notna(row["MACD_Line"]) else 0.0
    macd_sig = float(row["MACD_Signal"]) if pd.notna(row["MACD_Signal"]) else 0.0
    macd_hist = float(row["MACD_Hist"]) if pd.notna(row["MACD_Hist"]) else 0.0
    adx = float(row["ADX_14"]) if pd.notna(row["ADX_14"]) else 0.0
    plus_di = float(row["Plus_DI"]) if pd.notna(row["Plus_DI"]) else 0.0
    minus_di = float(row["Minus_DI"]) if pd.notna(row["Minus_DI"]) else 0.0
    vol_ratio = float(row["Vol_Ratio_20"]) if pd.notna(row["Vol_Ratio_20"]) else 1.0
    vwap = float(row["VWAP"]) if pd.notna(row["VWAP"]) else c
    bb_pctb = float(row["BB_PctB"]) if pd.notna(row["BB_PctB"]) else 0.5
    prior_high_20 = float(row["Prior_High_20"]) if pd.notna(row["Prior_High_20"]) else c

    if patterns is None:
        patterns = detect_patterns_at_index(scoped, idx)
    bull_conf = [p for p in patterns if p.direction == "BULLISH" and p.status == "CONFIRMED"]
    pat_names = ", ".join(p.name for p in bull_conf[:2]) if bull_conf else "None"

    min_rsi_3 = float(scoped["RSI_14"].iloc[idx - 3 : idx].min())
    avg_bb_w = float(scoped["BB_Width"].iloc[idx - 15 : idx].mean()) if pd.notna(row.get("BB_Width")) else 0.0
    rec_high = float(scoped["Close"].iloc[idx - 10 : idx].max())

    indiv_count = sum(1 for k, trig in t.items() if k != "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE" and trig)

    return {
        "EMA_SMA_GOLDEN_PULLBACK": {
            "triggered": t["EMA_SMA_GOLDEN_PULLBACK"],
            "direction": "BULLISH" if t["EMA_SMA_GOLDEN_PULLBACK"] else ("BEARISH" if c < ema50 < ema200 else "NEUTRAL"),
            "reason": f"Close (₹{c:.2f}), EMA20 (₹{ema20:.2f}), EMA50 (₹{ema50:.2f}), EMA200 (₹{ema200:.2f}), RSI {rsi:.1f}, +DI {plus_di:.1f} vs -DI {minus_di:.1f}.",
        },
        "MACD_MOMENTUM_SURGE": {
            "triggered": t["MACD_MOMENTUM_SURGE"],
            "direction": "BULLISH" if t["MACD_MOMENTUM_SURGE"] else ("BEARISH" if macd_line < macd_sig and macd_hist < 0 else "NEUTRAL"),
            "reason": f"MACD ({macd_line:.2f}) vs Signal ({macd_sig:.2f}), hist ({macd_hist:+.2f}), ADX {adx:.1f}, vol {vol_ratio:.2f}x.",
        },
        "RSI_SUPPORT_BOUNCE": {
            "triggered": t["RSI_SUPPORT_BOUNCE"],
            "direction": "BULLISH" if t["RSI_SUPPORT_BOUNCE"] else ("BEARISH" if rsi > 76 or rsi < 35 else "NEUTRAL"),
            "reason": f"RSI moved from 3-bar low ({min_rsi_3:.1f}) to {rsi:.1f} vs SMA200 (₹{sma200:.2f}).",
        },
        "BREAKOUT_VOLUME_CONFIRM": {
            "triggered": t["BREAKOUT_VOLUME_CONFIRM"],
            "direction": "BULLISH" if t["BREAKOUT_VOLUME_CONFIRM"] else "NEUTRAL",
            "reason": f"Close (₹{c:.2f}) vs 20-day resistance (₹{prior_high_20:.2f}) on {vol_ratio:.2f}x volume.",
        },
        "BOLLINGER_SQUEEZE_BREAKOUT": {
            "triggered": t["BOLLINGER_SQUEEZE_BREAKOUT"],
            "direction": "BULLISH" if t["BOLLINGER_SQUEEZE_BREAKOUT"] else ("BEARISH" if bb_pctb < 0.15 else "NEUTRAL"),
            "reason": f"Bollinger %B {bb_pctb:.2f} with 15-bar avg bandwidth {avg_bb_w:.1f}% and {vol_ratio:.2f}x volume.",
        },
        "BREAKOUT_RETEST_SUPPORT": {
            "triggered": t["BREAKOUT_RETEST_SUPPORT"],
            "direction": "BULLISH" if t["BREAKOUT_RETEST_SUPPORT"] else "NEUTRAL",
            "reason": f"Retest near EMA20 (₹{ema20:.2f}) after 10-bar high close (₹{rec_high:.2f}).",
        },
        "VWAP_ACCUMULATION_TREND": {
            "triggered": t["VWAP_ACCUMULATION_TREND"],
            "direction": "BULLISH" if t["VWAP_ACCUMULATION_TREND"] else ("BEARISH" if c < vwap and minus_di > plus_di else "NEUTRAL"),
            "reason": f"Close (₹{c:.2f}) vs 20D VWAP (₹{vwap:.2f}), vol {vol_ratio:.2f}x, DI spread {plus_di - minus_di:+.1f}.",
        },
        "CANDLESTICK_PATTERN_CONFIRM": {
            "triggered": t["CANDLESTICK_PATTERN_CONFIRM"],
            "direction": "BULLISH" if t["CANDLESTICK_PATTERN_CONFIRM"] else "NEUTRAL",
            "reason": f"Confirmed bullish pattern ({pat_names}) above EMA50 with {vol_ratio:.2f}x volume.",
        },
        "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE": {
            "triggered": t["MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE"],
            "direction": "BULLISH" if t["MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE"] else "NEUTRAL",
            "reason": f"Multi-factor rule confluence ({indiv_count} individual strategies aligned, ADX {adx:.1f}, RSI {rsi:.1f}, vol {vol_ratio:.2f}x).",
        },
    }


def evaluate_intraday_strategies_at_index(
    df: pd.DataFrame,
    idx: int = -1,
) -> Dict[str, Dict[str, object]]:
    """
    Evaluate all 3 intraday 15m strategies at bar `idx` using the EXACT same shared trigger engine
    as the backtester (`compute_intraday_trigger_arrays` on `df.iloc[:idx + 1]`).
    """
    if df is None or len(df) < 20:
        return {}
    if idx < 0:
        idx = len(df) + idx
    if idx < 15 or idx >= len(df):
        return {}

    scoped = df.iloc[: idx + 1]
    masks = compute_intraday_trigger_arrays(scoped)
    row = scoped.iloc[idx]

    c = float(row["Close"])
    vwap = float(row["VWAP"]) if pd.notna(row.get("VWAP")) else c
    ema9 = float(row["EMA_9"]) if pd.notna(row.get("EMA_9")) else c
    vol_ratio = float(row["Vol_Ratio_20"]) if pd.notna(row.get("Vol_Ratio_20")) else 1.0
    adx = float(row["ADX_14"]) if pd.notna(row.get("ADX_14")) else 0.0
    prior_high_20 = float(row["Prior_High_20"]) if pd.notna(row.get("Prior_High_20")) else c
    orb_val = row.get("ORB_High", np.nan)
    orb_str = f"₹{float(orb_val):.2f}" if pd.notna(orb_val) else "forming"

    return {
        "INTRADAY_ORB_VWAP_BREAKOUT": {
            "triggered": bool(masks["INTRADAY_ORB_VWAP_BREAKOUT"][idx]),
            "reason": f"15m close (₹{c:.2f}) vs Session ORB High ({orb_str}) and Session VWAP (₹{vwap:.2f}) on {vol_ratio:.2f}x volume.",
        },
        "INTRADAY_VWAP_EMA9_PULLBACK": {
            "triggered": bool(masks["INTRADAY_VWAP_EMA9_PULLBACK"][idx]),
            "reason": f"15m pullback near Session VWAP (₹{vwap:.2f}) & EMA9 (₹{ema9:.2f}) with rising MACD histogram.",
        },
        "INTRADAY_MOMENTUM_IGNITION": {
            "triggered": bool(masks["INTRADAY_MOMENTUM_IGNITION"][idx]),
            "reason": f"15m breakout above 20-bar high (₹{prior_high_20:.2f}) & VWAP (₹{vwap:.2f}) on {vol_ratio:.2f}x volume & ADX {adx:.1f}.",
        },
    }
