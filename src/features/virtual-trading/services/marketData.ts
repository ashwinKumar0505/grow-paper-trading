import type { ChartPoint,IndexData,QuoteFreshness,Stock,Timeframe } from '../../../types/market';

  // Fetch real chart data for given symbol & timeframe
export async function fetchRealChart(symbol: string, timeframe: Timeframe): Promise<ChartPoint[] | null> {
    try {
      const res = await fetch(`/api/stocks/${symbol}/chart?timeframe=${timeframe}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.points) && data.points.length > 0) {
        return data.points;
      }
    } catch {
      // Fallback
    }
    return null;
}


export async function fetchIndices() {
  const response = await fetch('/api/market/indices');
  if (!response.ok) return null;
  return response.json() as Promise<{ success: boolean; indices: IndexData[] }>;
}

export async function fetchStocks() {
  const response = await fetch('/api/stocks');
  if (!response.ok) return null;
  return response.json() as Promise<{ success: boolean; stocks: Stock[]; freshness?: QuoteFreshness }>;
}

export async function fetchPortfolioQuote(symbol: string, signal: AbortSignal) {
  const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, { signal });
  if (!response.ok) return null;
  return response.json() as Promise<{ success: boolean; stock?: Stock }>;
}
