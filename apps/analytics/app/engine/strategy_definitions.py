"""Immutable Registry of the 12 Deterministic Swing & Intraday Strategy Definitions."""

from dataclasses import asdict, dataclass
import hashlib
import json
from typing import Any, Dict

from app.data.nse_calendar import INTRADAY_ENTRY_CUTOFF_TIME

STRATEGY_ENGINE_VERSION = "2.0.0"


@dataclass(frozen=True)
class StrategyDefinition:
    strategy_id: str
    name: str
    category: str  # "INDIVIDUAL_INDICATOR", "CHART_PATTERN", "MULTI_FACTOR_ENSEMBLE"
    timeframe: str  # "DAILY_SWING", "INTRADAY_15M"
    default_weight: float
    target_atr_mult: float
    stop_atr_mult: float
    max_holding_bars: int
    min_warmup_bars: int
    description: str


SWING_STRATEGIES: Dict[str, StrategyDefinition] = {
    "EMA_SMA_GOLDEN_PULLBACK": StrategyDefinition(
        strategy_id="EMA_SMA_GOLDEN_PULLBACK",
        name="EMA 20/50/200 Golden Alignment & Pullback",
        category="INDIVIDUAL_INDICATOR",
        timeframe="DAILY_SWING",
        default_weight=1.15,
        target_atr_mult=2.2,
        stop_atr_mult=1.3,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "Uptrend alignment (Close > EMA20 > EMA50 > EMA200, rising 5-bar EMA50) where price "
            "tests or holds near EMA20 (Low <= 1.022*EMA20 or Close <= 1.035*EMA20), prints a green "
            "candle with RSI(14) in 50.0-68.5 and +DI > -DI."
        ),
    ),
    "MACD_MOMENTUM_SURGE": StrategyDefinition(
        strategy_id="MACD_MOMENTUM_SURGE",
        name="MACD Bullish Crossover & ADX Trend Surge",
        category="INDIVIDUAL_INDICATOR",
        timeframe="DAILY_SWING",
        default_weight=1.10,
        target_atr_mult=2.3,
        stop_atr_mult=1.3,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "MACD Line > Signal Line with expanding positive histogram (crossing zero or +12% MoM), "
            "Close > EMA50 > EMA200, ADX(14) >= 20, +DI > -DI, and relative volume >= 1.15x."
        ),
    ),
    "RSI_SUPPORT_BOUNCE": StrategyDefinition(
        strategy_id="RSI_SUPPORT_BOUNCE",
        name="RSI Pullback Recovery in Secular Uptrend",
        category="INDIVIDUAL_INDICATOR",
        timeframe="DAILY_SWING",
        default_weight=1.00,
        target_atr_mult=2.0,
        stop_atr_mult=1.25,
        max_holding_bars=10,
        min_warmup_bars=55,
        description=(
            "Close > SMA200 and >= 0.99*EMA50 after a 3-bar RSI(14) pullback low in 36.0-51.0, "
            "recovering by >= +2.5 points into 48.0-64.0 on a green higher-close candle."
        ),
    ),
    "BREAKOUT_VOLUME_CONFIRM": StrategyDefinition(
        strategy_id="BREAKOUT_VOLUME_CONFIRM",
        name="20-Day Resistance Breakout + Volume Confirmation",
        category="CHART_PATTERN",
        timeframe="DAILY_SWING",
        default_weight=1.30,
        target_atr_mult=2.5,
        stop_atr_mult=1.35,
        max_holding_bars=14,
        min_warmup_bars=55,
        description=(
            "Close breaks above prior 20-day high (prior close <= 1.005 * Prior_High_20) with "
            "volume >= 1.35x 20-day mean, ADX(14) >= 20, +DI > -DI, RSI 53-75, and close in top 35% of bar."
        ),
    ),
    "BOLLINGER_SQUEEZE_BREAKOUT": StrategyDefinition(
        strategy_id="BOLLINGER_SQUEEZE_BREAKOUT",
        name="Bollinger Volatility Squeeze Expansion",
        category="INDIVIDUAL_INDICATOR",
        timeframe="DAILY_SWING",
        default_weight=1.15,
        target_atr_mult=2.3,
        stop_atr_mult=1.3,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "Prior 15-bar average Bollinger Band width <= 14.0% followed by upper-band expansion "
            "(%B >= 0.80), Close > EMA20 > EMA50, positive MACD histogram, green candle, and volume >= 1.25x."
        ),
    ),
    "BREAKOUT_RETEST_SUPPORT": StrategyDefinition(
        strategy_id="BREAKOUT_RETEST_SUPPORT",
        name="Breakout & 20-EMA Support Retest Continuation",
        category="CHART_PATTERN",
        timeframe="DAILY_SWING",
        default_weight=1.25,
        target_atr_mult=2.4,
        stop_atr_mult=1.25,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "Within a Golden EMA stack (Close > EMA20 > EMA50 > EMA200), after a 10-bar high close > 1.008*Close, "
            "price retests EMA20 (Low <= 1.014*EMA20) and rebounds with green higher close, RSI 50-67, +DI > -DI."
        ),
    ),
    "VWAP_ACCUMULATION_TREND": StrategyDefinition(
        strategy_id="VWAP_ACCUMULATION_TREND",
        name="20D Rolling VWAP Accumulation & DI Spread",
        category="INDIVIDUAL_INDICATOR",
        timeframe="DAILY_SWING",
        default_weight=1.20,
        target_atr_mult=2.2,
        stop_atr_mult=1.3,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "Close > 20-day rolling VWAP and EMA20 > EMA50 with volume >= 1.30x, "
            "(+DI - -DI) >= 6.0, green candle, and close in top 35% of bar range."
        ),
    ),
    "CANDLESTICK_PATTERN_CONFIRM": StrategyDefinition(
        strategy_id="CANDLESTICK_PATTERN_CONFIRM",
        name="Confirmed Bullish Candlestick/Structure + Volume Confluence",
        category="CHART_PATTERN",
        timeframe="DAILY_SWING",
        default_weight=1.10,
        target_atr_mult=2.1,
        stop_atr_mult=1.25,
        max_holding_bars=10,
        min_warmup_bars=55,
        description=(
            "At least one confirmed bullish candlestick or structural pattern (Engulfing, Hammer at support, "
            "Morning Star, Marubozu, 20D/55D Breakout, EMA20 Retest, or Double Bottom) above EMA50 with RSI 48-72 and volume >= 1.10x."
        ),
    ),
    "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE": StrategyDefinition(
        strategy_id="MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE",
        name="Multi-Factor Rule-Based Confluence Ensemble",
        category="MULTI_FACTOR_ENSEMBLE",
        timeframe="DAILY_SWING",
        default_weight=1.65,
        target_atr_mult=2.0,
        stop_atr_mult=1.25,
        max_holding_bars=12,
        min_warmup_bars=55,
        description=(
            "Deterministic multi-factor rule confluence requiring >= 3 individual swing strategies triggered, "
            "Close > EMA20 > EMA50 > EMA200, rising EMA50, Close > 20D VWAP, ADX >= 21, (+DI - -DI) >= 7, "
            "RSI 53-71, positive rising MACD histogram, volume >= 1.25x, and close in top 30% of candle."
        ),
    ),
}

