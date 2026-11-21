import { Activity, Clock, Layers, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { api } from '../api/client';
import { shortDate, timeAgo } from '../utils/format';
import { CACHE_KEYS, CACHE_TTL_MS, loadCachedScan, saveCachedScan } from '../utils/scanCache';
import {
  computeIntradayCounts,
  extractSectors,
  filterIntradaySignals,
} from '../utils/screenerHelpers';
import { INTRADAY_STATUS } from '../utils/terms';

export function useIntradayScanner(marketStatus) {
  const { planConfig, openUpgradeModal, addToast } = useTrading();
  const [scan, setScan] = useState(() => loadCachedScan(CACHE_KEYS.intraday, CACHE_TTL_MS.intraday));
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
  const staleWarning = !isLocked ? scan?.staleWarning || '' : '';
  const effectiveMarketStatus = marketStatus || data?.market_status;
  const isMarketOpen = effectiveMarketStatus?.is_market_open ?? false;
  const interval = (effectiveMarketStatus?.intraday_refresh_interval_seconds || 300) * 1000;

  const fetchSignals = async (forceRefresh = false) => {
    if (isLocked) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: '15-Minute Intraday Stock Screener',
        featureDescription:
          'Access rule-based 15-minute intraday setups with reference entry price, target, stop-loss, and session status tracking.',
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
      setScan(saveCachedScan(CACHE_KEYS.intraday, res, CACHE_TTL_MS.intraday));
    } catch (err) {
      const msg =
        err.message ||
        'Intraday screener service is currently unreachable. Please retry when the service is online.';
      setError(msg);
      const cached = loadCachedScan(CACHE_KEYS.intraday, CACHE_TTL_MS.intraday);
      if (cached) {
        setScan({
          ...cached,
          isStale: true,
          staleWarning: `Live intraday refresh failed (${msg}). Showing previously fetched snapshot from ${new Date(
            cached.savedAt
          ).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`,
        });
      }
      addToast('Intraday Scan Unavailable', msg, 'error');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scan && !isLocked) fetchSignals(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

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
    () => filterIntradaySignals(data?.signals, { minConfidence, statusFilter, sectorFilter }),
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
          label: 'Stocks scanned',
          value: data.total_scanned,
          sub: `${data.total_scanned} liquid NSE symbols evaluated`,
          hint: 'Reflects the actual number of symbols evaluated on 15-minute bars during this scan run.',
        },
        {
          icon: Activity,
          label: 'Open setups',
          value: data.active_signals_count,
          sub: isMarketOpen ? 'Active in current session' : 'Open at last session close',
          tone: 'primary',
        },
        {
          icon: Target,
          label: 'Modelled outcomes',
          value: data.completed_trades_count,
          sub: closed.length ? `${wins} of ${closed.length} hit modelled target` : 'None yet',
          hint: 'Outcomes walk subsequent 15m bars (stop-first on ambiguous bars) and do not represent live user executions.',
        },
        {
          icon: Clock,
          label: 'Session date',
          value: shortDate(data.session_date),
          sub: scan?.savedAt
            ? `${scan.isStale ? 'Stale · ' : ''}Updated ${timeAgo(scan.savedAt)}`
            : isMarketOpen
              ? 'Active session'
              : 'Previous session',
        },
      ]
    : [];

  return {
    planConfig, scan, staleWarning, loading, error,
    statusFilter, setStatusFilter, minConfidence, setMinConfidence,
    sectorFilter, setSectorFilter, selectedSignal, setSelectedSignal,
    isLocked, data, effectiveMarketStatus, isMarketOpen, fetchSignals,
    sectors, counts, rows, resetFilters, mm, ss,
    visibleRows, lockedCount, B, A, stats,
  };
}
