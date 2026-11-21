import type {
  ChartPoint,
  IndexData,
  MarketDataMetadata,
  QuoteFreshness,
  Stock,
  Timeframe,
} from '../../../types/market';

export interface ChartFetchResult {
  available: boolean;
  points: ChartPoint[] | null;
  previousClose?: number;
  currentPrice?: number;
  metadata?: MarketDataMetadata;
  isStale?: boolean;
  staleWarning?: string;
  error?: string;
}

export async function fetchChartWithStatus(
  symbol: string,
  timeframe: Timeframe
): Promise<ChartFetchResult> {
  try {
    const res = await fetch(
      `/api/stocks/${encodeURIComponent(symbol)}/chart?timeframe=${encodeURIComponent(timeframe)}`
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !Array.isArray(data.points) || data.points.length === 0) {
      return {
        available: false,
        points: null,
        metadata: data?.metadata,
        error: data?.message || 'Historical chart data is currently unavailable from the provider.',
      };
    }
    return {
      available: true,
      points: data.points as ChartPoint[],
      previousClose: typeof data.previousClose === 'number' ? data.previousClose : undefined,
      currentPrice: typeof data.currentPrice === 'number' ? data.currentPrice : undefined,
      metadata: data.metadata as MarketDataMetadata | undefined,
      isStale: Boolean(data.isStale || data.metadata?.isStale || data.freshness === 'STALE'),
      staleWarning: data.staleWarning || data.metadata?.staleWarning,
    };
  } catch {
    return {
      available: false,
      points: null,
      error: 'Unable to reach market data server for chart candles.',
    };
  }
}

export async function fetchRealChart(
  symbol: string,
  timeframe: Timeframe
): Promise<ChartPoint[] | null> {
  const result = await fetchChartWithStatus(symbol, timeframe);
  return result.available ? result.points : null;
}

export async function fetchIndices() {
  const response = await fetch('/api/market/indices');
  if (!response.ok) return null;
  return response.json() as Promise<{
    success: boolean;
    indices: IndexData[];
    freshness?: QuoteFreshness;
    metadata?: MarketDataMetadata;
  }>;
}

export async function fetchStocks() {
  const response = await fetch('/api/stocks');
  if (!response.ok) return null;
  return response.json() as Promise<{
    success: boolean;
    stocks: Stock[];
    freshness?: QuoteFreshness;
    metadata?: MarketDataMetadata;
  }>;
}

export async function fetchPortfolioQuote(symbol: string, signal: AbortSignal) {
  const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, { signal });
  if (!response.ok) return null;
  return response.json() as Promise<{
    success: boolean;
    stock?: Stock;
    metadata?: MarketDataMetadata;
  }>;
}
