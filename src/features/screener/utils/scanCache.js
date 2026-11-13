// Persists scan results so they survive page navigation and browser refreshes.
// Data is only replaced when the user explicitly runs a new scan.

const memory = {};

export function loadCachedScan(key) {
  if (memory[key]) return memory[key];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    memory[key] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedScan(key, data) {
  const entry = { data, savedAt: new Date().toISOString() };
  memory[key] = entry;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — in-memory copy still keeps data across page switches.
  }
  return entry;
}

export const CACHE_KEYS = {
  swing: 'qp.swingScan.v2',
  intraday: 'qp.intradayScan.v2',
};
