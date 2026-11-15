import React from 'react';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import { simplifyTerm, patternIsForming } from '../utils/terms';

export function DrawerWhySection({ signal, strat }) {
  return (
    <>
      <section className="sc-drawer-section">
        <h4 className="sc-drawer-sec-title">
          <TrendingUp size={15} /> Why This Stock?
        </h4>
        <div className="sc-drawer-strat">
          <span className="sc-drawer-k">Primary Strategy</span>
          <strong>{strat.label}</strong>
          {strat.help && strat.help !== strat.label && <p>{strat.help}</p>}
        </div>

        {Array.isArray(signal.reasoning) && signal.reasoning.length > 0 && (
          <ul className="tick-list sc-drawer-list">
            {signal.reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {typeof signal.reasoning === 'string' && signal.reasoning && (
          <p className="sc-drawer-note">{signal.reasoning}</p>
        )}

        {signal.detected_patterns?.length > 0 && (
          <div className="chips chips-wrap mt-2.5">
            {signal.detected_patterns.map((p) => {
              const t = simplifyTerm(p);
              return (
                <span key={p} className={`chip ${patternIsForming(p) ? 'chip-warn' : ''}`} title={t.help}>
                  {t.label}
                </span>
              );
            })}
          </div>
        )}

        {(signal.estimated_holding_days != null || signal.historical_strategy_precision_pct != null) && (
          <div className="plan-mini mt-3">
            {signal.estimated_holding_days != null && (
              <div>
                <span>Expected hold</span>
                <strong>~{signal.estimated_holding_days} trading days</strong>
              </div>
            )}
            {signal.historical_strategy_precision_pct != null && (
              <div>
                <span>Past strategy precision</span>
                <strong>{signal.historical_strategy_precision_pct}%</strong>
              </div>
            )}
          </div>
        )}
      </section>

      {Array.isArray(signal.risk_notes) && signal.risk_notes.length > 0 && (
        <section className="sc-drawer-section">
          <h4 className="sc-drawer-sec-title">
            <ShieldAlert size={15} /> Risk Notes
          </h4>
          <ul className="warn-list">
            {signal.risk_notes.map((rn, i) => (
              <li key={i}>{rn}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
