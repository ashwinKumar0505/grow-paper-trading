"""Deterministic Heuristic Technical Setup Scoring & Intraday/Swing Signal Evaluation."""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.config import settings
from app.data.nifty500_constituents import get_stock_info
from app.data.nse_calendar import INTRADAY_ENTRY_CUTOFF_TIME, add_trading_days, get_next_trading_day, get_now_ist
from app.engine.backtest_execution import default_execution_assumptions
from app.engine.backtester import get_validated_backtest_report
from app.engine.indicators import compute_indicators
from app.engine.patterns import detect_patterns_at_index
from app.engine.strategies import (
    INTRADAY_STRATEGIES,
    SWING_STRATEGIES,
    evaluate_intraday_strategies_at_index,
    evaluate_swing_strategies_at_index,
)
from app.models.common import DataQualitySummary, MarketDataProvenance
from app.models.signals import (
    IndicatorSnapshot,
    IntradaySignalItem,
    PatternDetection,
    ScoreComponent,
    SwingSignalItem,
    TechnicalSetupScoreBreakdown,
    ValidationStatus,
)


def get_validated_strategy_stats() -> Tuple[Dict[str, Dict[str, Any]], ValidationStatus]:
    """
    Retrieve empirical out-of-sample statistics ONLY from a version-verified compatible
    backtest artifact. NEVER fabricates hardcoded win rates, precision, or profit factors.
    """
    report, _ = get_validated_backtest_report()
    stats: Dict[str, Dict[str, Any]] = {}

    if report is not None and report.strategies:
        for m in report.strategies:
            stats[m.strategy_id] = {
                "validation_status": m.validation_status,
                "win_rate_oos": m.net_win_rate_oos_pct,
                "target_hit_rate_oos": m.target_hit_rate_oos_pct,
                "profit_factor_oos": m.profit_factor_oos,
                "sample_size_oos": m.completed_trades_oos,
                "ci_low": m.win_rate_ci_95_low_pct,
                "ci_high": m.win_rate_ci_95_high_pct,
                "avg_hold_days": m.avg_holding_days,
                "heuristic_weight": m.heuristic_score_weight,
            }
        return stats, report.validation_status

    return stats, "UNVALIDATED"


