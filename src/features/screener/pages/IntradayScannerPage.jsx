import {
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { IntradayScannerGates } from '../components/IntradayScannerGates';
import ScreenerHeader from '../components/ScreenerHeader';
import ScreenerLayout from '../components/ScreenerLayout';
import { ScreenerStatsGrid } from '../components/ScreenerStatsGrid';
import StockAnalysisDrawer from '../components/StockAnalysisDrawer';
import { IntradayResultsSection } from '../components/IntradayResultsSection';
import { shortDate } from '../utils/format';
import { useIntradayScanner } from '../hooks/useIntradayScanner';

export default function IntradayScannerPage({ marketStatus }) {
  const model = useIntradayScanner(marketStatus);
  const {
    planConfig,
    scan,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    minConfidence,
    setMinConfidence,
    sectorFilter,
    setSectorFilter,
    selectedSignal,
    setSelectedSignal,
    isLocked,
    data,
    effectiveMarketStatus,
    isMarketOpen,
    fetchSignals,
    sectors,
    counts,
    rows,
    resetFilters,
    mm,
    ss,
    visibleRows,
    lockedCount,
    B,
    A,
    stats,
  } = model;

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
              <Button
                variant="unstyled"
                size="unstyled"
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
              </Button>
            ) : (
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fetchSignals(true)}
              >
                <Lock size={14} />
                <span>Unlock Intraday</span>
              </Button>
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
                <span className="text-up inline-flex items-center gap-1.25">
                  <PlayCircle size={13} />
                  Auto-refresh in <strong>{mm}:{ss}</strong>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.25">
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
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fetchSignals(false)}
              >
                Retry
              </Button>
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
        <IntradayScannerGates
          isLocked={isLocked}
          data={data}
          loading={loading}
          lockedCount={lockedCount}
          planConfig={planConfig}
          B={B}
          A={A}
        />
      }
    >
      {!isLocked && (
        <IntradayResultsSection
          isMarketOpen={isMarketOpen}
          data={data}
          rows={rows}
          visibleRows={visibleRows}
          loading={loading}
          minConfidence={minConfidence}
          setMinConfidence={setMinConfidence}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          counts={counts}
          sectors={sectors}
          sectorFilter={sectorFilter}
          setSectorFilter={setSectorFilter}
          fetchSignals={fetchSignals}
          resetFilters={resetFilters}
          selectedSignal={selectedSignal}
          setSelectedSignal={setSelectedSignal}
        />
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
