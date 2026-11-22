import type { IndexData, Stock } from '../../types/market';
import { buildMarketDataMetadata, type MarketStatus } from '../../utils/marketHours';
import { roundToTick } from '../../utils/orderEngine';
import { INDICES_CATALOG, NSE_SYMBOL_CATALOG, resolveCanonicalSymbol } from './symbolCatalog';
import type { StockSearchItem } from './types';
import type { UpstoxQuoteEntry, UpstoxSearchInstrument } from './upstoxTypes';

export function toFinitePositive(val: unknown): number | null {
  const n = typeof val === 'string' && val.trim() !== '' ? Number(val) : typeof val === 'number' ? val : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseUpstoxTimestampMs(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw > 1e11 ? Math.round(raw) : Math.round(raw * 1000);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n > 0) return n > 1e11 ? n : n * 1000;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function toIstDateKey(tsMs: number): string {
  return new Date(tsMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function formatIstDateOffset(nowMs: number, offsetDays: number): string {
  return toIstDateKey(nowMs + offsetDays * 86_400_000);
}

export function indexQuotesByInstrumentKey(
  rawData: Record<string, UpstoxQuoteEntry>
): Map<string, UpstoxQuoteEntry> {
  const byKey = new Map<string, UpstoxQuoteEntry>();
  for (const [respKey, entry] of Object.entries(rawData)) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.instrument_token) byKey.set(entry.instrument_token, entry);
    if (respKey.includes(':')) byKey.set(respKey.replace(':', '|'), entry);
    byKey.set(respKey, entry);
  }
  return byKey;
}

function resolvePreviousClose(entry: UpstoxQuoteEntry, lastPrice: number): number {
  const explicitPrev = toFinitePositive(entry.cp) ?? toFinitePositive(entry.prev_close_price);
  if (explicitPrev !== null) return Number(explicitPrev.toFixed(2));
  const netChange = typeof entry.net_change === 'number' && Number.isFinite(entry.net_change) ? entry.net_change : null;
  if (netChange !== null && Math.abs(netChange) > 1e-9 && lastPrice - netChange > 0) {
    return Number((lastPrice - netChange).toFixed(2));
  }
  const ohlcClose = toFinitePositive(entry.ohlc?.close);
  return ohlcClose !== null ? Number(ohlcClose.toFixed(2)) : lastPrice;
}

export function parseUpstoxQuoteToStock(
  symbol: string,
  entry: UpstoxQuoteEntry,
  now: number,
  options?: { sparkline?: number[]; week52High?: number; week52Low?: number; fallbackName?: string }
): Stock | null {
  const lastPrice = toFinitePositive(entry.last_price) ?? toFinitePositive(entry.ohlc?.close);
  if (lastPrice === null) return null;

  const upper = symbol.trim().toUpperCase();
  const cat = NSE_SYMBOL_CATALOG[upper] || NSE_SYMBOL_CATALOG[resolveCanonicalSymbol(upper)];
  const idxCat = INDICES_CATALOG[upper];
  const price = Number(lastPrice.toFixed(2));
  const previousClose = resolvePreviousClose(entry, price);
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose > 0 ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

  const open = Number((toFinitePositive(entry.ohlc?.open) ?? previousClose).toFixed(2));
  const high = Number((toFinitePositive(entry.ohlc?.high) ?? Math.max(open, price)).toFixed(2));
  const low = Number((toFinitePositive(entry.ohlc?.low) ?? Math.min(open, price)).toFixed(2));
  const volume = typeof entry.volume === 'number' && Number.isFinite(entry.volume) && entry.volume >= 0 ? Math.round(entry.volume) : 0;
  const quoteTs = parseUpstoxTimestampMs(entry.last_trade_time) ?? parseUpstoxTimestampMs(entry.timestamp) ?? now;
  const lowerCircuit = toFinitePositive(entry.lower_circuit_limit) ?? (previousClose > 0 ? roundToTick(previousClose * 0.9) : undefined);
  const upperCircuit = toFinitePositive(entry.upper_circuit_limit) ?? (previousClose > 0 ? roundToTick(previousClose * 1.1) : undefined);

  return {
    symbol: upper,
    name: idxCat?.name || cat?.name || options?.fallbackName || `${upper} Ltd.`,
    sector: idxCat ? 'Index' : cat?.sector || 'Equities',
    exchange: idxCat?.exchange || cat?.exchange || (upper === 'SENSEX' ? 'BSE' : 'NSE'),
    price,
    previousClose,
    change,
    changePercent,
    open,
    high,
    low,
    close: price,
    volume,
    week52High: Number((options?.week52High ? Math.max(options.week52High, high) : high).toFixed(2)),
    week52Low: Number((options?.week52Low ? Math.min(options.week52Low, low) : low).toFixed(2)),
    lowerCircuit,
    upperCircuit,
    fundamentals: {
      available: false, source: 'unavailable', marketCap: null, peRatio: null, pbRatio: null,
      industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null,
    },
    about: `${idxCat?.name || cat?.name || options?.fallbackName || upper} is listed on the ${idxCat?.exchange || cat?.exchange || 'NSE'}.`,
    sparkline: options?.sparkline && options.sparkline.length >= 2 ? options.sparkline : [previousClose, price],
    lastUpdated: now,
    quoteTimestamp: quoteTs,
    fetchedAt: now,
  };
}

export function parseUpstoxQuoteToIndex(
  symbol: string,
  entry: UpstoxQuoteEntry,
  now: number,
  marketStatus: Pick<MarketStatus, 'isOpen'>,
  sparkline?: number[]
): IndexData | null {
  const val = toFinitePositive(entry.last_price) ?? toFinitePositive(entry.ohlc?.close);
  if (val === null) return null;
  const idxCat = INDICES_CATALOG[symbol];
  const value = Number(val.toFixed(2));
  const prevClose = resolvePreviousClose(entry, value);
  const change = Number((value - prevClose).toFixed(2));
  const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
  const quoteTs = parseUpstoxTimestampMs(entry.last_trade_time) ?? parseUpstoxTimestampMs(entry.timestamp) ?? now;
  const metaStatus = buildMarketDataMetadata({
    source: 'upstox', price: value, quoteTimestamp: quoteTs, fetchedAt: now, providerAvailable: true, marketStatus, now,
  });

  return {
    symbol,
    name: idxCat?.name || symbol,
    value,
    change,
    changePercent,
    sparkline: sparkline && sparkline.length >= 2 ? sparkline : [prevClose, value],
    quoteTimestamp: quoteTs,
    fetchedAt: now,
    freshness: metaStatus.freshness,
    freshnessLabel: metaStatus.status,
    isStale: metaStatus.isStale,
    providerAvailable: true,
    dataStatus: metaStatus,
  };
}

export function normalizeUpstoxSearchResults(
  rawItems: UpstoxSearchInstrument[],
  limit: number,
  priceLookup: (symbol: string) => number | null
): { items: StockSearchItem[]; discoveredKeys: Map<string, { instrumentKey: string; name: string }> } {
  const items: StockSearchItem[] = [];
  const discoveredKeys = new Map<string, { instrumentKey: string; name: string }>();
  const seen = new Set<string>();

  for (const raw of rawItems) {
    if (items.length >= limit) break;
    const sym = String(raw.tradingsymbol || raw.trading_symbol || '').trim().toUpperCase();
    const key = String(raw.instrument_key || '').trim();
    const seg = String(raw.segment || '').toUpperCase();
    if (!sym || seen.has(sym) || (seg && seg !== 'NSE_EQ' && seg !== 'BSE_EQ')) continue;
    seen.add(sym);
    const cat = NSE_SYMBOL_CATALOG[sym];
    const exchange = seg === 'BSE_EQ' || String(raw.exchange || '').toUpperCase() === 'BSE' ? 'BSE' : 'NSE';
    const name = cat?.name || String(raw.name || raw.short_name || sym).trim();
    if (key) discoveredKeys.set(sym, { instrumentKey: key, name });
    items.push({
      symbol: sym,
      providerSymbol: `${sym}.${exchange === 'BSE' ? 'BO' : 'NS'}`,
      name,
      exchange,
      sector: cat?.sector || 'Equities',
      price: priceLookup(sym) ?? toFinitePositive(raw.last_price),
    });
  }
  return { items, discoveredKeys };
}
