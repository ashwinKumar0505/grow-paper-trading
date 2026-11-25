"""Genuine Chronological Multi-Fold Walk-Forward Out-of-Sample Backtesting Engine."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple
import uuid
import numpy as np
import pandas as pd

from app.config import settings
from app.data.cache import market_cache
from app.data.nifty500_constituents import UNIVERSE_VERSION, get_universe_metadata
from app.data.nse_calendar import get_now_ist
from app.engine.artifact_store import (
    ARTIFACT_SCHEMA_VERSION,
    build_cost_model_dict as _build_cost_model_dict,
    build_unvalidated_backtest_report,
    check_artifact_compatibility,
    get_validated_backtest_report,
)
from app.engine.backtest_execution import (
    default_execution_assumptions,
    simulate_portfolio_from_trades,
    simulate_strategy_on_dataframe,
)
from app.engine.backtest_metrics import METRIC_DEFINITIONS, compute_metrics_from_trades
from app.engine.indicators import compute_indicators
from app.engine.strategies import (
    INTRADAY_STRATEGIES,
    STRATEGY_ENGINE_VERSION,
    SWING_STRATEGIES,
    StrategyDefinition,
    compute_intraday_trigger_arrays,
    compute_strategy_config_hash,
    compute_swing_trigger_arrays,
    serialize_strategy_parameters,
)
from app.models.backtest import (
    ArtifactMetadata,
    BacktestReportResponse,
    BacktestTradeRecord,
    ExecutionAssumptions,
    FoldReport,
    StrategyBacktestMetrics,
)
from app.models.common import AnalysisEngineMetadata
from app.models.signals import ValidationStatus

@dataclass(frozen=True)
class WalkForwardFoldSpec:
    fold_id: int
    timeframe: Literal["DAILY_SWING", "INTRADAY_15M"]
    prep_start: pd.Timestamp
    prep_end: pd.Timestamp
    oos_start: pd.Timestamp
    oos_end: pd.Timestamp


def build_walk_forward_folds(
    timeline: List[pd.Timestamp],
    timeframe: Literal["DAILY_SWING", "INTRADAY_15M"],
    num_folds: int = 4,
    mode: Literal["EXPANDING", "ROLLING"] = "EXPANDING",
    min_warmup_bars: int = 60,
    min_oos_bars_per_fold: int = 25,
    rolling_train_bars: int = 120,
    min_intraday_sessions: int = 20,
) -> Tuple[List[WalkForwardFoldSpec], Optional[str]]:
    """
    Construct strictly chronological, non-overlapping walk-forward folds over `timeline`.
    Returns `(folds, error_reason)`. If history is insufficient, returns `([], reason)`.
    """
    if not timeline:
        return [], "Empty historical timeline; cannot build walk-forward folds."

    sorted_ts = sorted(set(timeline))
    n = len(sorted_ts)

    if timeframe == "INTRADAY_15M":
        unique_days = sorted({ts.date() for ts in sorted_ts})
        if len(unique_days) < min_intraday_sessions:
            return (
                [],
                f"Insufficient intraday history for {num_folds}-fold walk-forward validation: "
                f"found {len(unique_days)} trading session(s), minimum required is {min_intraday_sessions}.",
            )
        # Partition sessions chronologically: initial warmup sessions + num_folds non-overlapping OOS session blocks
        warmup_sessions = max(2, len(unique_days) // 5)
        oos_sessions = unique_days[warmup_sessions:]
        if len(oos_sessions) < num_folds:
            return (
                [],
                f"Insufficient intraday OOS sessions ({len(oos_sessions)}) for {num_folds} folds.",
            )
        splits = np.array_split(oos_sessions, num_folds)
        folds: List[WalkForwardFoldSpec] = []
        for idx, block in enumerate(splits, start=1):
            oos_dates = set(block.tolist())
            oos_ts = [ts for ts in sorted_ts if ts.date() in oos_dates]
            if not oos_ts:
                continue
            oos_start = oos_ts[0]
            oos_end = oos_ts[-1]
            prior_ts = [ts for ts in sorted_ts if ts < oos_start]
            if not prior_ts:
                continue
            prep_start = prior_ts[0] if mode == "EXPANDING" else prior_ts[max(0, len(prior_ts) - rolling_train_bars)]
            prep_end = prior_ts[-1]
            folds.append(
                WalkForwardFoldSpec(
                    fold_id=idx,
                    timeframe="INTRADAY_15M",
                    prep_start=prep_start,
                    prep_end=prep_end,
                    oos_start=oos_start,
                    oos_end=oos_end,
                )
            )
        return folds, None

    # DAILY_SWING chronological bar-indexed walk-forward folds
    min_total = min_warmup_bars + num_folds * min_oos_bars_per_fold
    if n < min_total:
        return (
            [],
            f"Insufficient daily history for {num_folds}-fold walk-forward validation: "
            f"found {n} timeline bars, minimum required is {min_total} "
            f"({min_warmup_bars} warm-up + {num_folds}x{min_oos_bars_per_fold} OOS bars).",
        )

    oos_pool = sorted_ts[min_warmup_bars:]
    splits = np.array_split(oos_pool, num_folds)
    folds = []
    for idx, block in enumerate(splits, start=1):
        block_list = list(block)
        if len(block_list) < min_oos_bars_per_fold:
            return (
                [],
                f"Fold {idx} OOS window has only {len(block_list)} bars (< minimum {min_oos_bars_per_fold}).",
            )
        oos_start = block_list[0]
        oos_end = block_list[-1]
        oos_start_pos = sorted_ts.index(oos_start)
        prep_end_pos = oos_start_pos - 1
        if mode == "EXPANDING":
            prep_start_pos = 0
        else:
            prep_start_pos = max(0, oos_start_pos - max(rolling_train_bars, min_warmup_bars))
        folds.append(
            WalkForwardFoldSpec(
                fold_id=idx,
                timeframe="DAILY_SWING",
                prep_start=sorted_ts[prep_start_pos],
                prep_end=sorted_ts[prep_end_pos],
                oos_start=oos_start,
                oos_end=oos_end,
            )
        )
    return folds, None


def _evaluate_strategy_across_folds(
    strategy_def: StrategyDefinition,
    prepared_dfs: Dict[str, pd.DataFrame],
    masks_by_sym: Dict[str, Dict[str, np.ndarray]],
    fold_specs: List[WalkForwardFoldSpec],
    slippage_pct: float,
    commission_rt_pct: float,
    assumptions: ExecutionAssumptions,
    timeline_strs: List[str],
    insufficient_reason: Optional[str] = None,
) -> StrategyBacktestMetrics:
    """Run strictly chronological non-overlapping fold evaluation for a single strategy."""
    if insufficient_reason or not fold_specs:
        return compute_metrics_from_trades(
            strategy_def=strategy_def,
            oos_trades=[],
            folds=[],
            insufficient_history_reason=insufficient_reason or "No valid walk-forward folds available.",
        )

    is_intraday = strategy_def.timeframe == "INTRADAY_15M"
    all_oos_trades: List[BacktestTradeRecord] = []
    fold_reports: List[FoldReport] = []
    instruments_considered = len(prepared_dfs)

    for fspec in fold_specs:
        fold_trades: List[BacktestTradeRecord] = []
        eligible_instruments = 0

        for sym, ind_df in prepared_dfs.items():
            idx = ind_df.index
            # Find index bounds strictly inside [oos_start, oos_end]
            in_fold_positions = np.where((idx >= fspec.oos_start) & (idx <= fspec.oos_end))[0]
            if len(in_fold_positions) < 2:
                continue
            eval_start_idx = int(in_fold_positions[0])
            eval_end_idx = int(in_fold_positions[-1])
            # Instrument must have sufficient causal warmup bars strictly before fold OOS start
            if eval_start_idx < strategy_def.min_warmup_bars:
                continue

            eligible_instruments += 1
            sym_trades = simulate_strategy_on_dataframe(
                symbol=sym,
                df_with_ind=ind_df,
                strategy_def=strategy_def,
                slippage_pct=slippage_pct,
                commission_round_trip_pct=commission_rt_pct,
                trigger_mask=masks_by_sym[sym].get(strategy_def.strategy_id),
                eval_start_idx=eval_start_idx,
                eval_end_idx=eval_end_idx,
                fold_id=fspec.fold_id,
                period_split="OUT_OF_SAMPLE",
                assumptions=assumptions,
            )
            fold_trades.extend(sym_trades)

        all_oos_trades.extend(fold_trades)
        fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"
        fold_timeline = [
            t_str for t_str in timeline_strs
            if fspec.oos_start.strftime(fmt) <= t_str <= fspec.oos_end.strftime(fmt)
        ]
        fold_port = simulate_portfolio_from_trades(
            trades=fold_trades,
            timeline_dates=fold_timeline,
            assumptions=assumptions,
            is_intraday=is_intraday,
            min_return_observations=10,
        )

        n_f = len(fold_trades)
        wins_f = sum(1 for tr in fold_trades if tr.net_return_pct > 1e-6)
        losses_f = sum(1 for tr in fold_trades if tr.net_return_pct < -1e-6)
        be_f = n_f - wins_f - losses_f
        fold_reports.append(
            FoldReport(
                fold_id=fspec.fold_id,
                timeframe=fspec.timeframe,
                preparation_start_date=fspec.prep_start.strftime(fmt),
                preparation_end_date=fspec.prep_end.strftime(fmt),
                training_or_selection_period=None,
                validation_period=None,
                oos_start_date=fspec.oos_start.strftime(fmt),
                oos_end_date=fspec.oos_end.strftime(fmt),
                instruments_considered=instruments_considered,
                eligible_instruments=eligible_instruments,
                completed_trades=n_f,
                winning_trades=wins_f,
                losing_trades=losses_f,
                breakeven_trades=be_f,
                net_win_rate_pct=round((wins_f / n_f) * 100.0, 2) if n_f > 0 else None,
                net_return_mean_pct=round(float(np.mean([tr.net_return_pct for tr in fold_trades])), 3)
                if n_f > 0
                else None,
                gross_return_mean_pct=round(float(np.mean([tr.gross_return_pct for tr in fold_trades])), 3)
                if n_f > 0
                else None,
                portfolio_net_return_pct=fold_port.net_return_pct,
                portfolio_max_drawdown_pct=fold_port.max_drawdown_pct,
                total_estimated_cost_pct=round(float(sum(tr.transaction_cost_pct for tr in fold_trades)), 3)
                if n_f > 0
                else None,
                transaction_cost_assumptions={
                    "slippage_per_side_pct": slippage_pct,
                    "commission_round_trip_pct": commission_rt_pct,
                    "total_round_trip_friction_pct": round(2.0 * slippage_pct + commission_rt_pct, 4),
                },
            )
        )

    # Full OOS chronological portfolio simulation (strictly across the union of OOS fold periods)
    fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"
    oos_start_global = fold_specs[0].oos_start.strftime(fmt)
    oos_end_global = fold_specs[-1].oos_end.strftime(fmt)
    oos_timeline = [t_str for t_str in timeline_strs if oos_start_global <= t_str <= oos_end_global]
    full_portfolio = simulate_portfolio_from_trades(
        trades=all_oos_trades,
        timeline_dates=oos_timeline,
        assumptions=assumptions,
        is_intraday=is_intraday,
        min_return_observations=20,
    )

    return compute_metrics_from_trades(
        strategy_def=strategy_def,
        oos_trades=all_oos_trades,
        folds=fold_reports,
        portfolio_summary=full_portfolio,
    )


def run_universe_backtest(
    daily_dfs: Dict[str, pd.DataFrame],
    intraday_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    save_artifact: bool = True,
    num_folds: Optional[int] = None,
    walk_forward_mode: Optional[Literal["EXPANDING", "ROLLING"]] = None,
    min_daily_oos_bars_per_fold: Optional[int] = None,
    min_intraday_sessions: Optional[int] = None,
    is_synthetic_fixture: bool = False,
    data_provider_id: Optional[str] = None,
    data_quality_exclusions: Optional[Dict[str, Any]] = None,
) -> BacktestReportResponse:
    """
    Execute genuine chronological multi-fold walk-forward out-of-sample evaluation across
    daily swing and 15m intraday NSE OHLCV datasets.
    """
    folds_requested = num_folds or settings.WALK_FORWARD_DEFAULT_FOLDS
    wf_mode: Literal["EXPANDING", "ROLLING"] = walk_forward_mode or settings.WALK_FORWARD_MODE
    assumptions = default_execution_assumptions()
    cost_model = _build_cost_model_dict()
    univ_meta = get_universe_metadata()
    exclusions = dict(data_quality_exclusions or {})

    # 1. Prepare daily indicator DataFrames
    prepared_daily: Dict[str, pd.DataFrame] = {}
    excluded_short_daily: List[str] = []
    for sym, df in sorted(daily_dfs.items()):
        if df is None or len(df) < 80:
            excluded_short_daily.append(sym)
            continue
        prepared_daily[sym] = compute_indicators(df, is_intraday=False)
    if excluded_short_daily:
        exclusions["daily_insufficient_bars_symbols"] = len(excluded_short_daily)

    daily_timeline = sorted({ts for df in prepared_daily.values() for ts in df.index})
    daily_timeline_strs = [str(ts)[:10] for ts in daily_timeline]
    daily_fold_specs, daily_fold_err = build_walk_forward_folds(
        timeline=daily_timeline,
        timeframe="DAILY_SWING",
        num_folds=folds_requested,
        mode=wf_mode,
        min_warmup_bars=settings.WALK_FORWARD_MIN_WARMUP_DAILY,
        min_oos_bars_per_fold=min_daily_oos_bars_per_fold or settings.WALK_FORWARD_MIN_OOS_BARS_PER_FOLD_DAILY,
        rolling_train_bars=settings.WALK_FORWARD_ROLLING_TRAIN_BARS,
    )

    daily_masks_by_sym: Dict[str, Dict[str, np.ndarray]] = {
        sym: compute_swing_trigger_arrays(ind_df) for sym, ind_df in prepared_daily.items()
    }

    strategy_metrics: List[StrategyBacktestMetrics] = []
    swing_comm = settings.swing_round_trip_commission_pct
    for st_id, st_def in SWING_STRATEGIES.items():
        metrics = _evaluate_strategy_across_folds(
            strategy_def=st_def,
            prepared_dfs=prepared_daily,
            masks_by_sym=daily_masks_by_sym,
            fold_specs=daily_fold_specs,
            slippage_pct=settings.SWING_SLIPPAGE_PCT,
            commission_rt_pct=swing_comm,
            assumptions=assumptions,
            timeline_strs=daily_timeline_strs,
            insufficient_reason=daily_fold_err,
        )
        strategy_metrics.append(metrics)

    # 2. Prepare intraday indicator DataFrames
    prepared_intra: Dict[str, pd.DataFrame] = {}
    excluded_short_intra: List[str] = []
    if intraday_dfs:
        for sym, idf in sorted(intraday_dfs.items()):
            if idf is None or len(idf) < 25:
                excluded_short_intra.append(sym)
                continue
            prepared_intra[sym] = compute_indicators(idf, is_intraday=True)
    if excluded_short_intra:
        exclusions["intraday_insufficient_bars_symbols"] = len(excluded_short_intra)

    intra_timeline = sorted({ts for df in prepared_intra.values() for ts in df.index})
    intra_timeline_strs = [ts.strftime("%Y-%m-%d %H:%M") for ts in intra_timeline]
    intra_fold_specs, intra_fold_err = (
        build_walk_forward_folds(
            timeline=intra_timeline,
            timeframe="INTRADAY_15M",
            num_folds=folds_requested,
            mode=wf_mode,
            min_warmup_bars=settings.WALK_FORWARD_MIN_WARMUP_INTRADAY,
            rolling_train_bars=settings.WALK_FORWARD_ROLLING_TRAIN_BARS,
            min_intraday_sessions=min_intraday_sessions or settings.WALK_FORWARD_MIN_SESSIONS_INTRADAY,
        )
        if prepared_intra
        else ([], "No intraday dataset provided for intraday walk-forward validation.")
    )

    intra_masks_by_sym: Dict[str, Dict[str, np.ndarray]] = {
        sym: compute_intraday_trigger_arrays(ind_df) for sym, ind_df in prepared_intra.items()
    }
    intra_comm = settings.intraday_round_trip_commission_pct
    for st_id, st_def in INTRADAY_STRATEGIES.items():
        metrics = _evaluate_strategy_across_folds(
            strategy_def=st_def,
            prepared_dfs=prepared_intra,
            masks_by_sym=intra_masks_by_sym,
            fold_specs=intra_fold_specs,
            slippage_pct=settings.INTRADAY_SLIPPAGE_PCT,
            commission_rt_pct=intra_comm,
            assumptions=assumptions,
            timeline_strs=intra_timeline_strs,
            insufficient_reason=intra_fold_err,
        )
        strategy_metrics.append(metrics)

    # Sort deterministically: validated first, then by net return expectancy and sample size
    strategy_metrics.sort(
        key=lambda m: (
            1 if m.validation_status == "VALIDATED" else 0,
            m.net_return_mean_oos_pct if m.net_return_mean_oos_pct is not None else -999.0,
            m.completed_trades_oos,
        ),
        reverse=True,
    )

    # Aggregate top-level fold summaries from the first daily/intraday strategy for timeline overview
    daily_fold_overview = next(
        (m.folds for m in strategy_metrics if m.timeframe == "DAILY_SWING" and m.folds), []
    )
    intra_fold_overview = next(
        (m.folds for m in strategy_metrics if m.timeframe == "INTRADAY_15M" and m.folds), []
    )

    validated_swing = [m for m in strategy_metrics if m.timeframe == "DAILY_SWING" and m.validation_status == "VALIDATED"]
    validated_intra = [m for m in strategy_metrics if m.timeframe == "INTRADAY_15M" and m.validation_status == "VALIDATED"]

    if validated_swing and validated_intra:
        overall_status: ValidationStatus = "VALIDATED"
    elif validated_swing or validated_intra:
        overall_status = "PARTIAL_VALIDATION"
    else:
        overall_status = "INSUFFICIENT_HISTORY"

    daily_range_str = (
        f"{daily_timeline_strs[0]} to {daily_timeline_strs[-1]}" if daily_timeline_strs else None
    )
    intra_range_str = (
        f"{intra_timeline_strs[0]} to {intra_timeline_strs[-1]}" if intra_timeline_strs else None
    )

    prep_period_str = (
        f"{daily_fold_overview[0].preparation_start_date} to {daily_fold_overview[0].preparation_end_date} "
        f"(Initial indicator warm-up; no ML fitting)"
        if daily_fold_overview
        else None
    )
    oos_period_str = (
        f"{daily_fold_overview[0].oos_start_date} to {daily_fold_overview[-1].oos_end_date} "
        f"({len(daily_fold_overview)} non-overlapping chronological {wf_mode.lower()} folds)"
        if daily_fold_overview
        else None
    )

    now_utc = datetime.now(timezone.utc)
    now_ist = get_now_ist()
    prov_id = data_provider_id or settings.MARKET_DATA_PROVIDER
    val_method = f"{wf_mode}_CHRONOLOGICAL_WALK_FORWARD_OOS_EVALUATION_FIXED_RULES"

    ensemble_wrs = [
        m.net_win_rate_oos_pct
        for m in strategy_metrics
        if m.category == "MULTI_FACTOR_ENSEMBLE"
        and m.validation_status == "VALIDATED"
        and m.net_win_rate_oos_pct is not None
    ]
    indiv_wrs = [
        m.net_win_rate_oos_pct
        for m in strategy_metrics
        if m.category != "MULTI_FACTOR_ENSEMBLE"
        and m.validation_status == "VALIDATED"
        and m.net_win_rate_oos_pct is not None
    ]
    best_ens = max(ensemble_wrs) if ensemble_wrs else None
    best_ind = max(indiv_wrs) if indiv_wrs else None

    is_partial = (len(prepared_daily) < univ_meta.constituent_count) or (len(intra_fold_specs) == 0)

    artifact_meta = ArtifactMetadata(
        schema_version=ARTIFACT_SCHEMA_VERSION,
        run_id=str(uuid.uuid4()),
        generated_at_utc=now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        generated_at_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        strategy_version=STRATEGY_ENGINE_VERSION,
        strategy_config_hash=compute_strategy_config_hash(),
        config_version=settings.APP_VERSION,
        data_provider_id=prov_id,
        data_adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        universe_version=UNIVERSE_VERSION,
        universe_effective_date=univ_meta.effective_date,
        historical_date_range_daily=daily_range_str,
        historical_date_range_intraday=intra_range_str,
        validation_methodology=val_method,
        walk_forward_mode=wf_mode,
        parameter_fitting_performed=False,
        random_seed=None,
        is_partial_run=is_partial,
        is_synthetic_fixture=is_synthetic_fixture,
        data_quality_exclusions=exclusions,
        strategy_parameters=serialize_strategy_parameters(),
    )

    limitations = [
        univ_meta.survivorship_bias_disclosure,
        f"Data adjustment policy: {settings.PRICE_ADJUSTMENT_POLICY}.",
        "All strategies use fixed deterministic technical rules; no ML training or out-of-sample parameter fitting is performed.",
    ]
    if intra_fold_err:
        limitations.append(f"Intraday validation unavailable: {intra_fold_err}")
    if is_synthetic_fixture:
        limitations.append("SYNTHETIC TEST FIXTURE DATA — NOT ACTUAL NSE HISTORICAL PERFORMANCE.")

    engine_meta = AnalysisEngineMetadata(
        strategy_version=STRATEGY_ENGINE_VERSION,
        validation_methodology=val_method,
        data_source=(
            "SYNTHETIC_TEST_FIXTURE"
            if is_synthetic_fixture
            else f"{prov_id} (NSE .NS {settings.PRICE_ADJUSTMENT_POLICY})"
        ),
        data_limitations=limitations,
    )

    summary_note = (
        f"Executed {len(daily_fold_specs)}-fold chronological {wf_mode.lower()} walk-forward OOS "
        f"evaluation on {len(prepared_daily)} daily NSE stocks"
        + (
            f" and {len(intra_fold_specs)}-fold evaluation on {len(prepared_intra)} intraday stocks."
            if intra_fold_specs
            else f". Intraday strategies marked INSUFFICIENT_HISTORY ({intra_fold_err})."
        )
    )

    legacy = settings.ENABLE_LEGACY_FIELD_ALIASES
    report = BacktestReportResponse(
        validation_status=overall_status,
        validation_summary_note=summary_note,
        generated_at_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        data_source=engine_meta.data_source,
        universe_metadata=univ_meta,
        universe_tested_count=len(prepared_daily),
        intraday_universe_tested_count=len(prepared_intra),
        walk_forward_mode=wf_mode,
        walk_forward_folds_requested=folds_requested,
        walk_forward_folds=len(daily_fold_specs),
        intraday_walk_forward_folds=len(intra_fold_specs),
        daily_folds=daily_fold_overview,
        intraday_folds=intra_fold_overview,
        in_sample_period=prep_period_str,
        out_of_sample_period=oos_period_str,
        cost_model=cost_model,
        execution_assumptions=assumptions,
        metric_definitions=METRIC_DEFINITIONS,
        artifact_metadata=artifact_meta,
        engine_metadata=engine_meta,
        strategies=strategy_metrics,
        scoring_methodology={
            "score_type": "HEURISTIC_TECHNICAL_SETUP_SCORE",
            "is_calibrated_probability": False,
            "trend_alignment_max_pts": 25.0,
            "momentum_volume_max_pts": 25.0,
            "strategy_confluence_max_pts": 32.0,
            "pattern_confirmation_max_pts": 18.0,
            "note": (
                "Technical Setup Score (0-100) uses fixed heuristic weights and deterministic indicator rules. "
                "Empirical out-of-sample walk-forward metrics are reported separately alongside sample size and 95% Wilson CI."
            ),
        },
        best_ensemble_win_rate_oos_pct=best_ens,
        best_individual_win_rate_oos_pct=best_ind,
        best_ensemble_precision_oos_pct=best_ens if legacy else None,
        best_individual_precision_oos_pct=best_ind if legacy else None,
        target_precision_note=(
            "Historical strategy results reflect fixed deterministic rules evaluated across chronological "
            "out-of-sample folds net of estimated NSE friction costs. Past backtested performance on a "
            "current-constituent snapshot is subject to survivorship bias and does not guarantee future returns."
        ),
        regime_status=(
            "Synthetic Fixture Test Run"
            if is_synthetic_fixture
            else f"{overall_status} ({len(daily_fold_specs)} daily folds, {len(intra_fold_specs)} intraday folds)"
        ),
    )

    if save_artifact and not is_synthetic_fixture:
        from app.engine.artifact_store import backtest_artifact_name
        market_cache.save_json_artifact(backtest_artifact_name(prov_id), report.model_dump())
        if prov_id.strip().lower() == "yfinance":
            market_cache.save_json_artifact("backtest_report", report.model_dump())

    return report


def get_cached_or_default_backtest_report() -> Optional[BacktestReportResponse]:
    """Backward-compatible wrapper returning ONLY a version-verified compatible backtest report."""
    report, _ = get_validated_backtest_report()
    return report
