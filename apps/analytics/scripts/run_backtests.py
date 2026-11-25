#!/usr/bin/env python3
"""
Reproducible Chronological Walk-Forward Out-of-Sample Backtesting CLI for NiftyLens.

Evaluates all 9 Daily Swing and 3 Intraday 15m fixed-rule strategies across chronological,
non-overlapping walk-forward folds with realistic NSE delivery/MIS transaction costs,
time-aligned portfolio simulation, Wilson 95% CIs, and versioned artifact persistence.

Usage:
    python backend/scripts/run_backtests.py --limit 500 --folds 4 --mode expanding --offline
"""

import argparse
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.data.nifty500_constituents import get_universe_metadata, load_nifty500_universe
from app.data.provider import data_provider
from app.data.providers.base import DataUsagePolicy
from app.engine.backtester import run_universe_backtest


def _fmt_opt(val, suffix: str = "", signed: bool = False) -> str:
    if val is None:
        return "N/A"
    fmt = f"{val:+.2f}" if signed else f"{val:.2f}"
    return f"{fmt}{suffix}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Chronological Walk-Forward NSE Backtests.")
    parser.add_argument("--limit", type=int, default=500, help="Number of NIFTY 500 stocks to evaluate (up to 500)")
    parser.add_argument("--intraday-limit", type=int, default=100, help="Number of stocks for intraday evaluation")
    parser.add_argument("--folds", type=int, default=settings.WALK_FORWARD_DEFAULT_FOLDS, help="Walk-forward OOS folds")
    parser.add_argument("--mode", choices=["expanding", "rolling"], default=settings.WALK_FORWARD_MODE.lower())
    parser.add_argument("--offline", action="store_true", help="Use local cached datasets only (no network fetch)")
    parser.add_argument("--no-save", action="store_true", help="Do not overwrite backtest_report.json artifact")
    args = parser.parse_args()

    if args.offline:
        settings.EDUCATIONAL_REPLAY_MODE = True

    univ_meta = get_universe_metadata()
    universe = load_nifty500_universe()
    symbols = [c.symbol for c in universe[: args.limit]]
    intra_symbols = [c.symbol for c in universe[: args.intraday_limit]]

    print("=" * 112)
    print("NIFTYLENS CHRONOLOGICAL WALK-FORWARD OUT-OF-SAMPLE EVALUATION ENGINE (FIXED DETERMINISTIC RULES)")
    print("=" * 112)
    t0 = time.monotonic()

    policy = DataUsagePolicy(
        purpose="EDUCATIONAL_HISTORICAL_REPLAY" if args.offline else "HISTORICAL_BACKTEST",
        allow_delayed_data=True,
        allow_stale_cache_fallback=True,
        require_production_approved_provider=False,
        adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
    )

    daily_res = data_provider.fetch_batch_daily_ohlcv_results(
        symbols=symbols, period="2y", force_refresh=False, min_bars=80, policy=policy
    )
    intra_res = data_provider.fetch_batch_intraday_ohlcv_results(
        symbols=intra_symbols, period="5d", interval="15m", force_refresh=False, min_bars=20, policy=policy
    )

    daily_map = {s: r.df for s, r in daily_res.items() if r.df is not None and r.quality.is_valid}
    intra_map = {s: r.df for s, r in intra_res.items() if r.df is not None and r.quality.is_valid}
    exclusions = {
        "daily_requested": len(symbols),
        "daily_loaded_valid": len(daily_map),
        "daily_excluded_or_missing": len(symbols) - len(daily_map),
        "intraday_requested": len(intra_symbols),
        "intraday_loaded_valid": len(intra_map),
        "intraday_excluded_or_missing": len(intra_symbols) - len(intra_map),
    }

    report = run_universe_backtest(
        daily_dfs=daily_map,
        intraday_dfs=intra_map,
        save_artifact=not args.no_save,
        num_folds=args.folds,
        walk_forward_mode=args.mode.upper(),  # type: ignore[arg-type]
        data_provider_id=data_provider.provider_name,
        data_quality_exclusions=exclusions,
    )

    meta = report.artifact_metadata
    print(f"Run ID               : {meta.run_id}")
    print(f"Strategy Version     : {meta.strategy_version} (hash={meta.strategy_config_hash})")
    print(f"Universe             : {univ_meta.universe_version} ({len(daily_map)} daily / {len(intra_map)} intraday loaded)")
    print(f"Validation Status    : {report.validation_status}")
    print(f"Methodology          : {meta.validation_methodology}")
    print(f"Daily Date Range     : {meta.historical_date_range_daily}")
    print(f"Intraday Date Range  : {meta.historical_date_range_intraday}")
    print(f"Round-Trip Friction  : Swing {report.cost_model['swing_total_round_trip_friction_pct']:.3f}% | Intraday {report.cost_model['intraday_total_round_trip_friction_pct']:.3f}%")
    print(f"Survivorship Notice  : {univ_meta.survivorship_bias_disclosure}")

    if report.daily_folds:
        print("\nDaily Walk-Forward Fold Schedule:")
        for f in report.daily_folds:
            print(
                f"  Fold {f.fold_id}: Prep [{f.preparation_start_date}..{f.preparation_end_date}] | "
                f"OOS [{f.oos_start_date}..{f.oos_end_date}] | Eligible={f.eligible_instruments}/{f.instruments_considered}"
            )

    print("\n" + "-" * 112)
    header = (
        f"{'Strategy ID':<38} | {'Status':<18} | {'OOS N':>5} | {'Win%':>6} | "
        f"{'95% CI':<13} | {'Tgt%':>6} | {'PF':>5} | {'Mean%':>6} | {'MaxDD%':>6} | {'Sharpe':>6}"
    )
    print(header)
    print("-" * 112)
    for m in report.strategies:
        ci_str = (
            f"[{m.win_rate_ci_95_low_pct:.0f}-{m.win_rate_ci_95_high_pct:.0f}%]"
            if m.win_rate_ci_95_low_pct is not None and m.win_rate_ci_95_high_pct is not None
            else "N/A"
        )
        print(
            f"{m.strategy_id[:38]:<38} | {m.validation_status:<18} | {m.completed_trades_oos:>5} | "
            f"{_fmt_opt(m.net_win_rate_oos_pct, '%'):>6} | {ci_str:<13} | "
            f"{_fmt_opt(m.target_hit_rate_oos_pct, '%'):>6} | {_fmt_opt(m.profit_factor_oos):>5} | "
            f"{_fmt_opt(m.net_return_mean_oos_pct, '%', signed=True):>6} | "
            f"{_fmt_opt(m.max_drawdown_oos_pct, '%'):>6} | {_fmt_opt(m.sharpe_ratio_oos):>6}"
        )
    print("-" * 112)
    print(f"Completed in {time.monotonic() - t0:.2f}s. Artifact saved={not args.no_save}.")


if __name__ == "__main__":
    main()
