import fs from 'fs';
import path from 'path';
import type { ChartPoint, Stock, Timeframe } from '../../types/market';
import { NSE_SYMBOL_CATALOG, resolveCanonicalSymbol } from './symbolCatalog';
import type { ProviderChartPayload, ProviderId } from './types';

const BACKEND_CACHE_ROOT =
  process.env.TRADEDIA_BACKEND_CACHE_DIR ||
  process.env.NIFTYLENS_BACKEND_CACHE_DIR ||
  path.resolve(process.cwd(), '../grow-paper-trading-backend/backend/data_cache/raw_ohlcv');

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function resolveDiskCacheSymbol(symbol: string): string {
  return resolveCanonicalSymbol(symbol);
}

function parseIstDateTimestamp(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return Date.parse(`${trimmed}T15:30:00+05:30`);
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return Date.parse(`${trimmed.replace(/\s+/, 'T')}+05:30`);
  }
  return Date.parse(trimmed);
}

export function formatChartTimeLabel(tsMs: number, timeframe: Timeframe): string {
  const d = new Date(tsMs);
  if (timeframe === '1D') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }
  if (timeframe === '1W' || timeframe === '1M') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
}

function verifySidecarProvider(metaPath: string, expectedProvider: string, requireSidecar: boolean): boolean {
  if (!fs.existsSync(metaPath)) return !requireSidecar;
  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { provider_id?: string };
    return String(parsed.provider_id || '').toLowerCase() === expectedProvider.toLowerCase();
  } catch {
    return false;
  }
}

function resolveProviderCsvPath(
  clean: string,
  kind: 'daily' | 'intraday',
  providerId: ProviderId,
  cacheRoot: string
): string | null {
  const metaDir = path.join(cacheRoot, 'meta');
  if (providerId === 'yahoo_finance') {
    const csvPath =
      kind === 'intraday'
        ? path.join(cacheRoot, 'intraday', `${clean}_15m.csv`)
        : path.join(cacheRoot, 'daily', `${clean}.csv`);
    const metaPath = path.join(metaDir, `yfinance_${clean}_${kind === 'intraday' ? '15m' : '1d'}_adj.meta.json`);
    if (!fs.existsSync(csvPath)) return null;
    return verifySidecarProvider(metaPath, 'yfinance', false) ? csvPath : null;
  }

  // Non-Yahoo providers MUST NEVER read legacy Yahoo filenames ({clean}.csv / {clean}_15m.csv)
  // and require a matching provider sidecar to prevent cross-provider cache contamination.
  const suffixes = ['split_adj', 'raw', 'adj'];
  const intervalTag = kind === 'intraday' ? '15m' : '1d';
  for (const suffix of suffixes) {
    const csvPath =
      kind === 'intraday'
        ? path.join(cacheRoot, 'intraday', `${providerId}_${clean}_15m_${suffix}.csv`)
        : path.join(cacheRoot, 'daily', `${providerId}_${clean}_${suffix}.csv`);
    const metaPath = path.join(metaDir, `${providerId}_${clean}_${intervalTag}_${suffix}.meta.json`);
    if (fs.existsSync(csvPath) && verifySidecarProvider(metaPath, providerId, true)) {
      return csvPath;
    }
  }
  return null;
}

export function readBackendCsvCandles(
  symbol: string,
  kind: 'daily' | 'intraday',
  providerId: ProviderId = 'yahoo_finance',
  cacheRoot: string = BACKEND_CACHE_ROOT
): ChartPoint[] | null {
  try {
    const clean = resolveDiskCacheSymbol(symbol);
    const filePath = resolveProviderCsvPath(clean, kind, providerId, cacheRoot);
    if (!filePath) return null;
    const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
    if (lines.length < 3) return null;

    const points: ChartPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 6) continue;
      const ts = parseIstDateTimestamp(cols[0]);
      const [o, h, l, c] = [Number(cols[1]), Number(cols[2]), Number(cols[3]), Number(cols[4])];
      const v = Math.max(0, Math.round(Number(cols[5]) || 0));
      if (!Number.isFinite(ts) || !Number.isFinite(c) || c <= 0) continue;
      const open = Number.isFinite(o) && o > 0 ? o : c;
      const high = Number.isFinite(h) && h > 0 ? h : Math.max(open, c);
      const low = Number.isFinite(l) && l > 0 ? l : Math.min(open, c);
      points.push({
        time: formatChartTimeLabel(ts, kind === 'intraday' ? '1D' : '1Y'),
        timestamp: ts, price: Number(c.toFixed(2)), open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)), low: Number(low.toFixed(2)), close: Number(c.toFixed(2)), volume: v,
      });
    }
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}