def compute_technical_setup_score(
    df_ind: pd.DataFrame,
    patterns: List[PatternDetection],
    strategy_evals: Dict[str, Dict[str, object]],
    validated_stats: Dict[str, Dict[str, Any]],
    overall_validation_status: ValidationStatus = "UNVALIDATED",
    data_quality: Optional[DataQualitySummary] = None,
) -> Tuple[TechnicalSetupScoreBreakdown, List[IndicatorSnapshot], List[str], List[str], List[str]]:
    """
    Compute deterministic heuristic Technical Setup Score (0-100) using static rule weights.
    This score measures multi-factor technical condition alignment and is NOT a calibrated probability.
    """
    last = df_ind.iloc[-1]
    prev = df_ind.iloc[-2]

    c = float(last["Close"])
    h = float(last["High"])
    ema20 = float(last["EMA_20"]) if pd.notna(last["EMA_20"]) else c
    ema50 = float(last["EMA_50"]) if pd.notna(last["EMA_50"]) else c
    ema200 = float(last["EMA_200"]) if pd.notna(last["EMA_200"]) else c
    sma200 = float(last["SMA_200"]) if pd.notna(last["SMA_200"]) else ema200

    rsi = float(last["RSI_14"]) if pd.notna(last["RSI_14"]) else 50.0
    macd_line = float(last["MACD_Line"]) if pd.notna(last["MACD_Line"]) else 0.0
    macd_sig = float(last["MACD_Signal"]) if pd.notna(last["MACD_Signal"]) else 0.0
    macd_hist = float(last["MACD_Hist"]) if pd.notna(last["MACD_Hist"]) else 0.0
    prev_macd_hist = float(prev["MACD_Hist"]) if pd.notna(prev["MACD_Hist"]) else 0.0

    adx = float(last["ADX_14"]) if pd.notna(last["ADX_14"]) else 15.0
    plus_di = float(last["Plus_DI"]) if pd.notna(last["Plus_DI"]) else 20.0
    minus_di = float(last["Minus_DI"]) if pd.notna(last["Minus_DI"]) else 20.0
    vol_ratio = float(last["Vol_Ratio_20"]) if pd.notna(last["Vol_Ratio_20"]) else 1.0
    vwap = float(last["VWAP"]) if pd.notna(last["VWAP"]) else c
    bb_pctb = float(last["BB_PctB"]) if pd.notna(last["BB_PctB"]) else 0.5
    atr = float(last["ATR_14"]) if pd.notna(last["ATR_14"]) and float(last["ATR_14"]) > 0 else c * 0.02
    atr_pct = float(last["ATR_Pct"]) if pd.notna(last["ATR_Pct"]) else (atr / max(c, 1e-6)) * 100.0
    prior_high_20 = float(last["Prior_High_20"]) if pd.notna(last["Prior_High_20"]) else h

    indicators: List[IndicatorSnapshot] = []
    positive_conditions: List[str] = []
    negative_conditions: List[str] = []
    risk_factors: List[str] = []
    components: List[ScoreComponent] = []

    # 1. Trend Structure (0 to 25 pts)
    if c > ema20 > ema50 > ema200:
        trend_pts, ema_sig = 25.0, "BULLISH"
        ema_exp = f"Golden EMA stack: Price (₹{c:.2f}) > EMA20 (₹{ema20:.2f}) > EMA50 (₹{ema50:.2f}) > EMA200 (₹{ema200:.2f})."
        positive_conditions.append(ema_exp)
    elif c > ema50 > ema200:
        trend_pts, ema_sig = 18.0, "BULLISH"
        ema_exp = f"Medium- and long-term uptrend above EMA50 (₹{ema50:.2f}) and EMA200 (₹{ema200:.2f})."
        positive_conditions.append(ema_exp)
    elif c > ema200:
        trend_pts, ema_sig = 11.0, "NEUTRAL"
        ema_exp = f"Price above EMA200 (₹{ema200:.2f}) but below shorter-term EMA20/EMA50."
        risk_factors.append("Short-term moving averages (EMA20/EMA50) are not fully aligned upward.")
    else:
        trend_pts, ema_sig = 3.0, "BEARISH"
        ema_exp = f"Price (₹{c:.2f}) below long-term EMA200 (₹{ema200:.2f}) and SMA200 (₹{sma200:.2f})."
        negative_conditions.append(f"Primary trend is bearish: price is below 200-day EMA (₹{ema200:.2f}).")

    indicators.append(
        IndicatorSnapshot(
            name="EMA Trend Stack (20 / 50 / 200)",
            value=f"₹{ema20:.1f} / ₹{ema50:.1f} / ₹{ema200:.1f}",
            numeric_value=round(c / max(ema200, 1e-6), 3),
            signal=ema_sig,
            weight=25.0,
            explanation=ema_exp,
        )
    )
    components.append(
        ScoreComponent(component="Trend Alignment (EMA Stack)", score=trend_pts, max_score=25.0, signal=ema_sig, details=ema_exp)
    )

    # 2. Momentum, Trend Strength & Volume/VWAP (0 to 25 pts)
    mom_pts = 0.0

    if 52.0 <= rsi <= 69.0:
        mom_pts += 7.0
        rsi_sig = "BULLISH"
        rsi_exp = f"RSI(14) at {rsi:.1f} reflects constructive momentum below overbought levels."
        positive_conditions.append(rsi_exp)
    elif 45.0 <= rsi < 52.0:
        mom_pts += 4.5
        rsi_sig = "NEUTRAL"
        rsi_exp = f"RSI(14) at {rsi:.1f} is in neutral territory."
    elif rsi > 74.0:
        mom_pts += 2.0
        rsi_sig = "BEARISH"
        rsi_exp = f"RSI(14) is elevated at {rsi:.1f} (>74), increasing mean-reversion pullback risk."
        risk_factors.append(rsi_exp)
        negative_conditions.append(f"Elevated RSI(14) at {rsi:.1f} increases short-term pullback risk.")
    elif rsi > 69.0:
        mom_pts += 5.0
        rsi_sig = "BULLISH"
        rsi_exp = f"RSI(14) at {rsi:.1f} shows strong momentum approaching overbought thresholds."
        risk_factors.append(f"RSI(14) at {rsi:.1f} is approaching 70+ overbought levels.")
    else:
        mom_pts += 1.0
        rsi_sig = "BEARISH"
        rsi_exp = f"RSI(14) is weak at {rsi:.1f} (<45)."
        negative_conditions.append(f"Weak relative momentum: RSI(14) is {rsi:.1f}.")

    indicators.append(
        IndicatorSnapshot(name="RSI (14)", value=f"{rsi:.1f}", numeric_value=round(rsi, 2), signal=rsi_sig, weight=7.0, explanation=rsi_exp)
    )

    if macd_line > macd_sig and macd_hist > 0 and macd_hist >= prev_macd_hist:
        mom_pts += 6.5
        macd_sig_str = "BULLISH"
        macd_exp = f"MACD ({macd_line:.2f}) > Signal ({macd_sig:.2f}) with rising positive histogram ({macd_hist:+.2f})."
        positive_conditions.append(macd_exp)
    elif macd_line > macd_sig:
        mom_pts += 4.5
        macd_sig_str = "BULLISH"
        macd_exp = f"MACD above signal ({macd_hist:+.2f}) with moderating histogram slope."
    else:
        mom_pts += 1.0
        macd_sig_str = "BEARISH"
        macd_exp = f"MACD ({macd_line:.2f}) below Signal ({macd_sig:.2f}) with histogram ({macd_hist:+.2f})."
        negative_conditions.append("MACD momentum is bearish (MACD line below signal line).")

    indicators.append(
        IndicatorSnapshot(name="MACD (12, 26, 9)", value=f"Hist {macd_hist:+.2f}", numeric_value=round(macd_hist, 3), signal=macd_sig_str, weight=6.5, explanation=macd_exp)
    )

    if adx >= 22.0 and plus_di > minus_di + 5.0:
        mom_pts += 6.0
        adx_sig = "BULLISH"
        adx_exp = f"Directional trend strength: ADX {adx:.1f} with +DI ({plus_di:.1f}) > -DI ({minus_di:.1f})."
        positive_conditions.append(adx_exp)
    elif plus_di > minus_di:
        mom_pts += 3.5
        adx_sig = "NEUTRAL"
        adx_exp = f"+DI ({plus_di:.1f}) > -DI ({minus_di:.1f}) with moderate ADX ({adx:.1f})."
        if adx < 18.0:
            risk_factors.append(f"Low ADX ({adx:.1f} < 18) indicates range-bound conditions prone to whipsaws.")
    else:
        mom_pts += 0.5
        adx_sig = "BEARISH"
        adx_exp = f"Negative directional spread: -DI ({minus_di:.1f}) > +DI ({plus_di:.1f}), ADX {adx:.1f}."
        negative_conditions.append(f"Directional Movement favors sellers (-DI {minus_di:.1f} > +DI {plus_di:.1f}).")

    indicators.append(
        IndicatorSnapshot(
            name="ADX (14) & DI Spread",
            value=f"ADX {adx:.1f} (+DI {plus_di:.0f}/-DI {minus_di:.0f})",
            numeric_value=round(adx, 2),
            signal=adx_sig,
            weight=6.0,
            explanation=adx_exp,
        )
    )

    if c > vwap and vol_ratio >= 1.3:
        mom_pts += 5.5
        vwap_sig = "BULLISH"
        vwap_exp = f"Price (₹{c:.2f}) above 20D rolling VWAP (₹{vwap:.2f}) with {vol_ratio:.2f}x relative volume."
        positive_conditions.append(vwap_exp)
    elif c > vwap:
        mom_pts += 3.5
        vwap_sig = "BULLISH"
        vwap_exp = f"Price above 20D rolling VWAP (₹{vwap:.2f}) on {vol_ratio:.2f}x volume."
        if vol_ratio < 0.85:
            risk_factors.append(f"Below-average volume ({vol_ratio:.2f}x 20-day mean) weakens signal conviction.")
    else:
        mom_pts += 1.0
        vwap_sig = "BEARISH"
        vwap_exp = f"Price (₹{c:.2f}) is below 20D rolling VWAP (₹{vwap:.2f})."
        negative_conditions.append(f"Price is trading below 20-day volume-weighted average price (₹{vwap:.2f}).")

    indicators.append(
        IndicatorSnapshot(
            name="20D Rolling VWAP & Volume Ratio",
            value=f"₹{vwap:.1f} ({vol_ratio:.2f}x Vol)",
            numeric_value=round(vol_ratio, 2),
            signal=vwap_sig,
            weight=5.5,
            explanation=vwap_exp,
        )
    )

    bb_sig = "BULLISH" if 0.55 <= bb_pctb <= 0.98 else ("BEARISH" if bb_pctb < 0.35 else "NEUTRAL")
    indicators.append(
        IndicatorSnapshot(
            name="Bollinger %B & ATR(14)",
            value=f"%B {bb_pctb:.2f} | ATR ₹{atr:.1f} ({atr_pct:.1f}%)",
            numeric_value=round(bb_pctb, 2),
            signal=bb_sig,
            weight=0.0,
            explanation=f"Bollinger %B {bb_pctb:.2f}; ATR(14) daily range ₹{atr:.2f} ({atr_pct:.2f}% of price).",
        )
    )
    components.append(
        ScoreComponent(
            component="Momentum, ADX & Volume/VWAP",
            score=round(mom_pts, 2),
            max_score=25.0,
            signal="BULLISH" if mom_pts >= 16.0 else ("BEARISH" if mom_pts <= 8.0 else "NEUTRAL"),
            details=f"RSI {rsi:.1f}, MACD hist {macd_hist:+.2f}, ADX {adx:.1f}, Vol {vol_ratio:.2f}x.",
        )
    )

    # 3. Rule-Based Strategy Alignment (0 to 32 pts, strictly static heuristic weights)
    triggered_ids = [k for k, v in strategy_evals.items() if v.get("triggered", False)]
    strat_pts = 0.0
    for st_id in triggered_ids:
        w = SWING_STRATEGIES[st_id].default_weight if st_id in SWING_STRATEGIES else 1.0
        strat_pts += 7.2 * w
    strat_pts = round(min(32.0, strat_pts), 2)
    components.append(
        ScoreComponent(
            component="Deterministic Strategy Alignment",
            score=strat_pts,
            max_score=32.0,
            signal="BULLISH" if triggered_ids else "NEUTRAL",
            details=f"{len(triggered_ids)} of {len(SWING_STRATEGIES)} swing strategies triggered.",
        )
    )

    # 4. Candlestick & Chart Pattern Confirmation (0 to 18 pts)
    bull_pats = [p for p in patterns if p.direction == "BULLISH"]
    bear_pats = [p for p in patterns if p.direction == "BEARISH"]
    pat_pts = 0.0
    for bp in bull_pats:
        mult = 1.0 if bp.status == "CONFIRMED" else 0.65
        pat_pts += (bp.pattern_strength_score / 100.0) * 10.5 * mult
        positive_conditions.append(f"{bp.name} ({bp.status}): {bp.description}")
    pat_pts = round(min(18.0, pat_pts), 2)
    components.append(
        ScoreComponent(
            component="Candlestick & Chart Structure Patterns",
            score=pat_pts,
            max_score=18.0,
            signal="BULLISH" if bull_pats else "NEUTRAL",
            details=f"{len(bull_pats)} bullish pattern(s), {len(bear_pats)} bearish pattern(s).",
        )
    )

    # 5. Risk & Bearish Pattern Penalties
    penalty_pts = 0.0
    for brp in bear_pats:
        penalty_pts += 8.5
        risk_factors.append(f"Bearish Pattern — {brp.name}: {brp.description}")
        negative_conditions.append(f"{brp.name} on {brp.detected_date}: {brp.description}")

    if c < prior_high_20 and (prior_high_20 - c) / max(c, 1e-6) < 0.012 and "BREAKOUT_VOLUME_CONFIRM" not in triggered_ids:
        risk_factors.append(
            f"Immediate overhead 20-day resistance at ₹{prior_high_20:.2f} ({(prior_high_20 - c) / c * 100:.2f}% above close)."
        )

    if penalty_pts > 0:
        components.append(
            ScoreComponent(
                component="Bearish Pattern Penalties",
                score=-round(penalty_pts, 2),
                max_score=0.0,
                signal="PENALTY",
                details=f"-{penalty_pts:.1f} pts deducted for {len(bear_pats)} bearish pattern(s).",
            )
        )

    raw_score = trend_pts + mom_pts + strat_pts + pat_pts - penalty_pts
    final_score = round(float(np.clip(raw_score, 0.0, 95.0)), 1)

    if not risk_factors:
        risk_factors.append(
            f"Daily ATR(14) volatility is ₹{atr:.2f} ({atr_pct:.2f}% of price); manage position risk strictly."
        )

    dq_summary = (
        {
            "is_valid": data_quality.is_valid,
            "completed_rows_usable": data_quality.completed_rows_usable,
            "partial_candle_excluded": data_quality.partial_candle_excluded,
            "issues_count": len(data_quality.issues),
        }
        if data_quality
        else {"completed_rows_usable": len(df_ind)}
    )

    breakdown = TechnicalSetupScoreBreakdown(
        overall_score=final_score,
        components=components,
        positive_conditions=positive_conditions,
        negative_conditions=negative_conditions,
        risk_factors=risk_factors,
        strategy_alignment={
            "triggered_count": len(triggered_ids),
            "total_evaluated": len(SWING_STRATEGIES),
            "triggered_strategy_ids": triggered_ids,
        },
        data_quality=dq_summary,
        validation_status=overall_validation_status,
    )
    return breakdown, indicators, positive_conditions, risk_factors, negative_conditions


