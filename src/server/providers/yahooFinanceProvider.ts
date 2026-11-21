import type { IndexData, MarketDepthItem, Stock, StockFundamentals, Timeframe } from '../../types/market';
import { buildMarketDataMetadata, classifyQuoteFreshness, getIndianMarketStatus } from '../../utils/marketHours';
import { roundToTick } from '../../utils/orderEngine';
import { buildChartFromDiskCsv, buildRawStockFromDiskCsv, mapWithConcurrency } from './diskCacheReader';
import { INDICES_CATALOG, NSE_SYMBOL_CATALOG, resolveYahooSymbol } from './symbolCatalog';
import type { MarketDataProvider, ProviderCapabilities, ProviderChartPayload, ProviderResponse, StockSearchItem } from './types';
import {
  CHART_TTL_MS, extractCandlesFromYahooResponse, fetchYahooRawChart,
  parseYahooStockFromChart, QUOTE_TTL_MS, searchYahooEquities, type YahooChartResponse,
} from './yahooHttpClient';

const TIMEFRAME_MAP: Record<Timeframe, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '2m' }, '1W': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' }, '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' }, '1Y': { range: '1y', interval: '1d' },
  '3Y': { range: '3y', interval: '1wk' }, '5Y': { range: '5y', interval: '1wk' },
  ALL: { range: 'max', interval: '1mo' },
};

export class YahooFinanceProvider implements MarketDataProvider {
  readonly id = 'yahoo_finance' as const;
  private ttlCache = new Map<string, { data: YahooChartResponse; fetchedAt: number }>();
  private authenticQuotes = new Map<string, Stock>();
  private authenticIndices = new Map<string, IndexData>();
  private authenticCharts = new Map<string, { payload: ProviderChartPayload; timestamp: number }>();

  getCapabilities(): ProviderCapabilities {
    return {
      providerId: 'yahoo_finance', displayName: 'Yahoo Finance (Development / Delayed Adapter)',
      supportsStockSearch: true, supportsStockQuotes: true, supportsIndexQuotes: true,
      supportsHistoricalCandles: true, supportsIntradayCandles: true,
      supportsFundamentals: false, supportsMarketDepth: false, typicalDelaySeconds: 60,
      isLicensedForCommercialRedistribution: false, isLicensedForPaperTrading: false,
    };
  }

  private annotateStock(stock: Stock, now: number, providerAvailable: boolean): Stock {
    const marketStatus = getIndianMarketStatus(now);
    const quoteTs = stock.quoteTimestamp ?? stock.lastUpdated ?? now;
    const freshnessInfo = classifyQuoteFreshness({ price: stock.price, quoteTimestamp: quoteTs, fetchedAt: stock.fetchedAt ?? now, providerAvailable }, marketStatus, now);
    const dataStatus = buildMarketDataMetadata({ source: providerAvailable ? this.id : `${this.id}_cache`, price: stock.price, quoteTimestamp: quoteTs, fetchedAt: stock.fetchedAt ?? now, providerAvailable, marketStatus, now });
    const prevClose = Number(stock.previousClose || stock.price || 0);
    return {
      ...stock,
      lowerCircuit: stock.lowerCircuit ?? (prevClose > 0 ? roundToTick(prevClose * 0.9) : undefined),
      upperCircuit: stock.upperCircuit ?? (prevClose > 0 ? roundToTick(prevClose * 1.1) : undefined),
      quoteTimestamp: quoteTs, freshness: freshnessInfo.freshness, freshnessLabel: freshnessInfo.label,
      isTradableQuote: freshnessInfo.isTradable, isStale: freshnessInfo.status === 'STALE',
      providerAvailable, staleWarning: freshnessInfo.staleWarning, dataStatus,
    };
  }

