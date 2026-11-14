import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Hint } from './ui';
import { StockRecommendationRow, StockRecommendationMobileCard } from './StockRecommendationRow';

function SortHead({ field, label, sortBy, sortDir, onSort, className = '', hint }) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`sortable ${active ? 'sorted' : ''} ${className}`} onClick={() => onSort(field)}>
      <span className="th-inner">
        {label}
        {hint && <Hint text={hint} />}
        <Icon size={13} />
      </span>
    </th>
  );
}

export default function RecommendationTable({
  signals = [],
  mode = 'swing',
  sortBy,
  sortDir,
  onSort,
  selectedSymbol,
  onSelectSignal,
  isRefreshing = false,
}) {
  const isSwing = mode === 'swing';
  const sortable = Boolean(onSort);

  return (
    <>
      {/* Desktop / Tablet Sticky-Header Table */}
      <div className={`table-wrap sc-table-desktop ${isRefreshing ? 'is-refreshing' : ''}`}>
        <table className="dtable sc-dtable">
          <thead>
            <tr>
              {isSwing && <th className="col-rank">#</th>}
              <th className="col-stock">Stock</th>
              {sortable ? (
                <SortHead field="confidence_score" label="Confidence" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              ) : (
                <th>Confidence</th>
              )}
              <th>Setup Status</th>
              <th className="num">Recommended Entry</th>
              {sortable ? (
                <SortHead
                  field="expected_gain_pct"
                  label="Target"
                  className="num"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                  hint="Estimated target price and approximate timeframe."
                />
              ) : (
                <th className="num">
                  <span className="th-inner">
                    Target <Hint text="Estimated target level and approximate time." />
                  </span>
                </th>
              )}
              <th className="num">
                <span className="th-inner">
                  Stop-Loss <Hint text="Reference invalidation level to manage risk." />
                </span>
              </th>
              <th className="col-strategy">Pattern / Strategy</th>
              {sortable ? (
                <SortHead
                  field="risk_reward_ratio"
                  label="Reward : Risk"
                  className="num"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                  hint="Estimated upside for every ₹1 of risk."
                />
              ) : (
                <th className="num">
                  <span className="th-inner">
                    Reward : Risk <Hint text="Possible gain for every ₹1 you risk." />
                  </span>
                </th>
              )}
              <th className="col-action" aria-label="Inspect" />
            </tr>
          </thead>
          <tbody>
            {signals.map((sig, idx) => (
              <StockRecommendationRow
                key={sig.id || sig.symbol}
                signal={sig}
                rank={idx + 1}
                mode={mode}
                selected={selectedSymbol === sig.symbol}
                onSelect={onSelectSignal}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact Stock Cards */}
      <div className={`sc-cards-mobile ${isRefreshing ? 'is-refreshing' : ''}`}>
        {signals.map((sig) => (
          <StockRecommendationMobileCard
            key={sig.id || sig.symbol}
            signal={sig}
            mode={mode}
            onSelect={onSelectSignal}
          />
        ))}
      </div>
    </>
  );
}
