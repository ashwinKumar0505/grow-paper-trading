import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export default function ResearchDisclaimer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className="sc-disclaimer" aria-label="Research disclaimer">
      <div className="sc-disclaimer-row">
        <div className="sc-disclaimer-main">
          <ShieldAlert size={15} className="sc-disclaimer-icon" />
          <p>
            <strong>Research Disclaimer:</strong> Signals are based on technical analysis and historical data. They are
            not guaranteed outcomes or personalized investment advice.
          </p>
        </div>
        <button
          type="button"
          className="sc-disclaimer-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Less <ChevronUp size={13} />
            </>
          ) : (
            <>
              Read more <ChevronDown size={13} />
            </>
          )}
        </button>
      </div>
      {expanded && (
        <div className="sc-disclaimer-more">
          NiftyLens Stock Screener is intended for educational and research purposes only. Confidence scores, entry
          zones, targets, and stop-loss levels are derived from historical price patterns and technical indicators —
          past backtested performance does not guarantee future returns. Always conduct your own due diligence and
          consider your risk tolerance before placing any trade.
        </div>
      )}
    </aside>
  );
}
