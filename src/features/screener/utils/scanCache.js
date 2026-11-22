// Persists authentic scan and analysis results with explicit provider separation, timestamps, and staleness detection.
// Never caches fabricated fallback data or serves legacy Yahoo-derived entries under another provider.

const memory = {};
const ACTIVE_PROVIDER_KEY = 'qp.activeProvider.v4';

export const CACHE_TTL_MS = {
  swing: 30 * 60 * 1000,
  intraday: 5 * 60 * 1000,
  analysis: 30 * 60 * 1000,
  financials: 24 * 60 * 60 * 1000,
};

export const CACHE_KEYS = {
  swing: 'qp.swingScan.v4',
  intraday: 'qp.intradayScan.v4',
  analysisPrefix: 'qp.analysis.v4.',
  financialsPrefix: 'qp.financials.v4.',
};

// Remove legacy v2/v3 browser caches that could contain pre-migration Yahoo Finance results.
try {
  if (typeof localStorage !== 'undefined') {
    const stalePrefixes = ['qp.swingScan.v2', 'qp.intradayScan.v2', 'qp.swingScan.v3', 'qp.intradayScan.v3', 'qp.analysis.v3.', 'qp.financials.v3.'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && stalePrefixes.some((p) => k === p || k.startsWith(p))) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
} catch {
  // Ignore storage access errors
}

function inferProviderId(data) {
  if (!data || typeof data !== 'object') return null;
  const raw = String(
    data.data_provenance?.provider_id || data.provider || data.data_provider || data.source || ''
  ).toLowerCase();
  if (raw.includes('upstox')) return 'upstox';
  if (raw.includes('yahoo') || raw.includes('yfinance')) return 'yfinance';
  return null;
}

export function getActiveScreenerProvider() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACTIVE_PROVIDER_KEY) || null;
    }
  } catch {
    // Ignore storage errors
  }
  return memory[ACTIVE_PROVIDER_KEY] || null;
}

export function clearAllScreenerCaches() {
  for (const key of Object.keys(memory)) {
    if (key !== ACTIVE_PROVIDER_KEY) delete memory[key];
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const prefixes = [CACHE_KEYS.swing, CACHE_KEYS.intraday, CACHE_KEYS.analysisPrefix, CACHE_KEYS.financialsPrefix];
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && prefixes.some((p) => k === p || k.startsWith(p))) toDelete.push(k);
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // Ignore storage errors
  }
}

export function syncActiveScreenerProvider(providerId) {
  const normalized = String(providerId || '').trim().toLowerCase();
  if (!normalized) return;
  const previous = getActiveScreenerProvider();
  if (previous && previous !== normalized) {
    clearAllScreenerCaches();
  }
  memory[ACTIVE_PROVIDER_KEY] = normalized;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_PROVIDER_KEY, normalized);
  } catch {
    // Ignore storage errors
  }
}

function annotateCacheEntry(entry, ttlMs = CACHE_TTL_MS.swing) {
  if (!entry || !entry.data || entry.isAuthentic !== true) return null;
  const activeProvider = getActiveScreenerProvider();
  const entryProvider = entry.providerId || inferProviderId(entry.data);
  if (activeProvider && entryProvider && activeProvider !== entryProvider) return null;

  const savedMs = entry.savedAt ? new Date(entry.savedAt).getTime() : 0;
  const ageMs = savedMs > 0 ? Math.max(0, Date.now() - savedMs) : Number.POSITIVE_INFINITY;
  const isStale = ageMs > ttlMs || Boolean(entry.data?.is_stale);
  return {
    ...entry,
    ageMs,
    isStale,
    freshness: isStale ? 'STALE' : entry.data?.freshness || 'HISTORICAL',
    staleWarning: isStale
      ? `Showing previously fetched snapshot from ${new Date(savedMs).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
        })} IST. Refresh to load current data.`
      : undefined,
  };
}

export function loadCachedScan(key, ttlMs = CACHE_TTL_MS.swing) {
  if (memory[key]) return annotateCacheEntry(memory[key], ttlMs);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || parsed.isAuthentic !== true) return null;
    memory[key] = parsed;
    return annotateCacheEntry(parsed, ttlMs);
  } catch {
    return null;
  }
}

export function saveCachedScan(key, data, ttlMs = CACHE_TTL_MS.swing) {
  if (!data || data.isFabricatedFallback) return null;
  const providerId = inferProviderId(data) || getActiveScreenerProvider();
  if (providerId) syncActiveScreenerProvider(providerId);
  const entry = {
    data,
    providerId: providerId || undefined,
    savedAt: new Date().toISOString(),
    isAuthentic: true,
  };
  memory[key] = entry;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable
  }
  return annotateCacheEntry(entry, ttlMs);
}

export function clearCachedScan(key) {
  delete memory[key];
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
