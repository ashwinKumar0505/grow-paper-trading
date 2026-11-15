import {
CheckCircle2,
Clock,
Layers,
TrendingUp
} from 'lucide-react';
import { useMemo,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { api } from '../api/client';
import { shortDate,timeAgo } from '../utils/format';
import { CACHE_KEYS,loadCachedScan,saveCachedScan } from '../utils/scanCache';
import {
computeSwingCounts,
extractSectors,
filterSwingSignals,
} from '../utils/screenerHelpers';

const SCAN_MIN_CONFIDENCE = 50;

export function useSwingScanner() {
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
          label: 'Technical Setups',
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

  return { planConfig, scan, loading, loadingMode, error, minConfidence, setMinConfidence, statusFilter, setStatusFilter, sectorFilter, setSectorFilter, sortBy, sortDir, selectedSignal, setSelectedSignal, data, runScan, sectors, counts, rows, onSort, resetFilters, visibleRows, lockedCount, nextTier, nextPlan, stats };
}
