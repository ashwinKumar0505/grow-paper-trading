import React from 'react';
import { Target } from 'lucide-react';
import { fmtPrice, fmtPct, shortDate, shortTime } from '../utils/format';

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
  );
}
