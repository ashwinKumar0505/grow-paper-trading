import { fmtPct,fmtPrice,shortDate } from '../utils/format';
import { OUTLOOK_LABEL } from '../utils/terms';
import { ConfidenceMeter,Hint } from './ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisOverview({ a, rec }) {
  return <>
          {/* 1. Stock Overview */}
          <section className={`card overview tone-border-${rec.tone}`}>
            <div className="ov-top">
              <div className="ov-id">
                <div className="stock-avatar lg">{a.symbol.slice(0, 2)}</div>
                <div>
                  <div className="ov-tags">
                    <span className="tag">{a.sector}</span>
                    {a.index_tier && <span className="tag">{a.index_tier}</span>}
                  </div>
                  <h2 className="ov-name">{a.name}</h2>
                  <div className="ov-sym">NSE: {a.symbol}</div>
                </div>
              </div>
              <div className="ov-price">
                <div className="ov-ltp">{fmtPrice(a.current_price)}</div>
                <div className={a.day_change_pct >= 0 ? 'text-up' : 'text-down'}>
                  {a.day_change_pct >= 0 ? '▲' : '▼'} {fmtPct(a.day_change_pct, 2)} today
                </div>
                <div className="ov-asof">Price as of {shortDate(a.data_as_of_date)}</div>
              </div>
            </div>

            <div className="ov-verdict">
              <div className={`verdict-box tone-${rec.tone}`}>
                <span className="verdict-label">Trend / Signal Assessment</span>
                <span className="verdict-value">{rec.label}</span>
                <span className="verdict-sub">Trend: {OUTLOOK_LABEL(a.market_outlook)}</span>
              </div>
              <div className="verdict-conf">
                <span className="verdict-label">
                  Strategy alignment score{' '}
                  <Hint
                    text={
                      a.score_explanation ||
                      '0–100 rule-based technical score combining moving averages, momentum indicators, and pattern triggers. It is an analytical alignment score, not a calibrated win probability.'
                    }
                  />
                </span>
                <ConfidenceMeter score={a.overall_confidence_score} />
                <div className="conf-scale">
                  <span>Avoid</span>
                  <span>Wait</span>
                  <span>Bullish Setup</span>
                </div>
              </div>
              <p className="verdict-summary">{a.recommendation_summary}</p>
            </div>

            <div className="plan-row">
              <div className="plan-cell">
                <span className="plan-k">
                  {a.entry_trigger_type === 'CONFIRMED_CURRENT_PRICE' ? 'Recommended entry zone' : 'Watch entry zone'}
                </span>
                <span className="plan-v">
                  {fmtPrice(a.entry_zone_low, 0)} – {fmtPrice(a.entry_zone_high, 0)}
                </span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">Target price</span>
                <span className="plan-v text-up">{fmtPrice(a.projected_target_1)}</span>
                <span className="plan-s">
                  {a.projected_target_1 != null && a.current_price > 0
                    ? `${fmtPct(((a.projected_target_1 - a.current_price) / a.current_price) * 100)} · ${a.estimated_target_window_days || ''}`
                    : '—'}
                </span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">
                  Stop loss <Hint text="Reference invalidation level to manage risk." />
                </span>
                <span className="plan-v text-down">{fmtPrice(a.stop_loss)}</span>
                <span className="plan-s">
                  {a.stop_loss != null && a.current_price > 0
                    ? fmtPct(((a.stop_loss - a.current_price) / a.current_price) * 100)
                    : '—'}
                </span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">
                  Reward : Risk <Hint text="Estimated upside for every ₹1 you risk." />
                </span>
                <span className="plan-v">{a.risk_reward_ratio != null ? `${Number(a.risk_reward_ratio).toFixed(1)}x` : '—'}</span>
                <span className="plan-s">
                  {a.risk_reward_ratio != null
                    ? `Gain ₹${Number(a.risk_reward_ratio).toFixed(1)} per ₹1 risked`
                    : 'Reference only'}
                </span>
              </div>
            </div>
          </section>


  </>;
}
