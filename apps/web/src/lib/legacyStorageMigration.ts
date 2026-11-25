/**
 * One-time migration of browser storage keys from the former "Nifty Lens"
 * brand prefix (`niftylens_`) to the Tradedia prefix (`tradedia_`).
 *
 * Imported for its side effect as the very first module in `main.tsx`, so it
 * runs before any feature module reads localStorage. Existing values are moved
 * only when the new key is not already set, so a newer Tradedia value is never
 * overwritten. Safe to run repeatedly; it is a no-op once no legacy keys remain.
 */
export const LEGACY_STORAGE_PREFIX = 'niftylens_';
export const STORAGE_PREFIX = 'tradedia_';

export function migrateLegacyStorageKeys(storage: Storage): number {
  const legacyKeys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(LEGACY_STORAGE_PREFIX)) legacyKeys.push(key);
  }

  let moved = 0;
  for (const legacyKey of legacyKeys) {
    const nextKey = STORAGE_PREFIX + legacyKey.slice(LEGACY_STORAGE_PREFIX.length);
    const value = storage.getItem(legacyKey);
    if (value !== null && storage.getItem(nextKey) === null) {
      storage.setItem(nextKey, value);
      moved += 1;
    }
    storage.removeItem(legacyKey);
  }
  return moved;
}

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    migrateLegacyStorageKeys(window.localStorage);
  }
} catch {
  // Storage can be unavailable (private mode, blocked cookies); the app
  // already handles missing localStorage, so skip migration silently.
}
