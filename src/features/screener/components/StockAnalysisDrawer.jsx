import React, { useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Target,
  Lock,
  LineChart,
  CheckCircle2,
  Eye,
  Clock,
} from 'lucide-react';
import { navigate } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';
import { Badge, ConfidenceMeter } from './ui';
import { fmtPrice, fmtPct, shortDate, shortTime } from '../utils/format';
import { simplifyTerm, patternIsForming, SWING_STATUS, INTRADAY_STATUS } from '../utils/terms';

export default function StockAnalysisDrawer({
  signal,
  mode = 'swing', // 'swing' | 'intraday'
  asOfLabel,
  onClose,
}) {
  const { selectStockBySymbol, planConfig, openUpgradeModal } = useTrading();
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!signal) return undefined;
    closeBtnRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [signal, onClose]);

  if (!signal) return null;

  const isSwing = mode === 'swing';
  const swingStatus = SWING_STATUS[signal.signal_type] || SWING_STATUS.PROJECTED_SETUP;
  const intraStatus = INTRADAY_STATUS[signal.signal_status] || {
    label: signal.status_badge_text || 'Signal',
    tone: 'neutral',
  };
  const statusObj = isSwing ? swingStatus : intraStatus;

  const entryPrice = isSwing ? signal.suggested_buy_price : signal.entry_price;
  const targetPrice = isSwing ? signal.target_sell_price : signal.target_exit_price;
  const stopLoss = signal.stop_loss;
  const currentPrice = signal.current_price ?? entryPrice;
  const rr = signal.risk_reward_ratio;
  const strat = simplifyTerm(isSwing ? signal.primary_strategy : signal.strategy_name);

  const canOneClickTrade =
    planConfig.allowOneClickTradeFromScreener === 'all' ||
    (isSwing && planConfig.allowOneClickTradeFromScreener === 'swing');

  const handlePracticeTrade = () => {
    if (!canOneClickTrade) {
      openUpgradeModal({
        requiredTier: isSwing ? 'beginner' : 'advanced',
        featureName: `One-Click "Trade ${signal.symbol}" from Screener`,
        featureDescription: isSwing
          ? 'Launching a pre-filled Paper Trade directly from Swing Screener setups requires the Beginner or Advanced Package.'
          : 'One-click Paper Trading directly from Intraday Signals is an Advanced Package feature.',
      });
      return;
    }
    selectStockBySymbol(signal.symbol);
    onClose();
    navigate('/trade');
  };

  const handleFullAnalysis = () => {
    const sym = signal.symbol;
    onClose();
    navigate(`/screener/analysis?symbol=${sym}`);
  };

  const targetPct = isSwing
    ? signal.expected_gain_pct
    : entryPrice
    ? ((targetPrice - entryPrice) / entryPrice) * 100
    : null;
  const slPct = isSwing
    ? -signal.stop_loss_risk_pct
    : entryPrice
    ? ((stopLoss - entryPrice) / entryPrice) * 100
    : null;

  return (
    <div className="sc-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="sc-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${signal.symbol} signal details`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sc-drawer-head">
          <div className="sc-drawer-id">
            <div className="stock-avatar lg">{signal.symbol.slice(0, 2)}</div>
            <div>
              <div className="sc-drawer-sym-row">
                <h3>{signal.symbol}</h3>
                <Badge
                  tone={statusObj.tone}
                  icon={isSwing ? (signal.signal_type === 'CONFIRMED_SIGNAL' ? CheckCircle2 : Eye) : Clock}
                >
                  {statusObj.label}
                </Badge>
              </div>
              <p className="sc-drawer-name">{signal.name}</p>
              {signal.sector && <span className="sc-drawer-sector">{signal.sector}</span>}
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="icon-btn sc-drawer-close"
            onClick={onClose}
            aria-label="Close stock details"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="sc-drawer-body">
          {/* Overview Strip */}
          <section className="sc-drawer-section">
            <div className="sc-drawer-overview">
              <div>
                <span className="sc-drawer-k">{isSwing ? 'Current Price' : 'Reference Entry'}</span>
                <strong className="sc-drawer-price">{fmtPrice(currentPrice)}</strong>
                {asOfLabel && <span className="sc-drawer-ts">{asOfLabel}</span>}
              </div>
              <div className="sc-drawer-conf">
                <span className="sc-drawer-k">Confidence Score</span>
                <ConfidenceMeter score={signal.confidence_score} compact />
              </div>
            </div>
          </section>

          {/* Trade Plan */}
          <section className="sc-drawer-section">
            <h4 className="sc-drawer-sec-title">
              <Target size={15} /> Trade Plan & Levels
            </h4>
            <div className="sc-drawer-levels">
              <div className="sc-drawer-level">
                <span>{isSwing ? 'Recommended Entry' : 'Entry Price'}</span>
                <strong>{fmtPrice(entryPrice)}</strong>
                <small>
                  {isSwing
                    ? `${signal.buy_date_is_confirmed ? 'From ' : 'Wait till '}${shortDate(signal.suggested_buy_date)}`
                    : `at ${shortTime(signal.entry_time_ist)}`}
                </small>
              </div>
              <div className="sc-drawer-level">
                <span>Target Price</span>
                <strong className="text-up">{fmtPrice(targetPrice)}</strong>
                <small className="text-up">
                  {targetPct != null ? fmtPct(targetPct, isSwing ? 1 : 2) : '—'}
                  {isSwing && signal.estimated_sell_date ? ` · by ${shortDate(signal.estimated_sell_date)}` : ''}
                </small>
              </div>
              <div className="sc-drawer-level">
                <span>Stop-Loss</span>
                <strong className="text-down">{fmtPrice(stopLoss)}</strong>
                <small>{slPct != null ? fmtPct(slPct, isSwing ? 1 : 2) : '—'}</small>
              </div>
              <div className="sc-drawer-level">
                <span>Reward : Risk</span>
                <strong className={rr >= 2 ? 'text-up' : ''}>{rr != null ? `${Number(rr).toFixed(1)}x` : '—'}</strong>
                <small>{rr != null ? `₹${Number(rr).toFixed(1)} per ₹1 risk` : '—'}</small>
              </div>
            </div>
            {signal.buy_price_note && <p className="sc-drawer-note">{signal.buy_price_note}</p>}
          </section>

          {/* Why This Stock */}
          <section className="sc-drawer-section">
            <h4 className="sc-drawer-sec-title">
              <TrendingUp size={15} /> Why This Stock?
            </h4>
            <div className="sc-drawer-strat">
              <span className="sc-drawer-k">Primary Strategy</span>
              <strong>{strat.label}</strong>
              {strat.help && strat.help !== strat.label && <p>{strat.help}</p>}
            </div>

            {Array.isArray(signal.reasoning) && signal.reasoning.length > 0 && (
              <ul className="tick-list sc-drawer-list">
                {signal.reasoning.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}

            {typeof signal.reasoning === 'string' && signal.reasoning && (
              <p className="sc-drawer-note">{signal.reasoning}</p>
            )}

            {signal.detected_patterns?.length > 0 && (
              <div className="chips chips-wrap" style={{ marginTop: 10 }}>
                {signal.detected_patterns.map((p) => {
                  const t = simplifyTerm(p);
                  return (
                    <span key={p} className={`chip ${patternIsForming(p) ? 'chip-warn' : ''}`} title={t.help}>
                      {t.label}
                    </span>
                  );
                })}
              </div>
            )}

            {(signal.estimated_holding_days != null || signal.historical_strategy_precision_pct != null) && (
              <div className="plan-mini" style={{ marginTop: 12 }}>
                {signal.estimated_holding_days != null && (
                  <div>
                    <span>Expected hold</span>
                    <strong>~{signal.estimated_holding_days} trading days</strong>
                  </div>
                )}
                {signal.historical_strategy_precision_pct != null && (
                  <div>
                    <span>Past strategy precision</span>
                    <strong>{signal.historical_strategy_precision_pct}%</strong>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Risks */}
          {Array.isArray(signal.risk_notes) && signal.risk_notes.length > 0 && (
            <section className="sc-drawer-section">
              <h4 className="sc-drawer-sec-title">
                <ShieldAlert size={15} /> Risk Notes
              </h4>
              <ul className="warn-list">
                {signal.risk_notes.map((rn, i) => (
                  <li key={i}>{rn}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="sc-drawer-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={handleFullAnalysis}>
            <LineChart size={14} />
            <span>Full Stock Analysis</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handlePracticeTrade}>
            {!canOneClickTrade && <Lock size={13} />}
            <span>Add to Paper Trading</span>
            <ArrowRight size={14} />
          </button>
        </footer>
      </aside>
    </div>
  );
}
