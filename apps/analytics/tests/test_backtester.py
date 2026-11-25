"""Unit tests for genuine multi-fold walk-forward backtester, execution rules, portfolio sim, and artifacts."""

import numpy as np
import pandas as pd
from app.engine.backtest_execution import (
    default_execution_assumptions,
    simulate_portfolio_from_trades,
    simulate_strategy_on_dataframe,
)
from app.engine.backtest_metrics import compute_metrics_from_trades, wilson_ci_95
from app.engine.backtester import (
    build_walk_forward_folds,
    check_artifact_compatibility,
    run_universe_backtest,
)
from app.engine.indicators import compute_indicators
from app.engine.strategies import INTRADAY_STRATEGIES, SWING_STRATEGIES
from app.models.backtest import ExecutionAssumptions


def _generate_trending_stock(n: int = 320, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2024-01-01", periods=n, freq="B")
    steps = rng.normal(1.2, 6.5, size=n)
    close = np.maximum(200.0, 800.0 + np.cumsum(steps))
    open_ = np.maximum(150.0, close - rng.normal(0.8, 3.0, size=n))
    high = np.maximum(open_, close) + np.abs(rng.normal(5.0, 2.5, size=n))
    low = np.maximum(100.0, np.minimum(open_, close) - np.abs(rng.normal(4.5, 2.0, size=n)))
    vol = rng.integers(400_000, 2_000_000, size=n)
    for idx in range(60, n - 5, 18):
        close[idx] = np.max(high[idx - 20 : idx]) + 8.0
        open_[idx] = close[idx] - 10.0
        high[idx] = close[idx] + 2.0
        low[idx] = open_[idx] - 1.0
        vol[idx] = 3_800_000
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates,
    )


def _generate_multi_session_intraday(num_sessions: int = 6, seed: int = 11) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    timestamps = []
    for d in pd.bdate_range("2026-10-01", periods=num_sessions):
        timestamps.extend(
            pd.date_range(f"{d.strftime('%Y-%m-%d')} 09:15:00", f"{d.strftime('%Y-%m-%d')} 15:15:00", freq="15min")
        )
    n = len(timestamps)
    close = 600.0 + np.cumsum(rng.normal(0.15, 2.2, size=n))
    open_ = close - rng.normal(0.0, 0.8, size=n)
    high = np.maximum(open_, close) + np.abs(rng.normal(1.5, 0.5, size=n))
    low = np.minimum(open_, close) - np.abs(rng.normal(1.5, 0.5, size=n))
    vol = rng.integers(150_000, 900_000, size=n)
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=pd.DatetimeIndex(timestamps),
    )


def test_walk_forward_folds_chronological_non_overlapping_expanding_and_rolling():
    timeline = list(pd.bdate_range("2024-01-01", periods=300))

    exp_folds, err_e = build_walk_forward_folds(timeline, "DAILY_SWING", num_folds=4, mode="EXPANDING")
    assert err_e is None and len(exp_folds) == 4
    # Expanding starts all preparation windows at timeline[0] and strictly advances OOS without overlap
    for i, f in enumerate(exp_folds):
        assert f.prep_start == timeline[0]
        assert f.prep_end < f.oos_start <= f.oos_end
        if i > 0:
            assert exp_folds[i - 1].oos_end < f.oos_start

    roll_folds, err_r = build_walk_forward_folds(
        timeline, "DAILY_SWING", num_folds=4, mode="ROLLING", rolling_train_bars=80
    )
    assert err_r is None and len(roll_folds) == 4
    assert roll_folds[-1].prep_start > timeline[0]
    for i in range(1, len(roll_folds)):
        assert roll_folds[i - 1].oos_end < roll_folds[i].oos_start


def test_insufficient_history_returns_explicit_status_and_null_metrics():
    short_df = _generate_trending_stock(90)
    short_intra = _generate_multi_session_intraday(num_sessions=5)
    report = run_universe_backtest(
        daily_dfs={"SHORT": short_df},
        intraday_dfs={"SHORT": short_intra},
        save_artifact=False,
        num_folds=4,
        is_synthetic_fixture=True,
    )
    assert report.validation_status == "INSUFFICIENT_HISTORY"
    assert report.walk_forward_folds == 0
    assert report.intraday_walk_forward_folds == 0
    for m in report.strategies:
        assert m.validation_status == "INSUFFICIENT_HISTORY"
        assert m.net_win_rate_oos_pct is None
        assert m.profit_factor_oos is None
        assert m.sharpe_ratio_oos is None


