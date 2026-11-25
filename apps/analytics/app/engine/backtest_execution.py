"""Realistic Trade & Time-Aligned Portfolio Execution Simulator for Daily & Intraday Backtests."""

from collections import defaultdict
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.config import settings
from app.data.nse_calendar import INTRADAY_ENTRY_CUTOFF_TIME
from app.engine.strategies import (
    StrategyDefinition,
    compute_intraday_trigger_arrays,
    compute_swing_trigger_arrays,
)
from app.models.backtest import (
    BacktestTradeRecord,
    ExecutionAssumptions,
    PortfolioSimulationSummary,
)


def default_execution_assumptions() -> ExecutionAssumptions:
    """Build ExecutionAssumptions reflecting active configuration."""
    return ExecutionAssumptions(
        breakeven_trailing_stop_enabled=settings.BACKTEST_BREAKEVEN_STOP_ENABLED,
        breakeven_trigger_atr_mult=settings.BACKTEST_BREAKEVEN_TRIGGER_ATR,
        breakeven_buffer_pct=settings.BACKTEST_BREAKEVEN_BUFFER_PCT,
        portfolio_initial_capital_inr=settings.BACKTEST_INITIAL_CAPITAL_INR,
        portfolio_position_size_pct=settings.BACKTEST_POSITION_SIZE_PCT,
        portfolio_max_concurrent_positions=settings.BACKTEST_MAX_CONCURRENT_POSITIONS,
    )


