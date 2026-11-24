import { Lock, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { HeroChartIllustration } from '../components/Illustrations';
import MarketStatusBadge from '../components/MarketStatusBadge';
import PremiumFeatureGate from '../components/PremiumFeatureGate';
import ScreenerHeader from '../components/ScreenerHeader';
import ScreenerLayout from '../components/ScreenerLayout';
import { ScreenerStatsGrid } from '../components/ScreenerStatsGrid';
import StockAnalysisDrawer from '../components/StockAnalysisDrawer';
import { SwingResultsSection } from '../components/SwingResultsSection';
import { Hint } from '../components/ui';
import { shortDate } from '../utils/format';
import { hasDifferentActionableSession, SWING_EOD_TOOLTIP } from '../utils/signalPresentation';
import { useSwingScanner } from '../hooks/useSwingScanner';

export default function SwingScannerPage({ marketStatus }) {
  const model = useSwingScanner();
  const {
    planConfig, scan, loading, loadingMode, error, minConfidence, setMinConfidence,
    statusFilter, setStatusFilter, sectorFilter, setSectorFilter, sortBy, sortDir,
    selectedSignal, setSelectedSignal, data, runScan, sectors, counts, rows,
    onSort, resetFilters, visibleRows, lockedCount, nextTier, nextPlan, stats,
  } = model;

  const hasActionableSession = hasDifferentActionableSession(
    data?.data_as_of_date,
    data?.actionable_session_date
  );
  const asOfShort = data?.data_as_of_date ? shortDate(data.data_as_of_date) : '';
  const actionableShort = hasActionableSession ? shortDate(data?.actionable_session_date) : '';

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow="Multi-Day Setups · Nifty 500"
          title="Swing Technical Screener"
          description="Explore rule-based multi-day technical setups identified through chart patterns, quantitative indicators, and historical backtesting with AI Powered."
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
          contextNote={
            hasActionableSession ? (
              <>
                EOD signals from <strong>{asOfShort}</strong> · Valid for{' '}
                <strong>{actionableShort}</strong> session
              </>
            ) : null
          }
          extra={
            data ? (
              <span className="sc-freshness-tag sc-freshness-with-hint">
                <span>
                  Prices as of <strong>{asOfShort}</strong>
                </span>
                <Hint text={SWING_EOD_TOOLTIP} align="right" />
              </span>
            ) : null
          }
        />
      }
      alerts={
        <>
          {error && (
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
          )}
          {model.staleWarning && !error && (
            <div className="alert alert-info sc-alert-retry">
              <span>{model.staleWarning}</span>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => runScan(false)}
              >
                Refresh Scan
              </Button>
            </div>
          )}
        </>
      }
      stats={<ScreenerStatsGrid stats={stats} loading={loading && !data} />}
      gate={
        lockedCount > 0 && nextTier ? (
          <PremiumFeatureGate
            requiredTier={nextTier}
            title={`Unlock ${lockedCount} More Swing Setups`}
            description={`Your ${planConfig.name} shows the top ${planConfig.swingMaxSignals} swing setups per scan. Upgrade to ${nextPlan.name} for ${
              nextTier === 'advanced' ? 'all matching Nifty 500 setups' : `up to ${nextPlan.swingMaxSignals} setups`
            } and force market data refresh.`}
            benefits={
              nextTier === 'beginner'
                ? [
                    `Up to ${nextPlan.swingMaxSignals} swing setups per scan (vs ${planConfig.swingMaxSignals} today)`,
                    '5x intraday paper trading & ₹10,00,000 capital',
                    'Interactive chart pattern quiz practice',
                  ]
                : [
                    'Full Nifty 500 swing screener (all matching setups)',
                    'On-demand Market Data Force Refresh',
                    'Unlimited rule-based stock analysis & 2-year strategy backtests',
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
        asOfLabel={
          asOfShort
            ? hasActionableSession
              ? `EOD close ${asOfShort} · Valid for ${actionableShort} session`
              : `Prices as of ${asOfShort}`
            : undefined
        }
        onClose={() => setSelectedSignal(null)}
      />
    </ScreenerLayout>
  );
}
