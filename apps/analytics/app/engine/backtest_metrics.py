"""Honest Performance Metrics, Uncertainty Intervals, and Explicit Metric Definitions."""

import math
from typing import Dict, List, Optional, Tuple
import numpy as np

from app.config import settings
from app.engine.strategies import StrategyDefinition
from app.models.backtest import (
    BacktestTradeRecord,
    ExecutionAssumptions,
    FoldReport,
    PortfolioSimulationSummary,
    StrategyBacktestMetrics,
)
from app.models.signals import ValidationStatus

METRIC_DEFINITIONS: Dict[str, str] = {
    "completed_trades_oos": "Count of completed out-of-sample trades across all chronological walk-forward folds (never mixed with in-sample trades).",
    "net_win_rate_oos_pct": "Percentage of completed out-of-sample trades with strictly positive net return after slippage, brokerage, STT, stamp duty, exchange/SEBI fees, and GST.",
    "win_rate_ci_95": "Wilson score 95% binomial confidence interval around net_win_rate_oos_pct, quantifying finite-sample uncertainty.",
    "target_hit_rate_oos_pct": "Percentage of completed out-of-sample trades exited via TARGET_HIT or GAP_TARGET (distinct from profitable time stops or trailing stops).",
    "stop_loss_hit_rate_oos_pct": "Percentage of completed out-of-sample trades exited via STOP_LOSS_HIT or GAP_STOP_LOSS.",
    "trailing_stop_exit_rate_oos_pct": "Percentage of completed out-of-sample trades exited via protective breakeven TRAILING_STOP.",
    "ambiguous_intrabar_exits_oos": "Count of trades where both stop-loss and target fell within the same bar's [Low, High] range; resolved conservatively as stop-first.",
    "net_return_mean_oos_pct": "Arithmetic mean net return per trade (%) after all estimated friction costs (expected return per trade).",
    "profit_factor_oos": "Sum of positive net trade returns divided by absolute sum of negative net trade returns; null if gross losses equal zero or N=0.",
    "portfolio_max_drawdown_pct": "Maximum peak-to-trough percentage decline of the time-aligned shared-capital portfolio equity curve.",
    "sharpe_ratio_oos": "Annualized Sharpe ratio (rf=0%, sqrt(252)) computed from the time-aligned daily portfolio return series; null when observations < 20 or std = 0.",
    "sortino_ratio_oos": "Annualized Sortino ratio (MAR=0%, sqrt(252)) computed from downside deviations of the time-aligned daily portfolio return series; null when insufficient observations.",
    "heuristic_score_weight": "Static rule-based weight used in Technical Setup Score; NEVER fitted or optimized on out-of-sample backtest results.",
}


def wilson_ci_95(wins: int, total: int, z: float = 1.959964) -> Tuple[Optional[float], Optional[float]]:
    """Compute Wilson score 95% confidence interval (in %) for a binomial proportion."""
    if total <= 0:
        return None, None
    p = wins / total
    z2 = z * z
    denom = 1.0 + z2 / total
    center = (p + z2 / (2.0 * total)) / denom
    half = (z * math.sqrt((p * (1.0 - p) + z2 / (4.0 * total)) / total)) / denom
    low = max(0.0, (center - half) * 100.0)
    high = min(100.0, (center + half) * 100.0)
    return round(low, 2), round(high, 2)


def classify_sample_size(n: int) -> str:
    if n < 10:
        return "INSUFFICIENT"
    if n < 30:
        return "LOW"
    if n < 100:
        return "MODERATE"
    return "ADEQUATE"