def simulate_strategy_on_dataframe(
    symbol: str,
    df_with_ind: pd.DataFrame,
    strategy_def: StrategyDefinition,
    slippage_pct: float,
    commission_round_trip_pct: float,
    trigger_mask: Optional[np.ndarray] = None,
    eval_start_idx: Optional[int] = None,
    eval_end_idx: Optional[int] = None,
    fold_id: int = 1,
    period_split: str = "OUT_OF_SAMPLE",
    assumptions: Optional[ExecutionAssumptions] = None,
) -> List[BacktestTradeRecord]:
    """
    Causal bar-by-bar trade simulator within `[eval_start_idx, eval_end_idx]`.
    - Signal on completed bar `t`; entry on `Open[t+1]` + slippage.
    - Handles gap-through-stop and gap-through-target at candle Open.
    - Tracks intrabar ambiguity when both stop and target touch in the same candle
      (conservatively resolved stop-first and explicitly flagged `intrabar_ambiguous=True`).
    - For INTRADAY_15M: strictly prevents overnight holding and enforces same-session
      exit on or before the session's final completed bar (`SESSION_CLOSE_SQUARE_OFF`).
    """
    n = len(df_with_ind)
    min_warmup = strategy_def.min_warmup_bars
    if n < min_warmup + 3:
        return []

    cfg = assumptions or default_execution_assumptions()
    is_intraday = strategy_def.timeframe == "INTRADAY_15M"

    if trigger_mask is None:
        masks = (
            compute_intraday_trigger_arrays(df_with_ind)
            if is_intraday
            else compute_swing_trigger_arrays(df_with_ind)
        )
        trigger_mask = masks.get(strategy_def.strategy_id, np.zeros(n, dtype=bool))

    start_i = max(min_warmup, eval_start_idx if eval_start_idx is not None else min_warmup)
    end_i = min(n - 1, eval_end_idx if eval_end_idx is not None else n - 1)
    if start_i >= end_i:
        return []

    opens = df_with_ind["Open"].to_numpy(dtype=float)
    highs = df_with_ind["High"].to_numpy(dtype=float)
    lows = df_with_ind["Low"].to_numpy(dtype=float)
    closes = df_with_ind["Close"].to_numpy(dtype=float)
    atrs = df_with_ind["ATR_14"].to_numpy(dtype=float)
    timestamps = list(df_with_ind.index)
    idx_strs = [
        ts.strftime("%Y-%m-%d %H:%M") if is_intraday else str(ts)[:10] for ts in timestamps
    ]
    dates = [ts.date() for ts in timestamps]

    # Map each session date to its last available bar index within `[0..end_i]` for intraday square-off
    last_bar_by_date: Dict[object, int] = {}
    if is_intraday:
        for i in range(end_i + 1):
            last_bar_by_date[dates[i]] = i

    trades: List[BacktestTradeRecord] = []
    t = start_i

    while t < end_i:
        if not trigger_mask[t]:
            t += 1
            continue

        entry_idx = t + 1
        if entry_idx > end_i:
            break

        # Intraday session boundary check: NEVER enter on a different session date or past cutoff
        if is_intraday:
            sig_time = timestamps[t].time() if hasattr(timestamps[t], "time") else None
            if dates[entry_idx] != dates[t] or (sig_time and sig_time > INTRADAY_ENTRY_CUTOFF_TIME):
                t += 1
                continue

        raw_entry = opens[entry_idx]
        atr = atrs[t]
        if not np.isfinite(raw_entry) or raw_entry <= 0 or not np.isfinite(atr) or atr <= 0:
            t += 1
            continue

        entry_price = raw_entry * (1.0 + slippage_pct / 100.0)
        target_price = entry_price + strategy_def.target_atr_mult * atr
        initial_stop = entry_price - strategy_def.stop_atr_mult * atr
        if initial_stop <= 0:
            t += 1
            continue

        active_stop = initial_stop
        breakeven_trigger = entry_price + cfg.breakeven_trigger_atr_mult * atr

        if is_intraday:
            session_last_idx = last_bar_by_date[dates[entry_idx]]
            max_exit_idx = min(
                entry_idx + strategy_def.max_holding_bars - 1,
                session_last_idx,
                end_i,
            )
            default_exit_reason = (
                "SESSION_CLOSE_SQUARE_OFF" if max_exit_idx == session_last_idx else "TIME_STOP"
            )
        else:
            max_exit_idx = min(entry_idx + strategy_def.max_holding_bars - 1, end_i)
            default_exit_reason = "TIME_STOP"

        exit_idx = max_exit_idx
        raw_exit = closes[exit_idx]
        exit_reason = default_exit_reason
        intrabar_ambiguous = False

        for k in range(entry_idx, max_exit_idx + 1):
            open_k = opens[k]
            high_k = highs[k]
            low_k = lows[k]

            # Gap checks apply only on bars strictly after entry bar (we entered at Open[entry_idx])
            if k > entry_idx:
                if open_k <= active_stop:
                    raw_exit = open_k
                    exit_idx = k
                    exit_reason = (
                        "TRAILING_STOP" if active_stop > initial_stop else "GAP_STOP_LOSS"
                    )
                    break
                if open_k >= target_price:
                    raw_exit = open_k
                    exit_idx = k
                    exit_reason = "GAP_TARGET"
                    break

            hit_stop = low_k <= active_stop
            hit_target = high_k >= target_price
            if hit_stop and hit_target:
                # Documented conservative resolution: stop-first, explicitly flagged as ambiguous
                intrabar_ambiguous = True
                raw_exit = active_stop
                exit_idx = k
                exit_reason = "TRAILING_STOP" if active_stop > initial_stop else "STOP_LOSS_HIT"
                break
            if hit_stop:
                raw_exit = active_stop
                exit_idx = k
                exit_reason = "TRAILING_STOP" if active_stop > initial_stop else "STOP_LOSS_HIT"
                break
            if hit_target:
                raw_exit = target_price
                exit_idx = k
                exit_reason = "TARGET_HIT"
                break

            # Activate breakeven trailing stop ONLY for subsequent bars (never retroactively on bar k)
            if cfg.breakeven_trailing_stop_enabled and high_k >= breakeven_trigger:
                be_offset_pct = commission_round_trip_pct + 2.0 * slippage_pct + cfg.breakeven_buffer_pct
                be_stop = entry_price * (1.0 + be_offset_pct / 100.0)
                active_stop = max(active_stop, be_stop)

        exit_price = raw_exit * (1.0 - slippage_pct / 100.0)
        gross_ret_pct = ((raw_exit - raw_entry) / raw_entry) * 100.0
        after_slip_ret_pct = ((exit_price - entry_price) / entry_price) * 100.0
        slippage_cost_pct = gross_ret_pct - after_slip_ret_pct
        net_ret_pct = after_slip_ret_pct - commission_round_trip_pct
        total_cost_pct = gross_ret_pct - net_ret_pct

        holding_bars = max(1, exit_idx - entry_idx + 1)
        holding_days = holding_bars if not is_intraday else None
        holding_minutes = (holding_bars * 15) if is_intraday else None

        trades.append(
            BacktestTradeRecord(
                symbol=symbol,
                strategy_id=strategy_def.strategy_id,
                strategy_name=strategy_def.name,
                timeframe=strategy_def.timeframe,  # type: ignore[arg-type]
                fold_id=fold_id,
                period_split=period_split,  # type: ignore[arg-type]
                signal_date=idx_strs[t],
                entry_date=idx_strs[entry_idx],
                entry_price=round(float(entry_price), 2),
                exit_date=idx_strs[exit_idx],
                exit_price=round(float(exit_price), 2),
                holding_bars=holding_bars,
                holding_days=holding_days,
                holding_minutes=holding_minutes,
                gross_return_pct=round(float(gross_ret_pct), 4),
                net_return_pct=round(float(net_ret_pct), 4),
                slippage_cost_pct=round(float(slippage_cost_pct), 4),
                commission_cost_pct=round(float(commission_round_trip_pct), 4),
                transaction_cost_pct=round(float(total_cost_pct), 4),
                exit_reason=exit_reason,  # type: ignore[arg-type]
                intrabar_ambiguous=intrabar_ambiguous,
                won=bool(net_ret_pct > 0.0),
            )
        )

        # Prevent overlapping positions in the same stock
        t = exit_idx + 1

    return trades


