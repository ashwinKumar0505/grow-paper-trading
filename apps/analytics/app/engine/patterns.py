"""Strictly Causal Candlestick and Chart Pattern Detection Engine (Shared Live & Backtest)."""

from typing import Dict, List
import numpy as np
import pandas as pd

from app.config import settings
from app.models.signals import PatternDetection


def _make_pattern(
    name: str,
    category: str,
    direction: str,
    status: str,
    detected_date: str,
    strength: float,
    description: str,
) -> PatternDetection:
    s_val = round(float(np.clip(strength, 0.0, 95.0)), 1)
    return PatternDetection(
        name=name,
        category=category,  # type: ignore[arg-type]
        direction=direction,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        detected_date=detected_date,
        pattern_strength_score=s_val,
        reliability_score=s_val if settings.ENABLE_LEGACY_FIELD_ALIASES else None,
        description=description,
    )


def compute_bullish_confirmed_pattern_masks(df: pd.DataFrame) -> Dict[str, np.ndarray]:
    """
    Single-source-of-truth causal boolean masks for all confirmed bullish candlestick & chart
    patterns across bars 0..N-1. Zero `.bfill()`, zero look-ahead.
    Shared by BOTH `detect_patterns_at_index` and `CANDLESTICK_PATTERN_CONFIRM` backtesting.
    """
    n = len(df)
    keys = [
        "bullish_engulfing",
        "bullish_hammer",
        "morning_star",
        "bullish_marubozu",
        "resistance_breakout_20d",
        "resistance_breakout_55d",
        "breakout_pullback_retest",
        "double_bottom_confirmed",
        "any_bullish_confirmed",
    ]
    if df is None or n < 25:
        return {k: np.zeros(max(0, n), dtype=bool) for k in keys}

    c = df["Close"].to_numpy(dtype=float)
    o = df["Open"].to_numpy(dtype=float)
    h = df["High"].to_numpy(dtype=float)
    l = df["Low"].to_numpy(dtype=float)
    rng = np.maximum(h - l, 1e-6)
    body = np.abs(c - o)

    pc = df["Close"].shift(1).to_numpy(dtype=float)
    po = df["Open"].shift(1).to_numpy(dtype=float)
    pbody = np.abs(pc - po)

    p2c = df["Close"].shift(2).to_numpy(dtype=float)
    p2o = df["Open"].shift(2).to_numpy(dtype=float)
    p2body = np.abs(p2c - p2o)

    ema20 = df["EMA_20"].to_numpy(dtype=float)
    ema50 = df["EMA_50"].to_numpy(dtype=float)
    vol_ratio = df["Vol_Ratio_20"].to_numpy(dtype=float)
    prior_high_20 = df["Prior_High_20"].to_numpy(dtype=float)
    prior_low_20 = df["Prior_Low_20"].to_numpy(dtype=float)
    prior_high_55 = df["Prior_High_55"].to_numpy(dtype=float)
    atr = df["ATR_14"].to_numpy(dtype=float)

    lower_wick = np.minimum(o, c) - l
    upper_wick = h - np.maximum(o, c)

    idx_ge_20 = np.arange(n) >= 20

    # 1. Bullish Engulfing
    engulf = (
        idx_ge_20
        & np.isfinite(pc) & np.isfinite(po)
        & (pc < po) & (c > o) & (c >= po) & (o <= pc) & (body > pbody * 1.08)
    )

    # 2. Bullish Hammer at Support (EMA-20 or 20D prior low)
    near_support = (
        (np.isfinite(ema20) & (l <= ema20 * 1.015))
        | (np.isfinite(prior_low_20) & (l <= prior_low_20 * 1.02))
    )
    hammer = (
        idx_ge_20
        & (lower_wick >= 2.0 * np.maximum(body, rng * 0.12))
        & (upper_wick <= rng * 0.25)
        & (c >= o * 0.997)
        & near_support
    )

    # 3. Morning Star (3-Bar Reversal)
    morning_star = (
        idx_ge_20
        & np.isfinite(p2c) & np.isfinite(p2o) & np.isfinite(atr) & np.isfinite(pbody)
        & (p2c < p2o)
        & (p2body > atr * 0.55)
        & (pbody < p2body * 0.45)
        & (c > o)
        & (c > (p2o + p2c) / 2.0)
    )

    # 4. Bullish Marubozu Expansion
    marubozu = (
        idx_ge_20
        & np.isfinite(pc) & np.isfinite(vol_ratio)
        & (c > o)
        & ((body / rng) >= 0.78)
        & (((c - pc) / np.maximum(pc, 1e-6)) >= 0.018)
        & (vol_ratio >= 1.35)
    )

    # 5. 20D / 55D Resistance Breakout with Volume Confirmation
    brk20 = (
        idx_ge_20
        & np.isfinite(prior_high_20) & np.isfinite(pc) & np.isfinite(vol_ratio)
        & (c > prior_high_20)
        & (pc <= prior_high_20)
        & (vol_ratio >= 1.30)
    )
    brk55 = brk20 & np.isfinite(prior_high_55) & (c > prior_high_55)

    # 6. Breakout & 20-EMA Pullback Retest
    recent_max_close_10 = df["Close"].shift(1).rolling(window=10, min_periods=5).max().to_numpy(dtype=float)
    retest = (
        idx_ge_20
        & np.isfinite(ema20) & np.isfinite(ema50) & np.isfinite(recent_max_close_10) & np.isfinite(pc)
        & (c > ema20) & (ema20 > ema50)
        & (recent_max_close_10 > c * 1.01)
        & (l <= ema20 * 1.012)
        & (c >= ema20)
        & (c > o)
        & (c > pc)
    )

    # 7. Confirmed Double Bottom (W-Reversal) — strictly causal window [i-25 : i]
    double_bottom_conf = np.zeros(n, dtype=bool)
    if n > 30:
        from numpy.lib.stride_tricks import sliding_window_view

        wins_l = sliding_window_view(l[:-1], 25)  # shape (n-25, 25); row k corresponds to bar i = k + 25
        wins_h = sliding_window_view(h[:-1], 25)
        # Only bars i >= 30 (k >= 5) are eligible
        min1_arr = np.min(wins_l[5:, :12], axis=1)
        min2_arr = np.min(wins_l[5:, 12:], axis=1)
        neck_arr = np.max(wins_h[5:, 8:18], axis=1)
        c_slice = c[30:]
        o_slice = o[30:]
        ema20_slice = ema20[30:]
        double_bottom_conf[30:] = (
            np.isfinite(ema20_slice)
            & (np.abs(min1_arr - min2_arr) / np.maximum(min1_arr, 1e-6) <= 0.018)
            & (c_slice > o_slice)
            & (c_slice >= min2_arr * 1.025)
            & (c_slice >= ema20_slice)
            & (c_slice > neck_arr)
        )

    any_confirmed = engulf | hammer | morning_star | marubozu | brk20 | retest | double_bottom_conf

    return {
        "bullish_engulfing": engulf,
        "bullish_hammer": hammer,
        "morning_star": morning_star,
        "bullish_marubozu": marubozu,
        "resistance_breakout_20d": brk20,
        "resistance_breakout_55d": brk55,
        "breakout_pullback_retest": retest,
        "double_bottom_confirmed": double_bottom_conf,
        "any_bullish_confirmed": any_confirmed,
    }