def compute_metrics_from_trades(
    strategy_def: StrategyDefinition,
    oos_trades: List[BacktestTradeRecord],
    folds: Optional[List[FoldReport]] = None,
    portfolio_summary: Optional[PortfolioSimulationSummary] = None,
    insufficient_history_reason: Optional[str] = None,
) -> StrategyBacktestMetrics:
    """
    Compute honest out-of-sample metrics from underlying completed trades.
    NEVER substitutes in-sample trades for out-of-sample trades.
    Returns None (`null` in JSON) for mathematically undefined metrics.
    """
    fold_list = folds or []
    strict_oos = [tr for tr in oos_trades if tr.period_split == "OUT_OF_SAMPLE"]
    n = len(strict_oos)
    sample_status = classify_sample_size(n)

    if insufficient_history_reason:
        return StrategyBacktestMetrics(
            strategy_id=strategy_def.strategy_id,
            strategy_name=strategy_def.name,
            category=strategy_def.category,  # type: ignore[arg-type]
            timeframe=strategy_def.timeframe,  # type: ignore[arg-type]
            description=strategy_def.description,
            validation_status="INSUFFICIENT_HISTORY",
            validation_note=insufficient_history_reason,
            simulation_level="UNAVAILABLE",
            sample_size_status="INSUFFICIENT",
            completed_trades_oos=0,
            winning_trades_oos=0,
            losing_trades_oos=0,
            breakeven_trades_oos=0,
            heuristic_score_weight=strategy_def.default_weight,
            folds=fold_list,
            sample_trades=[],
            total_trades_in_sample=0,
            total_trades_out_of_sample=0,
            calibrated_score_weight=strategy_def.default_weight if settings.ENABLE_LEGACY_FIELD_ALIASES else None,
        )

    if n == 0:
        return StrategyBacktestMetrics(
            strategy_id=strategy_def.strategy_id,
            strategy_name=strategy_def.name,
            category=strategy_def.category,  # type: ignore[arg-type]
            timeframe=strategy_def.timeframe,  # type: ignore[arg-type]
            description=strategy_def.description,
            validation_status="INSUFFICIENT_SAMPLE",
            validation_note=(
                "Zero completed out-of-sample trades occurred across walk-forward evaluation folds; "
                "all performance statistics are null."
            ),
            simulation_level="UNAVAILABLE",
            sample_size_status="INSUFFICIENT",
            completed_trades_oos=0,
            winning_trades_oos=0,
            losing_trades_oos=0,
            breakeven_trades_oos=0,
            portfolio_simulation=portfolio_summary,
            heuristic_score_weight=strategy_def.default_weight,
            folds=fold_list,
            sample_trades=[],
            total_trades_in_sample=0,
            total_trades_out_of_sample=0,
            calibrated_score_weight=strategy_def.default_weight if settings.ENABLE_LEGACY_FIELD_ALIASES else None,
        )

    net_rets = np.array([tr.net_return_pct for tr in strict_oos], dtype=float)
    gross_rets = np.array([tr.gross_return_pct for tr in strict_oos], dtype=float)
    costs = np.array([tr.transaction_cost_pct for tr in strict_oos], dtype=float)

    tol = 1e-6
    wins_mask = net_rets > tol
    losses_mask = net_rets < -tol
    be_mask = ~wins_mask & ~losses_mask

    winning_trades = int(np.sum(wins_mask))
    losing_trades = int(np.sum(losses_mask))
    breakeven_trades = int(np.sum(be_mask))

    net_win_rate = round((winning_trades / n) * 100.0, 2)
    ci_low, ci_high = wilson_ci_95(winning_trades, n)

    target_hits = sum(1 for tr in strict_oos if tr.exit_reason in ("TARGET_HIT", "GAP_TARGET"))
    stop_hits = sum(1 for tr in strict_oos if tr.exit_reason in ("STOP_LOSS_HIT", "GAP_STOP_LOSS"))
    trail_hits = sum(1 for tr in strict_oos if tr.exit_reason == "TRAILING_STOP")
    time_hits = sum(1 for tr in strict_oos if tr.exit_reason == "TIME_STOP")
    sess_hits = sum(1 for tr in strict_oos if tr.exit_reason == "SESSION_CLOSE_SQUARE_OFF")
    ambiguous_cnt = sum(1 for tr in strict_oos if tr.intrabar_ambiguous)

    pos_rets = net_rets[wins_mask]
    neg_rets = net_rets[losses_mask]

    gross_profit = float(np.sum(pos_rets)) if len(pos_rets) > 0 else 0.0
    gross_loss = float(np.abs(np.sum(neg_rets))) if len(neg_rets) > 0 else 0.0
    profit_factor = round(gross_profit / gross_loss, 3) if gross_loss > 1e-9 else None

    avg_win = round(float(np.mean(pos_rets)), 3) if len(pos_rets) > 0 else None
    avg_loss = round(float(np.mean(neg_rets)), 3) if len(neg_rets) > 0 else None
    gross_mean = round(float(np.mean(gross_rets)), 3)
    net_mean = round(float(np.mean(net_rets)), 3)
    total_cost = round(float(np.sum(costs)), 3)
    avg_bars = round(float(np.mean([tr.holding_bars for tr in strict_oos])), 2)

    is_intraday = strategy_def.timeframe == "INTRADAY_15M"
    avg_days = avg_bars if not is_intraday else None
    avg_mins = round(avg_bars * 15.0, 1) if is_intraday else None

    min_valid_n = settings.WALK_FORWARD_MIN_SAMPLE_SIZE_VALIDATED
    val_status: ValidationStatus = "VALIDATED" if n >= min_valid_n else "INSUFFICIENT_SAMPLE"
    val_note = (
        f"Evaluated across {len(fold_list)} chronological out-of-sample walk-forward fold(s) "
        f"(N={n}, sample adequacy: {sample_status}, 95% win-rate CI: [{ci_low}%, {ci_high}%]). "
        "Fixed deterministic rules; no parameter optimization performed on out-of-sample data."
    )
    if n < min_valid_n:
        val_note += f" Sample size below minimum threshold ({min_valid_n}); treat metrics as preliminary."

    max_dd = portfolio_summary.max_drawdown_pct if portfolio_summary else None
    sharpe = portfolio_summary.sharpe_ratio if portfolio_summary else None
    sortino = portfolio_summary.sortino_ratio if portfolio_summary else None

    legacy = settings.ENABLE_LEGACY_FIELD_ALIASES

    return StrategyBacktestMetrics(
        strategy_id=strategy_def.strategy_id,
        strategy_name=strategy_def.name,
        category=strategy_def.category,  # type: ignore[arg-type]
        timeframe=strategy_def.timeframe,  # type: ignore[arg-type]
        description=strategy_def.description,
        validation_status=val_status,
        validation_note=val_note,
        simulation_level="INDEPENDENT_TRADE_LEVEL_AND_PORTFOLIO",
        sample_size_status=sample_status,  # type: ignore[arg-type]
        completed_trades_oos=n,
        winning_trades_oos=winning_trades,
        losing_trades_oos=losing_trades,
        breakeven_trades_oos=breakeven_trades,
        ambiguous_intrabar_exits_oos=ambiguous_cnt,
        net_win_rate_oos_pct=net_win_rate,
        win_rate_ci_95_low_pct=ci_low,
        win_rate_ci_95_high_pct=ci_high,
        target_hit_rate_oos_pct=round((target_hits / n) * 100.0, 2),
        stop_loss_hit_rate_oos_pct=round((stop_hits / n) * 100.0, 2),
        trailing_stop_exit_rate_oos_pct=round((trail_hits / n) * 100.0, 2),
        time_stop_exit_rate_oos_pct=round((time_hits / n) * 100.0, 2),
        session_close_exit_rate_oos_pct=round((sess_hits / n) * 100.0, 2),
        gross_return_mean_oos_pct=gross_mean,
        net_return_mean_oos_pct=net_mean,
        avg_win_pct=avg_win,
        avg_loss_pct=avg_loss,
        profit_factor_oos=profit_factor,
        total_estimated_cost_pct=total_cost,
        avg_holding_bars=avg_bars,
        avg_holding_days=avg_days,
        avg_holding_minutes=avg_mins,
        max_drawdown_oos_pct=max_dd,
        sharpe_ratio_oos=sharpe,
        sortino_ratio_oos=sortino,
        portfolio_simulation=portfolio_summary,
        heuristic_score_weight=strategy_def.default_weight,
        folds=fold_list,
        sample_trades=strict_oos[-8:],
        # Deprecated safe mirrors (strictly OOS, never fabricated)
        total_trades_in_sample=0,
        total_trades_out_of_sample=n,
        win_rate_in_sample_pct=None,
        win_rate_out_of_sample_pct=net_win_rate if legacy else None,
        precision_out_of_sample_pct=net_win_rate if legacy else None,
        expectancy_per_trade_oos_pct=net_mean if legacy else None,
        calibrated_score_weight=strategy_def.default_weight if legacy else None,
    )
