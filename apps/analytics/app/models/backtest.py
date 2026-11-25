"""Schemas for genuine Walk-Forward Backtesting, execution assumptions, and versioned artifacts."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.models.common import AnalysisEngineMetadata, UniverseMetadata
from app.models.signals import ValidationStatus


class TransactionCostModel(BaseModel):
    swing_slippage_per_side_pct: float
    swing_commission_round_trip_pct: float
    swing_total_round_trip_friction_pct: float
    swing_breakdown: Dict[str, float]
    intraday_slippage_per_side_pct: float
    intraday_commission_round_trip_pct: float
    intraday_total_round_trip_friction_pct: float
    intraday_breakdown: Dict[str, float]


class ExecutionAssumptions(BaseModel):
    entry_timing: str = "NEXT_BAR_OPEN_PLUS_SLIPPAGE"
    exit_timing: str = "STOP_OR_TARGET_INTRABAR_OR_GAP_OPEN_OR_TIME_STOP_CLOSE"
    intrabar_ambiguity_policy: Literal["CONSERVATIVE_STOP_FIRST"] = "CONSERVATIVE_STOP_FIRST"
    gap_handling: str = (
        "If candle open gaps past stop-loss or target, fill occurs at candle open plus/minus slippage."
    )
    breakeven_trailing_stop_enabled: bool = True
    breakeven_trigger_atr_mult: float = 0.95
    breakeven_buffer_pct: float = 0.15
    intraday_session_end_policy: str = (
        "All intraday trades must enter on completed bars <= 14:45 IST and force-exit on or before "
        "the session's final completed bar (15:15 IST); zero overnight holding allowed."
    )
    swing_holding_period_policy: str = (
        "Fixed strategy-specific maximum holding bars (10-14 daily sessions) unless exited earlier."
    )
    portfolio_initial_capital_inr: float = 1_000_000.0
    portfolio_position_size_pct: float = 10.0
    portfolio_max_concurrent_positions: int = 10
    overlapping_same_symbol_positions_allowed: bool = False


class BacktestTradeRecord(BaseModel):
    symbol: str
    strategy_id: str
    strategy_name: str
    timeframe: Literal["DAILY_SWING", "INTRADAY_15M"]
    fold_id: int
    period_split: Literal["PREPARATION", "VALIDATION", "OUT_OF_SAMPLE"]
    signal_date: str
    entry_date: str
    entry_price: float
    exit_date: str
    exit_price: float
    holding_bars: int
    holding_days: Optional[int] = None
    holding_minutes: Optional[int] = None
    gross_return_pct: float
    net_return_pct: float
    slippage_cost_pct: float
    commission_cost_pct: float
    transaction_cost_pct: float
    exit_reason: Literal[
        "TARGET_HIT",
        "GAP_TARGET",
        "STOP_LOSS_HIT",
        "GAP_STOP_LOSS",
        "TRAILING_STOP",
        "TIME_STOP",
        "SESSION_CLOSE_SQUARE_OFF",
    ]
    intrabar_ambiguous: bool = False
    won: bool


class FoldReport(BaseModel):
    """Per-fold chronological walk-forward accounting."""

    fold_id: int
    timeframe: Literal["DAILY_SWING", "INTRADAY_15M"]
    preparation_start_date: str
    preparation_end_date: str
    training_or_selection_period: Optional[str] = None
    validation_period: Optional[str] = None
    oos_start_date: str
    oos_end_date: str
    instruments_considered: int
    eligible_instruments: int
    completed_trades: int
    winning_trades: int
    losing_trades: int
    breakeven_trades: int
    net_win_rate_pct: Optional[float] = None
    net_return_mean_pct: Optional[float] = None
    gross_return_mean_pct: Optional[float] = None
    portfolio_net_return_pct: Optional[float] = None
    portfolio_max_drawdown_pct: Optional[float] = None
    total_estimated_cost_pct: Optional[float] = None
    transaction_cost_assumptions: Dict[str, float]


class PortfolioSimulationSummary(BaseModel):
    """Genuine time-aligned portfolio simulation accounting for shared capital and concurrency."""

    simulation_scope: Literal["TIME_ALIGNED_PORTFOLIO", "UNAVAILABLE_INSUFFICIENT_DATA"]
    initial_capital_inr: float
    final_capital_inr: Optional[float] = None
    net_return_pct: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    executed_trades_count: int = 0
    skipped_due_to_capital_or_slots: int = 0
    return_series_observations: int = 0
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_concurrent_positions_limit: int
    position_size_pct: float
    notes: str


class StrategyBacktestMetrics(BaseModel):
    strategy_id: str
    strategy_name: str
    category: Literal["INDIVIDUAL_INDICATOR", "CHART_PATTERN", "MULTI_FACTOR_ENSEMBLE"]
    timeframe: Literal["DAILY_SWING", "INTRADAY_15M"]
    description: str
    validation_status: ValidationStatus
    validation_note: str
    simulation_level: Literal["INDEPENDENT_TRADE_LEVEL_AND_PORTFOLIO", "UNAVAILABLE"] = (
        "INDEPENDENT_TRADE_LEVEL_AND_PORTFOLIO"
    )
    sample_size_status: Literal["INSUFFICIENT", "LOW", "MODERATE", "ADEQUATE"]
    # Explicit trade counts (strictly OOS; never mixed with IS)
    completed_trades_oos: int
    winning_trades_oos: int
    losing_trades_oos: int
    breakeven_trades_oos: int
    ambiguous_intrabar_exits_oos: int = 0
    # Separated, explicitly defined rates (null when N=0)
    net_win_rate_oos_pct: Optional[float] = None
    win_rate_ci_95_low_pct: Optional[float] = None
    win_rate_ci_95_high_pct: Optional[float] = None
    target_hit_rate_oos_pct: Optional[float] = None
    stop_loss_hit_rate_oos_pct: Optional[float] = None
    trailing_stop_exit_rate_oos_pct: Optional[float] = None
    time_stop_exit_rate_oos_pct: Optional[float] = None
    session_close_exit_rate_oos_pct: Optional[float] = None
    # Returns, expectancy, costs & holding period
    gross_return_mean_oos_pct: Optional[float] = None
    net_return_mean_oos_pct: Optional[float] = None
    avg_win_pct: Optional[float] = None
    avg_loss_pct: Optional[float] = None
    profit_factor_oos: Optional[float] = None
    total_estimated_cost_pct: Optional[float] = None
    avg_holding_bars: Optional[float] = None
    avg_holding_days: Optional[float] = None
    avg_holding_minutes: Optional[float] = None
    # Portfolio-level risk metrics (null when series prerequisites are not met)
    max_drawdown_oos_pct: Optional[float] = None
    sharpe_ratio_oos: Optional[float] = None
    sortino_ratio_oos: Optional[float] = None
    portfolio_simulation: Optional[PortfolioSimulationSummary] = None
    # Heuristic rule weight (static, NOT fitted on OOS)
    heuristic_score_weight: float
    folds: List[FoldReport] = Field(default_factory=list)
    sample_trades: List[BacktestTradeRecord] = Field(default_factory=list)
    # Deprecated safe nullable compatibility mirrors
    total_trades_in_sample: int = 0
    total_trades_out_of_sample: int = 0
    win_rate_in_sample_pct: Optional[float] = None
    win_rate_out_of_sample_pct: Optional[float] = None
    precision_out_of_sample_pct: Optional[float] = None
    expectancy_per_trade_oos_pct: Optional[float] = None
    calibrated_score_weight: Optional[float] = None


class ArtifactMetadata(BaseModel):
    schema_version: str = "2.0.0"
    run_id: str
    generated_at_utc: str
    generated_at_ist: str
    strategy_version: str
    strategy_config_hash: str
    config_version: str
    data_provider_id: str
    data_adjustment_policy: str
    universe_version: str
    universe_effective_date: str
    historical_date_range_daily: Optional[str] = None
    historical_date_range_intraday: Optional[str] = None
    validation_methodology: str
    walk_forward_mode: Literal["EXPANDING", "ROLLING"]
    parameter_fitting_performed: bool = False
    random_seed: Optional[int] = None
    is_partial_run: bool = False
    is_synthetic_fixture: bool = False
    data_quality_exclusions: Dict[str, Any] = Field(default_factory=dict)
    strategy_parameters: Dict[str, Any] = Field(default_factory=dict)


class BacktestReportResponse(BaseModel):
    validation_status: ValidationStatus
    validation_summary_note: str
    generated_at_ist: str
    data_source: str
    universe_metadata: UniverseMetadata
    universe_tested_count: int
    intraday_universe_tested_count: int = 0
    walk_forward_mode: Literal["EXPANDING", "ROLLING"] = "EXPANDING"
    walk_forward_folds_requested: int = 4
    walk_forward_folds: int = 0
    intraday_walk_forward_folds: int = 0
    daily_folds: List[FoldReport] = Field(default_factory=list)
    intraday_folds: List[FoldReport] = Field(default_factory=list)
    in_sample_period: Optional[str] = None
    out_of_sample_period: Optional[str] = None
    cost_model: Dict[str, Any]
    execution_assumptions: ExecutionAssumptions
    metric_definitions: Dict[str, str]
    artifact_metadata: ArtifactMetadata
    engine_metadata: AnalysisEngineMetadata
    strategies: List[StrategyBacktestMetrics] = Field(default_factory=list)
    scoring_methodology: Dict[str, Any]
    # Deprecated safe nullable summary fields (never fabricated)
    best_ensemble_win_rate_oos_pct: Optional[float] = None
    best_individual_win_rate_oos_pct: Optional[float] = None
    best_ensemble_precision_oos_pct: Optional[float] = None
    best_individual_precision_oos_pct: Optional[float] = None
    target_precision_note: str = ""
    regime_status: str = ""