def test_execution_gap_handling_intrabar_ambiguity_and_transaction_costs():
    dates = pd.bdate_range("2025-01-01", periods=70)
    df = pd.DataFrame(
        {
            "Open": np.full(70, 100.0),
            "High": np.full(70, 102.0),
            "Low": np.full(70, 98.0),
            "Close": np.full(70, 100.0),
            "Volume": np.full(70, 1_000_000, dtype=np.int64),
        },
        index=dates,
    )
    ind = compute_indicators(df, is_intraday=False)
    st_def = SWING_STRATEGIES["BREAKOUT_VOLUME_CONFIRM"]

    # Case 1: Gap down through stop on bar t+2 -> must exit at Open[t+2] (GAP_STOP_LOSS), NOT stop price
    ind_gap = ind.copy()
    mask = np.zeros(70, dtype=bool)
    mask[56] = True
    # Entry at bar 57 Open=100, ATR~4 -> stop ~94.6, target ~110. Bar 58 gaps down to Open=88
    ind_gap.iloc[58, ind_gap.columns.get_loc("Open")] = 88.0
    ind_gap.iloc[58, ind_gap.columns.get_loc("High")] = 90.0
    ind_gap.iloc[58, ind_gap.columns.get_loc("Low")] = 86.0
    ind_gap.iloc[58, ind_gap.columns.get_loc("Close")] = 89.0

    trades_gap = simulate_strategy_on_dataframe(
        "GAPTEST", ind_gap, st_def, slippage_pct=0.10, commission_round_trip_pct=0.222, trigger_mask=mask
    )
    assert len(trades_gap) == 1
    tr = trades_gap[0]
    assert tr.exit_reason == "GAP_STOP_LOSS"
    assert tr.exit_price < 88.0  # Open 88 minus exit slippage
    assert tr.net_return_pct < tr.gross_return_pct
    assert tr.transaction_cost_pct > 0.0
    assert tr.entry_date > tr.signal_date
    assert tr.exit_date >= tr.entry_date

    # Case 2: Both stop and target hit in the SAME candle -> conservative stop-first + intrabar_ambiguous=True
    ind_amb = ind.copy()
    ind_amb.iloc[58, ind_amb.columns.get_loc("Low")] = 80.0
    ind_amb.iloc[58, ind_amb.columns.get_loc("High")] = 130.0
    trades_amb = simulate_strategy_on_dataframe(
        "AMBTEST", ind_amb, st_def, slippage_pct=0.10, commission_round_trip_pct=0.222, trigger_mask=mask
    )
    assert len(trades_amb) == 1
    assert trades_amb[0].intrabar_ambiguous is True
    assert trades_amb[0].exit_reason == "STOP_LOSS_HIT"


def test_intraday_simulation_enforces_same_session_square_off_zero_overnight():
    """Intraday trades must NEVER be held across calendar session boundaries."""
    df_intra = _generate_multi_session_intraday(num_sessions=4)
    ind_intra = compute_indicators(df_intra, is_intraday=True)
    st_def = INTRADAY_STRATEGIES["INTRADAY_ORB_VWAP_BREAKOUT"]

    # Force a signal on every bar from index 20 onward (including late bars!)
    mask = np.zeros(len(ind_intra), dtype=bool)
    mask[20:] = True

    trades = simulate_strategy_on_dataframe(
        symbol="INTRATEST",
        df_with_ind=ind_intra,
        strategy_def=st_def,
        slippage_pct=0.05,
        commission_round_trip_pct=0.106,
        trigger_mask=mask,
    )
    assert len(trades) >= 1
    for tr in trades:
        # Entry and exit MUST be on the exact same trading date (zero overnight!)
        assert tr.entry_date[:10] == tr.exit_date[:10], (
            f"Overnight intraday position detected: {tr.entry_date} -> {tr.exit_date}"
        )
        assert tr.holding_days is None
        assert tr.holding_minutes is not None and tr.holding_minutes >= 15


def test_oos_metrics_never_substitute_in_sample_and_handle_undefined_ratios():
    st_def = SWING_STRATEGIES["RSI_SUPPORT_BOUNCE"]
    # Zero OOS trades -> all rate/ratio metrics must be None (never fabricated!)
    m_empty = compute_metrics_from_trades(st_def, oos_trades=[])
    assert m_empty.completed_trades_oos == 0
    assert m_empty.validation_status == "INSUFFICIENT_SAMPLE"
    assert m_empty.net_win_rate_oos_pct is None
    assert m_empty.profit_factor_oos is None
    assert m_empty.avg_win_pct is None
    assert m_empty.avg_loss_pct is None
    assert m_empty.sharpe_ratio_oos is None

    # Wilson 95% CI sanity
    low, high = wilson_ci_95(5, 10)
    assert low is not None and high is not None
    assert 20.0 < low < 50.0 < high < 80.0


