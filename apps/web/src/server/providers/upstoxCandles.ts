import type { ChartPoint, Stock, Timeframe } from '../../types/market';
import { buildMarketDataMetadata } from '../../utils/marketHours';
import { buildChartFromDiskCsv, formatChartTimeLabel } from './diskCacheReader';
import type { ProviderChartPayload, ProviderResponse } from './types';
import type { UpstoxHttpClient } from './upstoxHttpClient';
import { formatIstDateOffset, parseUpstoxTimestampMs, toFinitePositive, toIstDateKey } from './upstoxNormalizer';
import { UpstoxApiError, type UpstoxRawCandle } from './upstoxTypes';
import { setBoundedMapEntry } from '../utils/boundedCache';

export const CHART_TTL_MS = 60_000;
export const MAX_CHART_CACHE_ENTRIES = 40;

interface TimeframeSpec {
  unit: 'minutes' | 'days' | 'weeks' | 'months';
  interval: number;
  lookbackDays: number;
  includeIntraday: boolean;
  dedupeByDate: boolean;
}

const TIMEFRAME_SPECS: Record<Timeframe, TimeframeSpec> = {
  '1D': { unit: 'minutes', interval: 2, lookbackDays: 0, includeIntraday: true, dedupeByDate: false },
  '1W': { unit: 'minutes', interval: 15, lookbackDays: 10, includeIntraday: true, dedupeByDate: false },
  '1M': { unit: 'days', interval: 1, lookbackDays: 35, includeIntraday: true, dedupeByDate: true },
  '3M': { unit: 'days', interval: 1, lookbackDays: 95, includeIntraday: true, dedupeByDate: true },
  '6M': { unit: 'days', interval: 1, lookbackDays: 190, includeIntraday: true, dedupeByDate: true },
  '1Y': { unit: 'days', interval: 1, lookbackDays: 370, includeIntraday: true, dedupeByDate: true },
  '3Y': { unit: 'weeks', interval: 1, lookbackDays: 1100, includeIntraday: false, dedupeByDate: false },
  '5Y': { unit: 'weeks', interval: 1, lookbackDays: 1830, includeIntraday: false, dedupeByDate: false },
  ALL: { unit: 'months', interval: 1, lookbackDays: 9500, includeIntraday: false, dedupeByDate: false },
};

export interface CachedChartEntry {
  payload: ProviderChartPayload;
  timestamp: number;
  cachedAt: number;
}

