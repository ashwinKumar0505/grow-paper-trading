import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Layers,
  TrendingUp,
  Clock,
  SearchX,
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
import { HeroChartIllustration } from '../components/Illustrations';
import { loadCachedScan, saveCachedScan, CACHE_KEYS } from '../utils/scanCache';
import { timeAgo, shortDate } from '../utils/format';
import {
  extractSectors,
  filterSwingSignals,
  computeSwingCounts,
} from '../utils/screenerHelpers';

const SCAN_MIN_CONFIDENCE = 50;

export default function SwingScannerPage({ marketStatus }) {
  const { subscriptionTier, planConfig, openUpgradeModal, addToast } = useTrading();
  const [scan, setScan] = useState(() => loadCachedScan(CACHE_KEYS.swing));
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState('scan');
  const [error, setError] = useState('');

  const [minConfidence, setMinConfidence] = useState(60);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('confidence_score');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedSignal, setSelectedSignal] = useState(null);

  const data = scan?.data;

  const runScan = async (forceRefresh) => {
    if (forceRefresh && !planConfig.swingAllowForceRefresh) {
      openUpgradeModal({
        requiredTier: 'advanced',
        featureName: 'Live Market Data Force Refresh',
        featureDescription:
          'Downloading fresh real-time Nifty 500 market prices on-demand is an Advanced Package feature. Free and Beginner plans use cached scanner snapshots.',
      });
      return;
    }
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
      setSelectedSignal(null);
    } catch (err) {
      const msg = err.message || 'Server is down or unreachable. Please try again in some time.';
      setError(msg);
      addToast('Scan Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sectors = useMemo(() => extractSectors(data?.signals), [data]);

  const counts = useMemo(
    () => computeSwingCounts(data?.signals, minConfidence, sectorFilter),
    [data, minConfidence, sectorFilter]
  );

  const rows = useMemo(
    () =>
      filterSwingSignals(data?.signals, {
        minConfidence,
        statusFilter,
        sectorFilter,
        sortBy,
        sortDir,
      }),
    [data, minConfidence, statusFilter, sectorFilter, sortBy, sortDir]
  );

  const onSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const resetFilters = () => {
    setMinConfidence(SCAN_MIN_CONFIDENCE);
    setStatusFilter('ALL');
    setSectorFilter('ALL');
  };

  const readyCount = (data?.signals || []).filter((s) => s.signal_type === 'CONFIRMED_SIGNAL').length;
  const visibleRows = rows.slice(0, planConfig.swingMaxSignals);
  const lockedCount = Math.max(0, rows.length - planConfig.swingMaxSignals);
  const nextTier = subscriptionTier === 'free' ? 'beginner' : 'advanced';
  const nextPlan = SUBSCRIPTION_PLANS[nextTier];

  const stats = data
    ? [
        {
          icon: Layers,
          label: 'Stocks screened',
          value: data.total_scanned,
          sub:
            data.total_scanned < data.total_universe_count
              ? `${data.total_scanned} of ${data.total_universe_count} Nifty 500 (incomplete symbols skipped)`
              : `of ${data.total_universe_count} in Nifty 500`,
          hint:
            data.total_scanned < data.total_universe_count
              ? 'Stocks with insufficient recent price history are excluded from screening.'
              : undefined,
        },
        {
          icon: TrendingUp,
          label: 'Recommendations',
          value: data.bullish_signals_found,
          sub: 'Matched backtested chart patterns',
          tone: 'primary',
        },
        {
          icon: CheckCircle2,
          label: 'Confirmed setups',
          value: readyCount,
          sub: 'All chart conditions aligned',
        },
        {
          icon: Clock,
          label: 'Data as of',
          value: shortDate(data.data_as_of_date),
          sub: scan?.savedAt ? `Screened ${timeAgo(scan.savedAt)}` : 'Latest snapshot',
        },
      ]
    : [];

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow="Multi-Day Setups · Nifty 500"
          title="Swing Recommendations"
          description="Explore AI-powered multi-day trading setups identified through technical analysis, historical patterns, and backtesting."
          methodologyNote="Screens Nifty 500 equities using trend alignment, volume confirmation, and 2-year backtested candlestick & breakout patterns."
          illustration={<HeroChartIllustration />}
          actions={
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => runScan(false)}
                disabled={loading}
                aria-busy={loading && loadingMode === 'scan'}
              >
                {loading && loadingMode === 'scan' ? (
                  <RefreshCw size={15} className="spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>{loading && loadingMode === 'scan' ? 'Screening stocks…' : 'Get recommendations'}</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost-dark btn-sm"
                onClick={() => runScan(true)}
                disabled={loading}
                aria-busy={loading && loadingMode === 'refresh'}
                title="Download latest market prices before scanning"
              >
                {!planConfig.swingAllowForceRefresh ? (
                  <Lock size={14} />
                ) : (
                  <RefreshCw size={14} className={loading && loadingMode === 'refresh' ? 'spin' : ''} />
                )}
                <span>
                  {loading && loadingMode === 'refresh'
                    ? 'Refreshing prices…'
                    : `Refresh data${!planConfig.swingAllowForceRefresh ? ' (Pro)' : ''}`}
                </span>
              </button>
            </>
          }
        />
      }
      statusBar={
        <MarketStatusBadge
          marketStatus={marketStatus}
          lastUpdatedIso={scan?.savedAt}
          extra={
            data ? (
              <span className="sc-freshness-tag">
                Prices as of <strong>{shortDate(data.data_as_of_date)}</strong>
              </span>
            ) : null
          }
        />
      }
      alerts={
        error ? (
          <div className="alert alert-error sc-alert-retry">
            <span>{error}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => runScan(false)}>
              Retry
            </button>
          </div>
        ) : null
      }
      stats={<ScreenerStatsGrid stats={stats} loading={loading && !data} />}
      gate={
        data && !loading && lockedCount > 0 ? (
          <PremiumFeatureGate
            requiredTier={nextTier}
            title="Unlock More Swing Trading Setups"
            description={`Showing ${visibleRows.length} of ${rows.length} matching setups on your ${planConfig.name}. Access additional recommendations, advanced analysis, and premium screening capabilities.`}
            ctaLabel={`Upgrade to ${nextPlan.name.replace(' Package', '')}`}
            benefits={
              nextTier === 'beginner'
                ? [
                    `Top ${nextPlan.swingMaxSignals} Nifty 200 swing setups with entry, target & stop-loss`,
                    'One-click Send Setup to Paper Trading Desk',
                    `${nextPlan.analysisDailyLimit} AI stock analyses/day with financials`,
                  ]
                : [
                    'Full Nifty 500 swing screener (all matching setups)',
                    'On-demand Live Market Data Force Refresh',
                    'Unlimited AI stock analysis & 2-year strategy backtests',
                  ]
            }
          />
        ) : null
      }
    >
      <section className="card sc-results-card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Swing Stock Recommendations</h3>
            <p className="card-sub">
              {data
                ? 'Click any stock to inspect its trade plan, reasoning, and backtested pattern details.'
                : 'Run the screener to view backtested swing setups.'}
            </p>
          </div>
          {data && !loading && <span className="count-pill">{rows.length} setups</span>}
        </header>

        {data && !loading && (
          <SignalFilters
            minConfidence={minConfidence}
            onMinConfidenceChange={setMinConfidence}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusLabel="Setup status"
            statusHint="Confirmed: all technical conditions met. Watchlist: promising pattern awaiting confirmation."
            statusOptions={[
              { value: 'ALL', label: `All (${counts.ALL})` },
              { value: 'CONFIRMED_SIGNAL', label: `Confirmed (${counts.CONFIRMED_SIGNAL})` },
              { value: 'PROJECTED_SETUP', label: `Watchlist (${counts.PROJECTED_SETUP})` },
            ]}
            sectors={sectors}
            sectorFilter={sectorFilter}
            onSectorFilterChange={setSectorFilter}
            minSlider={SCAN_MIN_CONFIDENCE}
          />
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
              <Sparkles size={24} />
            </div>
            <h4>No recommendations loaded yet</h4>
            <p>
              Press “Get recommendations” to screen Nifty 500 stocks using our backtested pattern & chart analysis
              engine.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => runScan(false)}>
              <Sparkles size={16} /> Get recommendations
            </button>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon muted">
              <SearchX size={24} />
            </div>
            <h4>No stocks match these filters</h4>
            <p>Try lowering the minimum confidence or resetting your active filters.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <RecommendationTable
            signals={visibleRows}
            mode="swing"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            selectedSymbol={selectedSignal?.symbol}
            onSelectSignal={setSelectedSignal}
            isRefreshing={loading}
          />
        )}
      </section>

      <StockAnalysisDrawer
        signal={selectedSignal}
        mode="swing"
        asOfLabel={data?.data_as_of_date ? `Prices as of ${shortDate(data.data_as_of_date)}` : undefined}
        onClose={() => setSelectedSignal(null)}
      />
    </ScreenerLayout>
  );
}
