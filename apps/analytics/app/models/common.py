"""Shared metadata, provenance, data-quality, coverage, auth, and error schemas."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


REGULATORY_NOTICE_TEXT = (
    "Outputs are deterministic, rule-based technical analytics generated for informational "
    "and educational evaluation only. They are not SEBI-registered Research Analyst "
    "recommendations or personalized investment advice. Disclaimers alone do not satisfy "
    "applicable Research Analyst or Investment Adviser regulatory obligations."
)


class AnalysisEngineMetadata(BaseModel):
    """Explicit disclosure of analysis engine type, methodology, and limitations."""

    schema_version: str = "2.0.0"
    analysis_engine_type: Literal["RULE_BASED_TECHNICAL_ANALYTICS"] = (
        "RULE_BASED_TECHNICAL_ANALYTICS"
    )
    uses_ai_or_ml: bool = False
    strategy_methodology: str = "DETERMINISTIC_MULTI_FACTOR_TECHNICAL_RULES"
    score_methodology: str = "WEIGHTED_HEURISTIC_TECHNICAL_SETUP_SCORE_0_TO_100"
    validation_methodology: str = "CHRONOLOGICAL_WALK_FORWARD_OUT_OF_SAMPLE_EVALUATION"
    strategy_version: str
    data_source: str
    data_limitations: List[str] = Field(default_factory=list)
    regulatory_notice: str = REGULATORY_NOTICE_TEXT


class MarketDataProvenance(BaseModel):
    """Source, adjustment, delay, and freshness provenance for market data."""

    provider_id: str
    provider_display_name: str
    exchange: str = "NSE"
    timezone: str = "Asia/Kolkata"
    is_realtime: bool = True
    estimated_delay_minutes: Optional[int] = 0
    price_adjustment_policy: Literal[
        "SPLIT_AND_DIVIDEND_ADJUSTED", "SPLIT_ADJUSTED_ONLY", "UNADJUSTED_RAW"
    ] = "SPLIT_AND_DIVIDEND_ADJUSTED"
    adjustment_note: str = (
        "Price adjustment metadata tracks whether historical OHLC bars are split/dividend adjusted "
        "or unadjusted; differently adjusted series are never mixed in cache or backtests."
    )
    fetched_at_utc: Optional[str] = None
    fetched_at_ist: Optional[str] = None
    last_completed_candle_ts: Optional[str] = None
    data_freshness: Literal["FRESH", "DELAYED", "STALE", "UNAVAILABLE"] = "UNAVAILABLE"
    is_stale: bool = False
    staleness_trading_days: Optional[int] = None
    has_partial_candle_excluded: bool = False
    cache_layer: Literal[
        "LIVE_PROVIDER",
        "MEMORY_CACHE",
        "DISK_CACHE_FRESH",
        "DISK_CACHE_STALE",
        "UNAVAILABLE",
    ] = "UNAVAILABLE"
    production_approved: bool = True


class DataQualitySummary(BaseModel):
    """Structured validation outcome for an OHLCV time series."""

    is_valid: bool
    total_rows_raw: int
    completed_rows_usable: int
    dropped_invalid_rows: int = 0
    duplicate_timestamps_removed: int = 0
    invalid_ohlc_rows_removed: int = 0
    negative_volume_rows_removed: int = 0
    unexpected_session_dates_count: int = 0
    missing_trading_sessions_estimate: int = 0
    partial_candle_excluded: bool = False
    issues: List[str] = Field(default_factory=list)


class ScanCoverageMetrics(BaseModel):
    """Transparent accounting of universe size, attempted fetches, failures, and caps."""

    universe_name: str = "NSE NIFTY 500"
    universe_version: str
    requested_universe_size: int
    eligible_universe_size: int
    stocks_attempted: int
    stocks_fetched: int
    stocks_analyzed: int
    stocks_skipped: int
    skip_reasons: Dict[str, int] = Field(default_factory=dict)
    stocks_failed: int
    stocks_using_stale_data: int
    matching_signals_count: int
    returned_signals_count: int
    applied_result_limit: Optional[int] = None
    coverage_pct: float = Field(..., ge=0.0, le=100.0)
    is_partial_coverage: bool


class UniverseMetadata(BaseModel):
    """Version, source, and survivorship-bias disclosure for the bundled stock universe."""

    universe_name: str = "NSE NIFTY 500"
    universe_version: str
    effective_date: str
    source: str
    constituent_count: int
    excluded_invalid_entries: List[str] = Field(default_factory=list)
    point_in_time_history_available: bool = False
    survivorship_bias_disclosure: str


class APIErrorResponse(BaseModel):
    """Consistent structured error envelope returned by all non-2xx responses."""

    status: str = "ERROR"
    error_code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp_ist: str
    request_id: Optional[str] = None


class AuthContext(BaseModel):
    """Verified caller identity and entitlement context."""

    authenticated: bool
    auth_mechanism: Literal[
        "DISABLED_DEV_ONLY",
        "HMAC_SERVICE_TOKEN",
        "FIREBASE_ID_TOKEN",
        "ANONYMOUS",
    ]
    user_id: Optional[str] = None
    subscription_tier: Literal["FREE", "PRO", "PREMIUM", "ADMIN", "SERVICE_INTERNAL"] = "FREE"
    roles: List[str] = Field(default_factory=list)
    is_service_call: bool = False
