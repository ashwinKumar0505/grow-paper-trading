import React from 'react';
import ResearchDisclaimer from './ResearchDisclaimer';

export default function ScreenerLayout({
  header,
  statusBar,
  stats,
  alerts,
  children,
  gate,
}) {
  return (
    <div className="page sc-layout">
      {header}
      {statusBar}
      {alerts}
      {stats}
      {children}
      {gate}
      <ResearchDisclaimer />
    </div>
  );
}
