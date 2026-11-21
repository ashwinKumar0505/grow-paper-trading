// Centralized Screener & Stock Analysis API Client
// Never fabricates signals, prices, candles, backtests, or financial statements ('Historical Financial Statements (Provider Feed)') on API failure.
import { getIndianMarketStatus } from '../../../utils/marketHours';
import { NSE_SYMBOL_CATALOG } from '../../../server/providers/symbolCatalog';
import {
  adaptFinancialsResponse,
  adaptIntradayResponse,
  adaptStockAnalysisResponse,
  adaptSwingResponse,
} from './adapters';

export {
  adaptFinancialsResponse,
  adaptIntradayResponse,
  adaptStockAnalysisResponse,
  adaptSwingResponse,
};

export const SCREENER_API_BASE =
  import.meta.env?.VITE_SCREENER_API_URL ||
  import.meta.env?.VITE_API_BASE_URL ||
  'http://localhost:8001/api/v1';

const SYMBOL_METADATA_LIST = Object.values(NSE_SYMBOL_CATALOG).map((item) => ({
  symbol: item.symbol,
  name: item.name,
  sector: item.sector,
  exchange: item.exchange,
}));

function buildCalendarMarketStatus(backendAvailable = true) {
  const status = getIndianMarketStatus();
  let sessionPhase = 'POST_CLOSE';
  if (status.isOpen) sessionPhase = 'LIVE_TRADING';
  else if (status.isWeekend) sessionPhase = 'WEEKEND_CLOSED';
  else if (status.sessionPhase === 'PRE_OPEN') sessionPhase = 'PRE_OPEN';

  return {
    is_market_open: status.isOpen,
    session_phase: sessionPhase,
    current_time_ist: status.istTimeString,
    next_trading_session_open_ist: status.nextOpenText.replace(/^Opens\s+/i, ''),
    intraday_refresh_interval_seconds: 300,
    session_date: status.dateKey,
    backend_available: backendAvailable,
  };
}

const statusListeners = new Set();

export function onScreenerApiStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function emitScreenerApiStatus(event) {
  statusListeners.forEach((fn) => {
    try { fn(event); } catch {}
  });
}

function getAuthHeaders() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const token = localStorage.getItem('niftylens_auth_token_v1');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const DEFAULT_TIMEOUT_MS = 10000;
const SCANNER_TIMEOUT_MS = 120000;
const FORCE_REFRESH_TIMEOUT_MS = 180000;

const CANDIDATE_API_BASES = [
  import.meta.env?.VITE_SCREENER_API_URL,
  import.meta.env?.VITE_API_BASE_URL,
  '/api/v1',
  'http://localhost:8001/api/v1',
  'http://127.0.0.1:8001/api/v1',
  'http://localhost:8000/api/v1',
].filter(Boolean);

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...fetchOptions } = options;
  let lastErr = null;

  for (const base of CANDIDATE_API_BASES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const isSameOriginProxy = base.startsWith('/');
      const hasBody = Boolean(fetchOptions.body);
      const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        headers: {
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(isSameOriginProxy ? getAuthHeaders() : {}),
          ...(headers || {}),
        },
        signal: controller.signal,
        ...fetchOptions,
      });
      clearTimeout(timeout);
      if (res.status === 404 && isSameOriginProxy) continue;

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          detail = errJson.message || errJson.detail || detail;
          if (typeof detail === 'object') detail = detail.message || JSON.stringify(detail);
        } catch {}
        if (res.status === 503 && isSameOriginProxy) {
          lastErr = new Error(detail);
          continue;
        }
        throw new Error(detail);
      }
      const json = await res.json();
      emitScreenerApiStatus({ ok: true, path });
      return json;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (err instanceof Error && /^HTTP 4\d\d|Invalid|Operation requires|Rate limit/i.test(err.message)) {
        break;
      }
    }
  }

  const err = lastErr;
  const message =
    err?.name === 'AbortError'
      ? 'Screener service request timed out. Please try again.'
      : err instanceof Error
        ? err.message
        : 'Screener analytics service is unreachable.';
  emitScreenerApiStatus({ ok: false, path, error: message });

  if (path.startsWith('/market/status')) return buildCalendarMarketStatus(false);
  if (path.startsWith('/stocks/search')) {
    const url = new URL(`http://localhost${path}`);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    return SYMBOL_METADATA_LIST.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }

  const unavailableErr = new Error(
    `Screener analytics service is currently unavailable (${message}). Authentic data could not be loaded.`
  );
  unavailableErr.isUnavailable = true;
  throw unavailableErr;
}

export const api = {
  getHealth: () => request('/health'),
  getMarketStatus: () => request('/market/status'),
  searchStocks: (q = '', limit = 25) => request(`/stocks/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getUniverse: () => request('/stocks/universe'),
  runSwingScanner: async ({ universeLimit = 500, minConfidence = 60, signalType = 'ALL', forceRefresh = false } = {}) => {
    const res = await request(
      `/scanner/swing?universe_limit=${universeLimit}&result_limit=${universeLimit}&min_confidence=${minConfidence}&signal_type=${signalType}&force_refresh=${forceRefresh}`,
      { method: 'POST', timeoutMs: forceRefresh ? FORCE_REFRESH_TIMEOUT_MS : SCANNER_TIMEOUT_MS }
    );
    return adaptSwingResponse(res);
  },
  runIntradayScanner: async ({ universeLimit = 100, forceRefresh = false, includeLastSession = true } = {}) => {
    const res = await request(
      `/scanner/intraday?universe_limit=${universeLimit}&force_refresh=${forceRefresh}&include_last_session_when_closed=${includeLastSession}`,
      { timeoutMs: forceRefresh ? FORCE_REFRESH_TIMEOUT_MS : SCANNER_TIMEOUT_MS }
    );
    return adaptIntradayResponse(res);
  },
  getStockAnalysis: async (symbol, forceRefresh = false) => {
    const res = await request(`/stocks/${encodeURIComponent(symbol)}/analysis?force_refresh=${forceRefresh}`, {
      timeoutMs: forceRefresh ? FORCE_REFRESH_TIMEOUT_MS : SCANNER_TIMEOUT_MS,
    });
    return adaptStockAnalysisResponse(res);
  },
  getStockFinancials: async (symbol, forceRefresh = false) => {
    const res = await request(`/stocks/${encodeURIComponent(symbol)}/financials?force_refresh=${forceRefresh}`, {
      timeoutMs: forceRefresh ? FORCE_REFRESH_TIMEOUT_MS : SCANNER_TIMEOUT_MS,
    });
    return adaptFinancialsResponse(res);
  },
};