def simulate_portfolio_from_trades(
    trades: List[BacktestTradeRecord],
    timeline_dates: List[str],
    assumptions: ExecutionAssumptions,
    is_intraday: bool = False,
    min_return_observations: int = 20,
) -> PortfolioSimulationSummary:
    """
    Time-aligned portfolio simulation accounting for shared capital, position sizing,
    and max concurrent positions. Computes genuine periodic return series, drawdown,
    and annualized Sharpe / Sortino ratios (None when prerequisites are unmet).
    """
    init_cap = float(assumptions.portfolio_initial_capital_inr)
    pos_pct = float(assumptions.portfolio_position_size_pct) / 100.0
    max_pos = int(assumptions.portfolio_max_concurrent_positions)

    if not trades or not timeline_dates:
        return PortfolioSimulationSummary(
            simulation_scope="UNAVAILABLE_INSUFFICIENT_DATA",
            initial_capital_inr=init_cap,
            max_concurrent_positions_limit=max_pos,
            position_size_pct=assumptions.portfolio_position_size_pct,
            notes="No completed out-of-sample trades available for portfolio simulation.",
        )

    # Index trades deterministically by entry timestamp/date and symbol
    entries_by_ts: Dict[str, List[BacktestTradeRecord]] = defaultdict(list)
    for tr in sorted(trades, key=lambda x: (x.entry_date, x.symbol, x.strategy_id)):
        entries_by_ts[tr.entry_date].append(tr)

    cash = init_cap
    open_positions: List[Tuple[BacktestTradeRecord, float]] = []  # (trade, allocated_capital)
    executed_count = 0
    skipped_count = 0

    equity_curve: List[float] = [init_cap]
    peak_equity = init_cap
    max_dd = 0.0

    # Group timeline by session date for daily return aggregation (clean annualization)
    prev_session_key: Optional[str] = None
    session_end_equities: List[float] = []

    for ts in timeline_dates:
        # 1. Open new eligible trades entering on `ts`
        for tr in entries_by_ts.get(ts, []):
            active_syms = {p[0].symbol for p in open_positions}
            if tr.symbol in active_syms:
                skipped_count += 1
                continue
            current_equity = cash + sum(alloc for _, alloc in open_positions)
            target_alloc = current_equity * pos_pct
            if len(open_positions) >= max_pos or cash < target_alloc or target_alloc <= 0:
                skipped_count += 1
                continue
            cash -= target_alloc
            open_positions.append((tr, target_alloc))
            executed_count += 1

        # 2. Close positions exiting on or before `ts`
        remaining_positions: List[Tuple[BacktestTradeRecord, float]] = []
        for tr, alloc in open_positions:
            if tr.exit_date <= ts:
                cash += alloc * (1.0 + tr.net_return_pct / 100.0)
            else:
                remaining_positions.append((tr, alloc))
        open_positions = remaining_positions

        # Realized + cost-basis open equity (conservative mark-to-book on non-exit bars)
        eq = cash + sum(alloc for _, alloc in open_positions)
        equity_curve.append(eq)
        peak_equity = max(peak_equity, eq)
        if peak_equity > 0:
            max_dd = max(max_dd, ((peak_equity - eq) / peak_equity) * 100.0)

        session_key = ts[:10]
        if prev_session_key is not None and session_key != prev_session_key:
            session_end_equities.append(equity_curve[-2])
        prev_session_key = session_key

    # Settle any positions whose exit fell on the final bar
    for tr, alloc in open_positions:
        cash += alloc * (1.0 + tr.net_return_pct / 100.0)
    final_equity = cash
    session_end_equities.append(final_equity)
    peak_equity = max(peak_equity, final_equity)
    if peak_equity > 0:
        max_dd = max(max_dd, ((peak_equity - final_equity) / peak_equity) * 100.0)

    net_return_pct = ((final_equity - init_cap) / init_cap) * 100.0

    # Compute daily portfolio return series for mathematically valid Sharpe / Sortino
    eq_arr = np.array([init_cap] + session_end_equities, dtype=float)
    daily_rets = np.diff(eq_arr) / np.maximum(eq_arr[:-1], 1e-9)
    n_obs = len(daily_rets)

    sharpe: Optional[float] = None
    sortino: Optional[float] = None
    if n_obs >= min_return_observations and executed_count >= 5:
        std_r = float(np.std(daily_rets, ddof=1))
        mean_r = float(np.mean(daily_rets))
        if std_r > 1e-9:
            sharpe = round((mean_r / std_r) * np.sqrt(252.0), 3)
        downside = np.minimum(daily_rets, 0.0)
        downside_dev = float(np.sqrt(np.mean(downside ** 2)))
        if downside_dev > 1e-9:
            sortino = round((mean_r / downside_dev) * np.sqrt(252.0), 3)

    note = (
        f"Time-aligned portfolio simulation with ₹{init_cap:,.0f} starting capital, "
        f"{assumptions.portfolio_position_size_pct:.1f}% allocation per position, max {max_pos} concurrent positions. "
        f"Executed {executed_count} trades, skipped {skipped_count} due to capital/slot limits. "
        + (
            "Sharpe/Sortino annualized from daily portfolio returns (rf=0%)."
            if sharpe is not None
            else f"Sharpe/Sortino omitted (requires >= {min_return_observations} daily return observations and >= 5 executed trades)."
        )
    )

    return PortfolioSimulationSummary(
        simulation_scope="TIME_ALIGNED_PORTFOLIO",
        initial_capital_inr=round(init_cap, 2),
        final_capital_inr=round(final_equity, 2),
        net_return_pct=round(net_return_pct, 3),
        max_drawdown_pct=round(max_dd, 3),
        executed_trades_count=executed_count,
        skipped_due_to_capital_or_slots=skipped_count,
        return_series_observations=n_obs,
        sharpe_ratio=sharpe,
        sortino_ratio=sortino,
        max_concurrent_positions_limit=max_pos,
        position_size_pct=assumptions.portfolio_position_size_pct,
        notes=note,
    )
