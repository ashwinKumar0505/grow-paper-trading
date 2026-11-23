import React, { useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  Lock,
  LineChart,
  CheckCircle2,
  Eye,
  Clock,
} from 'lucide-react';
import { buildTradeStockPath, navigate } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';
import { Badge, ConfidenceMeter } from './ui';
import { fmtPrice, fmtPct, shortDate } from '../utils/format';
import { simplifyTerm, SWING_STATUS, INTRADAY_STATUS } from '../utils/terms';
import { DrawerTradePlan } from './DrawerTradePlan';
import { DrawerWhySection } from './DrawerWhySection';

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
    navigate(buildTradeStockPath(signal.symbol));
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
          <DrawerTradePlan
            isSwing={isSwing}
            signal={signal}
            entryPrice={entryPrice}
            targetPrice={targetPrice}
            stopLoss={stopLoss}
            targetPct={targetPct}
            slPct={slPct}
            rr={rr}
          />

          {/* Why This Stock & Risks */}
          <DrawerWhySection signal={signal} strat={strat} />
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