export function mergeUpstoxCandles(
  historicalRaw: UpstoxRawCandle[],
  intradayRaw: UpstoxRawCandle[],
  timeframe: Timeframe,
  dedupeByIstDate: boolean
): ChartPoint[] {
  const deduped = new Map<string, ChartPoint>();
  const ingest = (rawList: UpstoxRawCandle[]) => {
    for (const bar of rawList) {
      if (!Array.isArray(bar) || bar.length < 6) continue;
      const ts = parseUpstoxTimestampMs(bar[0]);
      const c = toFinitePositive(bar[4]);
      if (ts === null || c === null) continue;
      const o = toFinitePositive(bar[1]) ?? c;
      const h = Math.max(toFinitePositive(bar[2]) ?? c, o, c);
      const l = Math.min(toFinitePositive(bar[3]) ?? c, o, c);
      const v = typeof bar[5] === 'number' && Number.isFinite(bar[5]) && bar[5] >= 0 ? Math.round(bar[5]) : 0;
      deduped.set(dedupeByIstDate ? toIstDateKey(ts) : String(ts), {
        time: formatChartTimeLabel(ts, timeframe),
        timestamp: ts,
        price: Number(c.toFixed(2)),
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: v,
      });
    }
  };
  ingest(historicalRaw);
  ingest(intradayRaw);
  return Array.from(deduped.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchUpstoxHistoricalChart(params: {
  client: UpstoxHttpClient;
  symbol: string;
  instrumentKey: string;
  timeframe: Timeframe;
  now: number;
  chartCache: Map<string, CachedChartEntry>;
  cachedQuote?: Stock;
  diskCacheRoot?: string;
}): Promise<ProviderResponse<ProviderChartPayload>> {
  const { client, symbol, instrumentKey, timeframe, now, chartCache, cachedQuote, diskCacheRoot } = params;
  const chartKey = `${symbol}_${timeframe}`;
  const hit = chartCache.get(chartKey);
  if (hit && now - hit.cachedAt < CHART_TTL_MS) {
    return {
      available: true,
      data: hit.payload,
      metadata: buildMarketDataMetadata({
        source: 'upstox', price: hit.payload.currentPrice ?? undefined, quoteTimestamp: hit.timestamp,
        fetchedAt: hit.cachedAt, freshness: timeframe === '1D' ? undefined : 'HISTORICAL', providerAvailable: true, now,
      }),
    };
  }

  const spec = TIMEFRAME_SPECS[timeframe] || TIMEFRAME_SPECS['1D'];
  let lastErr: unknown = null;
  try {
    const toDate = formatIstDateOffset(now, 0);
    const fromDate = timeframe === 'ALL' ? '2000-01-01' : formatIstDateOffset(now, -spec.lookbackDays);
    let historicalRaw: UpstoxRawCandle[] = [];
    let intradayRaw: UpstoxRawCandle[] = [];

    if (spec.lookbackDays > 0) {
      historicalRaw = await client.getHistoricalCandles(instrumentKey, spec.unit, spec.interval, toDate, fromDate);
    }
    if (spec.includeIntraday && (spec.unit === 'minutes' || spec.unit === 'days')) {
      try {
        intradayRaw = await client.getIntradayCandles(instrumentKey, spec.unit, spec.interval);
      } catch (err) {
        if (spec.lookbackDays === 0) throw err;
      }
    }

    let points = mergeUpstoxCandles(historicalRaw, intradayRaw, timeframe, spec.dedupeByDate);
    if (timeframe === '1D' && points.length < 2) {
      const recentRaw = await client.getHistoricalCandles(instrumentKey, 'minutes', 5, toDate, formatIstDateOffset(now, -7));
      const recentPts = mergeUpstoxCandles(recentRaw, [], '1D', false);
      if (recentPts.length >= 2) {
        const lastDay = toIstDateKey(recentPts[recentPts.length - 1].timestamp);
        const sameDay = recentPts.filter((p) => toIstDateKey(p.timestamp) === lastDay);
        points = sameDay.length >= 2 ? sameDay : recentPts.slice(-30);
      }
    }

    if (points.length >= 2) {
      const previousClose = timeframe === '1D' && cachedQuote?.previousClose ? cachedQuote.previousClose : points[0].open;
      const currentPrice = timeframe === '1D' && cachedQuote?.price ? cachedQuote.price : points[points.length - 1].close;
      const payload: ProviderChartPayload = { symbol, timeframe, points, previousClose, currentPrice };
      const lastTs = points[points.length - 1].timestamp;
      setBoundedMapEntry(chartCache, chartKey, { payload, timestamp: lastTs, cachedAt: now }, MAX_CHART_CACHE_ENTRIES);
      return {
        available: true,
        data: payload,
        metadata: buildMarketDataMetadata({
          source: 'upstox', price: currentPrice, quoteTimestamp: lastTs, fetchedAt: now,
          freshness: timeframe === '1D' ? undefined : 'HISTORICAL', providerAvailable: true, now,
        }),
      };
    }
  } catch (err) {
    lastErr = err;
  }

  if (hit) {
    return {
      available: true,
      data: hit.payload,
      metadata: buildMarketDataMetadata({
        source: 'upstox_cache', price: hit.payload.currentPrice ?? undefined,
        quoteTimestamp: hit.timestamp, fetchedAt: now, isStale: true, providerAvailable: false, now,
      }),
    };
  }

  const diskPayload = buildChartFromDiskCsv(symbol, timeframe, 'upstox', diskCacheRoot);
  if (diskPayload && diskPayload.points.length >= 2) {
    const lastTs = diskPayload.points[diskPayload.points.length - 1].timestamp;
    return {
      available: true,
      data: diskPayload,
      metadata: buildMarketDataMetadata({
        source: 'upstox_cached_ohlcv', price: diskPayload.currentPrice ?? undefined,
        quoteTimestamp: lastTs, fetchedAt: now, freshness: 'HISTORICAL', providerAvailable: true, now,
      }),
    };
  }

  return {
    available: false,
    data: null,
    metadata: buildMarketDataMetadata({ source: 'upstox', freshness: 'UNAVAILABLE', providerAvailable: false, now }),
    error: lastErr instanceof UpstoxApiError ? lastErr.message : `Authentic historical candle data is unavailable for ${symbol} (${timeframe}).`,
  };
}
