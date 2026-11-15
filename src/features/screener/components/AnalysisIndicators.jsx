import {
Gauge
} from 'lucide-react';
import { SIGNAL_WORD } from '../utils/terms';
import { Badge,SectionCard } from './ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisIndicators({ a }) {
  return (
              <SectionCard
                title={
                  <>
                    <Gauge size={18} /> Indicator Readings
                  </>
                }
                subtitle="Each indicator is one check. Weight shows how much it counts toward the confidence score."
                flush
              >
                <div className="table-wrap">
                  <table className="dtable compact">
                    <thead>
                      <tr>
                        <th>Indicator</th>
                        <th className="num">Value</th>
                        <th>Reading</th>
                        <th className="num">Weight</th>
                        <th>What it means</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.supporting_indicators.map((ind) => (
                        <tr key={ind.name}>
                          <td>
                            <strong>{ind.name}</strong>
                          </td>
                          <td className="num">{ind.value}</td>
                          <td>
                            <Badge tone={toneFor(ind.signal)}>{SIGNAL_WORD[ind.signal] || ind.signal}</Badge>
                          </td>
                          <td className="num">{ind.weight}</td>
                          <td className="wrap-cell">{ind.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
  );
}
