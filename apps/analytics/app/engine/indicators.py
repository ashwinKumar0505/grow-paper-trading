"""Strictly Causal Technical Indicator Engine for Daily Swing and 15m Intraday NSE Data."""

from typing import List, Optional, Tuple
import numpy as np
import pandas as pd


def compute_indicators(df: pd.DataFrame, is_intraday: bool = False) -> pd.DataFrame:
    """
    Compute all technical indicators strictly causally (zero look-ahead bias, zero `.bfill()`).
    Warm-up rows without sufficient prior history remain NaN rather than backfilling future values.
    Expects columns: Open, High, Low, Close, Volume.
    """
    if df is None or df.empty:
        return pd.DataFrame()

    out = df.copy()
    close = out["Close"].astype(float)
    high = out["High"].astype(float)
    low = out["Low"].astype(float)
    open_ = out["Open"].astype(float)
    volume = out["Volume"].astype(float)

    # 1. Moving Averages (EMA & SMA) — strictly causal
    out["EMA_9"] = close.ewm(span=9, min_periods=9, adjust=False).mean()
    out["EMA_20"] = close.ewm(span=20, min_periods=20, adjust=False).mean()
    out["EMA_50"] = close.ewm(span=50, min_periods=35, adjust=False).mean()
    out["EMA_200"] = close.ewm(span=200, min_periods=50, adjust=False).mean()

    out["SMA_20"] = close.rolling(window=20, min_periods=20).mean()
    out["SMA_50"] = close.rolling(window=50, min_periods=35).mean()
    out["SMA_200"] = close.rolling(window=200, min_periods=50).mean()

    # 2. Wilder's RSI (14) — handles flat/zero-loss series without NaN leakage
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1.0 / 14.0, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / 14.0, min_periods=14, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    # When avg_loss == 0 after warmup: if avg_gain > 0 -> RSI 100, else both 0 -> RSI 50
    warm_mask = avg_gain.notna() & avg_loss.notna()
    zero_loss_pos_gain = warm_mask & (avg_loss == 0.0) & (avg_gain > 0.0)
    zero_both = warm_mask & (avg_loss == 0.0) & (avg_gain == 0.0)
    rsi = rsi.mask(zero_loss_pos_gain, 100.0).mask(zero_both, 50.0)
    out["RSI_14"] = rsi

    # 3. MACD (12, 26, 9)
    ema12 = close.ewm(span=12, min_periods=12, adjust=False).mean()
    ema26 = close.ewm(span=26, min_periods=26, adjust=False).mean()
    out["MACD_Line"] = ema12 - ema26
    out["MACD_Signal"] = out["MACD_Line"].ewm(span=9, min_periods=9, adjust=False).mean()
    out["MACD_Hist"] = out["MACD_Line"] - out["MACD_Signal"]

    # 4. Bollinger Bands (20, 2.0)
    bb_std = close.rolling(window=20, min_periods=20).std(ddof=0)
    out["BB_Middle"] = out["SMA_20"]
    out["BB_Upper"] = out["BB_Middle"] + 2.0 * bb_std
    out["BB_Lower"] = out["BB_Middle"] - 2.0 * bb_std
    out["BB_Width"] = (
        (out["BB_Upper"] - out["BB_Lower"]) / out["BB_Middle"].replace(0.0, np.nan)
    ) * 100.0
    band_range = (out["BB_Upper"] - out["BB_Lower"]).replace(0.0, np.nan)
    out["BB_PctB"] = (close - out["BB_Lower"]) / band_range

    # 5. Average True Range (ATR 14) — NO .bfill()! Strictly causal.
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.Series(
        np.fmax(tr1.to_numpy(), np.fmax(tr2.to_numpy(), tr3.to_numpy())),
        index=out.index,
    )
    out["ATR_14"] = tr.ewm(alpha=1.0 / 14.0, min_periods=10, adjust=False).mean()
    out["ATR_Pct"] = (out["ATR_14"] / close.replace(0.0, np.nan)) * 100.0

    # 6. Directional Movement & ADX (14) — strictly causal
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    plus_dm_s = pd.Series(plus_dm, index=out.index).ewm(
        alpha=1.0 / 14.0, min_periods=10, adjust=False
    ).mean()
    minus_dm_s = pd.Series(minus_dm, index=out.index).ewm(
        alpha=1.0 / 14.0, min_periods=10, adjust=False
    ).mean()
    atr_safe = out["ATR_14"].replace(0.0, np.nan)
    out["Plus_DI"] = 100.0 * plus_dm_s / atr_safe
    out["Minus_DI"] = 100.0 * minus_dm_s / atr_safe
    di_sum = (out["Plus_DI"] + out["Minus_DI"]).replace(0.0, np.nan)
    dx = 100.0 * (out["Plus_DI"] - out["Minus_DI"]).abs() / di_sum
    out["ADX_14"] = dx.ewm(alpha=1.0 / 14.0, min_periods=10, adjust=False).mean()

    # 7. Volume Confirmation Metrics
    out["Vol_SMA_20"] = volume.rolling(window=20, min_periods=10).mean().replace(0.0, np.nan)
    out["Vol_Ratio_20"] = volume / out["Vol_SMA_20"]

    # 8. VWAP & Intraday Session-Anchored Opening Range (ORB)
    typical_price = (high + low + close) / 3.0
    tp_vol = typical_price * volume
    if is_intraday:
        session_dates = pd.Series(out.index.date, index=out.index)
        cum_tp_vol = tp_vol.groupby(session_dates).cumsum()
        cum_vol = volume.groupby(session_dates).cumsum().replace(0.0, np.nan)
        out["VWAP"] = (cum_tp_vol / cum_vol).fillna(close)

        # Strictly causal 0-based bar index within each NSE session (resets daily)
        session_bar_idx = session_dates.groupby(session_dates).cumcount()
        out["Session_Bar_Index"] = session_bar_idx.astype(int)

        # Opening Range = first 2 completed 15m bars (bars 0 and 1, i.e., 09:15-09:45 IST)
        # Strictly NaN on bars 0 & 1 so ORB cannot trigger before opening range completes.
        orb_high_seed = high.where(session_bar_idx < 2)
        orb_low_seed = low.where(session_bar_idx < 2)
        orb_high_causal = orb_high_seed.groupby(session_dates).cummax().groupby(session_dates).ffill()
        orb_low_causal = orb_low_seed.groupby(session_dates).cummin().groupby(session_dates).ffill()
        out["ORB_High"] = orb_high_causal.where(session_bar_idx >= 2)
        out["ORB_Low"] = orb_low_causal.where(session_bar_idx >= 2)
    else:
        roll_tp_vol = tp_vol.rolling(window=20, min_periods=5).sum()
        roll_vol = volume.rolling(window=20, min_periods=5).sum().replace(0.0, np.nan)
        out["VWAP"] = (roll_tp_vol / roll_vol).fillna(close)

    # 9. Causal Prior Support & Resistance (shifted by 1 bar so current bar never leaks into prior range)
    out["Prior_High_20"] = high.shift(1).rolling(window=20, min_periods=15).max()
    out["Prior_Low_20"] = low.shift(1).rolling(window=20, min_periods=15).min()
    out["Prior_High_55"] = high.shift(1).rolling(window=55, min_periods=25).max()
    out["Prior_Low_55"] = low.shift(1).rolling(window=55, min_periods=25).min()

    # 10. Candle Anatomy Helpers
    candle_range = (high - low).replace(0.0, np.nan)
    out["Candle_Body"] = (close - open_).abs()
    out["Candle_Body_Pct"] = (out["Candle_Body"] / candle_range).fillna(0.0)
    out["Upper_Wick"] = high - np.maximum(open_, close)
    out["Lower_Wick"] = np.minimum(open_, close) - low
    out["Return_1D_Pct"] = close.pct_change() * 100.0

    return out


