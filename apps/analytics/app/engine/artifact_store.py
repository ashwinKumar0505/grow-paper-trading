"""Backtest Artifact Versioning, Compatibility Verification, and Honest Unvalidated Fallbacks."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from app.config import settings
from app.data.cache import market_cache
from app.data.nifty500_constituents import UNIVERSE_VERSION, get_universe_metadata
from app.data.nse_calendar import get_now_ist
from app.engine.backtest_execution import default_execution_assumptions
from app.engine.backtest_metrics import METRIC_DEFINITIONS, compute_metrics_from_trades
from app.engine.strategy_definitions import (
    INTRADAY_STRATEGIES,
    STRATEGY_ENGINE_VERSION,
    SWING_STRATEGIES,
    compute_strategy_config_hash,
    serialize_strategy_parameters,
)
from app.models.backtest import ArtifactMetadata, BacktestReportResponse
from app.models.common import AnalysisEngineMetadata

ARTIFACT_SCHEMA_VERSION = "2.0.0"


def build_cost_model_dict() -> Dict[str, Any]:
    swing_comm = settings.swing_round_trip_commission_pct
    intra_comm = settings.intraday_round_trip_commission_pct
    return {
        "swing_slippage_per_side_pct": settings.SWING_SLIPPAGE_PCT,
        "swing_commission_round_trip_pct": swing_comm,
        "swing_total_round_trip_friction_pct": round(2.0 * settings.SWING_SLIPPAGE_PCT + swing_comm, 4),
        "swing_breakdown": {
            "stt_buy_pct": settings.SWING_STT_BUY_PCT,
            "stt_sell_pct": settings.SWING_STT_SELL_PCT,
            "stamp_duty_buy_pct": settings.SWING_STAMP_DUTY_BUY_PCT,
            "brokerage_per_side_pct": settings.SWING_BROKERAGE_PCT,
            "exchange_sebi_per_side_pct": settings.SWING_EXCHANGE_SEBI_PCT,
            "gst_on_charges_pct": settings.SWING_GST_ON_CHARGES_PCT,
        },
        "intraday_slippage_per_side_pct": settings.INTRADAY_SLIPPAGE_PCT,
        "intraday_commission_round_trip_pct": intra_comm,
        "intraday_total_round_trip_friction_pct": round(2.0 * settings.INTRADAY_SLIPPAGE_PCT + intra_comm, 4),
        "intraday_breakdown": {
            "stt_buy_pct": settings.INTRADAY_STT_BUY_PCT,
            "stt_sell_pct": settings.INTRADAY_STT_SELL_PCT,
            "stamp_duty_buy_pct": settings.INTRADAY_STAMP_DUTY_BUY_PCT,
            "brokerage_per_side_pct": settings.INTRADAY_BROKERAGE_PCT,
            "exchange_sebi_per_side_pct": settings.INTRADAY_EXCHANGE_SEBI_PCT,
            "gst_on_charges_pct": settings.INTRADAY_GST_ON_CHARGES_PCT,
        },
    }


def backtest_artifact_name(provider_id: Optional[str] = None) -> str:
    """Return provider-scoped backtest report artifact name."""
    pid = (provider_id or settings.MARKET_DATA_PROVIDER).strip().lower()
    return f"backtest_report_{pid}"


def check_artifact_compatibility(
    report: BacktestReportResponse,
    active_provider_id: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Verify a loaded backtest artifact matches the active provider, engine, strategy hash, and universe."""
    meta = report.artifact_metadata
    expected_provider = (active_provider_id or settings.MARKET_DATA_PROVIDER).strip().lower()
    if meta.data_provider_id.strip().lower() != expected_provider:
        return False, (
            f"Data provider mismatch: artifact={meta.data_provider_id}, active={expected_provider}"
        )
    if meta.schema_version != ARTIFACT_SCHEMA_VERSION:
        return False, f"Schema version mismatch: artifact={meta.schema_version}, active={ARTIFACT_SCHEMA_VERSION}"
    if meta.strategy_version != STRATEGY_ENGINE_VERSION:
        return False, f"Strategy version mismatch: artifact={meta.strategy_version}, active={STRATEGY_ENGINE_VERSION}"
    active_hash = compute_strategy_config_hash()
    if meta.strategy_config_hash != active_hash:
        return False, f"Strategy config hash mismatch: artifact={meta.strategy_config_hash}, active={active_hash}"
    if meta.universe_version != UNIVERSE_VERSION:
        return False, f"Universe version mismatch: artifact={meta.universe_version}, active={UNIVERSE_VERSION}"
    if meta.data_adjustment_policy != settings.PRICE_ADJUSTMENT_POLICY:
        return False, (
            f"Data adjustment mismatch: artifact={meta.data_adjustment_policy}, "
            f"active={settings.PRICE_ADJUSTMENT_POLICY}"
        )
    if meta.is_synthetic_fixture:
        return False, "Synthetic test fixture artifact cannot be served as NSE historical validation."
    return True, None