def detect_patterns_at_index(df: pd.DataFrame, idx: int = -1) -> List[PatternDetection]:
    """
    Detect confirmed and forming candlestick & chart patterns at row `idx`
    without inspecting any bars after `idx` (strictly zero look-ahead).
    """
    if df is None or len(df) < 25:
        return []

    if idx < 0:
        idx = len(df) + idx
    if idx < 20 or idx >= len(df):
        return []

    # Strictly slice up to `idx` so no downstream helper can ever touch future bars
    scoped = df.iloc[: idx + 1]
    if idx >= 40:
        tail_scoped = scoped.iloc[idx - 39 :]
        masks_src = compute_bullish_confirmed_pattern_masks(tail_scoped)
        m_idx = len(tail_scoped) - 1
    else:
        masks_src = compute_bullish_confirmed_pattern_masks(scoped)
        m_idx = idx
    masks = {k: {idx: bool(v[m_idx])} for k, v in masks_src.items()}

    row = scoped.iloc[idx]
    prev = scoped.iloc[idx - 1]

    bar_date = str(scoped.index[idx])[:10]
    c = float(row["Close"])
    o = float(row["Open"])
    h = float(row["High"])
    l = float(row["Low"])
    rng = max(h - l, 1e-6)
    body = abs(c - o)

    pc = float(prev["Close"])
    po = float(prev["Open"])
    pbody = abs(pc - po)

    ema20 = float(row["EMA_20"]) if pd.notna(row.get("EMA_20")) else np.nan
    ema50 = float(row["EMA_50"]) if pd.notna(row.get("EMA_50")) else np.nan
    vol_ratio = float(row["Vol_Ratio_20"]) if pd.notna(row.get("Vol_Ratio_20")) else 1.0
    prior_high_20 = float(row["Prior_High_20"]) if pd.notna(row.get("Prior_High_20")) else np.nan
    prior_low_20 = float(row["Prior_Low_20"]) if pd.notna(row.get("Prior_Low_20")) else np.nan

    lower_wick = min(o, c) - l
    upper_wick = h - max(o, c)
    patterns: List[PatternDetection] = []

    if masks["bullish_engulfing"][idx]:
        strength = 76.0 + (8.0 if vol_ratio >= 1.3 else 0.0) + (6.0 if np.isfinite(ema50) and c > ema50 else 0.0)
        patterns.append(
            _make_pattern(
                "Bullish Engulfing",
                "CANDLESTICK",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                min(92.0, strength),
                f"Green candle (₹{o:.2f}->₹{c:.2f}) engulfed prior red body on {vol_ratio:.2f}x 20-day average volume.",
            )
        )

    if masks["bullish_hammer"][idx]:
        patterns.append(
            _make_pattern(
                "Bullish Hammer at Support",
                "CANDLESTICK",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                79.0,
                f"Lower rejection wick ({lower_wick / rng * 100:.0f}% of candle range) tested support near ₹{l:.2f}.",
            )
        )

    if masks["morning_star"][idx]:
        patterns.append(
            _make_pattern(
                "Morning Star 3-Bar Reversal",
                "CANDLESTICK",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                84.0,
                "3-candle reversal structure: large red bar, narrow star bar, and bullish close above midpoint.",
            )
        )

    if masks["bullish_marubozu"][idx]:
        patterns.append(
            _make_pattern(
                "Bullish Marubozu Expansion",
                "CANDLESTICK",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                82.0,
                f"Full-body bullish candle ({body / rng * 100:.0f}% body-to-range) on {vol_ratio:.2f}x relative volume.",
            )
        )

    if masks["resistance_breakout_20d"][idx]:
        is_55d = bool(masks["resistance_breakout_55d"][idx])
        pat_name = "55-Day Multi-Month Range Breakout" if is_55d else "20-Day Resistance Breakout"
        strength = (87.0 if is_55d else 83.0) + (4.0 if vol_ratio >= 1.8 else 0.0)
        patterns.append(
            _make_pattern(
                pat_name,
                "BREAKOUT_VOLUME",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                min(93.0, strength),
                f"Confirmed close (₹{c:.2f}) above prior 20-day high (₹{prior_high_20:.2f}) on {vol_ratio:.2f}x volume.",
            )
        )

    if masks["breakout_pullback_retest"][idx]:
        recent_max = float(scoped["Close"].iloc[max(0, idx - 10) : idx].max())
        patterns.append(
            _make_pattern(
                "Breakout & 20-EMA Pullback Retest",
                "CHART_STRUCTURE",
                "BULLISH",
                "CONFIRMED",
                bar_date,
                85.0,
                f"Pullback from ₹{recent_max:.2f} tested rising EMA-20 (₹{ema20:.2f}) and closed higher.",
            )
        )

    # Forming / Projected: Ascending Triangle Coiling Below Resistance
    if (
        np.isfinite(prior_high_20)
        and np.isfinite(ema20)
        and np.isfinite(ema50)
        and prior_high_20 * 0.975 <= c <= prior_high_20
        and c > ema20 > ema50
    ):
        lows_15 = scoped["Low"].iloc[idx - 14 : idx + 1].to_numpy(dtype=float)
        if len(lows_15) == 15 and np.min(lows_15[-5:]) > np.min(lows_15[:5]) * 1.01:
            patterns.append(
                _make_pattern(
                    "Ascending Triangle Coiling Below Resistance",
                    "CHART_STRUCTURE",
                    "BULLISH",
                    "FORMING_PROJECTED",
                    bar_date,
                    78.0,
                    f"Higher swing lows compressing within {(prior_high_20 - c) / c * 100:.1f}% of resistance (₹{prior_high_20:.2f}); breakout unconfirmed.",
                )
            )

    # Double Bottom (Confirmed or Forming)
    if idx >= 30 and np.isfinite(ema20):
        win25 = scoped.iloc[idx - 25 : idx]
        min1 = float(win25["Low"].iloc[:12].min())
        min2 = float(win25["Low"].iloc[12:].min())
        neckline = float(win25["High"].iloc[8:18].max())
        if abs(min1 - min2) / max(min1, 1e-6) <= 0.018 and c > o and c >= min2 * 1.025 and c >= ema20:
            is_conf = c > neckline
            patterns.append(
                _make_pattern(
                    "Double Bottom Support Reversal",
                    "CHART_STRUCTURE",
                    "BULLISH",
                    "CONFIRMED" if is_conf else "FORMING_PROJECTED",
                    bar_date,
                    82.0 if is_conf else 74.0,
                    f"Dual support test at ₹{min1:.2f} & ₹{min2:.2f} ({'above' if is_conf else 'below'} ₹{neckline:.2f} neckline).",
                )
            )

    # Bearish Risk Patterns (for Stock Analysis risk/penalty evaluation)
    if pc > po and c < o and c <= po and o >= pc and body > pbody * 1.05:
        patterns.append(
            _make_pattern(
                "Bearish Engulfing Distribution",
                "CANDLESTICK",
                "BEARISH",
                "CONFIRMED",
                bar_date,
                79.0,
                f"Red candle (₹{o:.2f}->₹{c:.2f}) engulfed prior green real body.",
            )
        )

    if (
        np.isfinite(prior_high_20)
        and upper_wick >= 2.0 * max(body, rng * 0.12)
        and lower_wick <= rng * 0.25
        and h >= prior_high_20 * 0.99
    ):
        patterns.append(
            _make_pattern(
                "Shooting Star Supply Rejection",
                "CANDLESTICK",
                "BEARISH",
                "CONFIRMED",
                bar_date,
                76.5,
                f"Long upper-wick rejection from ₹{h:.2f} near overhead 20-day high.",
            )
        )

    if np.isfinite(prior_low_20) and c < prior_low_20 and pc >= prior_low_20:
        patterns.append(
            _make_pattern(
                "20-Day Support Breakdown",
                "CHART_STRUCTURE",
                "BEARISH",
                "CONFIRMED",
                bar_date,
                83.0,
                f"Close (₹{c:.2f}) broke below 20-day support floor (₹{prior_low_20:.2f}).",
            )
        )

    return patterns
