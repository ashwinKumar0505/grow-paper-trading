"""Core Quantitative Technical Analysis, Pattern Detection, Backtesting, and Scanner Engine."""
from app.engine.indicators import compute_indicators, compute_support_resistance_levels
from app.engine.patterns import detect_patterns_at_index
from app.engine.strategies import (
    SWING_STRATEGIES,
    INTRADAY_STRATEGIES,
    evaluate_swing_strategies_at_index,
    evaluate_intraday_strategies_at_index,
)
from app.engine.backtester import (
    simulate_strategy_on_dataframe,
    compute_metrics_from_trades,
    run_universe_backtest,
    get_cached_or_default_backtest_report,
)
from app.engine.scoring import (
    evaluate_swing_candidate,
    evaluate_intraday_session_signals,
    analyze_single_stock,
)
from app.engine.scanner import (
    run_swing_scanner,
    run_intraday_scanner,
    intraday_auto_scheduler_loop,
)

__all__ = [
    "compute_indicators",
    "compute_support_resistance_levels",
    "detect_patterns_at_index",
    "SWING_STRATEGIES",
    "INTRADAY_STRATEGIES",
    "evaluate_swing_strategies_at_index",
    "evaluate_intraday_strategies_at_index",
    "simulate_strategy_on_dataframe",
    "compute_metrics_from_trades",
    "run_universe_backtest",
    "get_cached_or_default_backtest_report",
    "evaluate_swing_candidate",
    "evaluate_intraday_session_signals",
    "analyze_single_stock",
    "run_swing_scanner",
    "run_intraday_scanner",
    "intraday_auto_scheduler_loop",
]