def get_validated_backtest_report(
    active_provider_id: Optional[str] = None,
) -> Tuple[Optional[BacktestReportResponse], Optional[str]]:
    """Load persisted backtest report ONLY if provider, schema, strategy hash, and config are compatible."""
    expected_provider = (active_provider_id or settings.MARKET_DATA_PROVIDER).strip().lower()
    raw = market_cache.load_json_artifact(backtest_artifact_name(expected_provider))
    if not raw and expected_provider == "yfinance":
        raw = market_cache.load_json_artifact("backtest_report")
    if not raw:
        return None, f"No backtest report artifact exists on disk for provider '{expected_provider}'."
    try:
        report = BacktestReportResponse(**raw)
    except Exception as exc:
        return None, f"Existing backtest artifact failed schema validation (legacy/incompatible): {exc}"
    ok, reason = check_artifact_compatibility(report, active_provider_id=expected_provider)
    if not ok:
        return None, reason
    return report, None


def build_unvalidated_backtest_report(reason: str) -> BacktestReportResponse:
    """Return an explicit, honest UNVALIDATED report with null metrics when no valid artifact exists."""
    now_utc = datetime.now(timezone.utc)
    now_ist = get_now_ist()
    univ_meta = get_universe_metadata()
    assumptions = default_execution_assumptions()

    strategies = [
        compute_metrics_from_trades(
            strategy_def=sdef,
            oos_trades=[],
            folds=[],
            insufficient_history_reason=reason,
        )
        for sdef in list(SWING_STRATEGIES.values()) + list(INTRADAY_STRATEGIES.values())
    ]

    artifact_meta = ArtifactMetadata(
        schema_version=ARTIFACT_SCHEMA_VERSION,
        run_id="unvalidated",
        generated_at_utc=now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        generated_at_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        strategy_version=STRATEGY_ENGINE_VERSION,
        strategy_config_hash=compute_strategy_config_hash(),
        config_version=settings.APP_VERSION,
        data_provider_id=settings.MARKET_DATA_PROVIDER,
        data_adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        universe_version=UNIVERSE_VERSION,
        universe_effective_date=univ_meta.effective_date,
        validation_methodology=f"{settings.WALK_FORWARD_MODE}_CHRONOLOGICAL_WALK_FORWARD_OOS_EVALUATION_FIXED_RULES",
        walk_forward_mode=settings.WALK_FORWARD_MODE,
        parameter_fitting_performed=False,
        is_partial_run=True,
        strategy_parameters=serialize_strategy_parameters(),
    )

    engine_meta = AnalysisEngineMetadata(
        strategy_version=STRATEGY_ENGINE_VERSION,
        validation_methodology=artifact_meta.validation_methodology,
        data_source=f"{settings.MARKET_DATA_PROVIDER} (No compatible validated backtest artifact)",
        data_limitations=[reason, univ_meta.survivorship_bias_disclosure],
    )

    return BacktestReportResponse(
        validation_status="UNVALIDATED",
        validation_summary_note=reason,
        generated_at_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        data_source=engine_meta.data_source,
        universe_metadata=univ_meta,
        universe_tested_count=0,
        intraday_universe_tested_count=0,
        walk_forward_mode=settings.WALK_FORWARD_MODE,
        walk_forward_folds_requested=settings.WALK_FORWARD_DEFAULT_FOLDS,
        walk_forward_folds=0,
        intraday_walk_forward_folds=0,
        cost_model=build_cost_model_dict(),
        execution_assumptions=assumptions,
        metric_definitions=METRIC_DEFINITIONS,
        artifact_metadata=artifact_meta,
        engine_metadata=engine_meta,
        strategies=strategies,
        scoring_methodology={
            "score_type": "HEURISTIC_TECHNICAL_SETUP_SCORE",
            "is_calibrated_probability": False,
        },
        target_precision_note=reason,
        regime_status="UNVALIDATED",
    )
