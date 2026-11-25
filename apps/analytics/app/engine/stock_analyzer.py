"""Single-Stock Rule-Based Technical Analyzer with Policy Governance & Provenance."""

from datetime import date
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.config import settings
from app.data.nifty500_constituents import get_stock_info, get_universe_metadata
from app.data.nse_calendar import add_trading_days, get_now_ist
from app.engine.backtest_execution import default_execution_assumptions, simulate_strategy_on_dataframe
from app.engine.backtest_metrics import classify_sample_size, wilson_ci_95
from app.engine.indicators import compute_indicators, compute_support_resistance_levels
from app.engine.patterns import detect_patterns_at_index
from app.engine.strategies import (
    STRATEGY_ENGINE_VERSION,
    SWING_STRATEGIES,
    compute_swing_trigger_arrays,
    evaluate_swing_strategies_at_index,
)
from app.models.common import (
    AnalysisEngineMetadata,
    DataQualitySummary,
    MarketDataProvenance,
    REGULATORY_NOTICE_TEXT,
)
from app.models.market import PriceBar
from app.models.signals import StockAnalysisResponse, StrategySignalMatch


def _run_stock_historical_simulation(symbol: str, df_ind: pd.DataFrame) -> Dict[str, Any]:
    """
    Run a causal historical simulation across the stock's own OHLCV history, reporting
    per-strategy and combined trade counts honestly with null metrics when N=0.
    """
    assumptions = default_execution_assumptions()
    comm_rt = settings.swing_round_trip_commission_pct
    masks = compute_swing_trigger_arrays(df_ind)

    per_strategy_summary: List[Dict[str, Any]] = []
    all_trades = []
    for st_id, st_def in SWING_STRATEGIES.items():
        if st_id == "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE":
            continue
        trades = simulate_strategy_on_dataframe(
            symbol=symbol,
            df_with_ind=df_ind,
            strategy_def=st_def,
            slippage_pct=settings.SWING_SLIPPAGE_PCT,
            commission_round_trip_pct=comm_rt,
            trigger_mask=masks.get(st_id),
            fold_id=1,
            period_split="OUT_OF_SAMPLE",
            assumptions=assumptions,
        )
        all_trades.extend(trades)
        n_s = len(trades)
        wins_s = sum(1 for tr in trades if tr.net_return_pct > 1e-6)
        per_strategy_summary.append(
            {
                "strategy_id": st_id,
                "completed_trades": n_s,
                "net_win_rate_pct": round((wins_s / n_s) * 100.0, 2) if n_s > 0 else None,
                "mean_net_return_pct": round(float(np.mean([tr.net_return_pct for tr in trades])), 3)
                if n_s > 0
                else None,
            }
        )

    n = len(all_trades)
    sample_status = classify_sample_size(n)
    if n == 0:
        return {
            "status": "INSUFFICIENT_DATA",
            "simulation_scope": "SINGLE_STOCK_INDEPENDENT_STRATEGIES",
            "symbol_tested": symbol,
            "bars_analyzed": len(df_ind),
            "historical_signals_on_stock": 0,
            "sample_size_status": "INSUFFICIENT",
            "stock_specific_win_rate_pct": None,
            "stock_specific_precision_pct": None,
            "win_rate_ci_95_low_pct": None,
            "win_rate_ci_95_high_pct": None,
            "target_hit_rate_pct": None,
            "avg_net_return_per_signal_pct": None,
            "per_strategy_breakdown": per_strategy_summary,
            "recent_historical_trades": [],
            "note": (
                "Zero historical swing strategy triggers occurred on this stock's available data; "
                "metrics are null rather than fabricated."
            ),
        }

    wins = sum(1 for tr in all_trades if tr.net_return_pct > 1e-6)
    target_hits = sum(1 for tr in all_trades if tr.exit_reason in ("TARGET_HIT", "GAP_TARGET"))
    ci_low, ci_high = wilson_ci_95(wins, n)
    avg_net = float(np.mean([tr.net_return_pct for tr in all_trades]))
    all_trades.sort(key=lambda tr: tr.entry_date)

    return {
        "status": "OK" if n >= 10 else "LOW_SAMPLE_SIZE",
        "simulation_scope": "SINGLE_STOCK_INDEPENDENT_STRATEGIES",
        "symbol_tested": symbol,
        "bars_analyzed": len(df_ind),
        "historical_signals_on_stock": n,
        "sample_size_status": sample_status,
        "stock_specific_win_rate_pct": round((wins / n) * 100.0, 2),
        "win_rate_ci_95_low_pct": ci_low,
        "win_rate_ci_95_high_pct": ci_high,
        "target_hit_rate_pct": round((target_hits / n) * 100.0, 2),
        "stock_specific_precision_pct": round((target_hits / n) * 100.0, 2),
        "avg_net_return_per_signal_pct": round(avg_net, 3),
        "per_strategy_breakdown": per_strategy_summary,
        "recent_historical_trades": [tr.model_dump() for tr in all_trades[-5:]],
        "note": (
            f"Single-stock historical simulation across {n} independent strategy triggers "
            f"(sample adequacy: {sample_status}, 95% CI: [{ci_low}%, {ci_high}%]); "
            "strategies evaluated independently and may overlap in time."
        ),
    }


