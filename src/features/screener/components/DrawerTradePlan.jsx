import React from 'react';
import { Target } from 'lucide-react';
import { fmtPrice, fmtPct, shortDate } from '../utils/format';
import {
  formatSwingEntrySubLabel,
  getIntradayLiveRiskReward,
  getSwingLiveEntryDisplay,
} from '../utils/signalPresentation';
import { IntradayEntrySubtext, SwingLivePriceMeta } from './SignalEntryCell';

export function DrawerTradePlan({
  isSwing,
  signal,
  entryPrice,
  targetPrice,
  stopLoss,
  targetPct,
  slPct,
  rr,
}) {
  const liveMeta = isSwing ? getSwingLiveEntryDisplay(signal) : null;
  const liveRr = !isSwing ? getIntradayLiveRiskReward(signal) : null;

  return (
    <section className="sc-drawer-section">
      <h4 className="sc-drawer-sec-title">
        <Target size={15} /> Trade Plan & Levels
      </h4>
      <div className="sc-drawer-levels">
        <div className="sc-drawer-level">
          <span>{isSwing ? 'Recommended Entry' : 'Entry Price'}</span>
          <strong>{fmtPrice(entryPrice)}</strong>
          <small>
            {isSwing ? formatSwingEntrySubLabel(signal) : <IntradayEntrySubtext signal={signal} />}
          </small>
          {isSwing && liveMeta && <SwingLivePriceMeta liveMeta={liveMeta} compact />}
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
          <small>
            {liveRr != null
              ? `Now ${liveRr.toFixed(1)}x live`
              : rr != null
                ? `₹${Number(rr).toFixed(1)} per ₹1 risk`
                : '—'}
          </small>
        </div>
      </div>
      {signal.buy_price_note && <p className="sc-drawer-note">{signal.buy_price_note}</p>}
    </section>
  );
}
