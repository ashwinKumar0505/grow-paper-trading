import {
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { HeroChartIllustration } from '../components/Illustrations';
import MarketStatusBadge from '../components/MarketStatusBadge';
import PremiumFeatureGate from '../components/PremiumFeatureGate';
import ScreenerHeader from '../components/ScreenerHeader';
import ScreenerLayout from '../components/ScreenerLayout';
import { ScreenerStatsGrid } from '../components/ScreenerStatsGrid';
import StockAnalysisDrawer from '../components/StockAnalysisDrawer';
import { SwingResultsSection } from '../components/SwingResultsSection';
import { shortDate } from '../utils/format';
import { useSwingScanner } from '../hooks/useSwingScanner';

export default function SwingScannerPage({ marketStatus }) {
  const model = useSwingScanner();
  const {
    planConfig,
    scan,
    loading,
    loadingMode,
    error,
    minConfidence,
    setMinConfidence,
    statusFilter,
    setStatusFilter,
    sectorFilter,
    setSectorFilter,
    sortBy,
    sortDir,
    selectedSignal,
    setSelectedSignal,
    data,
    runScan,
    sectors,
    counts,
    rows,
    onSort,
    resetFilters,
    visibleRows,
    lockedCount,
    nextTier,
    nextPlan,
    stats,
  } = model;

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow="Multi-Day Setups · Nifty 500"
          title="Swing Technical Screener"
          description="Explore rule-based multi-day technical setups identified through chart patterns, quantitative indicators, and historical backtesting."
          methodologyNote="Screens Nifty 500 equities using trend alignment, volume confirmation, and 2-year backtested candlestick & breakout patterns."
          illustration={<HeroChartIllustration />}
          actions={
            <>
              <Button
                variant="unstyled"
                size="unstyled"
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
                <span>{loading && loadingMode === 'scan' ? 'Screening stocks…' : 'Scan Nifty 500'}</span>
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
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
              </Button>
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
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => runScan(false)}
            >
              Retry
            </Button>
          </div>
        ) : null
      }
      stats={<ScreenerStatsGrid stats={stats} loading={loading && !data} />}
      gate={
        lockedCount > 0 && nextTier ? (
          <PremiumFeatureGate
            requiredTier={nextTier}
            title={`Unlock ${lockedCount} More Swing Setups`}
            description={`Your ${planConfig.name} shows the top ${planConfig.swingMaxSignals} swing setups per scan. Upgrade to ${nextPlan.name} for ${
              nextTier === 'advanced' ? 'unlimited Nifty 500 setups' : `up to ${nextPlan.swingMaxSignals} setups`
            } and force live market refresh.`}
            benefits={
              nextTier === 'beginner'
                ? [
                    `Up to ${nextPlan.swingMaxSignals} swing setups per scan (vs ${planConfig.swingMaxSignals} today)`,
                    '5x intraday paper trading & ₹10,00,000 capital',
                    'Interactive chart pattern quiz practice',
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
      <SwingResultsSection
        data={data}
        loading={loading}
        loadingMode={loadingMode}
        rows={rows}
        visibleRows={visibleRows}
        minConfidence={minConfidence}
        setMinConfidence={setMinConfidence}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        counts={counts}
        sectors={sectors}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        runScan={runScan}
        resetFilters={resetFilters}
        selectedSignal={selectedSignal}
        setSelectedSignal={setSelectedSignal}
      />

      <StockAnalysisDrawer
        signal={selectedSignal}
        mode="swing"
        asOfLabel={data?.data_as_of_date ? `Prices as of ${shortDate(data.data_as_of_date)}` : undefined}
        onClose={() => setSelectedSignal(null)}
      />
    </ScreenerLayout>
  );
}
