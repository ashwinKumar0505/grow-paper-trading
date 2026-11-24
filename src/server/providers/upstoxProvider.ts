import type { IndexData, MarketDepthItem, Stock, StockFundamentals, Timeframe } from '../../types/market';
import { buildMarketDataMetadata } from '../../utils/marketHours';
import {
  isSupportedSymbolFormat, NSE_SYMBOL_CATALOG,
  resolveCanonicalSymbol, resolveCatalogUpstoxInstrumentKey,
} from './symbolCatalog';
import type {
  MarketDataProvider, ProviderCapabilities, ProviderChartPayload,
  ProviderResponse, StockSearchItem,
} from './types';
import { fetchUpstoxHistoricalChart, mergeUpstoxCandles, type CachedChartEntry } from './upstoxCandles';
import {
  extractIsinFromInstrumentKey, fetchUpstoxFundamentals,
  resolveCatalogIsin, type CachedFundamentalsEntry,
} from './upstoxFundamentals';
import { UpstoxHttpClient } from './upstoxHttpClient';
import { normalizeUpstoxSearchResults } from './upstoxNormalizer';
import {
  fetchUpstoxBulkQuotes, fetchUpstoxIndexQuotes,
  type CachedIndexEntry, type CachedQuoteEntry,
} from './upstoxQuotes';
import type { UpstoxHttpClientOptions } from './upstoxTypes';

const SEARCH_TTL_MS = 300_000;

export class UpstoxMarketDataProvider implements MarketDataProvider {
  readonly id = 'upstox' as const;
  private client: UpstoxHttpClient;
  private env: Record<string, string | undefined>;
  private diskCacheRoot?: string;
  private dynamicInstruments = new Map<string, { instrumentKey: string; name: string }>();
  private authenticQuotes = new Map<string, CachedQuoteEntry>();
  private authenticIndices = new Map<string, CachedIndexEntry>();
  private authenticCharts = new Map<string, CachedChartEntry>();
  private authenticFundamentals = new Map<string, CachedFundamentalsEntry>();
  private searchCache = new Map<string, { items: StockSearchItem[]; cachedAt: number }>();

  constructor(options: UpstoxHttpClientOptions & { diskCacheRoot?: string } = {}) {
    this.env = options.env ?? process.env;
    this.diskCacheRoot = options.diskCacheRoot;
    this.client = new UpstoxHttpClient(options);
  }

  getCapabilities(): ProviderCapabilities {
    const tokenConfigured = this.client.hasAnalyticsToken();
    return {
      providerId: 'upstox',
      displayName: 'Upstox Market Data API (Analytics Token)',
      supportsStockSearch: true,
      supportsStockQuotes: true,
      supportsIndexQuotes: true,
      supportsHistoricalCandles: true,
      supportsIntradayCandles: true,
      supportsFundamentals: tokenConfigured,
      supportsMarketDepth: tokenConfigured,
      typicalDelaySeconds: 1,
      isLicensedForCommercialRedistribution:
        tokenConfigured && this.env.UPSTOX_COMMERCIAL_REDISTRIBUTION_AUTHORIZED === 'true',
      isLicensedForPaperTrading:
        tokenConfigured && this.env.UPSTOX_PAPER_TRADING_AUTHORIZED === 'true',
    };
  }

  private async resolveInstrumentKey(rawSymbol: string): Promise<string | null> {
    if (!isSupportedSymbolFormat(rawSymbol)) return null;
    const fromCatalog = resolveCatalogUpstoxInstrumentKey(rawSymbol);
    if (fromCatalog) return fromCatalog;
    const canonical = resolveCanonicalSymbol(rawSymbol);
    const cached = this.dynamicInstruments.get(canonical);
    if (cached) return cached.instrumentKey;
    if (!this.client.hasAnalyticsToken()) return null;
    try {
      const results = await this.client.searchInstruments(canonical, 10);
      const { discoveredKeys } = normalizeUpstoxSearchResults(results, 10, () => null);
      for (const [sym, info] of discoveredKeys) this.dynamicInstruments.set(sym, info);
      return this.dynamicInstruments.get(canonical)?.instrumentKey ?? null;
    } catch {
      return null;
    }
  }

