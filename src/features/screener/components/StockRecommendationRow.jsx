import React from 'react';
import { ChevronRight, CheckCircle2, Eye, XCircle, Timer, Zap, Clock } from 'lucide-react';
import { Badge, ConfidenceMeter } from './ui';
import { IntradayEntrySubtext, SignalEntryCell, SwingLivePriceMeta } from './SignalEntryCell';
import { fmtPrice, fmtPct, shortDate, shortTime } from '../utils/format';
import { simplifyTerm, patternIsForming, SWING_STATUS } from '../utils/terms';
import {
  formatSwingEntrySubLabel,
  getIntradayLiveRiskReward,
  getSwingLiveEntryDisplay,
  isIntradaySignalOpen,
  resolveIntradayStatus,
} from '../utils/signalPresentation';

const INTRADAY_ICON = {
  positive: CheckCircle2,
  negative: XCircle,
  warning: Timer,
  info: Zap,
  neutral: Clock,
};

export function StockRecommendationRow({
  signal,
  rank,
  mode = 'swing',
  selected = false,
  onSelect,
  muteCompleted = false,
}) {
  const isSwing = mode === 'swing';
  const statusObj = isSwing
    ? SWING_STATUS[signal.signal_type] || SWING_STATUS.PROJECTED_SETUP
    : resolveIntradayStatus(signal);

  const strat = simplifyTerm(isSwing ? signal.primary_strategy : signal.strategy_name);
  const entry = isSwing ? signal.suggested_buy_price : signal.entry_price;
  const target = isSwing ? signal.target_sell_price : signal.target_exit_price;
  const sl = signal.stop_loss;
  const isClosed = !isSwing && !isIntradaySignalOpen(signal);
  const rr = Number(signal.risk_reward_ratio || 0);
  const liveRr = !isSwing ? getIntradayLiveRiskReward(signal) : null;

  return (
    <tr
      className={`row-click sc-row ${selected ? 'is-selected' : ''} ${
        isClosed && muteCompleted ? 'is-completed-row' : ''
      }`}
      onClick={() => onSelect(signal)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(signal);
        }
      }}
    >
      {isSwing && <td className="col-rank">{rank}</td>}
      <td className="col-stock">
        <div className="stock-cell">
          <div className="stock-avatar">{signal.symbol.slice(0, 2)}</div>
          <div>
            <div className="stock-sym">{signal.symbol}</div>
            <div className="stock-name" title={signal.name}>{signal.name}</div>
          </div>
        </div>
      </td>
      <td>
        <ConfidenceMeter score={signal.confidence_score} compact />
      </td>
      <td>
        <div className="result-cell">
          <Badge
            tone={statusObj.tone}
            title={statusObj.help}
            icon={isSwing ? (signal.signal_type === 'CONFIRMED_SIGNAL' ? CheckCircle2 : Eye) : INTRADAY_ICON[statusObj.tone] || Clock}
          >
            {statusObj.label}
          </Badge>
          {!isSwing && signal.pnl_pct != null && (
            <span className={`pnl ${signal.pnl_pct >= 0 ? 'text-up' : 'text-down'}`}>
              {signal.pnl_pct >= 0 ? 'Profit ' : 'Loss '}{fmtPct(signal.pnl_pct, 2)}
            </span>
          )}
        </div>
      </td>
      <SignalEntryCell signal={signal} isSwing={isSwing} entry={entry} />
      <td className="num">
        <div className="cell-main text-up">{fmtPrice(target)}</div>
        <div className="cell-sub">
          {isSwing ? (
            <><span className="text-up">{fmtPct(signal.expected_gain_pct)}</span> · by {shortDate(signal.estimated_sell_date)}</>
          ) : isClosed && signal.actual_exit_price != null ? (
            `Sold ${fmtPrice(signal.actual_exit_price)} at ${shortTime(signal.actual_exit_time_ist)}`
          ) : (
            `by ~${shortTime(signal.estimated_exit_time_ist)}`
          )}
        </div>
      </td>
      <td className="num">
        <div className="cell-main text-down">{fmtPrice(sl)}</div>
        <div className="cell-sub">
          {isSwing ? fmtPct(-signal.stop_loss_risk_pct) : entry ? fmtPct(((sl - entry) / entry) * 100, 2) : '—'}
        </div>
      </td>
      <td className="col-strategy">
        <div className="strat-name" title={strat.help}>{strat.label}</div>
        {isSwing && signal.detected_patterns?.length > 0 && (
          <div className="chips">
            {signal.detected_patterns.slice(0, 2).map((p) => {
              const t = simplifyTerm(p);
              return (
                <span key={p} className={`chip ${patternIsForming(p) ? 'chip-warn' : ''}`} title={t.help}>
                  {t.label}
                </span>
              );
            })}
            {signal.detected_patterns.length > 2 && (
              <span className="chip chip-more">+{signal.detected_patterns.length - 2}</span>
            )}
          </div>
        )}
        {!isSwing && signal.reasoning && (
          <div className="strat-reason" title={signal.reasoning}>{signal.reasoning}</div>
        )}
      </td>
      <td className="num">
        <span className={`rr ${rr >= 2 ? 'rr-good' : rr >= 1.5 ? 'rr-ok' : ''}`}>{rr.toFixed(1)}x</span>
        {liveRr != null && <div className="cell-sub sc-live-rr">Now {liveRr.toFixed(1)}x</div>}
      </td>
      <td className="col-action">
        <span className="row-toggle" aria-hidden="true"><ChevronRight size={17} /></span>
      </td>
    </tr>
  );
}

