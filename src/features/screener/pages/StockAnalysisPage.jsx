import React, { useState, useEffect, useRef } from 'react';
import { useQueryParams, navigate } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import {
  Search,
  X,
  TrendingUp,
  AlertTriangle,
  ShieldX,
  CheckCircle2,
  RefreshCw,
  LineChart,
  ListChecks,
  Shapes,
  Award,
  Target,
  Eye,
  Gauge,
  Lock,
  BarChart3,
} from 'lucide-react';
import { api } from '../api/client';
import PriceChart from '../components/PriceChart';
import DataLoader from '../components/DataLoader';
import FinancialsSection from '../components/FinancialsSection';
import ScreenerLayout from '../components/ScreenerLayout';
import ScreenerHeader from '../components/ScreenerHeader';
import MarketStatusBadge from '../components/MarketStatusBadge';
import PremiumFeatureGate from '../components/PremiumFeatureGate';
import { SearchIllustration } from '../components/Illustrations';
import { Badge, ConfidenceMeter, Segmented, SectionCard, Hint } from '../components/ui';
import { fmtPrice, fmtPct, shortDate } from '../utils/format';
import { RECOMMENDATION, OUTLOOK_LABEL, SIGNAL_WORD, simplifyTerm, patternIsForming } from '../utils/terms';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');

