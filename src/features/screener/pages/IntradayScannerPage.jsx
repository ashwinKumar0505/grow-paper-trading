import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Clock,
  Activity,
  Target,
  Layers,
  SearchX,
  Zap,
  Lock,
} from 'lucide-react';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { api } from '../api/client';
import DataLoader from '../components/DataLoader';
import ScreenerLayout from '../components/ScreenerLayout';
import ScreenerHeader from '../components/ScreenerHeader';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { ScreenerStatsGrid } from '../components/ScreenerStatsGrid';
import SignalFilters from '../components/SignalFilters';
import RecommendationTable from '../components/RecommendationTable';
import PremiumFeatureGate from '../components/PremiumFeatureGate';
import StockAnalysisDrawer from '../components/StockAnalysisDrawer';
import { loadCachedScan, saveCachedScan, CACHE_KEYS } from '../utils/scanCache';
import { shortDate } from '../utils/format';
import { INTRADAY_STATUS } from '../utils/terms';
import {
  extractSectors,
  filterIntradaySignals,
  computeIntradayCounts,
} from '../utils/screenerHelpers';

export default function IntradayScannerPage({ marketStatus }) {
  const { planConfig, openUpgradeModal, addToast } = useTrading();
  const [scan, setScan] = useState(() => loadCachedScan(CACHE_KEYS.intraday));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minConfidence, setMinConfidence] = useState(50);
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [now, setNow] = useState(Date.now());
  const loadingRef = useRef(false);

  const isLocked = planConfig.intradayAccess === 'locked';
  const data = isLocked ? null : scan?.data;
  const effectiveMarketStatus = marketStatus || data?.market_status;
  const isMarketOpen = effectiveMarketStatus?.is_market_open ?? false;
  const interval = (effectiveMarketStatus?.intraday_refresh_interval_seconds || 300) * 1000;

  const fetchSignals = async (forceRefresh = false) => {
    if (isLocked) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: '15-Minute Intraday Stock Screener',
        featureDescription:
          'Access intraday trading setups with entry price, target, stop-loss, and signal tracking.',
      });
      return;
    }
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
      const msg = err.message || 'Server is down or unreachable. Please try again in some time.';
      setError(msg);
      addToast('Intraday Scan Failed', msg, 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // First visit with no saved results: load automatically if unlocked.
  useEffect(() => {
    if (!scan && !isLocked) fetchSignals(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  // Live auto-refresh every 5 minutes, only while NSE is open AND user has Advanced plan.
  useEffect(() => {
    if (!isMarketOpen || !planConfig.intradayAutoRefresh) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isMarketOpen, planConfig.intradayAutoRefresh]);

  const lastAt = scan ? new Date(scan.savedAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((lastAt + interval - now) / 1000));

  useEffect(() => {
    if (isMarketOpen && planConfig.intradayAutoRefresh && scan && secondsLeft === 0 && !loadingRef.current) {
      fetchSignals(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarketOpen, planConfig.intradayAutoRefresh, secondsLeft]);

  const sectors = useMemo(() => extractSectors(data?.signals), [data]);

  const counts = useMemo(
    () => computeIntradayCounts(data?.signals, minConfidence, sectorFilter),
    [data, minConfidence, sectorFilter]
  );

  const rows = useMemo(
    () =>
      filterIntradaySignals(data?.signals, {
        minConfidence,
        statusFilter,
        sectorFilter,
      }),
    [data, minConfidence, statusFilter, sectorFilter]
  );

  const resetFilters = () => {
    setMinConfidence(50);
    setStatusFilter('ALL');
    setSectorFilter('ALL');
  };

  const closed = (data?.signals || []).filter((s) => INTRADAY_STATUS[s.signal_status]?.group === 'closed');
  const wins = closed.filter((s) => (s.pnl_pct ?? 0) > 0).length;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const visibleRows = rows.slice(0, planConfig.intradayMaxSignals);
  const lockedCount = Math.max(0, rows.length - planConfig.intradayMaxSignals);
  const { beginner: B, advanced: A } = SUBSCRIPTION_PLANS;

  const stats = data
    ? [
        {
          icon: Layers,
          label: 'Stocks watched',
          value: data.total_scanned,
          sub: 'Top 100 liquid Nifty stocks',
          hint: 'Intraday screening focuses on the 100 most liquid Nifty stocks rather than the full Nifty 500 to ensure tight spreads and reliable 15-minute volume.',
        },
        {
          icon: Activity,
          label: 'Open trades',
          value: data.active_signals_count,
          sub: isMarketOpen ? 'Active in current session' : 'Open at last session close',
          tone: 'primary',
        },
        {
          icon: Target,
          label: 'Closed trades',
          value: data.completed_trades_count,
          sub: closed.length ? `${wins} of ${closed.length} ended in profit` : 'None yet',
        },
        {
          icon: Clock,
          label: 'Trading day',
          value: shortDate(data.session_date),
          sub: isMarketOpen ? 'Live session' : 'Last session (paused)',
        },
      ]
    : [];

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow={`15-Minute Setups · ${planConfig.name}`}
          title="Intraday Signals"
          description="Explore 15-minute chart setups using VWAP, volume trends, and backtested patterns."
          methodologyNote="Scans the 100 most liquid Nifty stocks on 15-minute candles using VWAP breakouts, relative volume surges, and intraday momentum."
          actions={
            !isLocked ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fetchSignals(true)}
                disabled={loading}
                aria-busy={loading}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                <span>
                  {loading
                    ? isMarketOpen
                      ? 'Refreshing signals…'
                      : 'Reloading session…'
                    : isMarketOpen
                    ? 'Refresh now'
                    : 'Reload last session'}
                </span>
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fetchSignals(true)}>
                <Lock size={14} />
                <span>Unlock Intraday</span>
              </button>
            )
          }
        />
      }
      statusBar={
        <MarketStatusBadge
          marketStatus={effectiveMarketStatus}
          lastUpdatedIso={!isLocked ? scan?.savedAt : undefined}
          sessionDateLabel={data?.session_date ? shortDate(data.session_date) : undefined}
          extra={
            <div className="sc-autorefresh-chip">
              {!planConfig.intradayAutoRefresh ? (
                <span>Manual refresh · Auto-refresh on Advanced</span>
              ) : isMarketOpen ? (
                <span className="text-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <PlayCircle size={13} />
                  Auto-refresh in <strong>{mm}:{ss}</strong>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <PauseCircle size={13} />
                  Real-time updates paused
                </span>
              )}
            </div>
          }
        />
      }
      alerts={
        <>
          {error && (
            <div className="alert alert-error sc-alert-retry">
              <span>{error}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fetchSignals(false)}>
                Retry
              </button>
            </div>
          )}
          {data && !isMarketOpen && (
            <div className="alert alert-info">
              <PauseCircle size={16} />
              <span>
                <strong>Market Closed:</strong> Real-time updates are paused. Showing historical signals from the last
                trading session (<strong>{shortDate(data.session_date)}</strong>) — these are not live signals.
              </span>
            </div>
          )}
        </>
      }
      stats={!isLocked ? <ScreenerStatsGrid stats={stats} loading={loading && !data} /> : null}
      gate={
        isLocked ? (
          <PremiumFeatureGate
            requiredTier="beginner"
            title="Unlock Intraday Signals"
            description="Access intraday trading setups with entry price, target, stop-loss, and signal tracking."
            comparisonPlans={[
              {
                tier: 'beginner',
                items: [
                  `Top ${B.intradayMaxSignals} intraday picks per session`,
                  '5x intraday (MIS) paper trading',
                  'Entry, target, stop-loss & status tracking',
                ],
              },
              {
                tier: 'advanced',
                items: [
                  `Up to ${A.intradayMaxSignals} liquid Nifty intraday setups`,
                  '5-minute automatic live refresh',
                  'Advanced filters & one-click intraday trade',
                ],
              },
            ]}
          />
        ) : data && !loading && lockedCount > 0 ? (
          <PremiumFeatureGate
            requiredTier="advanced"
            title={`Unlock ${lockedCount} More Intraday Setups`}
            description={`Your ${planConfig.name} displays the top ${planConfig.intradayMaxSignals} intraday picks per session. Upgrade to Advanced for full scanner access and automatic live refresh.`}
            benefits={[
              `Up to ${A.intradayMaxSignals} liquid Nifty intraday setups per session`,
              '5-minute automatic live refresh during market hours',
              'One-click Paper Trading directly from intraday signals',
            ]}
          />
        ) : null
      }
    >
      {!isLocked && (
        <section className="card sc-results-card">
          <header className="card-head">
            <div>
              <h3 className="card-title">Intraday Stock Recommendations</h3>
              <p className="card-sub">
                {isMarketOpen
                  ? 'Live 15-minute setups. Click any stock to view its trade plan and reasoning.'
                  : 'Last session 15-minute setups. Click any stock to inspect its levels and outcome.'}
              </p>
            </div>
            {data && <span className="count-pill">{rows.length} signals</span>}
          </header>

          {data && (
            <SignalFilters
              minConfidence={minConfidence}
              onMinConfidenceChange={setMinConfidence}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusLabel="Signal status"
              statusHint="Open: trade still active. Closed: target, stop-loss, or 3:20 PM exit completed."
              statusOptions={[
                { value: 'ALL', label: `All (${counts.ALL})` },
                { value: 'OPEN', label: `Open (${counts.OPEN})` },
                { value: 'CLOSED', label: `Closed (${counts.CLOSED})` },
                { value: 'TARGET', label: `Target Hit (${counts.TARGET})` },
              ]}
              sectors={sectors}
              sectorFilter={sectorFilter}
              onSectorFilterChange={setSectorFilter}
              minSlider={50}
            />
          )}

          {loading ? (
            <DataLoader
              title={isMarketOpen ? 'Refreshing intraday signals…' : 'Reloading last trading session…'}
              subtitle="Checking 15-minute price movements across the 100 most liquid Nifty stocks."
              stages={[
                'Loading 15-minute prices',
                'Calculating the day’s average traded price',
                'Spotting breakouts with high volume',
                'Tracking open trades and exits',
              ]}
            />
          ) : !data ? (
            <div className="empty">
              <div className="empty-icon">
                <Zap size={24} />
              </div>
              <h4>No intraday data loaded</h4>
              <p>Press “Reload last session” to load intraday setups.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fetchSignals(false)}>
                Reload last session
              </button>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="empty">
              <div className="empty-icon muted">
                <SearchX size={24} />
              </div>
              <h4>No trades match these filters</h4>
              <p>Try lowering the minimum confidence or resetting your active filters.</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <RecommendationTable
              signals={visibleRows}
              mode="intraday"
              selectedSymbol={selectedSignal?.symbol}
              onSelectSignal={setSelectedSignal}
              isRefreshing={loading}
            />
          )}
        </section>
      )}

      <StockAnalysisDrawer
        signal={selectedSignal}
        mode="intraday"
        asOfLabel={
          data?.session_date
            ? `${isMarketOpen ? 'Live session' : 'Last session'}: ${shortDate(data.session_date)}`
            : undefined
        }
        onClose={() => setSelectedSignal(null)}
      />
    </ScreenerLayout>
  );
}