  private unavailableMeta(now: number) {
    return buildMarketDataMetadata({ source: this.id, freshness: 'UNAVAILABLE', providerAvailable: false, now });
  }

  async getStockQuotes(symbols = Object.keys(NSE_SYMBOL_CATALOG), now = Date.now()): Promise<ProviderResponse<Stock[]>> {
    const res = await fetchUpstoxBulkQuotes({
      client: this.client, symbols, now,
      resolveKey: (sym) => this.resolveInstrumentKey(sym),
      quoteCache: this.authenticQuotes, dynamicInstruments: this.dynamicInstruments,
    });
    if (res.data) {
      res.data = res.data.map((s) => {
        const hit = this.authenticFundamentals.get(s.symbol);
        return hit?.fundamentals.available ? { ...s, fundamentals: hit.fundamentals, about: hit.about || s.about } : s;
      });
    }
    return res;
  }

  async getStockQuote(rawSymbol: string, now = Date.now()): Promise<ProviderResponse<Stock>> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!isSupportedSymbolFormat(symbol)) {
      return { available: false, data: null, metadata: this.unavailableMeta(now), error: `Unsupported NSE symbol '${symbol}'.` };
    }
    const batch = await this.getStockQuotes([symbol], now);
    const stock = batch.data?.[0] ?? null;
    if (!stock) {
      return { available: false, data: null, metadata: batch.metadata, error: batch.error || `Authentic market quote for ${symbol} is currently unavailable.` };
    }
    return { available: true, data: stock, metadata: stock.dataStatus! };
  }

  async getIndexQuotes(now = Date.now()): Promise<ProviderResponse<IndexData[]>> {
    return fetchUpstoxIndexQuotes({ client: this.client, now, indexCache: this.authenticIndices });
  }

  async getHistoricalCandles(rawSymbol: string, timeframe: Timeframe, now = Date.now()): Promise<ProviderResponse<ProviderChartPayload>> {
    const symbol = rawSymbol.trim().toUpperCase();
    const instrumentKey = await this.resolveInstrumentKey(symbol);
    if (!instrumentKey) {
      return { available: false, data: null, metadata: this.unavailableMeta(now), error: `No Upstox instrument mapping found for '${symbol}'.` };
    }
    return fetchUpstoxHistoricalChart({
      client: this.client, symbol, instrumentKey, timeframe, now,
      chartCache: this.authenticCharts, cachedQuote: this.authenticQuotes.get(symbol)?.stock,
      diskCacheRoot: this.diskCacheRoot,
    });
  }

  async getIntradayCandles(symbol: string, interval: '2m' | '5m' | '15m' = '5m', now = Date.now()): Promise<ProviderResponse<ProviderChartPayload>> {
    const upper = symbol.trim().toUpperCase();
    const key = await this.resolveInstrumentKey(upper);
    if (!key) return this.getHistoricalCandles(upper, '1D', now);
    try {
      const raw = await this.client.getIntradayCandles(key, 'minutes', interval === '2m' ? 2 : interval === '15m' ? 15 : 5);
      const points = mergeUpstoxCandles([], raw, '1D', false);
      if (points.length >= 2) {
        const last = points[points.length - 1];
        return {
          available: true,
          data: { symbol: upper, timeframe: '1D', points, previousClose: points[0].open, currentPrice: last.close },
          metadata: buildMarketDataMetadata({ source: this.id, price: last.close, quoteTimestamp: last.timestamp, fetchedAt: now, providerAvailable: true, now }),
        };
      }
    } catch { /* fall through to 1D fallback */ }
    return this.getHistoricalCandles(upper, '1D', now);
  }

  async getFundamentals(rawSymbol: string, now = Date.now()): Promise<ProviderResponse<StockFundamentals>> {
    const symbol = rawSymbol.trim().toUpperCase();
    const isin = resolveCatalogIsin(symbol) ?? extractIsinFromInstrumentKey(await this.resolveInstrumentKey(symbol));
    const hit = this.authenticQuotes.get(symbol);
    const price = hit?.stock.price ?? null;
    const res = await fetchUpstoxFundamentals({ client: this.client, symbol, isin, currentPrice: price, now, cache: this.authenticFundamentals });
    if (res?.fundamentals.available) {
      if (hit) this.authenticQuotes.set(symbol, { ...hit, stock: { ...hit.stock, fundamentals: res.fundamentals, about: res.about || hit.stock.about } });
      return { available: true, data: res.fundamentals, metadata: buildMarketDataMetadata({ source: this.id, price: price ?? 1, quoteTimestamp: now, providerAvailable: true, now }) };
    }
    return {
      available: false,
      data: { available: false, source: 'unavailable', marketCap: null, peRatio: null, pbRatio: null, industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null },
      metadata: this.unavailableMeta(now),
      error: 'Fundamental ratios are served via Stock Analysis financial statements.',
    };
  }

  async getMarketDepth(rawSymbol: string, now = Date.now()): Promise<ProviderResponse<MarketDepthItem>> {
    const symbol = rawSymbol.trim().toUpperCase();
    const quote = this.client.hasAnalyticsToken() && isSupportedSymbolFormat(symbol) ? await this.getStockQuote(symbol, now) : null;
    if (quote?.data?.marketDepth?.available) return { available: true, data: quote.data.marketDepth, metadata: quote.metadata };
    return {
      available: false,
      data: { available: false, source: this.id, reason: `Authentic 5-level exchange order book depth is not enabled for ${symbol} on the current adapter.`, timestamp: null, bids: [], asks: [], totalBuyQty: 0, totalSellQty: 0 },
      metadata: this.unavailableMeta(now),
      error: 'Market depth is not enabled on the active market data provider.',
    };
  }

  async searchStocks(query: string, limit = 8, now = Date.now()): Promise<ProviderResponse<StockSearchItem[]>> {
    const q = query.trim();
    if (!q) return { available: true, data: [], metadata: buildMarketDataMetadata({ source: this.id, price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
    const cacheKey = `${q.toLowerCase()}:${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && now - cached.cachedAt < SEARCH_TTL_MS) {
      return { available: true, data: cached.items, metadata: buildMarketDataMetadata({ source: this.id, price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
    }

    const searchQuery = resolveCanonicalSymbol(q);
    try {
      const raw = await this.client.searchInstruments(searchQuery, limit);
      const { items, discoveredKeys } = normalizeUpstoxSearchResults(raw, limit, (s) => this.authenticQuotes.get(s)?.stock.price ?? null);
      for (const [sym, info] of discoveredKeys) this.dynamicInstruments.set(sym, info);
      if (items.length > 0) {
        this.searchCache.set(cacheKey, { items, cachedAt: now });
        return { available: true, data: items, metadata: buildMarketDataMetadata({ source: this.id, price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
      }
    } catch { /* fall back to static NSE catalog metadata without fabricating prices */ }

    const lower = q.toLowerCase();
    const canonLower = searchQuery.toLowerCase();
    const matches: StockSearchItem[] = Object.values(NSE_SYMBOL_CATALOG)
      .filter((s) => s.symbol.toLowerCase().includes(lower) || s.canonicalSymbol.toLowerCase().includes(canonLower) || s.name.toLowerCase().includes(lower))
      .slice(0, limit)
      .map((s) => ({
        symbol: s.symbol, providerSymbol: s.yahooSymbol, name: s.name, exchange: s.exchange,
        sector: s.sector, price: this.authenticQuotes.get(s.symbol)?.stock.price ?? null,
      }));
    return { available: true, data: matches, metadata: buildMarketDataMetadata({ source: 'nse_symbol_catalog', price: 1, quoteTimestamp: now, providerAvailable: true, now }) };
  }

  seedAuthenticQuote(stock: Stock, cachedAt = Date.now()): void {
    this.authenticQuotes.set(stock.symbol.toUpperCase(), { stock, cachedAt });
  }
}
