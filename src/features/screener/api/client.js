// Screener & Stock Analysis backend API client (running on port 8001 by default)
export const SCREENER_API_BASE =
  import.meta.env?.VITE_SCREENER_API_URL ||
  import.meta.env?.VITE_API_BASE_URL ||
  'http://localhost:8001/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${SCREENER_API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  getHealth: () => request('/health'),
  getMarketStatus: () => request('/market/status'),
  searchStocks: (q = '', limit = 25) =>
    request(`/stocks/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getUniverse: () => request('/stocks/universe'),
  runSwingScanner: ({
    universeLimit = 500,
    minConfidence = 60,
    signalType = 'ALL',
    forceRefresh = false,
  } = {}) =>
    request(
      `/scanner/swing?universe_limit=${universeLimit}&min_confidence=${minConfidence}&signal_type=${signalType}&force_refresh=${forceRefresh}`,
      { method: 'POST' }
    ),
  runIntradayScanner: ({
    universeLimit = 100,
    forceRefresh = false,
    includeLastSession = true,
  } = {}) =>
    request(
      `/scanner/intraday?universe_limit=${universeLimit}&force_refresh=${forceRefresh}&include_last_session_when_closed=${includeLastSession}`
    ),
  getStockAnalysis: (symbol, forceRefresh = false) =>
    request(`/stocks/${encodeURIComponent(symbol)}/analysis?force_refresh=${forceRefresh}`),
  getStockFinancials: (symbol, forceRefresh = false) =>
    request(`/stocks/${encodeURIComponent(symbol)}/financials?force_refresh=${forceRefresh}`),
};
