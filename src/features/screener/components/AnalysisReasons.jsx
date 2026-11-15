import {
AlertTriangle,
ShieldX,
TrendingUp
} from 'lucide-react';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisReasons({ a }) {
  return (
              <div className="three-grid">
                <div className="reason-card tone-positive">
                  <h4>
                    <TrendingUp size={17} /> Good signs ({a.bullish_reasons.length})
                  </h4>
                  {a.bullish_reasons.length === 0 ? (
                    <p className="muted">No strong positive signs right now.</p>
                  ) : (
                    <ul>
                      {a.bullish_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="reason-card tone-warning">
                  <h4>
                    <AlertTriangle size={17} /> Risks to watch ({a.risk_factors.length})
                  </h4>
                  {a.risk_factors.length === 0 ? (
                    <p className="muted">No major risks flagged.</p>
                  ) : (
                    <ul>
                      {a.risk_factors.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="reason-card tone-negative">
                  <h4>
                    <ShieldX size={17} /> Reasons to avoid ({a.reasons_to_avoid.length})
                  </h4>
                  {a.reasons_to_avoid.length === 0 ? (
                    <p className="muted">Nothing that rules this stock out.</p>
                  ) : (
                    <ul>
                      {a.reasons_to_avoid.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

  );
}
