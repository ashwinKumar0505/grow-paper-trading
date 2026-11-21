// Persists authentic scan and analysis results with explicit timestamps and staleness detection.
// Never caches fabricated fallback data.

const memory = {};

export const CACHE_TTL_MS = {
  swing: 30 * 60 * 1000, // 30 minutes before marked stale
  intraday: 5 * 60 * 1000, // 5 minutes before marked stale
  analysis: 30 * 60 * 1000,
  financials: 24 * 60 * 60 * 1000,
};

export const CACHE_KEYS = {
  swing: 'qp.swingScan.v3',
  intraday: 'qp.intradayScan.v3',
  analysisPrefix: 'qp.analysis.v3.',
  financialsPrefix: 'qp.financials.v3.',
};

// Clean up legacy v2 caches that could contain fabricated fallback responses
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('qp.swingScan.v2');
    localStorage.removeItem('qp.intradayScan.v2');
  }
} catch {
  // Ignore storage access errors
}

function annotateCacheEntry(entry, ttlMs = CACHE_TTL_MS.swing) {
  if (!entry || !entry.data || entry.isAuthentic !== true) return null;
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
  const nowIso = new Date().toISOString();
  const entry = {
    data,
    savedAt: nowIso,
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