export default function StockAnalysisPage({ marketStatus }) {
  const [searchParams, setSearchParams] = useQueryParams();
  const {
    selectStockBySymbol,
    subscriptionTier,
    planConfig,
    usageQuota,
    consumeAnalysisSearch,
    openUpgradeModal,
    addToast,
  } = useTrading();
  const urlSymbol = (searchParams.get('symbol') || '').toUpperCase();

  const [query, setQuery] = useState(urlSymbol);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [analysis, setAnalysis] = useState(urlSymbol ? analysisMemo[urlSymbol] || null : null);
  const [loading, setLoading] = useState(false);
  const [loadingSym, setLoadingSym] = useState('');
  const [error, setError] = useState('');
  const [lastAttemptSym, setLastAttemptSym] = useState('');
  const [mode, setMode] = useState(() => localStorage.getItem('qp.analysisMode') || 'simple');
  const inputRef = useRef(null);

  useEffect(() => localStorage.setItem('qp.analysisMode', mode), [mode]);

  const load = async (sym, forceRefresh = false) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    if (loading && loadingSym === clean) return;
    setShowDropdown(false);
    setQuery(clean);
    setLastAttemptSym(clean);
    if (!consumeAnalysisSearch(clean)) {
      return;
    }
    if (!forceRefresh && analysisMemo[clean]) {
      setAnalysis(analysisMemo[clean]);
      setError('');
      if (urlSymbol !== clean) setSearchParams({ symbol: clean });
      return;
    }
    setLoading(true);
    setLoadingSym(clean);
    setError('');
    try {
      const data = await api.getStockAnalysis(clean, forceRefresh);
      analysisMemo[data.symbol] = data;
      setAnalysis(data);
      setQuery(data.symbol);
      setSearchParams({ symbol: data.symbol });
    } catch (err) {
      const msg = err.message || `We couldn’t analyse “${clean}”. Server may be down — please try again in some time.`;
      setError(msg);
      addToast('Analysis Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSymbol && urlSymbol !== analysis?.symbol) load(urlSymbol);
    if (!urlSymbol) {
      setAnalysis(null);
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    if (!q || q === analysis?.symbol) {
      setSuggestions([]);
      return undefined;
    }
    const t = setTimeout(() => {
      api
        .searchStocks(q, 8)
        .then((res) => alive && setSuggestions(res))
        .catch(() => {});
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, analysis?.symbol]);

  const onKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      load(suggestions[activeIdx].symbol);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const clear = () => {
    setQuery('');
    setAnalysis(null);
    setError('');
    setSearchParams({});
    inputRef.current?.focus();
  };

  const a = analysis;
  const rec = a ? RECOMMENDATION[a.recommendation] || RECOMMENDATION.WAIT : null;
  const isAdvanced = mode === 'advanced';
  const { beginner: B, advanced: A } = SUBSCRIPTION_PLANS;

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow="Deep-Dive Research · Nifty 500"
          title="Stock Analysis"
          description="Explore price charts, technical indicators, financial performance, and historical pattern insights for any Nifty 500 company."
          methodologyNote="Combines 2-year historical backtested patterns, multi-indicator chart analysis, and quarterly/annual financial trends."
        />
      }
      statusBar={
        <MarketStatusBadge
          marketStatus={marketStatus}
          lastUpdatedIso={a?.data_as_of_date}
          extra={
            planConfig.analysisDailyLimit < 999 ? (
              <button
                type="button"
                onClick={() =>
                  openUpgradeModal({
                    requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
                    featureName: 'More Daily AI Stock Analyses',
                    featureDescription: `Upgrade to Beginner for ${B.analysisDailyLimit} analyses/day or Advanced for Unlimited daily analyses and 2-year strategy backtests.`,
                  })
                }
                className={`analysis-quota-pill ${
                  usageQuota.analysisSearchesCount >= planConfig.analysisDailyLimit ? 'is-exhausted' : ''
                }`}
                title="Click to upgrade your daily Stock Analysis quota"
              >
                <span className="quota-dot" />
                <span>
                  Daily Analysis:{' '}
                  <strong>
                    {usageQuota.analysisSearchesCount} / {planConfig.analysisDailyLimit}
                  </strong>{' '}
                  used
                </span>
                <span className="quota-tier-tag">{planConfig.name}</span>
              </button>
            ) : null
          }
        />
      }
      alerts={
        error ? (
          <div className="alert alert-error sc-alert-retry">
            <span>{error}</span>
            {lastAttemptSym && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => load(lastAttemptSym, true)}>
                Retry
              </button>
            )}
          </div>
        ) : null
      }
    >
      {/* Search Bar */}
      <section className="card search-card">
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            load(activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx].symbol : query);
          }}
        >
          <div className="search-box">
            <Search size={18} className="search-ico" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search stock name or symbol, e.g. Reliance, TCS, HDFC Bank…"
              value={query}
              aria-label="Search Nifty 500 stock"
              aria-expanded={showDropdown && suggestions.length > 0}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
                setActiveIdx(-1);
              }}
            />
            {query && (
              <button type="button" className="icon-btn search-clear" onClick={clear} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
            {showDropdown && suggestions.length > 0 && (
              <ul className="search-dd" role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={s.symbol}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={i === activeIdx ? 'active' : ''}
                    onMouseDown={() => load(s.symbol)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <div className="stock-avatar sm">{s.symbol.slice(0, 2)}</div>
                    <div className="dd-text">
                      <strong>{s.symbol}</strong>
                      <span>{s.name}</span>
                    </div>
                    <span className="dd-sector">{s.sector}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
            {loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
            <span>{loading ? 'Analysing…' : 'Analyse'}</span>
          </button>
        </form>

        <div className="popular">
          <span>Popular:</span>
          {POPULAR.map((s) => (
            <button
              key={s}
              className={`chip-btn ${a?.symbol === s ? 'active' : ''}`}
              onClick={() => load(s)}
              type="button"
              disabled={loading && loadingSym === s}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="card">
          <DataLoader
            title={`Analysing ${loadingSym}…`}
            subtitle="Reading two years of price history and checking technical signals."
            stages={[
              'Loading price history',
              'Checking trends and averages',
              'Looking for chart patterns',
              'Building the buy / sell plan',
            ]}
          />
        </section>
      ) : !a ? (
        <section className="card sc-empty-analysis">
          <div className="sc-empty-illus">
            <SearchIllustration />
          </div>
          <div className="sc-empty-copy">
            <h3>Analyse Any Nifty 500 Stock</h3>
            <p>
              Search for a company to explore its chart, technical indicators, financial performance, and available
              trading insights.
            </p>
            <div className="placeholder-points">
              <span>
                <CheckCircle2 size={14} /> Technical Analysis
              </span>
              <span>
                <LineChart size={14} /> Price Charts
              </span>
              <span>
                <BarChart3 size={14} /> Financial Insights
              </span>
            </div>
            <div className="sc-empty-examples">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => load('RELIANCE')}>
                Try RELIANCE
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => load('TCS')}>
                Try TCS
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="view-switch">
            <Segmented
              value={mode}
              onChange={(nextMode) => {
                if (nextMode === 'advanced' && !planConfig.analysisAllowAdvancedMode) {
                  openUpgradeModal({
                    requiredTier: 'advanced',
                    featureName: 'Advanced Stock Analysis & 2-Year Strategy Backtest',
                    featureDescription:
                      'Advanced mode (Weighted Indicator Readings, Chart Pattern Detection, 2-Year Historical Strategy Backtest, and Active Strategy Checklist) is exclusive to the Advanced Package.',
                  });
                  setMode('advanced');
                  return;
                }
                setMode(nextMode);
              }}
              options={[
                { value: 'simple', label: 'Simple', icon: Eye },
                {
                  value: 'advanced',
                  label: planConfig.analysisAllowAdvancedMode ? 'Advanced' : 'Advanced 🔒',
                  icon: Gauge,
                },
              ]}
            />
            <span className="view-switch-hint">
              {isAdvanced
                ? planConfig.analysisAllowAdvancedMode
                  ? 'Showing all technical details.'
                  : 'Advanced technical breakdown requires the Advanced Package.'
                : 'Showing the essentials. Switch to Advanced for full details.'}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (planConfig.allowOneClickTradeFromScreener === 'none') {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'One-Click Practice Trade from Stock Analysis',
                    featureDescription:
                      'Sending analysed stocks directly to the Paper Trading Desk is available on Beginner and Advanced plans.',
                  });
                  return;
                }
                selectStockBySymbol(a.symbol);
                navigate('/trade');
              }}
              title="Open this stock in Paper Trading Desk"
            >
              {planConfig.allowOneClickTradeFromScreener === 'none' && <Lock size={13} />}
              <span>Trade {a.symbol} in Paper Desk</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => load(a.symbol, true)}
              title="Get latest prices"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

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
                  Confidence score{' '}
                  <Hint text="0–100 based on backtested pattern precision and indicator agreement. It is an analytical score, not a guaranteed win probability." />
                </span>
                <ConfidenceMeter score={a.overall_confidence_score} />
                <div className="conf-scale">
                  <span>Avoid</span>
                  <span>Wait</span>
                  <span>Recommended</span>
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
                  {fmtPct(((a.projected_target_1 - a.current_price) / a.current_price) * 100)} ·{' '}
                  {a.estimated_target_window_days}
                </span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">
                  Stop loss <Hint text="Reference invalidation level to manage risk." />
                </span>
                <span className="plan-v text-down">{fmtPrice(a.stop_loss)}</span>
                <span className="plan-s">{fmtPct(((a.stop_loss - a.current_price) / a.current_price) * 100)}</span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">
                  Reward : Risk <Hint text="Estimated upside for every ₹1 you risk." />
                </span>
                <span className="plan-v">{a.risk_reward_ratio.toFixed(1)}x</span>
                <span className="plan-s">Gain ₹{a.risk_reward_ratio.toFixed(1)} per ₹1 risked</span>
              </div>
            </div>
          </section>

          {/* 2. Chart & Technical Indicators */}
          <SectionCard
            title={
              <>
                <LineChart size={18} /> Price Chart & Indicators
              </>
            }
            subtitle="Daily prices with moving average lines. Hover over the chart to inspect each session."
          >
            <PriceChart
              bars={a.recent_price_bars}
              stopLoss={a.stop_loss}
              target1={a.projected_target_1}
              showMomentum={isAdvanced}
            />
          </SectionCard>

          {/* 3. Revenue & Profit */}
          {planConfig.analysisAllowFinancialsAndLevels ? (
            <FinancialsSection symbol={a.symbol} />
          ) : (
            <PremiumFeatureGate
              requiredTier="beginner"
              title={`Unlock ${a.symbol} Revenue, Profit & Fundamental Trends`}
              description="Quarterly & yearly revenue, net profit, margin trends, and support/resistance levels are unlocked on Beginner and Advanced plans."
              benefits={[
                `Full revenue & profit financials + support/resistance zones`,
                `${B.analysisDailyLimit} AI stock analyses per day`,
                `One-click paper trading from stock analysis`,
              ]}
            />
          )}

          {/* 4. Advanced Technical & Backtest Gate */}
          {isAdvanced && !planConfig.analysisAllowAdvancedMode && (
            <PremiumFeatureGate
              requiredTier="advanced"
              title={`Unlock Advanced Technical & 2-Year Backtest Suite for ${a.symbol}`}
              description="Inspect weighted indicator readings, automated chart pattern recognition, 2-year historical strategy win-rate, and the multi-strategy checklist."
              benefits={[
                'Weighted technical indicator readings (RSI, MACD, ADX, Bollinger)',
                `2-year historical backtest precision & return on ${a.symbol}`,
                `Unlimited daily analyses (${A.name})`,
              ]}
            />
          )}

          {/* 5. Advanced Sections */}
          {isAdvanced && planConfig.analysisAllowAdvancedMode && (
            <>
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
        </>
      )}
    </ScreenerLayout>
  );
}
