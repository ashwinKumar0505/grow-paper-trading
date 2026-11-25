"""Schemas for Technical Setup Scores, swing/intraday scanners, and stock analysis."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.models.common import (
    AnalysisEngineMetadata,
    DataQualitySummary,
    MarketDataProvenance,
    REGULATORY_NOTICE_TEXT,
    ScanCoverageMetrics,
)
from app.models.market import MarketStatusResponse, PriceBar


ValidationStatus = Literal[
    "VALIDATED",
    "PARTIAL_VALIDATION",
    "INSUFFICIENT_SAMPLE",
    "INSUFFICIENT_HISTORY",
    "UNVALIDATED",
]


class IndicatorSnapshot(BaseModel):
    name: str
    value: str
    numeric_value: Optional[float] = None
    signal: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    weight: float
    explanation: str


class PatternDetection(BaseModel):
    name: str
    category: Literal["CANDLESTICK", "CHART_STRUCTURE", "BREAKOUT_VOLUME"]
    direction: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    status: Literal["CONFIRMED", "FORMING_PROJECTED"]
    detected_date: str
    pattern_strength_score: float = Field(
        ...,
        ge=0,
        le=95,
        description="Heuristic structural clarity score (0-95, capped at 95%), not an empirical win probability",
    )
    reliability_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=95,
        description="Deprecated alias for pattern_strength_score (heuristic, non-empirical, capped at 95%)",
    )
    description: str


class ScoreComponent(BaseModel):
    component: str
    score: float
    max_score: float
    signal: Literal["BULLISH", "BEARISH", "NEUTRAL", "PENALTY"]
    details: str


class TechnicalSetupScoreBreakdown(BaseModel):
    """Structured explanation of the deterministic heuristic Technical Setup Score."""

    overall_score: float = Field(..., ge=0.0, le=95.0)
    score_scale: str = "0-95"
    score_type: Literal["HEURISTIC_TECHNICAL_SETUP_SCORE"] = "HEURISTIC_TECHNICAL_SETUP_SCORE"
    is_calibrated_probability: bool = False
    probability_disclaimer: str = (
        "Technical Setup Score (0-95, capped at 95%) measures deterministic rule alignment across trend, "
        "momentum, volume, strategy triggers, and patterns. A score of 85/100 is NOT an "
        "85% probability of profit."
    )
    components: List[ScoreComponent] = Field(default_factory=list)
    positive_conditions: List[str] = Field(default_factory=list)
    negative_conditions: List[str] = Field(default_factory=list)
    risk_factors: List[str] = Field(default_factory=list)
    strategy_alignment: Dict[str, Any] = Field(default_factory=dict)
    data_quality: Dict[str, Any] = Field(default_factory=dict)
    validation_status: ValidationStatus = "UNVALIDATED"


class StrategySignalMatch(BaseModel):
    strategy_id: str
    strategy_name: str
    triggered: bool
    direction: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    heuristic_weight: float
    validation_status: ValidationStatus = "UNVALIDATED"
    empirical_win_rate_oos_pct: Optional[float] = None
    empirical_target_hit_rate_oos_pct: Optional[float] = None
    empirical_profit_factor_oos: Optional[float] = None
    empirical_sample_size_oos: Optional[int] = None
    empirical_win_rate_ci_95_low_pct: Optional[float] = None
    empirical_win_rate_ci_95_high_pct: Optional[float] = None
    condition_summary: str
    # Deprecated safe nullable compatibility mirrors (never fabricated)
    historical_win_rate_pct: Optional[float] = None
    historical_precision_pct: Optional[float] = None
    historical_profit_factor: Optional[float] = None
    weight: float


class SwingSignalItem(BaseModel):
    rank: int
    symbol: str
    name: str
    sector: str
    current_price: float
    last_updated_date: str
    candle_confirmation_status: Literal["COMPLETED_CANDLE", "PRELIMINARY_PARTIAL_CANDLE"] = (
        "COMPLETED_CANDLE"
    )
    data_freshness: Literal["FRESH", "DELAYED", "STALE", "UNAVAILABLE"] = "DELAYED"
    is_stale: bool = False
    primary_strategy_id: Optional[str] = None
    primary_strategy: str
    matched_strategies: List[str]
    detected_patterns: List[str]
    # Canonical heuristic Technical Setup Score (distinct from empirical backtest stats)
    technical_setup_score: float = Field(..., ge=0.0, le=95.0)
    score_type: Literal["HEURISTIC_TECHNICAL_SETUP_SCORE"] = "HEURISTIC_TECHNICAL_SETUP_SCORE"
    score_breakdown: TechnicalSetupScoreBreakdown
    # Empirical historical validation (nullable; never hardcoded)
    validation_status: ValidationStatus = "UNVALIDATED"
    empirical_win_rate_oos_pct: Optional[float] = None
    empirical_target_hit_rate_oos_pct: Optional[float] = None
    backtest_sample_size_oos: Optional[int] = None
    # Deprecated safe aliases (never fabricated)
    confidence_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=95.0,
        description="Deprecated alias for technical_setup_score (heuristic 0-95, capped at 95%, NOT probability)",
    )
    historical_strategy_precision_pct: Optional[float] = Field(
        default=None,
        description="Deprecated nullable alias populated ONLY from validated OOS win rate",
    )
    signal_type: Literal["CONFIRMED_SIGNAL", "PROJECTED_SETUP"]
    signal_type_label: str
    suggested_buy_price: float
    buy_price_note: str
    suggested_buy_date: str
    buy_date_is_confirmed: bool
    signal_confirmed_date: Optional[str] = None
    actionable_session_date: Optional[str] = None
    live_price: Optional[float] = None
    live_price_change_from_signal_pct: Optional[float] = None
    live_entry_status: Optional[
        Literal["IN_ENTRY_ZONE", "EXTENDED", "TARGET_HIT", "STOP_BREACHED"]
    ] = None
    live_quote_timestamp_ist: Optional[str] = None
    target_sell_price: float
    expected_gain_pct: float
    estimated_sell_date: str
    estimated_holding_days: int
    projection_basis: str
    stop_loss: float
    stop_loss_risk_pct: float
    risk_reward_ratio: float
    volume_ratio_20d: float
    rsi_14: float
    adx_14: float
    atr_14: float
    reasoning: List[str]
    risk_notes: List[str]


class SwingScannerResponse(BaseModel):
    status: Literal["OK", "PARTIAL_RESULTS", "STALE_DATA", "PROVIDER_UNAVAILABLE"] = "OK"
    scan_timestamp_ist: str
    data_as_of_date: str
    actionable_session_date: Optional[str] = None
    fetch_timestamp_ist: Optional[str] = None
    data_provider: str
    data_delay_minutes: Optional[int] = 0
    data_freshness: Literal["FRESH", "DELAYED", "STALE", "UNAVAILABLE"] = "FRESH"
    is_stale: bool = False
    universe_name: str = "NSE NIFTY 500"
    total_universe_count: int
    total_scanned: int
    bullish_signals_found: int
    scan_duration_seconds: float
    scan_coverage: ScanCoverageMetrics
    validation_status: ValidationStatus = "UNVALIDATED"
    strategy_version: str
    engine_metadata: AnalysisEngineMetadata
    methodology_disclaimer: str
    signals: List[SwingSignalItem]


class IntradaySignalItem(BaseModel):
    id: str
    symbol: str
    name: str
    sector: str
    strategy_id: str
    strategy_name: str
    technical_setup_score: float = Field(..., ge=0.0, le=95.0)
    score_type: Literal["HEURISTIC_TECHNICAL_SETUP_SCORE"] = "HEURISTIC_TECHNICAL_SETUP_SCORE"
    validation_status: ValidationStatus = "UNVALIDATED"
    empirical_win_rate_oos_pct: Optional[float] = None
    backtest_sample_size_oos: Optional[int] = None
    # Deprecated safe aliases
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=95.0)
    historical_precision_pct: Optional[float] = None
    current_price: float
    vwap: float
    entry_price: float
    entry_execution_model: Literal["NEXT_BAR_OPEN_WITH_SLIPPAGE", "SIGNAL_BAR_CLOSE_REFERENCE"]
    entry_time_ist: str
    target_exit_price: float
    estimated_exit_time_ist: str
    actual_exit_price: Optional[float] = None
    actual_exit_time_ist: Optional[str] = None
    stop_loss: float
    risk_reward_ratio: float
    pnl_pct: Optional[float] = None
    signal_status: Literal[
        "LIVE_ACTIVE_ENTRY",
        "PROJECTED_EXIT_PENDING",
        "COMPLETED_TARGET_HIT",
        "COMPLETED_GAP_TARGET",
        "COMPLETED_STOP_LOSS_HIT",
        "COMPLETED_GAP_STOP_LOSS",
        "COMPLETED_TRAILING_STOP",
        "COMPLETED_SQUARE_OFF_1515",
    ]
    is_projected_exit: bool
    intrabar_ambiguous: bool = False
    minutes_since_entry: Optional[int] = None
    bars_since_entry: Optional[int] = None
    entry_freshness: Optional[Literal["FRESH", "IN_PROGRESS", "CLOSED"]] = None
    live_risk_reward_ratio: Optional[float] = None
    data_freshness: Literal["FRESH", "DELAYED", "STALE", "UNAVAILABLE"] = "DELAYED"
    is_stale: bool = False
    status_badge_text: str
    reasoning: str


class IntradayScannerResponse(BaseModel):
    status: Literal["OK", "PARTIAL_RESULTS", "STALE_DATA", "PAUSED_CLOSED", "PROVIDER_UNAVAILABLE"] = "OK"
    scan_timestamp_ist: str
    fetch_timestamp_ist: Optional[str] = None
    market_status: MarketStatusResponse
    scanner_state: Literal["ACTIVE_SCANNING", "PAUSED_MARKET_CLOSED"]
    session_date: str
    next_auto_refresh_ist: Optional[str] = None
    data_provider: str
    data_delay_minutes: Optional[int] = 0
    data_freshness: Literal["FRESH", "DELAYED", "STALE", "UNAVAILABLE"] = "FRESH"
    is_stale: bool = False
    total_scanned: int
    active_signals_count: int
    completed_trades_count: int
    scan_coverage: ScanCoverageMetrics
    validation_status: ValidationStatus = "UNVALIDATED"
    strategy_version: str
    engine_metadata: AnalysisEngineMetadata
    data_delay_notice: str
    signals: List[IntradaySignalItem]


class StockAnalysisResponse(BaseModel):
    status: Literal["OK", "STALE_DATA", "TECHNICAL_ONLY_POLICY"] = "OK"
    symbol: str
    name: str
    sector: str
    index_tier: str
    analysis_timestamp_ist: str
    data_as_of_date: str
    current_price: float
    day_change_pct: float
    # Canonical heuristic Technical Setup Score & structured breakdown
    technical_setup_score: float = Field(..., ge=0.0, le=95.0)
    score_breakdown: TechnicalSetupScoreBreakdown
    market_outlook: Literal["STRONG_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG_BEARISH"]
    # Algorithmic classification (can be disabled via policy controls)
    signal_classification: Optional[Literal["BUY", "WAIT", "AVOID"]] = None
    classification_type: Literal["ALGORITHMIC_TECHNICAL_CLASSIFICATION", "DISABLED_BY_POLICY"] = (
        "ALGORITHMIC_TECHNICAL_CLASSIFICATION"
    )
    is_investment_advice: bool = False
    regulatory_notice: str = REGULATORY_NOTICE_TEXT
    classification_summary: str
    # Deprecated safe aliases
    overall_confidence_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=95.0,
        description="Deprecated alias for technical_setup_score (heuristic 0-95, capped at 95%, NOT probability)",
    )
    recommendation: Optional[Literal["BUY", "WAIT", "AVOID"]] = Field(
        default=None,
        description="Deprecated alias for signal_classification (algorithmic output, null if disabled)",
    )
    recommendation_summary: str
    # Reproducible reference technical levels (null when disabled by policy)
    entry_zone_low: Optional[float] = None
    entry_zone_high: Optional[float] = None
    entry_trigger_type: Optional[
        Literal["CONFIRMED_CURRENT_PRICE", "WAIT_FOR_PULLBACK_OR_BREAKOUT"]
    ] = None
    projected_target_1: Optional[float] = None
    projected_target_2: Optional[float] = None
    estimated_target_window_days: Optional[str] = None
    estimated_target_date: Optional[str] = None
    stop_loss: Optional[float] = None
    risk_reward_ratio: Optional[float] = None
    support_levels: List[float]
    resistance_levels: List[float]
    # Breakdown & transparency
    supporting_indicators: List[IndicatorSnapshot]
    identified_patterns: List[PatternDetection]
    strategy_evaluations: List[StrategySignalMatch]
    bullish_reasons: List[str]
    risk_factors: List[str]
    reasons_to_avoid: List[str]
    stock_backtest_summary: Dict[str, Any]
    recent_price_bars: List[PriceBar]
    # Provenance, quality & engine metadata
    validation_status: ValidationStatus = "UNVALIDATED"
    data_provenance: MarketDataProvenance
    data_quality: DataQualitySummary
    engine_metadata: AnalysisEngineMetadata