INTRADAY_STRATEGIES: Dict[str, StrategyDefinition] = {
    "INTRADAY_ORB_VWAP_BREAKOUT": StrategyDefinition(
        strategy_id="INTRADAY_ORB_VWAP_BREAKOUT",
        name="15m Opening Range & Session VWAP Breakout",
        category="CHART_PATTERN",
        timeframe="INTRADAY_15M",
        default_weight=1.35,
        target_atr_mult=1.9,
        stop_atr_mult=1.1,
        max_holding_bars=14,
        min_warmup_bars=20,
        description=(
            "After the first two completed 15m bars establish the session Opening Range (09:15-09:45 IST), "
            "completed 15m close breaks strictly above Session ORB High and Session VWAP & EMA20 "
            "on >= 1.25x relative bar volume, green candle, RSI(14) 53-75, on bars <= 14:45 IST."
        ),
    ),
    "INTRADAY_VWAP_EMA9_PULLBACK": StrategyDefinition(
        strategy_id="INTRADAY_VWAP_EMA9_PULLBACK",
        name="Session VWAP & EMA-9 Pullback Bounce",
        category="INDIVIDUAL_INDICATOR",
        timeframe="INTRADAY_15M",
        default_weight=1.25,
        target_atr_mult=1.8,
        stop_atr_mult=1.0,
        max_holding_bars=12,
        min_warmup_bars=20,
        description=(
            "Intraday uptrend (Close > Session VWAP and Close > EMA9 >= EMA20) retests EMA9/VWAP "
            "(Low <= 1.006 * max(EMA9, VWAP)) and closes green above prior close with rising MACD histogram, "
            "RSI(14) 50-68, on bars <= 14:45 IST."
        ),
    ),
    "INTRADAY_MOMENTUM_IGNITION": StrategyDefinition(
        strategy_id="INTRADAY_MOMENTUM_IGNITION",
        name="15m Range Breakout & Volume Ignition",
        category="MULTI_FACTOR_ENSEMBLE",
        timeframe="INTRADAY_15M",
        default_weight=1.45,
        target_atr_mult=2.0,
        stop_atr_mult=1.15,
        max_holding_bars=12,
        min_warmup_bars=20,
        description=(
            "15m close breaks above prior 20-bar high, Session VWAP, and EMA20 > EMA50 with >= 1.40x "
            "volume surge, ADX >= 21, +DI > -DI, and close in top 30% of candle on bars <= 14:45 IST."
        ),
    ),
}

ALL_STRATEGIES: Dict[str, StrategyDefinition] = {**SWING_STRATEGIES, **INTRADAY_STRATEGIES}


def serialize_strategy_parameters() -> Dict[str, Dict[str, Any]]:
    return {sid: asdict(sdef) for sid, sdef in sorted(ALL_STRATEGIES.items())}


def compute_strategy_config_hash() -> str:
    payload = {
        "engine_version": STRATEGY_ENGINE_VERSION,
        "intraday_entry_cutoff_ist": INTRADAY_ENTRY_CUTOFF_TIME.strftime("%H:%M:%S"),
        "strategies": serialize_strategy_parameters(),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()[:16]
