import React, { useState, useEffect, useMemo, useRef } from 'react';
import { navigate } from '../../../lib/navigation';
import {
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  Activity,
  Target,
  Layers,
  ArrowUpRight,
  SearchX,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import DataLoader from '../components/DataLoader';
import { Badge, ConfidenceMeter, Segmented, Hint, StatCard } from '../components/ui';
import { loadCachedScan, saveCachedScan, CACHE_KEYS } from '../utils/scanCache';
import { fmtPrice, fmtPct, fmtDateTime, timeAgo, shortTime, shortDate } from '../utils/format';
import { simplifyTerm, INTRADAY_STATUS } from '../utils/terms';

const STATUS_ICON = {
  positive: CheckCircle2,
  negative: XCircle,
  warning: Timer,
  info: Zap,
  neutral: Clock,
};

export default function IntradayScannerPage({ marketStatus }) {
  const [scan, setScan] = useState(() => loadCachedScan(CACHE_KEYS.intraday));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minConfidence, setMinConfidence] = useState(50);
  const [now, setNow] = useState(Date.now());
  const loadingRef = useRef(false);

  const data = scan?.data;
  const isMarketOpen = marketStatus?.is_market_open ?? data?.market_status?.is_market_open ?? false;
  const interval = (marketStatus?.intraday_refresh_interval_seconds || 300) * 1000;

  const fetchSignals = async (forceRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await api.runIntradayScanner({
        universeLimit: 100,
        forceRefresh: isMarketOpen ? forceRefresh : false,
        includeLastSession: true,
      });
      setScan(saveCachedScan(CACHE_KEYS.intraday, res));
    } catch (err) {
      setError(err.message || 'Could not load intraday picks. Please try again.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // First visit with no saved results: load automatically.
  useEffect(() => {
    if (!scan) fetchSignals(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live auto-refresh every 5 minutes, only while NSE is open.
  useEffect(() => {
    if (!isMarketOpen) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isMarketOpen]);

  const lastAt = scan ? new Date(scan.savedAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((lastAt + interval - now) / 1000));

  useEffect(() => {
    if (isMarketOpen && scan && secondsLeft === 0 && !loadingRef.current) fetchSignals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarketOpen, secondsLeft]);

  const counts = useMemo(() => {
    const list = (data?.signals || []).filter((s) => s.confidence_score >= minConfidence);
    const grp = (s) => INTRADAY_STATUS[s.signal_status]?.group;
    return {
      ALL: list.length,
      OPEN: list.filter((s) => grp(s) === 'open').length,
      CLOSED: list.filter((s) => grp(s) === 'closed').length,
      TARGET: list.filter((s) => s.signal_status === 'COMPLETED_TARGET_HIT').length,
    };
  }, [data, minConfidence]);

  const rows = useMemo(() => {
    if (!data?.signals) return [];
    let list = data.signals.filter((s) => s.confidence_score >= minConfidence);
    if (statusFilter === 'OPEN') list = list.filter((s) => INTRADAY_STATUS[s.signal_status]?.group === 'open');
    if (statusFilter === 'CLOSED') list = list.filter((s) => INTRADAY_STATUS[s.signal_status]?.group === 'closed');
    if (statusFilter === 'TARGET') list = list.filter((s) => s.signal_status === 'COMPLETED_TARGET_HIT');
    return [...list].sort((a, b) => b.confidence_score - a.confidence_score);
  }, [data, statusFilter, minConfidence]);

  const closed = (data?.signals || []).filter((s) => INTRADAY_STATUS[s.signal_status]?.group === 'closed');
  const wins = closed.filter((s) => (s.pnl_pct ?? 0) > 0).length;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="page">
      <section className="hero hero-compact">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className={`eyebrow-dot ${isMarketOpen ? 'live' : 'off'}`} /> 15-Minute Chart Analysis & Backtested Setups
          </span>
          <h2>Intraday stock recommendations for today’s session.</h2>
          <p>
            We screen the 100 most-traded Nifty stocks on 15-minute charts using backtested intraday patterns, VWAP
            trend analysis, and volume breakouts to pick the best stock recommendations — refreshing automatically every
            5 minutes during market hours.
          </p>
          <div className="hero-actions">
            <div className={`live-pill ${isMarketOpen ? 'on' : ''}`}>
              {isMarketOpen ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
              {isMarketOpen ? (
                <span>
                  Live · next update in <strong>{mm}:{ss}</strong>
                </span>
              ) : (
                <span>Paused · market closed (opens 9:15 AM, Mon–Fri)</span>
              )}
            </div>
            <button className="btn btn-ghost-dark" onClick={() => fetchSignals(true)} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              {isMarketOpen ? 'Refresh now' : 'Reload last session'}
            </button>
          </div>
          <div className="hero-meta">
            <Clock size={13} />
            {scan ? (
              <span>
                Last screened <strong>{fmtDateTime(scan.savedAt)}</strong> · {timeAgo(scan.savedAt)}
              </span>
            ) : (
              <span>Loading first scan…</span>
            )}
          </div>
        </div>
      </section>

      <div className="alert alert-info" style={{ alignItems: 'flex-start' }}>
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Research Disclaimer:</strong> Please do research once from your side before buying or acting on any of
          these intraday stock recommendations. Recommendations are generated using 15-minute chart analysis and
          backtested patterns, not a forced buy call.
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {data && !isMarketOpen && (
        <div className="alert alert-info">
          <PauseCircle size={16} />
          <span>
            The market is closed. Showing picks and results from the last trading day (
            <strong>{shortDate(data.session_date)}</strong>).
          </span>
        </div>
      )}

      {data && (
        <div className="stat-grid four">
          <StatCard icon={Layers} label="Stocks watched" value={data.total_scanned} sub="Most-traded Nifty stocks" />
          <StatCard icon={Activity} label="Open trades" value={data.active_signals_count} sub="Waiting to hit target or stop loss" tone="primary" />
          <StatCard icon={Target} label="Closed trades" value={data.completed_trades_count} sub={closed.length ? `${wins} of ${closed.length} ended in profit` : 'None yet'} />
          <StatCard icon={Clock} label="Trading day" value={shortDate(data.session_date)} sub={isMarketOpen ? 'Live session' : 'Last session'} />
        </div>
      )}

      <section className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Intraday stock recommendations</h3>
            <p className="card-sub">
              Picked via 15-minute chart analysis and backtested breakout patterns. Please do research once from your
              side before buying any recommendation.
            </p>
          </div>
          {data && <span className="count-pill">{rows.length} recommendations</span>}
        </header>

        {data && (
          <div className="filters">
            <div className="filter">
              <label className="filter-label">
                Minimum confidence <Hint text="How strongly the signals agree, from 0 to 100." />
              </label>
              <div className="range-row">
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  style={{ '--fill': `${((minConfidence - 50) / 45) * 100}%` }}
                />
                <span className="range-value">{minConfidence}+</span>
              </div>
            </div>
            <div className="filter">
              <label className="filter-label">
                Signal status <Hint text="Open: trade still running. Closed: target, stop loss or 3:20 PM exit already happened." />
              </label>
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: `All (${counts.ALL})` },
                  { value: 'OPEN', label: `Open (${counts.OPEN})` },
                  { value: 'CLOSED', label: `Closed (${counts.CLOSED})` },
                  { value: 'TARGET', label: `Target reached (${counts.TARGET})` },
                ]}
              />
            </div>
          </div>
        )}

        {loading && !data ? (
          <DataLoader
            title="Finding intraday trades…"
            subtitle="Checking 15-minute price movements across the most-traded stocks."
            stages={[
              'Loading 15-minute prices',
              'Calculating the day’s average traded price',
              'Spotting breakouts with high volume',
              'Tracking open trades and exits',
            ]}
          />
        ) : !data ? (
          <div className="empty">
            <div className="empty-icon"><Zap size={26} /></div>
            <h4>No intraday data yet</h4>
            <p>Press “Reload last session” to load picks.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon muted"><SearchX size={26} /></div>
            <h4>No trades match these filters</h4>
            <p>Try lowering the minimum confidence or choosing “All”.</p>
          </div>
        ) : (
          <div className={`table-wrap ${loading ? 'is-refreshing' : ''}`}>
            <table className="dtable">
              <thead>
                <tr>
                  <th className="col-stock">Stock</th>
                  <th>Confidence</th>
                  <th className="num">Recommended Entry</th>
                  <th className="num">
                    <span className="th-inner">Target <Hint text="Estimated target level and approximate time." /></span>
                  </th>
                  <th className="num">
                    <span className="th-inner">Stop loss <Hint text="Reference invalidation level to manage risk." /></span>
                  </th>
                  <th className="col-strategy">Backtested Pattern / Analysis</th>
                  <th className="num">
                    <span className="th-inner">Reward : Risk <Hint text="Possible gain for every ₹1 you risk." /></span>
                  </th>
                  <th>Status</th>
                  <th className="col-action" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((sig) => {
                  const st = INTRADAY_STATUS[sig.signal_status] || { label: sig.status_badge_text, tone: 'neutral' };
                  const strat = simplifyTerm(sig.strategy_name);
                  const isClosed = st.group === 'closed';
                  return (
                    <tr key={sig.id}>
                      <td className="col-stock">
                        <div className="stock-cell">
                          <div className="stock-avatar">{sig.symbol.slice(0, 2)}</div>
                          <div>
                            <div className="stock-sym">{sig.symbol}</div>
                            <div className="stock-name" title={sig.name}>{sig.name}</div>
                          </div>
                        </div>
                      </td>
                      <td><ConfidenceMeter score={sig.confidence_score} compact /></td>
                      <td className="num">
                        <div className="cell-main">{fmtPrice(sig.entry_price)}</div>
                        <div className="cell-sub">at {shortTime(sig.entry_time_ist)}</div>
                      </td>
                      <td className="num">
                        <div className="cell-main text-up">{fmtPrice(sig.target_exit_price)}</div>
                        <div className="cell-sub">
                          {isClosed && sig.actual_exit_price != null
                            ? `Sold ${fmtPrice(sig.actual_exit_price)} at ${shortTime(sig.actual_exit_time_ist)}`
                            : `by ~${shortTime(sig.estimated_exit_time_ist)}`}
                        </div>
                      </td>
                      <td className="num">
                        <div className="cell-main text-down">{fmtPrice(sig.stop_loss)}</div>
                        <div className="cell-sub">{fmtPct(((sig.stop_loss - sig.entry_price) / sig.entry_price) * 100, 2)}</div>
                      </td>
                      <td className="col-strategy">
                        <div className="strat-name" title={strat.help}>{strat.label}</div>
                        <div className="strat-reason" title={sig.reasoning}>{sig.reasoning}</div>
                      </td>
                      <td className="num">
                        <span className={`rr ${sig.risk_reward_ratio >= 2 ? 'rr-good' : sig.risk_reward_ratio >= 1.5 ? 'rr-ok' : ''}`}>
                          {sig.risk_reward_ratio.toFixed(1)}x
                        </span>
                      </td>
                      <td>
                        <div className="result-cell">
                          <Badge tone={st.tone} icon={STATUS_ICON[st.tone]}>{st.label}</Badge>
                          {sig.pnl_pct != null && (
                            <span className={`pnl ${sig.pnl_pct >= 0 ? 'text-up' : 'text-down'}`}>
                              {sig.pnl_pct >= 0 ? 'Profit ' : 'Loss '}
                              {fmtPct(sig.pnl_pct, 2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="col-action">
                        <button
                          className="icon-btn"
                          title={`Analyse ${sig.symbol}`}
                          onClick={() => navigate(`/screener/analysis?symbol=${sig.symbol}`)}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </td>
                    </tr>
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
