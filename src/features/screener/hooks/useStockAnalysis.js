import { useEffect, useRef, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useQueryParams } from '../../../lib/navigation';
import { SUBSCRIPTION_PLANS, normalizeUsageQuota } from '../../../lib/subscription';
import { api } from '../api/client';
import { CACHE_KEYS, CACHE_TTL_MS, loadCachedScan, saveCachedScan } from '../utils/scanCache';
import { RECOMMENDATION } from '../utils/terms';

export function useStockAnalysis() {
  const [searchParams, setSearchParams] = useQueryParams();
  const {
    selectStockBySymbol,
    subscriptionTier,
    planConfig,
    usageQuota,
    consumeAnalysisSearch,
    openUpgradeModal,
    addToast,
  } = useTrading();
  const urlSymbol = (searchParams.get('symbol') || '').toUpperCase();

  const [query, setQuery] = useState(urlSymbol);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [cachedEntry, setCachedEntry] = useState(() =>
    urlSymbol ? loadCachedScan(CACHE_KEYS.analysisPrefix + urlSymbol, CACHE_TTL_MS.analysis) : null
  );
  const [analysis, setAnalysis] = useState(cachedEntry?.data || null);
  const [staleWarning, setStaleWarning] = useState(cachedEntry?.staleWarning || '');
  const [loading, setLoading] = useState(false);
  const [loadingSym, setLoadingSym] = useState('');
  const [error, setError] = useState('');
  const [lastAttemptSym, setLastAttemptSym] = useState('');
  const [mode, setMode] = useState(() => localStorage.getItem('qp.analysisMode') || 'simple');
  const inputRef = useRef(null);

  useEffect(() => localStorage.setItem('qp.analysisMode', mode), [mode]);

  const load = async (sym, forceRefresh = false) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    if (loading && loadingSym === clean) return;
    setShowDropdown(false);
    setQuery(clean);
    setLastAttemptSym(clean);

    const existingCache = loadCachedScan(CACHE_KEYS.analysisPrefix + clean, CACHE_TTL_MS.analysis);
    if (!forceRefresh && existingCache && !existingCache.isStale) {
      setCachedEntry(existingCache);
      setAnalysis(existingCache.data);
      setStaleWarning('');
      setError('');
      if (urlSymbol !== clean) setSearchParams({ symbol: clean });
      return;
    }

    // Check daily quota before making network call, but only deduct quota upon successful response
    const normalizedQuota = normalizeUsageQuota(usageQuota);
    if (normalizedQuota.analysisSearchesCount >= planConfig.analysisDailyLimit) {
      consumeAnalysisSearch(clean);
      return;
    }

    setLoading(true);
    setLoadingSym(clean);
    setError('');
    try {
      const data = await api.getStockAnalysis(clean, forceRefresh);
      consumeAnalysisSearch(clean);
      const saved = saveCachedScan(CACHE_KEYS.analysisPrefix + data.symbol, data, CACHE_TTL_MS.analysis);
      setCachedEntry(saved);
      setAnalysis(data);
      setStaleWarning('');
      setQuery(data.symbol);
      setSearchParams({ symbol: data.symbol });
    } catch (err) {
      const msg =
        err.message ||
        `We couldn’t analyse “${clean}”. The analytics service is currently unreachable — please retry.`;
      if (existingCache?.data) {
        setCachedEntry(existingCache);
        setAnalysis(existingCache.data);
        setStaleWarning(
          `Live analysis service is unreachable. Showing previously fetched snapshot from ${new Date(
            existingCache.savedAt
          ).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`
        );
      } else {
        setAnalysis(null);
      }
      setError(msg);
      addToast('Analysis Unavailable', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSymbol && urlSymbol !== analysis?.symbol) load(urlSymbol);
    if (!urlSymbol) {
      setAnalysis(null);
      setQuery('');
      setStaleWarning('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    if (!q || q === analysis?.symbol) {
      setSuggestions([]);
      return undefined;
    }
    const t = setTimeout(() => {
      api
        .searchStocks(q, 8)
        .then((res) => alive && setSuggestions(res))
        .catch(() => {});
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, analysis?.symbol]);

  const onKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      load(suggestions[activeIdx].symbol);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const clear = () => {
    setQuery('');
    setAnalysis(null);
    setError('');
    setStaleWarning('');
    setSearchParams({});
    inputRef.current?.focus();
  };

  const a = analysis;
  const rec = a ? RECOMMENDATION[a.recommendation] || RECOMMENDATION.WAIT : null;
  const isAdvanced = mode === 'advanced';
  const { beginner: B, advanced: A } = SUBSCRIPTION_PLANS;

  return {
    selectStockBySymbol,
    subscriptionTier,
    planConfig,
    usageQuota,
    openUpgradeModal,
    query,
    setQuery,
    suggestions,
    showDropdown,
    setShowDropdown,
    activeIdx,
    setActiveIdx,
    analysis,
    cachedEntry,
    staleWarning,
    loading,
    loadingSym,
    error,
    lastAttemptSym,
    mode,
    setMode,
    inputRef,
    load,
    onKeyDown,
    clear,
    a,
    rec,
    isAdvanced,
    B,
    A,
  };
}
