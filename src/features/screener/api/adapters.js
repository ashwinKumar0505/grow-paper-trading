// Normalized Screener & Stock Analysis Response Adapters

export function adaptSwingResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid swing screener response payload.');
  }
  const rawSignals = Array.isArray(raw.signals) ? raw.signals : [];
  const signals = rawSignals.map((sig) => ({
    ...sig,
    confidence_score: Number(sig.confidence_score ?? sig.technical_setup_score ?? 0),
    technical_setup_score: Number(sig.technical_setup_score ?? sig.confidence_score ?? 0),
    historical_strategy_precision_pct:
      sig.historical_strategy_precision_pct ?? sig.empirical_win_rate_oos_pct ?? null,
  }));
  const totalScanned =
    typeof raw.total_scanned === 'number'
      ? raw.total_scanned
      : typeof raw.stocks_scanned === 'number'
        ? raw.stocks_scanned
        : signals.length;
  const totalUniverse =
    typeof raw.total_universe_count === 'number'
      ? raw.total_universe_count
      : typeof raw.universe_size === 'number'
        ? raw.universe_size
        : totalScanned;

  return {
    ...raw,
    total_scanned: totalScanned,
    total_universe_count: totalUniverse,
    bullish_signals_found:
      typeof raw.bullish_signals_found === 'number' ? raw.bullish_signals_found : signals.length,
    data_as_of_date: raw.data_as_of_date || raw.data_timestamp || null,
    data_timestamp: raw.data_timestamp || raw.generated_at || raw.data_as_of_date || null,
    freshness: raw.freshness || raw.data_freshness || (raw.is_stale ? 'STALE' : 'HISTORICAL'),
    source: raw.data_source || raw.data_provider || raw.source || 'Python Technical Scanner (Daily OHLCV)',
    score_explanation:
      raw.score_explanation ||
      'Rule-based strategy alignment score (0–100) weighted by technical indicators and chart conditions. Not a calibrated probability.',
    validation_methodology:
      raw.validation_methodology ||
      'Historical rule simulation on single chronological split (not multi-fold walk-forward validation).',
    limitations:
      raw.limitations ||
      'Results depend on upstream historical data completeness and fixed slippage/commission estimates.',
    signals,
  };
}

export function adaptIntradayResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid intraday screener response payload.');
  }
  const rawSignals = Array.isArray(raw.signals) ? raw.signals : [];
  const signals = rawSignals.map((sig) => ({
    ...sig,
    confidence_score: Number(sig.confidence_score ?? sig.technical_setup_score ?? 0),
    technical_setup_score: Number(sig.technical_setup_score ?? sig.confidence_score ?? 0),
    historical_precision_pct:
      sig.historical_precision_pct ?? sig.empirical_win_rate_oos_pct ?? null,
  }));
  const totalScanned =
    typeof raw.total_scanned === 'number'
      ? raw.total_scanned
      : typeof raw.stocks_scanned === 'number'
        ? raw.stocks_scanned
        : signals.length;

  const isActive = (s) => {
    if (typeof s.is_projected_exit === 'boolean') return s.is_projected_exit;
    return (
      s.signal_status === 'LIVE_ACTIVE_ENTRY' ||
      s.signal_status === 'PROJECTED_EXIT_PENDING' ||
      s.signal_status === 'OPEN_ACTIVE'
    );
  };

  return {
    ...raw,
    total_scanned: totalScanned,
    active_signals_count:
      typeof raw.active_signals_count === 'number'
        ? raw.active_signals_count
        : signals.filter(isActive).length,
    completed_trades_count:
      typeof raw.completed_trades_count === 'number'
        ? raw.completed_trades_count
        : signals.filter((s) => !isActive(s)).length,
    session_date: raw.session_date || raw.data_as_of_date || null,
    data_timestamp: raw.data_timestamp || raw.generated_at || raw.session_date || null,
    freshness:
      raw.freshness ||
      raw.data_freshness ||
      (raw.is_stale ? 'STALE' : raw.market_status?.is_market_open ? 'DELAYED' : 'HISTORICAL'),
    source: raw.data_source || raw.data_provider || raw.source || 'Python Intraday Scanner (15m OHLCV)',
    score_explanation:
      raw.score_explanation ||
      'Rule-based intraday setup score (0–100) evaluating VWAP, opening-range breakout, and relative volume. Not a guaranteed win rate.',
    limitations:
      raw.limitations ||
      'Intraday signal outcomes model bar-level target/stop touches (stop-first on ambiguous bars) and do not reflect live exchange order-book fills.',
    signals,
  };
}

