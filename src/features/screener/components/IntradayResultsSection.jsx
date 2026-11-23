import React from 'react';
import { SearchX, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import DataLoader from './DataLoader';
import RecommendationTable from './RecommendationTable';
import SignalFilters from './SignalFilters';

export function IntradayResultsSection({
  isMarketOpen,
  data,
  rows,
  visibleRows,
  loading,
  minConfidence,
  setMinConfidence,
  statusFilter,
  setStatusFilter,
  counts,
  sectors,
  sectorFilter,
  setSectorFilter,
  fetchSignals,
  resetFilters,
  selectedSignal,
  setSelectedSignal,
}) {
  return (
    <section className="card sc-results-card">
      <header className="card-head">
        <div>
          <h3 className="card-title">Intraday Technical Setups</h3>
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
          <Button variant="unstyled" size="unstyled" type="button" className="btn btn-primary btn-sm" onClick={() => fetchSignals(false)}>
            Reload last session
          </Button>
        </div>
      ) : visibleRows.length === 0 ? (
        statusFilter === 'OPEN' && counts.ALL > 0 ? (
          <div className="empty">
            <div className="empty-icon muted">
              <Zap size={24} />
            </div>
            <h4>No active setups right now</h4>
            <p>
              All {counts.ALL} {counts.ALL === 1 ? 'setup' : 'setups'} from earlier in this session{' '}
              {counts.ALL === 1 ? 'has' : 'have'} already closed.
            </p>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStatusFilter('ALL')}
            >
              No active setups right now — View {counts.ALL} earlier session{' '}
              {counts.ALL === 1 ? 'outcome' : 'outcomes'}
            </Button>
          </div>
        ) : (data?.signals?.length || 0) === 0 ? (
          <div className="empty">
            <div className="empty-icon muted">
              <Zap size={24} />
            </div>
            <h4>No active setups right now</h4>
            <p>
              {isMarketOpen
                ? 'No 15-minute setups have triggered yet in today’s session.'
                : 'No 15-minute setups were recorded in the last trading session.'}
            </p>
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon muted">
              <SearchX size={24} />
            </div>
            <h4>No trades match these filters</h4>
            <p>Try lowering the minimum confidence or resetting your active filters.</p>
            <Button variant="unstyled" size="unstyled" type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        )
      ) : (
        <>
          <p className="sc-table-caption">
            {isMarketOpen
              ? 'Tracks all 15-min setups triggered since 9:15 AM today. Use Open for active setups or Closed for earlier session outcomes.'
              : 'Tracks all 15-min setups from the last trading session. Use Open for unclosed setups or Closed for earlier session outcomes.'}
          </p>
          <RecommendationTable
            signals={visibleRows}
            mode="intraday"
            selectedSymbol={selectedSignal?.symbol}
            onSelectSignal={setSelectedSignal}
            isRefreshing={loading}
            muteCompleted={statusFilter === 'ALL' || statusFilter === 'CLOSED'}
          />
        </>
      )}
    </section>
  );
}
