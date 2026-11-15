import React from 'react';
import { SearchX, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import DataLoader from './DataLoader';
import RecommendationTable from './RecommendationTable';
import SignalFilters from './SignalFilters';

const SCAN_MIN_CONFIDENCE = 50;

export function SwingResultsSection({
  data,
  loading,
  loadingMode,
  rows,
  visibleRows,
  minConfidence,
  setMinConfidence,
  statusFilter,
  setStatusFilter,
  counts,
  sectors,
  sectorFilter,
  setSectorFilter,
  sortBy,
  sortDir,
  onSort,
  runScan,
  resetFilters,
  selectedSignal,
  setSelectedSignal,
}) {
  return (
    <section className="card sc-results-card">
      <header className="card-head">
        <div>
          <h3 className="card-title">Swing Technical Setups</h3>
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
            'Scoring each setup’s technical confluence',
            'Calculating pivot, resistance and risk levels',
          ]}
        />
      ) : !data ? (
        <div className="empty">
          <div className="empty-icon">
            <Sparkles size={24} />
          </div>
          <h4>No technical setups loaded yet</h4>
          <p>
            Press “Scan Nifty 500” to screen stocks using our backtested pattern & chart analysis
            engine.
          </p>
          <Button variant="unstyled" size="unstyled" type="button" className="btn btn-primary" onClick={() => runScan(false)}>
            <Sparkles size={16} /> Scan Nifty 500
          </Button>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="empty">
          <div className="empty-icon muted">
            <SearchX size={24} />
          </div>
          <h4>No stocks match these filters</h4>
          <p>Try lowering the minimum confidence or resetting your active filters.</p>
          <Button variant="unstyled" size="unstyled" type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
            Reset filters
          </Button>
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
  );
}
