"""Unit tests for Technical Setup Score determinism, zero fabricated stats, and signal policy controls."""

import numpy as np
import pandas as pd

from app.config import settings
from app.engine import scoring
from app.engine.stock_analyzer import analyze_single_stock


def _sample_bullish_df(n: int = 120) -> pd.DataFrame:
    dates = pd.bdate_range("2025-01-01", periods=n)
    close = np.linspace(500.0, 620.0, n) + np.sin(np.arange(n) * 0.4) * 5.0
    open_ = close - 1.5
    high = close + 3.0
    low = open_ - 2.0
    vol = np.full(n, 1_500_000, dtype=np.int64)
    vol[-1] = 3_000_000
    return pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates,
    )


def test_unvalidated_state_never_fabricates_hardcoded_strategy_metrics(monkeypatch):
    """When no valid backtest report exists, empirical win rates & profit factors MUST be None (never 68/76/89.5)."""
    monkeypatch.setattr(scoring, "get_validated_backtest_report", lambda: (None, "No artifact"))

    stats, val_status = scoring.get_validated_strategy_stats()
    assert stats == {}
    assert val_status == "UNVALIDATED"

    df = _sample_bullish_df(120)
    analysis = analyze_single_stock("RELIANCE", df)
    assert analysis.validation_status == "UNVALIDATED"
    assert analysis.engine_metadata.uses_ai_or_ml is False
    assert analysis.engine_metadata.analysis_engine_type == "RULE_BASED_TECHNICAL_ANALYTICS"
    assert analysis.score_breakdown.score_type == "HEURISTIC_TECHNICAL_SETUP_SCORE"
    assert analysis.score_breakdown.is_calibrated_probability is False

    for sm in analysis.strategy_evaluations:
        assert sm.validation_status == "UNVALIDATED"
        assert sm.empirical_win_rate_oos_pct is None
        assert sm.empirical_profit_factor_oos is None
        assert sm.historical_win_rate_pct is None
        assert sm.historical_precision_pct is None
        assert sm.historical_profit_factor is None


def test_technical_setup_score_is_strictly_deterministic():
    df = _sample_bullish_df(120)
    a1 = analyze_single_stock("RELIANCE", df)
    a2 = analyze_single_stock("RELIANCE", df)

    assert a1.technical_setup_score == a2.technical_setup_score
    assert a1.score_breakdown.model_dump() == a2.score_breakdown.model_dump()
    assert a1.signal_classification == a2.signal_classification
    assert a1.stop_loss == a2.stop_loss
    assert a1.projected_target_1 == a2.projected_target_1


def test_signal_policy_can_disable_public_buy_wait_avoid_classifications(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PUBLIC_STOCK_SIGNALS", False)
    df = _sample_bullish_df(120)
    analysis = analyze_single_stock("RELIANCE", df)

    assert analysis.status == "TECHNICAL_ONLY_POLICY"
    assert analysis.classification_type == "DISABLED_BY_POLICY"
    assert analysis.signal_classification is None
    assert analysis.recommendation is None
    assert analysis.entry_zone_low is None
    assert analysis.projected_target_1 is None
    assert analysis.stop_loss is None
    assert analysis.is_investment_advice is False
    # Objective indicators and Technical Setup Score still function (capped at 95.0)
    assert 0.0 <= analysis.technical_setup_score <= 95.0
    assert len(analysis.supporting_indicators) >= 4


def test_confidence_and_technical_setup_score_never_exceed_95():
    """Confidence / Technical Setup Score is strictly capped at 95.0% maximum across swing, stock, and intraday."""
    from app.engine.intraday_signals import evaluate_intraday_session_signals
    from app.engine.patterns import PatternDetection
    from app.engine.scoring import compute_technical_setup_score
    from app.engine.strategies import SWING_STRATEGIES

    df = _sample_bullish_df(120)
    from app.engine.indicators import compute_indicators

    df_ind = compute_indicators(df, is_intraday=False)
    # Force ideal momentum/trend values on the last row so raw_score > 95.0 (25 + 25 + 32 + 18 = 100)
    df_ind.loc[df_ind.index[-1], "RSI_14"] = 60.0
    df_ind.loc[df_ind.index[-1], "MACD_Line"] = 5.0
    df_ind.loc[df_ind.index[-1], "MACD_Signal"] = 2.0
    df_ind.loc[df_ind.index[-1], "MACD_Hist"] = 3.0
    df_ind.loc[df_ind.index[-2], "MACD_Hist"] = 2.0
    df_ind.loc[df_ind.index[-1], "ADX_14"] = 30.0
    df_ind.loc[df_ind.index[-1], "Plus_DI"] = 35.0
    df_ind.loc[df_ind.index[-1], "Minus_DI"] = 12.0
    df_ind.loc[df_ind.index[-1], "Vol_Ratio_20"] = 2.0
    # Force all swing strategies and high-strength bullish patterns to trigger simultaneously
    all_triggered = {sid: {"triggered": True, "direction": "BULLISH", "reason": "test"} for sid in SWING_STRATEGIES}
    pats = [
        PatternDetection(
            name="Bullish Engulfing",
            category="CANDLESTICK",
            direction="BULLISH",
            status="CONFIRMED",
            detected_date="2025-06-01",
            pattern_strength_score=95.0,
            description="Test pattern 1",
        ),
        PatternDetection(
            name="20-Day Resistance Breakout",
            category="BREAKOUT_VOLUME",
            direction="BULLISH",
            status="CONFIRMED",
            detected_date="2025-06-01",
            pattern_strength_score=95.0,
            description="Test pattern 2",
        ),
    ]
    breakdown, _, _, _, _ = compute_technical_setup_score(df_ind, pats, all_triggered, {})
    assert breakdown.overall_score == 95.0
    assert breakdown.overall_score <= 95.0

    cand = scoring.evaluate_swing_candidate("RELIANCE", df)
    if cand is not None:
        assert cand.technical_setup_score <= 95.0
        assert (cand.confidence_score or 0.0) <= 95.0