export function buildRawStockFromDiskCsv(
  symbol: string,
  now: number,
  providerId: ProviderId = 'yahoo_finance',
  cacheRoot: string = BACKEND_CACHE_ROOT
): Stock | null {
  const daily = readBackendCsvCandles(symbol, 'daily', providerId, cacheRoot);
  if (!daily || daily.length < 2) return null;
  const latest = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  const cat = NSE_SYMBOL_CATALOG[symbol];
  const price = latest.close;
  const prevClose = prev.close || latest.open || price;
  const change = Number((price - prevClose).toFixed(2));
  const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
  const trailingYear = daily.slice(-252);
  const w52High = Math.max(...trailingYear.map((p) => p.high));
  const w52Low = Math.min(...trailingYear.map((p) => p.low));

  return {
    symbol,
    name: cat?.name || `${symbol} Ltd.`,
    sector: cat?.sector || 'Equities',
    exchange: cat?.exchange || 'NSE',
    price: Number(price.toFixed(2)),
    previousClose: Number(prevClose.toFixed(2)),
    change,
    changePercent,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    volume: latest.volume,
    week52High: Number(w52High.toFixed(2)),
    week52Low: Number(w52Low.toFixed(2)),
    fundamentals: {
      available: false, source: 'unavailable', marketCap: null, peRatio: null, pbRatio: null,
      industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null,
    },
    about: `${cat?.name || symbol} is listed on the ${cat?.exchange || 'NSE'}.`,
    sparkline: daily.slice(-10).map((p) => p.close),
    lastUpdated: latest.timestamp,
    quoteTimestamp: latest.timestamp,
    fetchedAt: now,
  };
}

export function buildChartFromDiskCsv(
  symbol: string,
  timeframe: Timeframe,
  providerId: ProviderId = 'yahoo_finance',
  cacheRoot: string = BACKEND_CACHE_ROOT
): ProviderChartPayload | null {
  if (timeframe === '1D' || timeframe === '1W') {
    const intra = readBackendCsvCandles(symbol, 'intraday', providerId, cacheRoot);
    if (intra && intra.length >= 2) {
      let filtered = intra;
      if (timeframe === '1D') {
        const lastDayKey = new Date(intra[intra.length - 1].timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const sameDay = intra.filter((p) => new Date(p.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === lastDayKey);
        filtered = sameDay.length >= 2 ? sameDay : intra.slice(-25);
      }
      const relabeled = filtered.map((p) => ({ ...p, time: formatChartTimeLabel(p.timestamp, timeframe) }));
      return { symbol, timeframe, points: relabeled, previousClose: relabeled[0].open, currentPrice: relabeled[relabeled.length - 1].close };
    }
  }

  const daily = readBackendCsvCandles(symbol, 'daily', providerId, cacheRoot);
  if (!daily || daily.length < 2) return null;
  const countMap: Record<Timeframe, number> = {
    '1D': 15, '1W': 10, '1M': 22, '3M': 66, '6M': 130, '1Y': 252, '3Y': 756, '5Y': 1260, ALL: daily.length,
  };
  const sliced = daily.slice(-Math.max(2, countMap[timeframe] || 66)).map((p) => ({
    ...p,
    time: formatChartTimeLabel(p.timestamp, timeframe),
  }));
  return { symbol, timeframe, points: sliced, previousClose: sliced[0].open, currentPrice: sliced[sliced.length - 1].close };
}
