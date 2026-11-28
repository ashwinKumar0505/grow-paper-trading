/**
 * Lightweight bounded LRU-style Map eviction and TTL pruning helpers
 * preventing unbounded in-memory cache and rate-limiter growth over uptime.
 */

export function setBoundedMapEntry<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxSize: number
): void {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
  while (map.size > maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

export function pruneMapEntries<K, V>(
  map: Map<K, V>,
  isExpired: (value: V, key: K) => boolean,
  maxSize?: number
): number {
  let removed = 0;
  for (const [key, value] of map.entries()) {
    if (isExpired(value, key)) {
      map.delete(key);
      removed += 1;
    }
  }
  if (typeof maxSize === 'number' && maxSize >= 0) {
    while (map.size > maxSize) {
      const oldestKey = map.keys().next().value;
      if (oldestKey === undefined) break;
      map.delete(oldestKey);
      removed += 1;
    }
  }
  return removed;
}