def analyze_single_stock(
    symbol: str,
    df_raw: pd.DataFrame,
    provenance: Optional[MarketDataProvenance] = None,
    data_quality: Optional[DataQualitySummary] = None,
) -> StockAnalysisResponse:
    """
    Perform deterministic rule-based multi-indicator, pattern, and strategy analysis on a
    single NSE stock with explicit provenance, Technical Setup Score, and policy governance.
    """
    from app.engine.scoring import compute_technical_setup_score, get_validated_strategy_stats

    info = get_stock_info(symbol)
    clean_sym = info.symbol if info else symbol.strip().upper().replace(".NS", "")
    validated_stats, overall_val_status = get_validated_strategy_stats()

    df_ind = compute_indicators(df_raw, is_intraday=False)
    patterns = detect_patterns_at_index(df_ind, -1)
    strat_evals = evaluate_swing_strategies_at_index(df_ind, -1, patterns)
    supports, resistances = compute_support_resistance_levels(df_ind, num_levels=3, as_of_idx=-1)

    breakdown, indicators, bullish_reasons, risk_factors, avoid_reasons = compute_technical_setup_score(
        df_ind=df_ind,
        patterns=patterns,
        strategy_evals=strat_evals,
        validated_stats=validated_stats,
        overall_validation_status=overall_val_status,
        data_quality=data_quality,
    )
    score = breakdown.overall_score

    last = df_ind.iloc[-1]
    prev = df_ind.iloc[-2]
    c = float(last["Close"])
    pc = float(prev["Close"])
    day_change_pct = round(((c - pc) / max(pc, 1e-6)) * 100.0, 2)
    last_date_str = str(df_ind.index[-1])[:10]
    try:
        last_date_obj = date.fromisoformat(last_date_str)
    except Exception:
        last_date_obj = get_now_ist().date()

    atr = float(last["ATR_14"]) if pd.notna(last["ATR_14"]) and float(last["ATR_14"]) > 0 else c * 0.02
    ema20 = float(last["EMA_20"]) if pd.notna(last["EMA_20"]) else c
    ema50 = float(last["EMA_50"]) if pd.notna(last["EMA_50"]) else c
    ema200 = float(last["EMA_200"]) if pd.notna(last["EMA_200"]) else c
    rsi = float(last["RSI_14"]) if pd.notna(last["RSI_14"]) else 50.0

    # Deterministic Market Outlook & Algorithmic Signal Classification
    bear_confirmed = any(p.direction == "BEARISH" and p.status == "CONFIRMED" for p in patterns)
    if score >= 76.0 and c > ema20 > ema50 and not bear_confirmed and rsi <= 73.5:
        outlook, raw_classification = "STRONG_BULLISH", "BUY"
    elif score >= 65.0 and c > ema50 > ema200 and not bear_confirmed and rsi <= 74.0:
        outlook, raw_classification = "BULLISH", "BUY"
    elif score >= 50.0 and c >= ema200 * 0.98:
        outlook = "BULLISH" if score >= 58.0 else "NEUTRAL"
        raw_classification = "WAIT"
    elif score >= 38.0:
        outlook, raw_classification = "BEARISH", "AVOID"
    else:
        outlook, raw_classification = "STRONG_BEARISH", "AVOID"

    signals_allowed = (
        settings.ENABLE_PUBLIC_STOCK_SIGNALS and settings.SIGNAL_CLASSIFICATION_MODE == "FULL"
    )

    if signals_allowed:
        signal_classification = raw_classification
        classification_type = "ALGORITHMIC_TECHNICAL_CLASSIFICATION"
        if raw_classification == "BUY":
            entry_low = round(c * 0.994, 2)
            entry_high = round(c * 1.005, 2)
            entry_type = "CONFIRMED_CURRENT_PRICE"
            stop_loss = round(min(c - 1.35 * atr, supports[0] * 0.992 if supports else c - 1.35 * atr), 2)
            stop_loss = max(stop_loss, round(c - 2.2 * atr, 2))
        else:
            pullback_lvl = round(max(ema20, supports[0] if supports else c - atr), 2)
            entry_low = round(pullback_lvl * 0.995, 2)
            entry_high = round(pullback_lvl * 1.008, 2)
            entry_type = "WAIT_FOR_PULLBACK_OR_BREAKOUT"
            stop_loss = round(entry_low - 1.35 * atr, 2)

        ref_entry = round((entry_low + entry_high) / 2.0, 2)
        target_1 = round(
            max(
                ref_entry + 2.0 * atr,
                resistances[0] if resistances and resistances[0] > ref_entry * 1.015 else ref_entry + 2.0 * atr,
            ),
            2,
        )
        target_2 = round(ref_entry + 3.4 * atr, 2)
        rr_ratio = round(max(target_1 - ref_entry, 0.01) / max(ref_entry - stop_loss, 0.01), 2)
        est_date_obj = add_trading_days(last_date_obj, 9)
        est_window = "7-12 NSE Trading Days"
        est_date_str = f"Est. {est_date_obj.isoformat()} ({est_window})"

        if raw_classification == "BUY":
            summary = (
                f"ALGORITHMIC OUTPUT: BUY (Technical Setup Score: {score}/100, heuristic alignment). "
                f"Reference zone ₹{entry_low:.2f}-₹{entry_high:.2f}, reference target ₹{target_1:.2f} "
                f"(R:R {rr_ratio}:1), reference stop ₹{stop_loss:.2f}."
            )
            if not avoid_reasons:
                avoid_reasons.append(f"Technical invalidation if daily close drops below ₹{stop_loss:.2f}.")
        elif raw_classification == "WAIT":
            summary = (
                f"ALGORITHMIC OUTPUT: WAIT (Technical Setup Score: {score}/100). "
                f"Reference pullback zone ₹{entry_low:.2f}-₹{entry_high:.2f} or breakout above "
                f"₹{resistances[0] if resistances else round(c * 1.02, 2):.2f}."
            )
            if not avoid_reasons:
                avoid_reasons.append("Awaiting stronger volume confirmation or support pullback.")
        else:
            summary = (
                f"ALGORITHMIC OUTPUT: AVOID (Technical Setup Score: {score}/100, Outlook: {outlook}). "
                f"Price structure remains unfavorable relative to EMA50 (₹{ema50:.2f}) / EMA200 (₹{ema200:.2f})."
            )
    else:
        signal_classification = None
        classification_type = "DISABLED_BY_POLICY"
        entry_low = entry_high = target_1 = target_2 = stop_loss = rr_ratio = None
        entry_type = est_window = est_date_str = None
        summary = (
            f"Technical-only mode active (Technical Setup Score: {score}/100, Outlook: {outlook}). "
            "Stock-specific BUY/WAIT/AVOID classifications and trade levels are disabled by policy."
        )

    legacy = settings.ENABLE_LEGACY_FIELD_ALIASES
    strat_matches: List[StrategySignalMatch] = []
    for st_id, st_def in SWING_STRATEGIES.items():
        ev = strat_evals.get(st_id, {})
        st_stat = validated_stats.get(st_id)
        st_val_status = st_stat.get("validation_status", "UNVALIDATED") if st_stat else "UNVALIDATED"
        is_val = st_val_status == "VALIDATED"
        emp_wr = st_stat.get("win_rate_oos") if (st_stat and is_val) else None
        emp_tr = st_stat.get("target_hit_rate_oos") if (st_stat and is_val) else None
        emp_pf = st_stat.get("profit_factor_oos") if (st_stat and is_val) else None
        emp_n = st_stat.get("sample_size_oos") if st_stat else None
        strat_matches.append(
            StrategySignalMatch(
                strategy_id=st_id,
                strategy_name=st_def.name,
                triggered=bool(ev.get("triggered", False)),
                direction=str(ev.get("direction", "NEUTRAL")),  # type: ignore[arg-type]
                heuristic_weight=st_def.default_weight,
                validation_status=st_val_status,
                empirical_win_rate_oos_pct=emp_wr,
                empirical_target_hit_rate_oos_pct=emp_tr,
                empirical_profit_factor_oos=emp_pf,
                empirical_sample_size_oos=emp_n,
                empirical_win_rate_ci_95_low_pct=st_stat.get("ci_low") if (st_stat and is_val) else None,
                empirical_win_rate_ci_95_high_pct=st_stat.get("ci_high") if (st_stat and is_val) else None,
                condition_summary=str(ev.get("reason", st_def.description)),
                historical_win_rate_pct=emp_wr if legacy else None,
                historical_precision_pct=emp_wr if legacy else None,
                historical_profit_factor=emp_pf if legacy else None,
                weight=st_def.default_weight,
            )
        )

    stock_bt_summary = _run_stock_historical_simulation(clean_sym, df_ind)

    recent_bars: List[PriceBar] = []
    for ts, r in df_ind.tail(90).iterrows():
        recent_bars.append(
            PriceBar(
                date=str(ts)[:10],
                open=round(float(r["Open"]), 2),
                high=round(float(r["High"]), 2),
                low=round(float(r["Low"]), 2),
                close=round(float(r["Close"]), 2),
                volume=int(r["Volume"]),
                ema_20=round(float(r["EMA_20"]), 2) if pd.notna(r["EMA_20"]) else None,
                ema_50=round(float(r["EMA_50"]), 2) if pd.notna(r["EMA_50"]) else None,
                ema_200=round(float(r["EMA_200"]), 2) if pd.notna(r["EMA_200"]) else None,
                bb_upper=round(float(r["BB_Upper"]), 2) if pd.notna(r["BB_Upper"]) else None,
                bb_lower=round(float(r["BB_Lower"]), 2) if pd.notna(r["BB_Lower"]) else None,
                rsi_14=round(float(r["RSI_14"]), 1) if pd.notna(r["RSI_14"]) else None,
                is_completed_candle=True,
            )
        )

    prov = provenance or MarketDataProvenance(
        provider_id=settings.MARKET_DATA_PROVIDER,
        provider_display_name=f"{settings.MARKET_DATA_PROVIDER} (Direct DataFrame Input)",
        price_adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        last_completed_candle_ts=last_date_str,
        data_freshness="DELAYED",
        is_stale=False,
        cache_layer="LIVE_PROVIDER",
    )
    dq = data_quality or DataQualitySummary(
        is_valid=True,
        total_rows_raw=len(df_raw),
        completed_rows_usable=len(df_ind),
    )

    univ_meta = get_universe_metadata()
    engine_meta = AnalysisEngineMetadata(
        strategy_version=STRATEGY_ENGINE_VERSION,
        data_source=f"{prov.provider_id} ({prov.price_adjustment_policy})",
        data_limitations=[
            "Deterministic rule-based technical analysis; no AI/ML prediction model is used.",
            f"Data freshness: {prov.data_freshness} (estimated delay: {prov.estimated_delay_minutes} min).",
            univ_meta.survivorship_bias_disclosure,
        ],
    )

    resp_status = "TECHNICAL_ONLY_POLICY" if not signals_allowed else ("STALE_DATA" if prov.is_stale else "OK")

    return StockAnalysisResponse(
        status=resp_status,  # type: ignore[arg-type]
        symbol=clean_sym,
        name=info.name if info else clean_sym,
        sector=info.sector if info else "NSE Equity",
        index_tier=info.index_tier if info else "NSE LISTED",
        analysis_timestamp_ist=get_now_ist().strftime("%Y-%m-%d %H:%M:%S IST"),
        data_as_of_date=last_date_str,
        current_price=round(c, 2),
        day_change_pct=day_change_pct,
        technical_setup_score=score,
        score_breakdown=breakdown,
        market_outlook=outlook,  # type: ignore[arg-type]
        signal_classification=signal_classification,  # type: ignore[arg-type]
        classification_type=classification_type,  # type: ignore[arg-type]
        is_investment_advice=False,
        regulatory_notice=REGULATORY_NOTICE_TEXT,
        classification_summary=summary,
        overall_confidence_score=score if legacy else None,
        recommendation=signal_classification if legacy else None,  # type: ignore[arg-type]
        recommendation_summary=summary,
        entry_zone_low=entry_low,
        entry_zone_high=entry_high,
        entry_trigger_type=entry_type,  # type: ignore[arg-type]
        projected_target_1=target_1,
        projected_target_2=target_2,
        estimated_target_window_days=est_window,
        estimated_target_date=est_date_str,
        stop_loss=stop_loss,
        risk_reward_ratio=rr_ratio,
        support_levels=supports,
        resistance_levels=resistances,
        supporting_indicators=indicators,
        identified_patterns=patterns,
        strategy_evaluations=strat_matches,
        bullish_reasons=bullish_reasons,
        risk_factors=risk_factors,
        reasons_to_avoid=avoid_reasons,
        stock_backtest_summary=stock_bt_summary,
        recent_price_bars=recent_bars,
        validation_status=overall_val_status,
        data_provenance=prov,
        data_quality=dq,
        engine_metadata=engine_meta,
    )
