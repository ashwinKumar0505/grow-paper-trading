import type { ChartPoint, Stock, Timeframe } from '../../types/market';
import { formatChartTimeLabel } from './diskCacheReader';
import { INDICES_CATALOG, NSE_SYMBOL_CATALOG } from './symbolCatalog';
import type { StockSearchItem } from './types';

export const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const QUOTE_TTL_MS = 20_000;
export const CHART_TTL_MS = 60_000;
const YAHOO_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
let hostCursor = 0;

export interface YahooChartResponse {
  meta?: Record<string, unknown>;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}

export async function fetchYahooRawChart(
  ttlCache: Map<string, { data: YahooChartResponse; fetchedAt: number }>,
  yahooSymbol: string,
  range = '1d',
  interval = '5m',
  ttlMs = CHART_TTL_MS
): Promise<YahooChartResponse | null> {
  const key = `${yahooSymbol}_${range}_${interval}`;
  const hit = ttlCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < ttlMs) return hit.data;

  for (let attempt = 0; attempt < 2; attempt++) {
    const host = YAHOO_HOSTS[hostCursor++ % YAHOO_HOSTS.length];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);
    try {
      const url = `${host}/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}&includePrePost=false`;
      const res = await fetch(url, { headers: YAHOO_HEADERS, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { chart?: { result?: YahooChartResponse[] } };
      const result = json?.chart?.result?.[0];
      if (!result?.meta) continue;
      ttlCache.set(key, { data: result, fetchedAt: Date.now() });
      return result;
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

export function extractCandlesFromYahooResponse(
  res: YahooChartResponse | null,
  timeframe: Timeframe
): ChartPoint[] {
  if (!res?.meta || !Array.isArray(res.timestamp) || res.timestamp.length === 0) return [];
  const tsList = res.timestamp;
  const q = res.indicators?.quote?.[0] || {};
  const points: ChartPoint[] = [];
  for (let i = 0; i < tsList.length; i++) {
    const c = q.close?.[i];
    if (typeof c !== 'number' || isNaN(c) || c <= 0) continue;
    const o = typeof q.open?.[i] === 'number' && !isNaN(q.open[i]!) ? q.open[i]! : c;
    const h = typeof q.high?.[i] === 'number' && !isNaN(q.high[i]!) ? q.high[i]! : Math.max(o, c);
    const l = typeof q.low?.[i] === 'number' && !isNaN(q.low[i]!) ? q.low[i]! : Math.min(o, c);
    const v = typeof q.volume?.[i] === 'number' && !isNaN(q.volume[i]!) ? q.volume[i]! : 0;
    const tsMs = tsList[i] * 1000;
    points.push({
      time: formatChartTimeLabel(tsMs, timeframe),
      timestamp: tsMs,
      price: Number(c.toFixed(2)),
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: v,
    });
  }
  return points;
}

export function parseYahooStockFromChart(
  symbol: string,
  result: YahooChartResponse,
  providerId: string,
  now: number
): Stock | null {
  const meta = result.meta;
  if (!meta) return null;
  const price = Number(meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  const cat = NSE_SYMBOL_CATALOG[symbol];
  const idxCat = INDICES_CATALOG[symbol];
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = Number((price - prevClose).toFixed(2));
  const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
  const quoteBlock = result.indicators?.quote?.[0];
  const validOpens = (quoteBlock?.open || []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  const validCloses = (quoteBlock?.close || []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  const openPrice = Number(meta.regularMarketOpen ?? validOpens[0] ?? prevClose);
  const highPrice = Number(meta.regularMarketDayHigh ?? Math.max(openPrice, price));
  const lowPrice = Number(meta.regularMarketDayLow ?? Math.min(openPrice, price));
  const volume = typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : 0;
  const w52High = Number(meta.fiftyTwoWeekHigh ?? highPrice);
  const w52Low = Number(meta.fiftyTwoWeekLow ?? lowPrice);
  const quoteTs = typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime * 1000 : now;
  const mcap = typeof meta.marketCap === 'number' && meta.marketCap > 0
    ? `₹${Math.round(meta.marketCap / 10000000).toLocaleString('en-IN')} Cr`
    : null;

  return {
    symbol,
    name: String(idxCat?.name || meta.longName || meta.shortName || cat?.name || symbol),
    sector: idxCat ? 'Index' : cat?.sector || 'Equities',
    exchange: idxCat?.exchange || cat?.exchange || (symbol === 'SENSEX' ? 'BSE' : 'NSE'),
    price: Number(price.toFixed(2)),
    previousClose: Number(prevClose.toFixed(2)),
    change,
    changePercent,
    open: Number(openPrice.toFixed(2)),
    high: Number(highPrice.toFixed(2)),
    low: Number(lowPrice.toFixed(2)),
    close: Number(price.toFixed(2)),
    volume,
    week52High: Number(w52High.toFixed(2)),
    week52Low: Number(w52Low.toFixed(2)),
    fundamentals: {
      available: Boolean(mcap),
      source: mcap ? providerId : 'unavailable',
      marketCap: mcap,
      peRatio: null,
      pbRatio: null,
      industryPe: null,
      debtToEquity: null,
      roe: null,
      divYield: null,
      eps: null,
      bookValue: null,
    },
    about: `${String(meta.longName || cat?.name || symbol)} is listed on the ${cat?.exchange || 'NSE'}.`,
    sparkline: validCloses.length >= 2 ? validCloses.slice(-10) : [prevClose, price],
    lastUpdated: now,
    quoteTimestamp: quoteTs,
    fetchedAt: now,
  };
}

export async function searchYahooEquities(query: string, limit: number): Promise<StockSearchItem[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { quotes?: Array<Record<string, unknown>> };
    const quotes = (data.quotes || []).filter((item) => item.quoteType === 'EQUITY');
    const results = quotes.map((item) => {
      const rawSym = String(item.symbol || '');
      const clean = rawSym.replace(/\.NS$/i, '').replace(/\.BO$/i, '');
      const ex = item.exchange === 'NSI' || item.exchange === 'NSE' ? 'NSE' : item.exchange === 'BSE' ? 'BSE' : String(item.exchange || 'NSE');
      return {
        symbol: clean,
        providerSymbol: rawSym,
        name: String(item.longname || item.shortname || clean),
        exchange: ex,
        sector: String(item.sector || 'Equities'),
        price: typeof item.regularMarketPrice === 'number' ? item.regularMarketPrice : null,
      };
    });
    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}