def test_full_walk_forward_reproducible_and_artifact_compatibility():
    daily_map = {
        "SYNTH_A": _generate_trending_stock(300, seed=1),
        "SYNTH_B": _generate_trending_stock(300, seed=2),
        "SYNTH_C": _generate_trending_stock(300, seed=3),
    }
    r1 = run_universe_backtest(
        daily_dfs=daily_map,
        intraday_dfs=None,
        save_artifact=False,
        num_folds=4,
        walk_forward_mode="EXPANDING",
        is_synthetic_fixture=True,
    )
    r2 = run_universe_backtest(
        daily_dfs=daily_map,
        intraday_dfs=None,
        save_artifact=False,
        num_folds=4,
        walk_forward_mode="EXPANDING",
        is_synthetic_fixture=True,
    )
    assert r1.walk_forward_folds == 4
    assert len(r1.daily_folds) == 4
    # Identical inputs -> identical strategy metrics
    s1 = {m.strategy_id: (m.completed_trades_oos, m.net_win_rate_oos_pct, m.net_return_mean_oos_pct) for m in r1.strategies}
    s2 = {m.strategy_id: (m.completed_trades_oos, m.net_win_rate_oos_pct, m.net_return_mean_oos_pct) for m in r2.strategies}
    assert s1 == s2

    # Synthetic fixture artifacts MUST fail production compatibility verification
    ok, reason = check_artifact_compatibility(r1)
    assert ok is False
    assert "Synthetic" in (reason or "")

    # Mutating strategy hash MUST fail compatibility verification
    r1_real = r1.model_copy(deep=True)
    r1_real.artifact_metadata.is_synthetic_fixture = False
    ok_real, _ = check_artifact_compatibility(r1_real)
    assert ok_real is True

    r1_bad_hash = r1_real.model_copy(deep=True)
    r1_bad_hash.artifact_metadata.strategy_config_hash = "deadbeef00000000"
    ok_bad, reason_bad = check_artifact_compatibility(r1_bad_hash)
    assert ok_bad is False and "hash" in (reason_bad or "").lower()


def test_portfolio_simulation_enforces_shared_capital_and_concurrency():
    assumptions = ExecutionAssumptions(
        portfolio_initial_capital_inr=100_000.0,
        portfolio_position_size_pct=50.0,
        portfolio_max_concurrent_positions=2,
    )
    from app.models.backtest import BacktestTradeRecord

    trades = [
        BacktestTradeRecord(
            symbol=f"SYM{i}",
            strategy_id="BREAKOUT_VOLUME_CONFIRM",
            strategy_name="Test",
            timeframe="DAILY_SWING",
            fold_id=1,
            period_split="OUT_OF_SAMPLE",
            signal_date="2025-02-01",
            entry_date="2025-02-03",
            entry_price=100.0,
            exit_date="2025-02-10",
            exit_price=105.0,
            holding_bars=5,
            holding_days=5,
            gross_return_pct=5.0,
            net_return_pct=4.5,
            slippage_cost_pct=0.2,
            commission_cost_pct=0.3,
            transaction_cost_pct=0.5,
            exit_reason="TARGET_HIT",
            won=True,
        )
        for i in range(4)  # 4 simultaneous signals on same day, max_concurrent_positions=2
    ]
    dates = [d.strftime("%Y-%m-%d") for d in pd.bdate_range("2025-02-03", periods=10)]
    port = simulate_portfolio_from_trades(trades, dates, assumptions)
    assert port.executed_trades_count == 2
    assert port.skipped_due_to_capital_or_slots == 2
    assert port.final_capital_inr == 104_500.0
    assert port.sharpe_ratio is None  # < 20 return observations -> honestly None


def test_intraday_walk_forward_with_sufficient_sessions_and_zero_overnight():
    """With 24 synthetic sessions, 4-fold intraday walk-forward completes cleanly with zero overnight trades."""
    intra_map = {
        "SYNTH_I1": _generate_multi_session_intraday(num_sessions=24, seed=21),
        "SYNTH_I2": _generate_multi_session_intraday(num_sessions=24, seed=22),
    }
    report = run_universe_backtest(
        daily_dfs={},
        intraday_dfs=intra_map,
        save_artifact=False,
        num_folds=4,
        walk_forward_mode="ROLLING",
        min_intraday_sessions=20,
        is_synthetic_fixture=True,
    )
    assert report.intraday_walk_forward_folds == 4
    assert len(report.intraday_folds) == 4
    for i in range(1, len(report.intraday_folds)):
        assert report.intraday_folds[i - 1].oos_end_date < report.intraday_folds[i].oos_start_date
    for m in report.strategies:
        if m.timeframe == "INTRADAY_15M":
            for tr in m.sample_trades:
                assert tr.entry_date[:10] == tr.exit_date[:10]