export function adaptStockAnalysisResponse(raw) {
  if (!raw || typeof raw !== 'object' || !raw.symbol) {
    throw new Error('Invalid stock analysis response payload.');
  }
  const summary = raw.stock_backtest_summary || null;
  const sampleSize =
    summary?.historical_signals_on_stock ?? summary?.sample_size ?? summary?.total_trades ?? 0;

  return {
    ...raw,
    overall_confidence_score: Number(raw.overall_confidence_score ?? raw.technical_setup_score ?? 0),
    recommendation: raw.recommendation ?? raw.signal_classification ?? 'WAIT',
    recommendation_summary: raw.recommendation_summary ?? raw.classification_summary ?? '',
    data_timestamp: raw.data_timestamp || raw.generated_at || raw.data_as_of_date || null,
    freshness: raw.freshness || raw.data_provenance?.data_freshness || (raw.is_stale ? 'STALE' : 'HISTORICAL'),
    source:
      raw.data_source ||
      raw.data_provenance?.provider_display_name ||
      raw.source ||
      'Python Rule-Based Technical Engine (2Y Daily OHLCV)',
    score_explanation:
      raw.score_explanation ||
      'Rule-based technical alignment score (0–100) derived from moving averages, momentum indicators, and detected chart patterns. Not a probability of profit.',
    validation_methodology:
      raw.validation_methodology ||
      summary?.methodology ||
      '2-year historical rule simulation with fixed slippage and commission assumptions.',
    limitations:
      raw.limitations ||
      'Rule-based technical evaluation does not incorporate live news, corporate actions, or exchange order-book liquidity.',
    stock_backtest_summary: summary
      ? {
          ...summary,
          historical_signals_on_stock: sampleSize,
          sample_size: sampleSize,
          is_low_sample: sampleSize < 10,
          stock_specific_precision_pct:
            summary.stock_specific_precision_pct ?? summary.target_hit_rate_pct ?? null,
        }
      : null,
    supporting_indicators: Array.isArray(raw.supporting_indicators) ? raw.supporting_indicators : [],
    identified_patterns: (Array.isArray(raw.identified_patterns) ? raw.identified_patterns : []).map((p) => ({
      ...p,
      reliability_score: p.reliability_score ?? p.pattern_strength_score ?? 0,
    })),
    strategy_evaluations: (Array.isArray(raw.strategy_evaluations) ? raw.strategy_evaluations : []).map((st) => ({
      ...st,
      historical_win_rate_pct: st.historical_win_rate_pct ?? st.empirical_win_rate_oos_pct ?? null,
      historical_precision_pct:
        st.historical_precision_pct ??
        st.empirical_target_hit_rate_oos_pct ??
        st.empirical_win_rate_oos_pct ??
        null,
      historical_profit_factor: st.historical_profit_factor ?? st.empirical_profit_factor_oos ?? null,
      weight: st.weight ?? st.heuristic_weight ?? 0,
    })),
    resistance_levels: Array.isArray(raw.resistance_levels) ? raw.resistance_levels : [],
    support_levels: Array.isArray(raw.support_levels) ? raw.support_levels : [],
    bullish_reasons: Array.isArray(raw.bullish_reasons) ? raw.bullish_reasons : [],
    risk_factors: Array.isArray(raw.risk_factors) ? raw.risk_factors : [],
    reasons_to_avoid: Array.isArray(raw.reasons_to_avoid) ? raw.reasons_to_avoid : [],
    recent_price_bars: Array.isArray(raw.recent_price_bars) ? raw.recent_price_bars : [],
  };
}

export function adaptFinancialsResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid financial statements response payload.');
  }
  const yearly = Array.isArray(raw.yearly) ? raw.yearly : [];
  const quarterly = Array.isArray(raw.quarterly) ? raw.quarterly : [];
  const hasAuthenticRows = Boolean(raw.available && (yearly.length > 0 || quarterly.length > 0));
  const rawSource = String(raw.source || '');
  const sanitizedSource =
    rawSource === 'NSE Consolidated Filings' && !raw.verified_nse_filing
      ? 'Historical Financial Statements (Provider Feed)'
      : rawSource || 'Historical Financial Statements (Provider Feed)';

  return {
    ...raw,
    available: hasAuthenticRows,
    source: sanitizedSource,
    freshness: raw.freshness || 'HISTORICAL',
    data_timestamp: raw.data_timestamp || raw.fetched_at || null,
    yearly,
    quarterly,
  };
}