  async getStockQuote(rawSymbol: string, now = Date.now()): Promise<ProviderResponse<Stock>> {
    const symbol = rawSymbol.trim().toUpperCase();
    const result = await fetchYahooRawChart(this.ttlCache, resolveYahooSymbol(symbol), '1d', '5m', QUOTE_TTL_MS);
    const parsed = result ? parseYahooStockFromChart(symbol, result, this.id, now) : null;
    if (parsed) {
      const stock = this.annotateStock(parsed, now, true);
      this.authenticQuotes.set(symbol, stock);
      return { available: true, data: stock, metadata: stock.dataStatus! };
    }
    const cached = this.authenticQuotes.get(symbol);
    if (cached) {
      const staleStock = this.annotateStock(cached, now, false);
      return { available: true, data: staleStock, metadata: staleStock.dataStatus! };
    }
    const diskRaw = buildRawStockFromDiskCsv(symbol, now);
    if (diskRaw) {
      const diskStock = this.annotateStock(diskRaw, now, true);
      this.authenticQuotes.set(symbol, diskStock);
      return { available: true, data: diskStock, metadata: diskStock.dataStatus! };
    }
    return { available: false, data: null, metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now }), error: `Authentic market quote for ${symbol} is currently unavailable.` };
  }

  async getStockQuotes(symbols = Object.keys(NSE_SYMBOL_CATALOG), now = Date.now()): Promise<ProviderResponse<Stock[]>> {
    const responses = await mapWithConcurrency(symbols, 8, (s) => this.getStockQuote(s, now));
    const valid = responses.map((r) => r.data).filter((s): s is Stock => s !== null);
    if (valid.length === 0) {
      return { available: false, data: [], metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now }), error: 'No authentic stock quotes are currently available from the provider.' };
    }
    const anyLive = valid.some((s) => s.providerAvailable !== false);
    const first = valid[0];
    return { available: true, data: valid, metadata: first.dataStatus || buildMarketDataMetadata({ source: this.id, price: first.price, quoteTimestamp: first.quoteTimestamp, providerAvailable: anyLive, now }) };
  }

  async getIndexQuotes(now = Date.now()): Promise<ProviderResponse<IndexData[]>> {
    const marketStatus = getIndianMarketStatus(now);
    const items = await Promise.all(
      Object.entries(INDICES_CATALOG).map(async ([symbol, { yahoo, name }]) => {
        const res = await fetchYahooRawChart(this.ttlCache, yahoo, '1d', '15m', QUOTE_TTL_MS);
        const val = Number(res?.meta?.regularMarketPrice ?? res?.meta?.chartPreviousClose ?? 0);
        if (res?.meta && Number.isFinite(val) && val > 0) {
          const prev = Number(res.meta.chartPreviousClose ?? val);
          const change = Number((val - prev).toFixed(2));
          const pct = prev > 0 ? Number(((change / prev) * 100).toFixed(2)) : 0;
          const closes = (res.indicators?.quote?.[0]?.close || []).filter((v): v is number => typeof v === 'number' && !isNaN(v));
          const quoteTs = typeof res.meta.regularMarketTime === 'number' ? res.meta.regularMarketTime * 1000 : now;
          const metaStatus = buildMarketDataMetadata({ source: this.id, price: val, quoteTimestamp: quoteTs, fetchedAt: now, providerAvailable: true, marketStatus, now });
          const idx: IndexData = { symbol, name, value: Number(val.toFixed(2)), change, changePercent: pct, sparkline: closes.length >= 2 ? closes.slice(-10) : [prev, val], quoteTimestamp: quoteTs, fetchedAt: now, freshness: metaStatus.freshness, freshnessLabel: metaStatus.status, isStale: metaStatus.isStale, providerAvailable: true, dataStatus: metaStatus };
          this.authenticIndices.set(symbol, idx);
          return idx;
        }
        const cached = this.authenticIndices.get(symbol);
        if (!cached) return null;
        const staleMeta = buildMarketDataMetadata({ source: `${this.id}_cache`, price: cached.value, quoteTimestamp: cached.quoteTimestamp, fetchedAt: cached.fetchedAt, providerAvailable: false, marketStatus, now });
        return { ...cached, freshness: staleMeta.freshness, freshnessLabel: 'Stale Quote', isStale: true, providerAvailable: false, staleWarning: staleMeta.staleWarning, dataStatus: staleMeta };
      })
    );
    const valid = items.filter((i): i is IndexData => i !== null);
    if (valid.length === 0) return { available: false, data: [], metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, marketStatus, now }), error: 'Market index quotes are currently unavailable.' };
    return { available: true, data: valid, metadata: valid[0].dataStatus! };
  }

  async getHistoricalCandles(rawSymbol: string, timeframe: Timeframe, now = Date.now()): Promise<ProviderResponse<ProviderChartPayload>> {
    const symbol = rawSymbol.trim().toUpperCase();
    const yahooSymbol = resolveYahooSymbol(symbol);
    const chartKey = `${symbol}_${timeframe}`;
    const { range, interval } = TIMEFRAME_MAP[timeframe] || TIMEFRAME_MAP['1D'];
    let res = await fetchYahooRawChart(this.ttlCache, yahooSymbol, range, interval, CHART_TTL_MS);
    let points = extractCandlesFromYahooResponse(res, timeframe);
    if (points.length < 2 && timeframe === '1D') {
      const fallbackRes = await fetchYahooRawChart(this.ttlCache, yahooSymbol, '5d', '5m', CHART_TTL_MS);
      const fallbackPts = extractCandlesFromYahooResponse(fallbackRes, '1D');
      if (fallbackPts.length >= 2) {
        const lastKey = new Date(fallbackPts[fallbackPts.length - 1].timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const sameDay = fallbackPts.filter((p) => new Date(p.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === lastKey);
        points = sameDay.length >= 2 ? sameDay : fallbackPts.slice(-30);
        res = fallbackRes;
      }
    }
    if (res?.meta && points.length >= 2) {
      const lastTs = points[points.length - 1].timestamp;
      const payload: ProviderChartPayload = { symbol, timeframe, points, previousClose: Number(res.meta.chartPreviousClose ?? points[0].open), currentPrice: Number(res.meta.regularMarketPrice ?? points[points.length - 1].close) };
      this.authenticCharts.set(chartKey, { payload, timestamp: lastTs });
      return { available: true, data: payload, metadata: buildMarketDataMetadata({ source: this.id, price: payload.currentPrice ?? undefined, quoteTimestamp: lastTs, fetchedAt: now, freshness: timeframe === '1D' ? undefined : 'HISTORICAL', providerAvailable: true, now }) };
    }
    const cached = this.authenticCharts.get(chartKey);
    if (cached) return { available: true, data: cached.payload, metadata: buildMarketDataMetadata({ source: `${this.id}_cache`, price: cached.payload.currentPrice ?? undefined, quoteTimestamp: cached.timestamp, fetchedAt: now, isStale: true, providerAvailable: false, now }) };
    const diskPayload = buildChartFromDiskCsv(symbol, timeframe);
    if (diskPayload && diskPayload.points.length >= 2) {
      const lastTs = diskPayload.points[diskPayload.points.length - 1].timestamp;
      this.authenticCharts.set(chartKey, { payload: diskPayload, timestamp: lastTs });
      return { available: true, data: diskPayload, metadata: buildMarketDataMetadata({ source: 'nse_cached_ohlcv', price: diskPayload.currentPrice ?? undefined, quoteTimestamp: lastTs, fetchedAt: now, freshness: 'HISTORICAL', providerAvailable: true, now }) };
    }
    return { available: false, data: null, metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now }), error: `Authentic historical candle data is unavailable for ${symbol} (${timeframe}).` };
  }

  async getIntradayCandles(symbol: string, _interval: '2m' | '5m' | '15m' = '5m', now = Date.now()): Promise<ProviderResponse<ProviderChartPayload>> {
    return this.getHistoricalCandles(symbol, '1D', now);
  }

  async getFundamentals(_symbol: string, now = Date.now()): Promise<ProviderResponse<StockFundamentals>> {
    return { available: false, data: { available: false, source: 'unavailable', marketCap: null, peRatio: null, pbRatio: null, industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null }, metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now }), error: 'Detailed fundamental ratios require an authorized financial statement feed.' };
  }

  async getMarketDepth(symbol: string, now = Date.now()): Promise<ProviderResponse<MarketDepthItem>> {
    return { available: false, data: { available: false, source: this.id, reason: `Authentic 5-level exchange order book depth is unavailable for ${symbol} on the current market data adapter.`, timestamp: null, bids: [], asks: [], totalBuyQty: 0, totalSellQty: 0 }, metadata: buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now }), error: 'Market depth is not supported by the active market data provider.' };
  }

  async searchStocks(query: string, limit = 8, now = Date.now()): Promise<ProviderResponse<StockSearchItem[]>> {
    const q = query.trim().toLowerCase();
    if (!q) return { available: true, data: [], metadata: buildMarketDataMetadata({ source: this.id, price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
    const remote = await searchYahooEquities(q, limit);
    if (remote) return { available: true, data: remote, metadata: buildMarketDataMetadata({ source: this.id, price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
    const catalogMatches: StockSearchItem[] = Object.values(NSE_SYMBOL_CATALOG).filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, limit).map((s) => ({ symbol: s.symbol, providerSymbol: s.yahooSymbol, name: s.name, exchange: s.exchange, sector: s.sector, price: this.authenticQuotes.get(s.symbol)?.price ?? null }));
    return { available: true, data: catalogMatches, metadata: buildMarketDataMetadata({ source: 'nse_symbol_catalog', price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
  }

  seedAuthenticQuote(stock: Stock): void {
    this.authenticQuotes.set(stock.symbol.toUpperCase(), stock);
  }
}