export function StockRecommendationMobileCard({
  signal,
  mode = 'swing',
  onSelect,
  muteCompleted = false,
}) {
  const isSwing = mode === 'swing';
  const statusObj = isSwing
    ? SWING_STATUS[signal.signal_type] || SWING_STATUS.PROJECTED_SETUP
    : resolveIntradayStatus(signal);
  const strat = simplifyTerm(isSwing ? signal.primary_strategy : signal.strategy_name);
  const entry = isSwing ? signal.suggested_buy_price : signal.entry_price;
  const target = isSwing ? signal.target_sell_price : signal.target_exit_price;
  const isClosed = !isSwing && !isIntradaySignalOpen(signal);
  const rr = Number(signal.risk_reward_ratio || 0);
  const liveMeta = isSwing ? getSwingLiveEntryDisplay(signal) : null;
  const liveRr = !isSwing ? getIntradayLiveRiskReward(signal) : null;

  return (
    <button
      type="button"
      className={`sc-mob-card ${isClosed && muteCompleted ? 'is-completed-card' : ''}`}
      onClick={() => onSelect(signal)}
    >
      <div className="sc-mob-top">
        <div className="stock-cell">
          <div className="stock-avatar">{signal.symbol.slice(0, 2)}</div>
          <div>
            <div className="stock-sym">{signal.symbol}</div>
            <div className="stock-name">{signal.name}</div>
          </div>
        </div>
        <Badge tone={statusObj.tone}>{statusObj.label}</Badge>
      </div>

      <div className="sc-mob-metrics">
        <div>
          <span>Entry</span>
          <strong>{fmtPrice(entry)}</strong>
          <small className="sc-mob-sub">
            {isSwing ? formatSwingEntrySubLabel(signal) : <IntradayEntrySubtext signal={signal} />}
          </small>
        </div>
        <div><span>Target</span><strong className="text-up">{fmtPrice(target)}</strong></div>
        <div><span>Stop-Loss</span><strong className="text-down">{fmtPrice(signal.stop_loss)}</strong></div>
        <div>
          <span>R : R</span>
          <strong>{rr.toFixed(1)}x</strong>
          {liveRr != null && <small className="sc-mob-sub">Now {liveRr.toFixed(1)}x</small>}
        </div>
      </div>

      {isSwing && liveMeta && <SwingLivePriceMeta liveMeta={liveMeta} compact />}

      <div className="sc-mob-foot">
        <ConfidenceMeter score={signal.confidence_score} compact />
        <span className="sc-mob-strat">{strat.label}</span>
        <ChevronRight size={15} className="sc-mob-arrow" />
      </div>
    </button>
  );
}
