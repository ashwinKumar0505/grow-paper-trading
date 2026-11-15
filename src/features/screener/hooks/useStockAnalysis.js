import { useEffect,useRef,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useQueryParams } from '../../../lib/navigation';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { api } from '../api/client';
import { RECOMMENDATION } from '../utils/terms';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');

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
  const [analysis, setAnalysis] = useState(urlSymbol ? analysisMemo[urlSymbol] || null : null);
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
    if (!consumeAnalysisSearch(clean)) {
      return;
    }
    if (!forceRefresh && analysisMemo[clean]) {
      setAnalysis(analysisMemo[clean]);
      setError('');
      if (urlSymbol !== clean) setSearchParams({ symbol: clean });
      return;
    }
    setLoading(true);
    setLoadingSym(clean);
    setError('');
    try {
      const data = await api.getStockAnalysis(clean, forceRefresh);
      analysisMemo[data.symbol] = data;
      setAnalysis(data);
      setQuery(data.symbol);
      setSearchParams({ symbol: data.symbol });
    } catch (err) {
      const msg = err.message || `We couldn’t analyse “${clean}”. Server may be down — please try again in some time.`;
      setError(msg);
      addToast('Analysis Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSymbol && urlSymbol !== analysis?.symbol) load(urlSymbol);
    if (!urlSymbol) {
      setAnalysis(null);
      setQuery('');
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
    setSearchParams({});
    inputRef.current?.focus();
  };

  const a = analysis;
  const rec = a ? RECOMMENDATION[a.recommendation] || RECOMMENDATION.WAIT : null;
  const isAdvanced = mode === 'advanced';
  const { beginner: B, advanced: A } = SUBSCRIPTION_PLANS;

  return { selectStockBySymbol, subscriptionTier, planConfig, usageQuota, openUpgradeModal, query, setQuery, suggestions, showDropdown, setShowDropdown, activeIdx, setActiveIdx, analysis, loading, loadingSym, error, lastAttemptSym, mode, setMode, inputRef, load, onKeyDown, clear, a, rec, isAdvanced, B, A };
}
