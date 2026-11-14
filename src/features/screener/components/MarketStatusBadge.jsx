import React from 'react';
import { Clock, Radio, PauseCircle } from 'lucide-react';
import { formatIstTimestamp } from '../utils/screenerHelpers';
import { timeAgo } from '../utils/format';

const PHASE_LABEL = {
  PRE_OPEN: 'Pre-Open',
  LIVE_TRADING: 'Market Open',
  POST_CLOSE: 'Market Closed',
  WEEKEND_CLOSED: 'Market Closed',
  HOLIDAY_CLOSED: 'Market Closed',
};

export default function MarketStatusBadge({
  marketStatus,
  lastUpdatedIso,
  sessionDateLabel,
  extra,
}) {
  const rawPhase = marketStatus?.session_phase;
  const isOpen = Boolean(
    marketStatus?.is_market_open &&
      rawPhase !== 'POST_CLOSE' &&
      rawPhase !== 'WEEKEND_CLOSED' &&
      rawPhase !== 'HOLIDAY_CLOSED'
  );
  const isPreOpen = !isOpen && rawPhase === 'PRE_OPEN';

  const statusText = marketStatus
    ? PHASE_LABEL[rawPhase] || (isOpen ? 'Market Open' : 'Market Closed')
    : 'Checking market';

  const dotClass = isOpen ? 'on' : isPreOpen ? 'warn' : 'closed';

  return (
    <div className="sc-status-bar">
      <div className="sc-status-left">
        <span className={`sc-market-pill ${isOpen ? 'is-open' : isPreOpen ? 'is-pre' : 'is-closed'}`}>
          <span className={`pulse-dot ${dotClass}`} />
          {isOpen ? <Radio size={12} /> : <PauseCircle size={12} />}
          <span>{statusText}</span>
        </span>

        {sessionDateLabel && (
          <span className="sc-status-meta">
            <span>Session: <strong>{sessionDateLabel}</strong></span>
          </span>
        )}

        {lastUpdatedIso ? (
          <span className="sc-status-meta">
            <Clock size={12} />
            <span>
              Updated <strong>{formatIstTimestamp(lastUpdatedIso)}</strong>
              <span className="sc-status-ago"> ({timeAgo(lastUpdatedIso)})</span>
            </span>
          </span>
        ) : (
          <span className="sc-status-meta">
            <Clock size={12} />
            <span>Not screened yet</span>
          </span>
        )}
      </div>

      {extra && <div className="sc-status-right">{extra}</div>}
    </div>
  );
}
