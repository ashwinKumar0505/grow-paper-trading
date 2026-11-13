import React, { useState, useMemo } from 'react';
import { navigate } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Eye,
  Clock,
  Layers,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  SearchX,
} from 'lucide-react';
import { api } from '../api/client';
import DataLoader from '../components/DataLoader';
import { Badge, ConfidenceMeter, Segmented, Hint, StatCard } from '../components/ui';
import { HeroChartIllustration } from '../components/Illustrations';
import { loadCachedScan, saveCachedScan, CACHE_KEYS } from '../utils/scanCache';
import { fmtPrice, fmtPct, fmtDateTime, timeAgo, shortDate } from '../utils/format';
import { simplifyTerm, patternIsForming, SWING_STATUS } from '../utils/terms';

const SCAN_MIN_CONFIDENCE = 50;

function SortHead({ field, label, sortBy, sortDir, onSort, className = '', hint }) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`sortable ${active ? 'sorted' : ''} ${className}`} onClick={() => onSort(field)}>
      <span className="th-inner">
        {label}
        {hint && <Hint text={hint} />}
        <Icon size={13} />
      </span>
    </th>
  );
}

export default function SwingScannerPage() {
  const { selectStockBySymbol } = useTrading();
  const cached = loadCachedScan(CACHE_KEYS.swing);
  const [scan, setScan] = useState(cached);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState('scan');
  const [error, setError] = useState('');

  const [minConfidence, setMinConfidence] = useState(60);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('confidence_score');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  const data = scan?.data;

  const runScan = async (forceRefresh) => {
    setLoading(true);
    setLoadingMode(forceRefresh ? 'refresh' : 'scan');
    setError('');
    try {
      const res = await api.runSwingScanner({
        universeLimit: 500,
        minConfidence: SCAN_MIN_CONFIDENCE,
        signalType: 'ALL',
        forceRefresh,
      });
      setScan(saveCachedScan(CACHE_KEYS.swing, res));
      setExpanded(null);
    } catch (err) {
      setError(err.message || 'The scan could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const list = (data?.signals || []).filter((s) => s.confidence_score >= minConfidence);
    return {
      ALL: list.length,
      CONFIRMED_SIGNAL: list.filter((s) => s.signal_type === 'CONFIRMED_SIGNAL').length,
      PROJECTED_SETUP: list.filter((s) => s.signal_type === 'PROJECTED_SETUP').length,
    };
  }, [data, minConfidence]);

  const rows = useMemo(() => {
    if (!data?.signals) return [];
    let list = data.signals.filter((s) => s.confidence_score >= minConfidence);
    if (statusFilter !== 'ALL') list = list.filter((s) => s.signal_type === statusFilter);
    return [...list].sort((a, b) => {
      const vA = a[sortBy] ?? 0;
      const vB = b[sortBy] ?? 0;
      return sortDir === 'asc' ? vA - vB : vB - vA;
    });
  }, [data, minConfidence, statusFilter, sortBy, sortDir]);

  const onSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const readyCount = (data?.signals || []).filter((s) => s.signal_type === 'CONFIRMED_SIGNAL').length;

  return (
    <div className="page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Backtested Patterns & Chart Analysis · Multi-Day Setups
          </span>
          <h2>Stock recommendations backed by chart analysis & backtests.</h2>
          <p>
            We screen all Nifty 500 stocks using historical backtested patterns, technical chart analysis, and volume
            trends to pick the strongest stock recommendations for you — complete with a recommended entry zone, target
            price, and stop-loss level.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => runScan(false)} disabled={loading}>
              {loading && loadingMode === 'scan' ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              {loading && loadingMode === 'scan' ? 'Screening stocks…' : 'Get stock recommendations'}
              {!loading && <ArrowRight size={16} />}
            </button>
            <button
              className="btn btn-ghost-dark btn-lg"
              onClick={() => runScan(true)}
              disabled={loading}
              title="Download the latest prices before scanning"
            >
              <RefreshCw size={16} className={loading && loadingMode === 'refresh' ? 'spin' : ''} />
              Refresh market data
            </button>
          </div>
          <div className="hero-meta">
            <Clock size={13} />
            {scan ? (
              <span>
                Last screened <strong>{fmtDateTime(scan.savedAt)}</strong> · {timeAgo(scan.savedAt)}
              </span>
            ) : (
              <span>Not screened yet — recommendations stay saved until you scan again.</span>
            )}
          </div>
        </div>
        <div className="hero-art">
          <HeroChartIllustration />
          <span className="hero-art-note">Illustration · not market data</span>
        </div>
      </section>

      <div className="alert alert-info" style={{ alignItems: 'flex-start' }}>
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Research Disclaimer:</strong> Please do your own research from your side before buying or acting on any
          of these stock recommendations. Our screener uses historical backtested patterns and chart analysis to surface
          high-probability setups — these are analytical recommendations, not a forced buy call.
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {data && !loading && (
        <div className="stat-grid four">
          <StatCard icon={Layers} label="Stocks screened" value={data.total_scanned} sub={`out of ${data.total_universe_count} in Nifty 500`} />
          <StatCard icon={TrendingUp} label="Recommendations" value={data.bullish_signals_found} sub="Matched backtested chart patterns" tone="primary" />
          <StatCard icon={CheckCircle2} label="Confirmed setups" value={readyCount} sub="All chart conditions aligned" />
          <StatCard icon={Clock} label="Prices as of" value={shortDate(data.data_as_of_date)} sub={`Screened ${timeAgo(scan.savedAt)}`} />
        </div>
      )}

      {/* Results */}
      <section className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Swing stock recommendations</h3>
            <p className="card-sub">
              {data
                ? 'Picked using backtested chart patterns and technical analysis. Tap any recommendation to inspect its full reasoning and do your own research before buying.'
                : 'Run the screener to view backtested stock recommendations here.'}
            </p>
          </div>
          {data && !loading && <span className="count-pill">{rows.length} recommendations</span>}
        </header>

        {data && !loading && (
          <div className="filters">
            <div className="filter">
              <label className="filter-label">
                Minimum confidence <Hint text="How strongly the backtested patterns and chart indicators agree, from 0 to 100." />
              </label>
              <div className="range-row">
                <input
                  type="range"
                  min={SCAN_MIN_CONFIDENCE}
                  max={95}
                  step={5}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  style={{ '--fill': `${((minConfidence - SCAN_MIN_CONFIDENCE) / (95 - SCAN_MIN_CONFIDENCE)) * 100}%` }}
                />
                <span className="range-value">{minConfidence}+</span>
              </div>
            </div>
            <div className="filter">
              <label className="filter-label">
                Recommendation status <Hint text="Confirmed setup: all technical conditions are met. Watchlist: promising pattern, wait for confirmation." />
              </label>
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: `All (${counts.ALL})` },
                  { value: 'CONFIRMED_SIGNAL', label: `Confirmed setups (${counts.CONFIRMED_SIGNAL})` },
                  { value: 'PROJECTED_SETUP', label: `Watchlist (${counts.PROJECTED_SETUP})` },
                ]}
              />
            </div>
          </div>
        )}

        {loading ? (
          <DataLoader
            title={loadingMode === 'refresh' ? 'Getting the latest prices…' : 'Screening Nifty 500 stocks…'}
            subtitle="Running backtested pattern recognition and multi-indicator chart analysis across the universe."
            stages={[
              loadingMode === 'refresh' ? 'Downloading latest daily prices' : 'Loading saved daily prices',
              'Checking price trends and moving averages',
              'Matching historical backtested chart patterns',
              'Scoring each recommendation’s confidence',
              'Calculating reference entry, target and stop loss',
            ]}
          />
        ) : !data ? (
          <div className="empty">
            <div className="empty-icon">
              <Sparkles size={26} />
            </div>
            <h4>No recommendations loaded yet</h4>
            <p>Press “Get stock recommendations” to screen all Nifty 500 stocks using our backtested pattern & chart analysis engine.</p>
            <button className="btn btn-primary" onClick={() => runScan(false)}>
              <Sparkles size={16} /> Get stock recommendations
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon muted">
              <SearchX size={26} />
            </div>
            <h4>No stocks match these filters</h4>
            <p>Try lowering the minimum confidence or choosing “All”.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th className="col-stock">Stock</th>
                  <SortHead field="confidence_score" label="Confidence" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <th>Setup Status</th>
                  <th className="num">Recommended Entry</th>
                  <SortHead field="expected_gain_pct" label="Target" className="num" sortBy={sortBy} sortDir={sortDir} onSort={onSort} hint="Estimated target price and approximate timeframe." />
                  <th className="num">
                    <span className="th-inner">Stop loss <Hint text="Reference invalidation level to manage risk." /></span>
                  </th>
                  <th className="col-strategy">Backtested Pattern / Analysis</th>
                  <SortHead field="risk_reward_ratio" label="Reward : Risk" className="num" sortBy={sortBy} sortDir={sortDir} onSort={onSort} hint="Estimated upside for every ₹1 of risk." />
                  <th className="col-action" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((sig, idx) => {
                  const isOpen = expanded === sig.symbol;
                  const status = SWING_STATUS[sig.signal_type] || SWING_STATUS.PROJECTED_SETUP;
                  const strat = simplifyTerm(sig.primary_strategy);
                  return (
                    <React.Fragment key={sig.symbol}>
                      <tr className={`row-click ${isOpen ? 'is-open' : ''}`} onClick={() => setExpanded(isOpen ? null : sig.symbol)}>
                        <td className="col-rank">{idx + 1}</td>
                        <td className="col-stock">
                          <div className="stock-cell">
                            <div className="stock-avatar">{sig.symbol.slice(0, 2)}</div>
                            <div>
                              <div className="stock-sym">{sig.symbol}</div>
                              <div className="stock-name" title={sig.name}>{sig.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <ConfidenceMeter score={sig.confidence_score} compact />
                        </td>
                        <td>
                          <Badge tone={status.tone} title={status.help} icon={sig.signal_type === 'CONFIRMED_SIGNAL' ? CheckCircle2 : Eye}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="num">
                          <div className="cell-main">{fmtPrice(sig.suggested_buy_price)}</div>
                          <div className="cell-sub">
                            {sig.buy_date_is_confirmed ? 'From ' : 'Wait till '}
                            {shortDate(sig.suggested_buy_date)}
                          </div>
                        </td>
                        <td className="num">
                          <div className="cell-main text-up">{fmtPrice(sig.target_sell_price)}</div>
                          <div className="cell-sub">
                            <span className="text-up">{fmtPct(sig.expected_gain_pct)}</span> · by {shortDate(sig.estimated_sell_date)}
                          </div>
                        </td>
                        <td className="num">
                          <div className="cell-main text-down">{fmtPrice(sig.stop_loss)}</div>
                          <div className="cell-sub">{fmtPct(-sig.stop_loss_risk_pct)}</div>
                        </td>
                        <td className="col-strategy">
                          <div className="strat-name" title={strat.help}>{strat.label}</div>
                          {sig.detected_patterns?.length > 0 && (
                            <div className="chips">
                              {sig.detected_patterns.slice(0, 2).map((p) => {
                                const t = simplifyTerm(p);
                                return (
                                  <span key={p} className={`chip ${patternIsForming(p) ? 'chip-warn' : ''}`} title={t.help}>
                                    {t.label}
                                  </span>
                                );
                              })}
                              {sig.detected_patterns.length > 2 && <span className="chip chip-more">+{sig.detected_patterns.length - 2}</span>}
                            </div>
                          )}
                        </td>
                        <td className="num">
                          <span className={`rr ${sig.risk_reward_ratio >= 2 ? 'rr-good' : sig.risk_reward_ratio >= 1.5 ? 'rr-ok' : ''}`}>
                            {sig.risk_reward_ratio.toFixed(1)}x
                          </span>
                        </td>
                        <td className="col-action">
                          <span className="row-toggle">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="row-detail">
                          <td colSpan={10}>
                            <div className="detail-grid">
                              <div className="detail-block">
                                <h4>
                                  <TrendingUp size={15} /> Why this stock?
                                </h4>
                                <ul className="tick-list">
                                  {sig.reasoning.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                                {sig.matched_strategies?.length > 0 && (
                                  <div className="chips chips-wrap">
                                    {sig.matched_strategies.map((m) => (
                                      <span key={m} className="chip" title={m}>
                                        {simplifyTerm(m).label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="detail-block">
                                <h4>
                                  <ShieldAlert size={15} /> Plan & risks
                                </h4>
                                <div className="plan-mini">
                                  <div><span>Current price</span><strong>{fmtPrice(sig.current_price)}</strong></div>
                                  <div><span>Expected hold</span><strong>~{sig.estimated_holding_days} trading days</strong></div>
                                  <div><span>Past success rate</span><strong>{sig.historical_strategy_precision_pct}%</strong></div>
                                </div>
                                <p className="detail-note">{sig.buy_price_note}</p>
                                <ul className="warn-list">
                                  {sig.risk_notes.map((rn, i) => (
                                    <li key={i}>{rn}</li>
                                  ))}
                                </ul>
                                <div className="alert alert-info" style={{ marginTop: 10, marginBottom: 12, padding: '9px 12px', fontSize: 12 }}>
                                  <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                                  <span>
                                    <strong>Note:</strong> Please do research once from your side before buying any of
                                    these recommendations. Picked using backtested patterns and chart analysis.
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/screener/analysis?symbol=${sig.symbol}`);
                                    }}
                                  >
                                    Full analysis of {sig.symbol} <ArrowRight size={14} />
                                  </button>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectStockBySymbol(sig.symbol);
                                      navigate('/trade');
                                    }}
                                  >
                                    Practice trade {sig.symbol} <ArrowRight size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
