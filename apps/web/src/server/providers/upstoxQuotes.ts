import type { IndexData, Stock } from '../../types/market';
import { buildMarketDataMetadata, classifyQuoteFreshness, getIndianMarketStatus } from '../../utils/marketHours';
import { roundToTick } from '../../utils/orderEngine';
import { INDICES_CATALOG, resolveCanonicalSymbol } from './symbolCatalog';
import type { ProviderResponse } from './types';
import type { UpstoxHttpClient } from './upstoxHttpClient';
import { indexQuotesByInstrumentKey, parseUpstoxQuoteToIndex, parseUpstoxQuoteToStock } from './upstoxNormalizer';
import { UpstoxApiError, type UpstoxQuoteEntry } from './upstoxTypes';
import { setBoundedMapEntry } from '../utils/boundedCache';

export const QUOTE_TTL_MS = 15_000;
export const MAX_QUOTE_CACHE_ENTRIES = 150;
const MAX_QUOTES_PER_BATCH = 100;

export interface CachedQuoteEntry {
  stock: Stock;
  cachedAt: number;
}

export interface CachedIndexEntry {
  index: IndexData;
  cachedAt: number;
}

export function annotateUpstoxStock(stock: Stock, now: number, providerAvailable: boolean): Stock {
  const marketStatus = getIndianMarketStatus(now);
  const quoteTs = stock.quoteTimestamp ?? stock.lastUpdated ?? now;
  const info = classifyQuoteFreshness(
    { price: stock.price, quoteTimestamp: quoteTs, fetchedAt: stock.fetchedAt ?? now, providerAvailable },
    marketStatus,
    now
  );
  const dataStatus = buildMarketDataMetadata({
    source: providerAvailable ? 'upstox' : 'upstox_cache',
    price: stock.price, quoteTimestamp: quoteTs, fetchedAt: stock.fetchedAt ?? now,
    providerAvailable, marketStatus, now,
  });
  const prevClose = Number(stock.previousClose || stock.price || 0);
  return {
    ...stock,
    lowerCircuit: stock.lowerCircuit ?? (prevClose > 0 ? roundToTick(prevClose * 0.9) : undefined),
    upperCircuit: stock.upperCircuit ?? (prevClose > 0 ? roundToTick(prevClose * 1.1) : undefined),
    quoteTimestamp: quoteTs, freshness: info.freshness, freshnessLabel: info.label,
    isTradableQuote: info.isTradable, isStale: info.status === 'STALE',
    providerAvailable, staleWarning: info.staleWarning, dataStatus,
  };
}

