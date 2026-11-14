import React from 'react';
import { Hint } from './ui';

export function ScreenerStatCard({ label, value, sub, tone, icon: Icon, hint }) {
  return (
    <div className={`sc-stat-card ${tone ? `tone-${tone}` : ''}`}>
      <div className="sc-stat-label">
        {Icon && <Icon size={14} className="sc-stat-icon" />}
        <span>{label}</span>
        {hint && <Hint text={hint} />}
      </div>
      <div className="sc-stat-value">{value}</div>
      {sub && <div className="sc-stat-sub">{sub}</div>}
    </div>
  );
}

export function ScreenerStatsGrid({ stats = [], loading = false }) {
  if (loading) {
    return (
      <div className="sc-stats-grid" aria-busy="true" aria-label="Loading statistics">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sc-stat-card sc-stat-skeleton">
            <div className="sc-skel sc-skel-sm" />
            <div className="sc-skel sc-skel-lg" />
            <div className="sc-skel sc-skel-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats.length) return null;

  return (
    <div className="sc-stats-grid">
      {stats.map((s) => (
        <ScreenerStatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
