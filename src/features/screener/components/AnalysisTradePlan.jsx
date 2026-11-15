import {
Target
} from 'lucide-react';
import { fmtPrice } from '../utils/format';
import { SectionCard } from './ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisTradePlan({ a }) {
  return (
              <SectionCard
                title={
                  <>
                    <Target size={18} /> Detailed Trade Plan
                  </>
                }
                subtitle="Key support floors and resistance ceilings from recent price action."
              >
                <div className="levels-grid">
                  <div className="level-col">
                    <h5>Targets</h5>
                    <div className="level-item">
                      <span>Target 1</span>
                      <strong className="text-up">{fmtPrice(a.projected_target_1)}</strong>
                    </div>
                    <div className="level-item">
                      <span>Target 2</span>
                      <strong className="text-up">{fmtPrice(a.projected_target_2)}</strong>
                    </div>
                    <div className="level-item">
                      <span>Expected by</span>
                      <strong>{a.estimated_target_date}</strong>
                    </div>
                  </div>
                  <div className="level-col">
                    <h5>Resistance (price ceilings)</h5>
                    {a.resistance_levels.length ? (
                      a.resistance_levels.map((r) => (
                        <div key={r} className="level-item">
                          <span>Ceiling</span>
                          <strong>{fmtPrice(r)}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="muted">None nearby</p>
                    )}
                  </div>
                  <div className="level-col">
                    <h5>Support (price floors)</h5>
                    {a.support_levels.length ? (
                      a.support_levels.map((s) => (
                        <div key={s} className="level-item">
                          <span>Floor</span>
                          <strong>{fmtPrice(s)}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="muted">None nearby</p>
                    )}
                  </div>
                </div>
              </SectionCard>
  );
}
