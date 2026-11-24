import { Router, type Request, type Response } from 'express';
import type { Timeframe } from '../../types/market';
import { getIndianMarketStatus } from '../../utils/marketHours';
import { sanitizeErrorMessage } from '../middleware/security';
import { marketDataRegistry } from '../providers/providerRegistry';
import { handleScreenerProxyRequest } from './screenerProxyRoute';

export function createMarketRouter(): Router {
  const router = Router();

  router.get('/market/status', (_req: Request, res: Response) => {
    const now = Date.now();
    const marketStatus = getIndianMarketStatus(now);
    const policies = marketDataRegistry.getPolicies();
    const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
    res.json({
      success: true,
      marketStatus,
      capabilities: provider.getCapabilities(),
      policies: {
        environment: policies.environment,
        stockAnalytics: { providerId: policies.stockAnalytics.providerId, authorized: policies.stockAnalytics.authorized },
        paperTrading: { providerId: policies.paperTrading.providerId, authorized: policies.paperTrading.authorized },
        historicalReplay: { providerId: policies.historicalReplay.providerId, authorized: policies.historicalReplay.authorized },
      },
      timestamp: now,
    });
  });

  router.get('/market/indices', async (_req: Request, res: Response) => {
    const now = Date.now();
    const marketStatus = getIndianMarketStatus(now);
    try {
      const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
      const result = await provider.getIndexQuotes(now);
      if (!result.available || !result.data || result.data.length === 0) {
        res.status(503).json({
          success: false, available: false, indices: [], marketStatus, freshness: 'UNAVAILABLE',
          metadata: result.metadata, message: result.error || 'Market index quotes are currently unavailable.', timestamp: now,
        });
        return;
      }
      res.json({
        success: true, available: true, indices: result.data, marketStatus,
        freshness: result.metadata.freshness, metadata: result.metadata, timestamp: now,
      });
    } catch (err) {
      res.status(503).json({
        success: false, available: false, indices: [], marketStatus, freshness: 'UNAVAILABLE',
        message: sanitizeErrorMessage(err, 'Unable to fetch market indices.'), timestamp: now,
      });
    }
  });

  router.get('/stocks', async (_req: Request, res: Response) => {
    const now = Date.now();
    const marketStatus = getIndianMarketStatus(now);
    try {
      const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
      const result = await provider.getStockQuotes(undefined, now);
      if (!result.available || !result.data || result.data.length === 0) {
        res.status(503).json({
          success: false, available: false, stocks: [], marketStatus, freshness: 'UNAVAILABLE',
          metadata: result.metadata, message: result.error || 'Stock quotes are currently unavailable from the market data provider.', timestamp: now,
        });
        return;
      }
      res.json({
        success: true, available: true, stocks: result.data, marketStatus,
        freshness: result.metadata.freshness, metadata: result.metadata, timestamp: now,
      });
    } catch (err) {
      res.status(503).json({
        success: false, available: false, stocks: [], marketStatus, freshness: 'UNAVAILABLE',
        message: sanitizeErrorMessage(err, 'Unable to fetch stock quotes.'), timestamp: now,
      });
    }
  });

  router.get('/stocks/:symbol', async (req: Request, res: Response) => {
    const symbol = decodeURIComponent(req.params.symbol || '').trim().toUpperCase();
    const now = Date.now();
    const marketStatus = getIndianMarketStatus(now);
    if (!symbol) {
      res.status(400).json({ success: false, message: 'Stock symbol is required.' });
      return;
    }

    try {
      const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
      const result = await provider.getStockQuote(symbol, now);
      if (!result.available || !result.data) {
        res.status(503).json({
          success: false, available: false, freshness: 'UNAVAILABLE', metadata: result.metadata, marketStatus,
          message: result.error || `Authentic market quote for ${symbol} is currently unavailable.`,
        });
        return;
      }
      let stock = result.data;
      if (!stock.fundamentals?.available && stock.sector !== 'Index') {
        const fundRes = await provider.getFundamentals(symbol, now).catch(() => null);
        if (fundRes?.available && fundRes.data?.available) {
          const updated = await provider.getStockQuote(symbol, now).catch(() => null);
          stock = updated?.data || { ...stock, fundamentals: fundRes.data };
        }
      }
      res.json({ success: true, available: true, stock, metadata: result.metadata, marketStatus });
    } catch (err) {
      res.status(503).json({
        success: false, available: false, freshness: 'UNAVAILABLE', marketStatus,
        message: sanitizeErrorMessage(err, 'Stock data not available'),
      });
    }
  });

  router.get('/stocks/:symbol/chart', async (req: Request, res: Response) => {
    const symbol = decodeURIComponent(req.params.symbol || '').trim().toUpperCase();
    const rawTf = String(req.query.timeframe || '1D').toUpperCase();
    const validTimeframes = new Set(['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL']);
    const timeframe = (validTimeframes.has(rawTf) ? rawTf : '1D') as Timeframe;
    const now = Date.now();

    try {
      const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
      const result = await provider.getHistoricalCandles(symbol, timeframe, now);
      if (!result.available || !result.data || result.data.points.length === 0) {
        res.status(503).json({
          success: false, available: false, symbol, timeframe, points: [], freshness: 'UNAVAILABLE',
          metadata: result.metadata,
          message: result.error || `Historical chart candles for ${symbol} (${timeframe}) are currently unavailable.`,
        });
        return;
      }
      res.json({
        success: true, available: true, symbol, timeframe,
        points: result.data.points, previousClose: result.data.previousClose, currentPrice: result.data.currentPrice,
        simulated: false, freshness: result.metadata.freshness, isStale: result.metadata.isStale,
        staleWarning: result.metadata.staleWarning, metadata: result.metadata,
      });
    } catch (err) {
      res.status(503).json({
        success: false, available: false, symbol, timeframe, points: [], freshness: 'UNAVAILABLE',
        message: sanitizeErrorMessage(err, 'Chart data unavailable for this symbol'),
      });
    }
  });

  router.get('/stocks/:symbol/depth', async (req: Request, res: Response) => {
    const symbol = decodeURIComponent(req.params.symbol || '').trim().toUpperCase();
    const now = Date.now();
    const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
    const result = await provider.getMarketDepth(symbol, now);
    res.status(result.available ? 200 : 503).json({
      success: result.available, available: result.available, symbol,
      depth: result.data, metadata: result.metadata, message: result.error,
    });
  });

  router.get('/search', async (req: Request, res: Response) => {
    const query = String(req.query.q || '').trim();
    const now = Date.now();
    if (!query) {
      res.json({ success: true, results: [] });
      return;
    }
    const provider = marketDataRegistry.getProviderForUseCase('stock_analytics');
    const result = await provider.searchStocks(query, 8, now);
    return res.json({
      success: result.available,
      results: (result.data || []).map((item) => ({
        symbol: item.symbol, yahooSymbol: item.providerSymbol, name: item.name,
        exchange: item.exchange, sector: item.sector, price: item.price,
      })),
      metadata: result.metadata,
    });
  });

  router.all('/v1/*', handleScreenerProxyRequest);
  return router;
}