def compute_support_resistance_levels(
    df: pd.DataFrame,
    num_levels: int = 3,
    as_of_idx: Optional[int] = None,
) -> Tuple[List[float], List[float]]:
    """
    Identify horizontal support and resistance levels using ONLY bars up to `as_of_idx`
    (confirmed 3-bar swing pivots whose right confirmation bars have already closed).
    """
    if df is None or len(df) < 20:
        return [], []

    if as_of_idx is not None:
        idx = as_of_idx if as_of_idx >= 0 else len(df) + as_of_idx
        if idx < 19 or idx >= len(df):
            return [], []
        scoped = df.iloc[: idx + 1]
    else:
        scoped = df

    recent = scoped.tail(120)
    current_price = float(recent["Close"].iloc[-1])
    highs = recent["High"].to_numpy(dtype=float)
    lows = recent["Low"].to_numpy(dtype=float)

    pivot_highs: List[float] = []
    pivot_lows: List[float] = []

    # Bar i is only a confirmed pivot once bars i+1..i+3 have closed (all strictly <= as_of_idx)
    for i in range(3, len(recent) - 3):
        if highs[i] == np.max(highs[i - 3 : i + 4]):
            pivot_highs.append(float(highs[i]))
        if lows[i] == np.min(lows[i - 3 : i + 4]):
            pivot_lows.append(float(lows[i]))

    last = recent.iloc[-1]
    for col in (
        "EMA_20",
        "EMA_50",
        "EMA_200",
        "Prior_High_20",
        "Prior_Low_20",
        "Prior_High_55",
        "Prior_Low_55",
    ):
        if col in recent.columns and pd.notna(last[col]):
            val = float(last[col])
            if val < current_price:
                pivot_lows.append(val)
            elif val > current_price:
                pivot_highs.append(val)

    supports_raw = sorted([p for p in pivot_lows if p < current_price * 0.998], reverse=True)
    resistances_raw = sorted([p for p in pivot_highs if p > current_price * 1.002])

    def _cluster(levels: List[float]) -> List[float]:
        clustered: List[float] = []
        for lvl in levels:
            if not clustered or abs(lvl - clustered[-1]) / max(clustered[-1], 1e-6) > 0.012:
                clustered.append(round(lvl, 2))
            if len(clustered) >= num_levels:
                break
        return clustered

    supports = _cluster(supports_raw)
    resistances = _cluster(resistances_raw)

    atr_val = last.get("ATR_14", np.nan)
    atr = float(atr_val) if pd.notna(atr_val) and float(atr_val) > 0 else current_price * 0.02
    if not supports:
        supports = [round(current_price - 1.5 * atr, 2), round(current_price - 3.0 * atr, 2)]
    if not resistances:
        resistances = [round(current_price + 2.0 * atr, 2), round(current_price + 4.0 * atr, 2)]

    return supports, resistances
