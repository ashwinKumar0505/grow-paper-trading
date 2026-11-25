import {
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { api } from '../api/client';
import { shortDate, timeAgo } from '../utils/format';
import { CACHE_KEYS, CACHE_TTL_MS, loadCachedScan, saveCachedScan } from '../utils/scanCache';
import {
  computeSwingCounts,
  extractSectors,
  filterSwingSignals,
} from '../utils/screenerHelpers';
import { hasDifferentActionableSession, SWING_EOD_TOOLTIP } from '../utils/signalPresentation';

const SCAN_MIN_CONFIDENCE = 50;

export function useSwingScanner() {
  const { subscriptionTier, planConfig, openUpgradeModal, addToast } = useTrading();
  const [scan, setScan] = useState(() => loadCachedScan(CACHE_KEYS.swing, CACHE_TTL_MS.swing));
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState('scan');
  const [error, setError] = useState('');

  const [minConfidence, setMinConfidence] = useState(60);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('confidence_score');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedSignal, setSelectedSignal] = useState(null);
  const autoLoadedRef = useRef(false);

  const data = scan?.data;
  const staleWarning = scan?.staleWarning || '';

  const runScan = async (forceRefresh) => {
    if (forceRefresh && !planConfig.swingAllowForceRefresh) {
      openUpgradeModal({
        requiredTier: 'advanced',
        featureName: 'On-Demand Screener Data Force Refresh',
        featureDescription:
          'Requesting an immediate upstream market-data refresh before scanning is an Advanced Package feature. Free and Beginner plans scan the latest backend snapshot.',
      });
      return;
    }
    setLoading(true);
    setLoadingMode(forceRefresh ? 'refresh' : 'scan');
    setError('');
    try {
      const universeLimit =
        subscriptionTier === 'advanced' ? 500 : subscriptionTier === 'beginner' ? 200 : 100;
      const res = await api.runSwingScanner({
        universeLimit,
        minConfidence: SCAN_MIN_CONFIDENCE,
        signalType: 'ALL',
        forceRefresh,
      });
      setScan(saveCachedScan(CACHE_KEYS.swing, res, CACHE_TTL_MS.swing));
      setSelectedSignal(null);
    } catch (err) {
      const msg =
        err.message ||
        'Screener analytics service is currently unreachable. Please retry when the service is online.';
      setError(msg);
      const cached = loadCachedScan(CACHE_KEYS.swing, CACHE_TTL_MS.swing);
      if (cached) {
        setScan({
          ...cached,
          isStale: true,
          staleWarning: `Live scan failed (${msg}). Displaying previously fetched snapshot from ${new Date(
            cached.savedAt
          ).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`,
        });
      }
      addToast('Scan Unavailable', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scan && !autoLoadedRef.current) {
      autoLoadedRef.current = true;
      runScan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            data.total_universe_count && data.total_scanned !== data.total_universe_count
              ? `${data.total_scanned} of ${data.total_universe_count} constituent symbols evaluated`
              : `${data.total_scanned} constituent symbols evaluated`,
          hint:
            'Reflects the exact number of symbols with sufficient valid daily OHLCV bars evaluated in this scan run.',
        },
        {
          icon: TrendingUp,
          label: 'Rule-Based Setups',
          value: data.bullish_signals_found,
          sub: 'Matched technical strategy rules',
          tone: 'primary',
        },
        {
          icon: CheckCircle2,
          label: 'Confirmed setups',
          value: readyCount,
          sub: 'All rule conditions aligned',
        },
        {
          icon: Clock,
          label: 'Data as of',
          value: shortDate(data.data_as_of_date),
          sub: hasDifferentActionableSession(data.data_as_of_date, data.actionable_session_date)
            ? `Valid for ${shortDate(data.actionable_session_date)} session`
            : scan?.savedAt
              ? `${scan.isStale ? 'Stale snapshot · ' : ''}Screened ${timeAgo(scan.savedAt)}`
              : 'Latest snapshot',
          hint: SWING_EOD_TOOLTIP,
          hintAlign: 'right',
        },
      ]
    : [];

  return {
    planConfig,
    scan,
    staleWarning,
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
  };
}
