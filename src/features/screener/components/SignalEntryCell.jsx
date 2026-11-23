import React from 'react';
import { fmtPct, fmtPrice, shortTime } from '../utils/format';
import {
  formatSwingEntrySubLabel,
  getIntradayRecencyMeta,
  getSwingLiveEntryDisplay,
} from '../utils/signalPresentation';

export function SwingLivePriceMeta({ liveMeta, compact = false }) {
  if (!liveMeta) return null;
  const { livePrice, changePct, statusMeta } = liveMeta;
  const pctClass =
    changePct == null ? '' : changePct > 0 ? 'text-up' : changePct < 0 ? 'text-down' : '';

  return (
    <div className={`sc-live-entry-meta ${compact ? 'is-compact' : ''}`}>
      <span className="sc-live-price-line">
        Now <strong>{fmtPrice(livePrice)}</strong>
        {changePct != null && (
          <span className={`sc-live-pct ${pctClass}`}> ({fmtPct(changePct, 1)})</span>
        )}
      </span>
      {statusMeta && (
        <span
          className={`sc-live-status-pill tone-${statusMeta.tone}`}
          title={statusMeta.help}
        >
          {statusMeta.label}
        </span>
      )}
    </div>
  );
}

export function IntradayEntrySubtext({ signal }) {
  const recency = getIntradayRecencyMeta(signal);
  return (
    <span className="sc-entry-time-row">
      <span>at {shortTime(signal.entry_time_ist)}</span>
      {recency && (
        <>
          <span className="sc-meta-dot" aria-hidden="true">·</span>
          <span
            className={`sc-recency-pill ${recency.kind === 'fresh' ? 'is-fresh' : 'is-running'}`}
            title={
              recency.kind === 'fresh'
                ? recency.elapsed
                  ? `Fresh entry (${recency.elapsed})`
                  : 'Fresh intraday entry'
                : recency.elapsed
                  ? `Open setup running since ${recency.elapsed}`
                  : 'Open setup currently running'
            }
          >
            {recency.kind === 'running' && recency.elapsed
              ? `${recency.label} · ${recency.elapsed}`
              : recency.label}
          </span>
        </>
      )}
    </span>
  );
}

export function SignalEntryCell({ signal, isSwing, entry }) {
  const liveMeta = isSwing ? getSwingLiveEntryDisplay(signal) : null;

  return (
    <td className="num">
      <div className="cell-main">{fmtPrice(entry)}</div>
      <div className="cell-sub">
        {isSwing ? formatSwingEntrySubLabel(signal) : <IntradayEntrySubtext signal={signal} />}
      </div>
      {isSwing && liveMeta && <SwingLivePriceMeta liveMeta={liveMeta} />}
    </td>
  );
}