export async function fetchUpstoxBulkQuotes(params: {
  client: UpstoxHttpClient;
  symbols: string[];
  now: number;
  resolveKey: (symbol: string) => Promise<string | null>;
  quoteCache: Map<string, CachedQuoteEntry>;
  dynamicInstruments: Map<string, { instrumentKey: string; name: string }>;
}): Promise<ProviderResponse<Stock[]>> {
  const { client, symbols, now, resolveKey, quoteCache, dynamicInstruments } = params;
  const normalized = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const resolved = new Map<string, Stock>();
  const toFetch: Array<{ symbol: string; key: string }> = [];

  for (const sym of normalized) {
    const hit = quoteCache.get(sym);
    if (hit && now - hit.cachedAt < QUOTE_TTL_MS && hit.stock.providerAvailable !== false) {
      resolved.set(sym, annotateUpstoxStock(hit.stock, now, true));
      continue;
    }
    const key = await resolveKey(sym);
    if (key) toFetch.push({ symbol: sym, key });
  }

  let lastErr: unknown = null;
  if (toFetch.length > 0) {
    const uniqueKeys = Array.from(new Set(toFetch.map((x) => x.key)));
    const mergedMap = new Map<string, UpstoxQuoteEntry>();
    for (let i = 0; i < uniqueKeys.length; i += MAX_QUOTES_PER_BATCH) {
      try {
        const raw = await client.getFullQuotes(uniqueKeys.slice(i, i + MAX_QUOTES_PER_BATCH));
        for (const [k, v] of indexQuotesByInstrumentKey(raw)) mergedMap.set(k, v);
      } catch (err) {
        lastErr = err;
        if (err instanceof UpstoxApiError && (err.kind === 'TOKEN_MISSING' || err.kind === 'TOKEN_INVALID_OR_EXPIRED')) break;
      }
    }

    for (const { symbol, key } of toFetch) {
      const entry = mergedMap.get(key);
      const dynamicName = dynamicInstruments.get(resolveCanonicalSymbol(symbol))?.name;
      const parsed = entry ? parseUpstoxQuoteToStock(symbol, entry, now, { fallbackName: dynamicName }) : null;
      if (parsed) {
        const annotated = annotateUpstoxStock(parsed, now, true);
        setBoundedMapEntry(quoteCache, symbol, { stock: annotated, cachedAt: now }, MAX_QUOTE_CACHE_ENTRIES);
        resolved.set(symbol, annotated);
      } else {
        const cached = quoteCache.get(symbol);
        if (cached) resolved.set(symbol, annotateUpstoxStock(cached.stock, now, false));
      }
    }
  }

  const ordered = normalized.map((s) => resolved.get(s)).filter((s): s is Stock => Boolean(s));
  if (ordered.length === 0) {
    return {
      available: false, data: [],
      metadata: buildMarketDataMetadata({ source: 'upstox', freshness: 'UNAVAILABLE', providerAvailable: false, now }),
      error: lastErr instanceof UpstoxApiError ? lastErr.message : 'No authentic stock quotes are currently available from Upstox.',
    };
  }
  const first = ordered[0];
  return {
    available: true, data: ordered,
    metadata: first.dataStatus || buildMarketDataMetadata({
      source: 'upstox', price: first.price, quoteTimestamp: first.quoteTimestamp,
      providerAvailable: ordered.some((s) => s.providerAvailable !== false), now,
    }),
  };
}

export async function fetchUpstoxIndexQuotes(params: {
  client: UpstoxHttpClient;
  now: number;
  indexCache: Map<string, CachedIndexEntry>;
}): Promise<ProviderResponse<IndexData[]>> {
  const { client, now, indexCache } = params;
  const marketStatus = getIndianMarketStatus(now);
  const entries = Object.entries(INDICES_CATALOG);
  if (entries.every(([sym]) => { const h = indexCache.get(sym); return h && now - h.cachedAt < QUOTE_TTL_MS; })) {
    const data = entries.map(([sym]) => indexCache.get(sym)!.index);
    return { available: true, data, metadata: data[0].dataStatus! };
  }

  let lastErr: unknown = null;
  let indexed = new Map<string, UpstoxQuoteEntry>();
  try {
    indexed = indexQuotesByInstrumentKey(await client.getFullQuotes(entries.map(([, i]) => i.upstoxInstrumentKey)));
  } catch (err) {
    lastErr = err;
  }

  const valid: IndexData[] = [];
  for (const [sym, info] of entries) {
    const parsed = indexed.has(info.upstoxInstrumentKey)
      ? parseUpstoxQuoteToIndex(sym, indexed.get(info.upstoxInstrumentKey)!, now, marketStatus)
      : null;
    if (parsed) {
      indexCache.set(sym, { index: parsed, cachedAt: now });
      valid.push(parsed);
    } else {
      const cached = indexCache.get(sym);
      if (cached) {
        const staleMeta = buildMarketDataMetadata({
          source: 'upstox_cache', price: cached.index.value, quoteTimestamp: cached.index.quoteTimestamp,
          fetchedAt: cached.index.fetchedAt, providerAvailable: false, marketStatus, now,
        });
        valid.push({
          ...cached.index, freshness: staleMeta.freshness, freshnessLabel: 'Stale Quote',
          isStale: true, providerAvailable: false, staleWarning: staleMeta.staleWarning, dataStatus: staleMeta,
        });
      }
    }
  }

  if (valid.length === 0) {
    return {
      available: false, data: [],
      metadata: buildMarketDataMetadata({ source: 'upstox', freshness: 'UNAVAILABLE', providerAvailable: false, marketStatus, now }),
      error: lastErr instanceof UpstoxApiError ? lastErr.message : 'Market index quotes are currently unavailable from Upstox.',
    };
  }
  return { available: true, data: valid, metadata: valid[0].dataStatus! };
}
