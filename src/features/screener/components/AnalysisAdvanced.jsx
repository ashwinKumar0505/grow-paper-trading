import {
Award,
CheckCircle2,
ListChecks,
Shapes
} from 'lucide-react';
import { fmtPct } from '../utils/format';
import { patternIsForming,simplifyTerm } from '../utils/terms';
import { AnalysisIndicators } from './AnalysisIndicators';
import { AnalysisReasons } from './AnalysisReasons';
import { AnalysisTradePlan } from './AnalysisTradePlan';
import { Badge,Hint,SectionCard } from './ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisAdvanced({ planConfig, a, isAdvanced }) {
  return <>
          {/* 5. Advanced Sections */}
          {isAdvanced && planConfig.analysisAllowAdvancedMode && (
            <>
              <AnalysisTradePlan a={a} />

              <AnalysisReasons a={a} />

              <AnalysisIndicators a={a} />

              <div className="two-grid">
                <SectionCard
                  title={
                    <>
                      <Shapes size={18} /> Chart Patterns Found
                    </>
                  }
                  subtitle="Price formations detected on the daily chart."
                >
                  {a.identified_patterns.length === 0 ? (
                    <p className="muted">No major pattern on the latest day.</p>
                  ) : (
                    <div className="pattern-list">
                      {a.identified_patterns.map((p) => {
                        const t = simplifyTerm(p.name);
                        return (
                          <div key={p.name} className="pattern-item">
                            <div className="pattern-top">
                              <strong title={p.name}>{t.label}</strong>
                              <div className="pattern-badges">
                                <Badge tone={p.direction === 'BULLISH' ? 'positive' : 'negative'}>
                                  {p.direction === 'BULLISH' ? 'Upward' : 'Downward'}
                                </Badge>
                                <Badge tone={patternIsForming(p.status) ? 'warning' : 'info'}>
                                  {patternIsForming(p.status) ? 'Still forming' : 'Confirmed'}
                                </Badge>
                              </div>
                            </div>
                            <p>{p.description}</p>
                            <span className="pattern-rel">Reliability {p.reliability_score}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title={
                    <>
                      <Award size={18} /> Historical Pattern Performance
                    </>
                  }
                  subtitle={`Past 2 years on ${a.symbol}`}
                >
                  {a.stock_backtest_summary ? (
                    <div className="stat-grid two">
                      <div className="mini-stat">
                        <span>Times signalled</span>
                        <strong>{a.stock_backtest_summary.historical_signals_on_stock}</strong>
                      </div>
                      <div className="mini-stat">
                        <span>Hit target</span>
                        <strong>{a.stock_backtest_summary.stock_specific_precision_pct}%</strong>
                      </div>
                      <div className="mini-stat">
                        <span>Ended in profit</span>
                        <strong>{a.stock_backtest_summary.stock_specific_win_rate_pct}%</strong>
                      </div>
                      <div className="mini-stat">
                        <span>Average return per trade</span>
                        <strong
                          className={
                            a.stock_backtest_summary.avg_net_return_per_signal_pct >= 0 ? 'text-up' : 'text-down'
                          }
                        >
                          {fmtPct(a.stock_backtest_summary.avg_net_return_per_signal_pct, 2)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">Not enough past signals on this stock.</p>
                  )}
                </SectionCard>
              </div>

              <SectionCard
                title={
                  <>
                    <ListChecks size={18} /> Strategy Checklist
                  </>
                }
                subtitle="Which trading strategies are currently active on this stock."
                flush
              >
                <div className="table-wrap">
                  <table className="dtable compact">
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th>Active now?</th>
                        <th className="num">
                          <span className="th-inner">
                            Past success <Hint text="How often this strategy reached its target in past testing." />
                          </span>
                        </th>
                        <th className="num">
                          <span className="th-inner">
                            Profit factor{' '}
                            <Hint text="Total gains ÷ total losses in past testing. Above 1 means it made money overall." />
                          </span>
                        </th>
                        <th>Current condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.strategy_evaluations.map((st) => {
                        const t = simplifyTerm(st.strategy_name);
                        return (
                          <tr key={st.strategy_id}>
                            <td>
                              <strong title={st.strategy_name}>{t.label}</strong>
                              <div className="cell-sub">{st.strategy_name}</div>
                            </td>
                            <td>
                              {st.triggered ? (
                                <Badge tone="positive" icon={CheckCircle2}>
                                  Yes
                                </Badge>
                              ) : (
                                <Badge tone="neutral">No</Badge>
                              )}
                            </td>
                            <td className="num">{st.historical_precision_pct}%</td>
                            <td className="num">{st.historical_profit_factor}</td>
                            <td className="wrap-cell">{st.condition_summary}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
  </>;
}
