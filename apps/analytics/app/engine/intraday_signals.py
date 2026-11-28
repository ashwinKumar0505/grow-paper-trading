"""Intraday 15m Session Signal Evaluator Aligned with Backtester Execution Assumptions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.config import settings
from app.data.nifty500_constituents import get_stock_info
from app.data.nse_calendar import INTRADAY_ENTRY_CUTOFF_TIME
from app.engine.backtest_execution import default_execution_assumptions
from app.engine.indicators import compute_indicators
from app.engine.strategies import (
    INTRADAY_STRATEGIES,
    compute_intraday_trigger_arrays,
    evaluate_intraday_strategies_at_index,
)
from app.models.common import MarketDataProvenance
from app.models.signals import IntradaySignalItem, ValidationStatus

_DEFAULT_INTRADAY_EVALUATOR = evaluate_intraday_strategies_at_index


def evaluate_intraday_session_signals(
    symbol: str,
    df_15m: pd.DataFrame,
    is_market_live: bool,
    validated_stats: Optional[Dict[str, Dict[str, Any]]] = None,
    provenance: Optional[MarketDataProvenance] = None,
) -> List[IntradaySignalItem]:
    """
    Scan the latest trading session's completed 15m bars using the EXACT SAME strategy trigger
    and execution assumptions as the intraday backtester (next-bar-open + slippage for completed
    subsequent bars, conservative stop-first ambiguity resolution, breakeven trailing stop,
    and mandatory same-session square-off with zero overnight holding).
    """
    from app.engine.scoring import get_validated_strategy_stats

    if df_15m is None or len(df_15m) < 20:
        return []

    if validated_stats is None:
        validated_stats, _ = get_validated_strategy_stats()

    df_ind = compute_indicators(df_15m, is_intraday=True)
    last_session_date = df_ind.index[-1].date()
    session_indices = [
        i for i, ts in enumerate(df_ind.index) if ts.date() == last_session_date and i >= 15
    ]
    if not session_indices:
        return []

    # Strictly causal masks computed once per stock when using the standard evaluator
    use_precomputed = evaluate_intraday_strategies_at_index is _DEFAULT_INTRADAY_EVALUATOR
    precomputed_masks = compute_intraday_trigger_arrays(df_ind) if use_precomputed else None
    opens_arr = df_ind["Open"].to_numpy(dtype=float)
    highs_arr = df_ind["High"].to_numpy(dtype=float)
    lows_arr = df_ind["Low"].to_numpy(dtype=float)
    closes_arr = df_ind["Close"].to_numpy(dtype=float)
    index_arr = df_ind.index
    latest_close_price = round(float(closes_arr[-1]), 2)
    session_close_dt = pd.Timestamp.combine(last_session_date, datetime.strptime("15:15", "%H:%M").time())
    latest_bar_end_ts = index_arr[session_indices[-1]] + pd.Timedelta(minutes=15)

    assumptions = default_execution_assumptions()
    slip_pct = settings.INTRADAY_SLIPPAGE_PCT
    comm_rt = settings.intraday_round_trip_commission_pct
    info = get_stock_info(symbol)
    legacy = settings.ENABLE_LEGACY_FIELD_ALIASES
    freshness = provenance.data_freshness if provenance else "DELAYED"
    is_stale = provenance.is_stale if provenance else False

    badge_map = {
        "LIVE_ACTIVE_ENTRY": "LIVE SIGNAL BAR (Projected Reference Target)",
        "PROJECTED_EXIT_PENDING": "OPEN INTRADAY — PROJECTED EXIT PENDING",
        "COMPLETED_TARGET_HIT": "COMPLETED — TARGET HIT",
        "COMPLETED_GAP_TARGET": "COMPLETED — GAP TARGET",
        "COMPLETED_STOP_LOSS_HIT": "COMPLETED — STOP-LOSS HIT",
        "COMPLETED_GAP_STOP_LOSS": "COMPLETED — GAP STOP-LOSS",
        "COMPLETED_TRAILING_STOP": "COMPLETED — BREAKEVEN TRAILING STOP",
        "COMPLETED_SQUARE_OFF_1515": "COMPLETED — SESSION-END SQUARE-OFF",
    }

    signals: List[IntradaySignalItem] = []
    i_ptr = 0
    while i_ptr < len(session_indices):
        idx = session_indices[i_ptr]
        sig_ts = index_arr[idx]
        if hasattr(sig_ts, "time") and sig_ts.time() > INTRADAY_ENTRY_CUTOFF_TIME:
            break

        if precomputed_masks is not None:
            if not any(bool(m[idx]) for m in precomputed_masks.values()):
                i_ptr += 1
                continue
            evals = evaluate_intraday_strategies_at_index(df_ind, idx, precomputed_masks=precomputed_masks)
        else:
            evals = evaluate_intraday_strategies_at_index(df_ind, idx)
        trig_ids = [k for k, v in evals.items() if v.get("triggered", False)]
        if not trig_ids:
            i_ptr += 1
            continue

        best_id = max(trig_ids, key=lambda sid: INTRADAY_STRATEGIES[sid].default_weight)
        st_def = INTRADAY_STRATEGIES[best_id]
        st_stat = validated_stats.get(best_id)
        val_status: ValidationStatus = (
            st_stat.get("validation_status", "UNVALIDATED") if st_stat else "UNVALIDATED"
        )
        emp_wr = st_stat.get("win_rate_oos") if (st_stat and val_status == "VALIDATED") else None
        emp_n = st_stat.get("sample_size_oos") if st_stat else None

        row = df_ind.iloc[idx]
        atr_raw = row.get("ATR_14", np.nan)
        vwap_val = round(float(row["VWAP"]), 2) if pd.notna(row.get("VWAP")) else round(float(closes_arr[idx]), 2)
        subsequent_indices = [k for k in session_indices if k > idx]

        if subsequent_indices:
            entry_idx = subsequent_indices[0]
            raw_entry = float(opens_arr[entry_idx])
            entry_price = round(raw_entry * (1.0 + slip_pct / 100.0), 2)
            entry_ts = index_arr[entry_idx]
            entry_model = "NEXT_BAR_OPEN_WITH_SLIPPAGE"
            check_indices = subsequent_indices[: st_def.max_holding_bars]
        else:
            raw_entry = float(closes_arr[idx])
            entry_price = round(raw_entry, 2)
            entry_ts = sig_ts
            entry_model = "SIGNAL_BAR_CLOSE_REFERENCE"
            check_indices = []

        atr = float(atr_raw) if pd.notna(atr_raw) and float(atr_raw) > 0 else entry_price * 0.006
        target_price = round(entry_price + st_def.target_atr_mult * atr, 2)
        initial_stop = round(entry_price - st_def.stop_atr_mult * atr, 2)
        active_stop = initial_stop
        be_trigger = entry_price + assumptions.breakeven_trigger_atr_mult * atr
        rr = round((target_price - entry_price) / max(entry_price - initial_stop, 0.01), 2)

        est_exit_dt = min(entry_ts + pd.Timedelta(minutes=90), session_close_dt)

        status = "LIVE_ACTIVE_ENTRY" if (is_market_live and len(check_indices) <= 1) else "PROJECTED_EXIT_PENDING"
        is_projected = True
        intrabar_ambiguous = False
        actual_exit_price: Optional[float] = None
        actual_exit_time: Optional[str] = None
        exit_bar_idx: Optional[int] = None

        for pos, k in enumerate(check_indices):
            ts_k = index_arr[k]
            open_k = float(opens_arr[k])
            high_k = float(highs_arr[k])
            low_k = float(lows_arr[k])

            if pos > 0:
                if open_k <= active_stop:
                    status = "COMPLETED_TRAILING_STOP" if active_stop > initial_stop else "COMPLETED_GAP_STOP_LOSS"
                    is_projected = False
                    exit_bar_idx = k
                    actual_exit_price = round(open_k * (1.0 - slip_pct / 100.0), 2)
                    actual_exit_time = ts_k.strftime("%Y-%m-%d %H:%M IST")
                    break
                if open_k >= target_price:
                    status = "COMPLETED_GAP_TARGET"
                    is_projected = False
                    exit_bar_idx = k
                    actual_exit_price = round(open_k * (1.0 - slip_pct / 100.0), 2)
                    actual_exit_time = ts_k.strftime("%Y-%m-%d %H:%M IST")
                    break

            hit_stop = low_k <= active_stop
            hit_target = high_k >= target_price
            if hit_stop and hit_target:
                intrabar_ambiguous = True
                status = "COMPLETED_TRAILING_STOP" if active_stop > initial_stop else "COMPLETED_STOP_LOSS_HIT"
                is_projected = False
                exit_bar_idx = k
                actual_exit_price = round(active_stop * (1.0 - slip_pct / 100.0), 2)
                actual_exit_time = ts_k.strftime("%Y-%m-%d %H:%M IST")
                break
            if hit_stop:
                status = "COMPLETED_TRAILING_STOP" if active_stop > initial_stop else "COMPLETED_STOP_LOSS_HIT"
                is_projected = False
                exit_bar_idx = k
                actual_exit_price = round(active_stop * (1.0 - slip_pct / 100.0), 2)
                actual_exit_time = ts_k.strftime("%Y-%m-%d %H:%M IST")
                break
            if hit_target:
                status = "COMPLETED_TARGET_HIT"
                is_projected = False
                exit_bar_idx = k
                actual_exit_price = round(target_price * (1.0 - slip_pct / 100.0), 2)
                actual_exit_time = ts_k.strftime("%Y-%m-%d %H:%M IST")
                break

            if assumptions.breakeven_trailing_stop_enabled and high_k >= be_trigger:
                be_offset = comm_rt + 2.0 * slip_pct + assumptions.breakeven_buffer_pct
                active_stop = max(active_stop, round(entry_price * (1.0 + be_offset / 100.0), 2))

        holding_window_expired = len(subsequent_indices) >= st_def.max_holding_bars and bool(check_indices)
        status_badge_override: Optional[str] = None
        if is_projected and check_indices and (not is_market_live or holding_window_expired):
            last_k = check_indices[-1]
            status = "COMPLETED_SQUARE_OFF_1515"
            is_projected = False
            exit_bar_idx = last_k
            actual_exit_price = round(float(closes_arr[last_k]) * (1.0 - slip_pct / 100.0), 2)
            actual_exit_time = index_arr[last_k].strftime("%Y-%m-%d %H:%M IST")
            if is_market_live and holding_window_expired:
                status_badge_override = "COMPLETED — HOLDING WINDOW EXPIRED"

        current_price = latest_close_price
        if not is_projected and actual_exit_price is not None:
            pnl_pct = round(((actual_exit_price - entry_price) / entry_price) * 100.0 - comm_rt, 3)
        else:
            pnl_pct = round(((current_price - entry_price) / entry_price) * 100.0, 3)
        if is_projected:
            if subsequent_indices:
                bars_since_entry: Optional[int] = len(subsequent_indices)
                minutes_since_entry: Optional[int] = max(
                    0, int(round((latest_bar_end_ts - entry_ts).total_seconds() / 60.0))
                )
            else:
                bars_since_entry = 0
                minutes_since_entry = 0
            entry_freshness = "FRESH" if bars_since_entry <= 2 else "IN_PROGRESS"
            if initial_stop < current_price < target_price:
                live_rr: Optional[float] = round(
                    (target_price - current_price) / max(current_price - initial_stop, 0.01), 2
                )
            else:
                live_rr = None
        else:
            bars_since_entry = None
            minutes_since_entry = None
            entry_freshness = "CLOSED"
            live_rr = None

        vol_r = float(row["Vol_Ratio_20"]) if pd.notna(row.get("Vol_Ratio_20")) else 1.0
        adx_v = float(row["ADX_14"]) if pd.notna(row.get("ADX_14")) else 20.0
        setup_score = float(
            np.clip(
                round(60.0 + len(trig_ids) * 8.0 + min(10.0, max(0.0, (vol_r - 1.0) * 8.0)) + min(8.0, max(0.0, (adx_v - 18.0) * 0.6)), 1),
                0.0,
                95.0,
            )
        )

        signals.append(
            IntradaySignalItem(
                id=f"{symbol}-{sig_ts.strftime('%H%M')}",
                symbol=symbol,
                name=info.name if info else symbol,
                sector=info.sector if info else "NSE Equity",
                strategy_id=best_id,
                strategy_name=st_def.name,
                technical_setup_score=setup_score,
                validation_status=val_status,
                empirical_win_rate_oos_pct=emp_wr,
                backtest_sample_size_oos=emp_n,
                confidence_score=setup_score if legacy else None,
                historical_precision_pct=emp_wr if legacy else None,
                current_price=current_price,
                vwap=vwap_val,
                entry_price=entry_price,
                entry_execution_model=entry_model,  # type: ignore[arg-type]
                entry_time_ist=entry_ts.strftime("%Y-%m-%d %H:%M IST"),
                target_exit_price=target_price,
                estimated_exit_time_ist=f"Est. {est_exit_dt.strftime('%H:%M IST')}",
                actual_exit_price=actual_exit_price,
                actual_exit_time_ist=actual_exit_time,
                stop_loss=initial_stop,
                risk_reward_ratio=rr,
                pnl_pct=pnl_pct,
                signal_status=status,  # type: ignore[arg-type]
                is_projected_exit=is_projected,
                intrabar_ambiguous=intrabar_ambiguous,
                minutes_since_entry=minutes_since_entry,
                bars_since_entry=bars_since_entry,
                entry_freshness=entry_freshness,  # type: ignore[arg-type]
                live_risk_reward_ratio=live_rr,
                data_freshness=freshness,
                is_stale=is_stale,
                status_badge_text=status_badge_override or badge_map[status],
                reasoning=str(evals[best_id]["reason"]),
            )
        )

        if exit_bar_idx is not None:
            while i_ptr < len(session_indices) and session_indices[i_ptr] <= exit_bar_idx:
                i_ptr += 1
        else:
            break

    return signals