def evaluate_swing_candidate(
    symbol: str,
    df_raw: pd.DataFrame,
    validated_stats: Optional[Dict[str, Dict[str, Any]]] = None,
    overall_validation_status: Optional[ValidationStatus] = None,
    provenance: Optional[MarketDataProvenance] = None,
    data_quality: Optional[DataQualitySummary] = None,
) -> Optional[SwingSignalItem]:
    """Evaluate a single NSE stock for the Daily Swing Scanner using shared deterministic rules."""
    if df_raw is None or len(df_raw) < 60:
        return None

    if validated_stats is None or overall_validation_status is None:
        validated_stats, overall_validation_status = get_validated_strategy_stats()

    df_ind = compute_indicators(df_raw, is_intraday=False)
    patterns = detect_patterns_at_index(df_ind, -1)
    strat_evals = evaluate_swing_strategies_at_index(df_ind, -1, patterns)

    triggered_ids = [k for k, v in strat_evals.items() if v.get("triggered", False)]
    bull_patterns = [p for p in patterns if p.direction == "BULLISH"]
    bear_patterns = [p for p in patterns if p.direction == "BEARISH"]

    if not triggered_ids and not bull_patterns:
        return None
    if bear_patterns and len(triggered_ids) < 2:
        return None

    breakdown, _, bullish_reasons, risk_notes, _ = compute_technical_setup_score(
        df_ind=df_ind,
        patterns=patterns,
        strategy_evals=strat_evals,
        validated_stats=validated_stats,
        overall_validation_status=overall_validation_status,
        data_quality=data_quality,
    )
    score = breakdown.overall_score
    if score < 55.0:
        return None

    last = df_ind.iloc[-1]
    last_date_str = str(df_ind.index[-1])[:10]
    try:
        last_date_obj = date.fromisoformat(last_date_str)
    except Exception:
        last_date_obj = get_now_ist().date()

    c = float(last["Close"])
    atr = float(last["ATR_14"]) if pd.notna(last["ATR_14"]) and float(last["ATR_14"]) > 0 else c * 0.02
    prior_high_20 = float(last["Prior_High_20"]) if pd.notna(last["Prior_High_20"]) else c * 1.02

    primary_id: Optional[str] = None
    emp_win_rate: Optional[float] = None
    emp_target_rate: Optional[float] = None
    emp_sample_n: Optional[int] = None
    strat_val_status: ValidationStatus = "UNVALIDATED"

    if triggered_ids:
        primary_id = max(
            triggered_ids,
            key=lambda sid: (
                1 if sid == "MULTI_FACTOR_HIGH_PRECISION_ENSEMBLE" else 0,
                SWING_STRATEGIES[sid].default_weight,
            ),
        )
        primary_def = SWING_STRATEGIES[primary_id]
        primary_name = primary_def.name
        st_stat = validated_stats.get(primary_id)
        if st_stat and st_stat.get("validation_status") == "VALIDATED":
            strat_val_status = "VALIDATED"
            emp_win_rate = st_stat.get("win_rate_oos")
            emp_target_rate = st_stat.get("target_hit_rate_oos")
            emp_sample_n = st_stat.get("sample_size_oos")
            avg_hold = int(round(st_stat.get("avg_hold_days") or primary_def.max_holding_bars * 0.6))
        else:
            strat_val_status = st_stat.get("validation_status", "UNVALIDATED") if st_stat else "UNVALIDATED"
            emp_sample_n = st_stat.get("sample_size_oos") if st_stat else None
            avg_hold = max(4, int(round(primary_def.max_holding_bars * 0.6)))
        target_mult = primary_def.target_atr_mult
        stop_mult = primary_def.stop_atr_mult
        is_confirmed = True
    else:
        primary_pat = bull_patterns[0]
        primary_name = f"Pattern Setup: {primary_pat.name}"
        avg_hold = 8
        target_mult = 2.2
        stop_mult = 1.3
        is_confirmed = primary_pat.status == "CONFIRMED"
        strat_val_status = "UNVALIDATED"

    if is_confirmed:
        sig_type = "CONFIRMED_SIGNAL"
        sig_label = f"Confirmed Completed-Candle Setup ({last_date_str})"
        suggested_buy = round(c, 2)
        buy_note = (
            f"Signal confirmed on completed {last_date_str} close (₹{c:.2f}); "
            f"backtest execution assumption enters on next session open + slippage."
        )
        suggested_buy_date = f"{last_date_str} (Completed Signal Bar)"
        buy_date_confirmed = True
    else:
        sig_type = "PROJECTED_SETUP"
        sig_label = "Projected Breakout Setup (Unconfirmed)"
        suggested_buy = round(max(c * 1.005, prior_high_20 * 1.001), 2)
        buy_note = f"Conditional setup awaiting completed close above ₹{suggested_buy:.2f}."
        next_td = add_trading_days(last_date_obj, 1)
        suggested_buy_date = f"Est. {next_td.isoformat()} (Conditional)"
        buy_date_confirmed = False

    target_price = round(suggested_buy + target_mult * atr, 2)
    stop_loss = round(suggested_buy - stop_mult * atr, 2)
    risk = max(suggested_buy - stop_loss, 0.01)
    reward = max(target_price - suggested_buy, 0.01)
    rr_ratio = round(reward / risk, 2)

    expected_gain_pct = round(((target_price - suggested_buy) / suggested_buy) * 100.0, 2)
    stop_risk_pct = round(((suggested_buy - stop_loss) / suggested_buy) * 100.0, 2)
    est_sell_date_obj = add_trading_days(last_date_obj, max(4, avg_hold))
    est_sell_date_str = f"Est. {est_sell_date_obj.isoformat()} (~{max(4, avg_hold)} NSE trading days)"
    actionable_session_date_str = get_next_trading_day(last_date_obj).isoformat()

    info = get_stock_info(symbol)
    matched_names = [SWING_STRATEGIES[sid].name for sid in triggered_ids]
    pat_names = [f"{p.name} ({p.status})" for p in bull_patterns]
    legacy = settings.ENABLE_LEGACY_FIELD_ALIASES

    freshness = provenance.data_freshness if provenance else "DELAYED"
    is_stale = provenance.is_stale if provenance else False

    return SwingSignalItem(
        rank=0,
        symbol=symbol,
        name=info.name if info else symbol,
        sector=info.sector if info else "NSE Equity",
        current_price=round(c, 2),
        last_updated_date=last_date_str,
        candle_confirmation_status="COMPLETED_CANDLE",
        data_freshness=freshness,
        is_stale=is_stale,
        primary_strategy_id=primary_id,
        primary_strategy=primary_name,
        matched_strategies=matched_names if matched_names else [primary_name],
        detected_patterns=pat_names,
        technical_setup_score=score,
        score_breakdown=breakdown,
        validation_status=strat_val_status,
        empirical_win_rate_oos_pct=emp_win_rate,
        empirical_target_hit_rate_oos_pct=emp_target_rate,
        backtest_sample_size_oos=emp_sample_n,
        confidence_score=score if legacy else None,
        historical_strategy_precision_pct=emp_win_rate if legacy else None,
        signal_type=sig_type,  # type: ignore[arg-type]
        signal_type_label=sig_label,
        suggested_buy_price=suggested_buy,
        buy_price_note=buy_note,
        suggested_buy_date=suggested_buy_date,
        buy_date_is_confirmed=buy_date_confirmed,
        signal_confirmed_date=last_date_str,
        actionable_session_date=actionable_session_date_str,
        target_sell_price=target_price,
        expected_gain_pct=expected_gain_pct,
        estimated_sell_date=est_sell_date_str,
        estimated_holding_days=max(4, avg_hold),
        projection_basis=(
            f"Rule-based +{target_mult:.1f}x ATR(14) reference target (₹{target_price:.2f}) and "
            f"-{stop_mult:.2f}x ATR(14) reference stop (₹{stop_loss:.2f}); not a guaranteed outcome."
        ),
        stop_loss=stop_loss,
        stop_loss_risk_pct=stop_risk_pct,
        risk_reward_ratio=rr_ratio,
        volume_ratio_20d=round(float(last["Vol_Ratio_20"]) if pd.notna(last["Vol_Ratio_20"]) else 1.0, 2),
        rsi_14=round(float(last["RSI_14"]) if pd.notna(last["RSI_14"]) else 50.0, 1),
        adx_14=round(float(last["ADX_14"]) if pd.notna(last["ADX_14"]) else 15.0, 1),
        atr_14=round(atr, 2),
        reasoning=bullish_reasons[:4],
        risk_notes=risk_notes[:2],
    )


# Re-exports preserving backward-compatible imports across scanners and analyzers
from app.engine.intraday_signals import evaluate_intraday_session_signals  # noqa: E402,F401
from app.engine.stock_analyzer import analyze_single_stock  # noqa: E402,F401
