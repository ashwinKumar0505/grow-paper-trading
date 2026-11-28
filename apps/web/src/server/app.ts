import express, { type Express } from 'express';
import type { Stock } from '../types/market';
import {
  getIndianMarketStatus,
  isPastIntradayCutoff,
  isPastSessionClose,
} from '../utils/marketHours';
import {
  pruneRateLimitBuckets,
  securityHeadersAndCors,
  type AuthenticatedRequest,
} from './middleware/security';
import { pruneOtpRateLimits } from './auth/otpService';
import { marketDataRegistry } from './providers/providerRegistry';
import { createAuthRouter } from './routes/authRoutes';
import { createMarketRouter } from './routes/marketRoutes';
import { createPaperTradingRouter } from './routes/paperTradingRoutes';
import { createPaymentRouter } from './routes/paymentRoutes';
import { createSeoInfraRouter } from './seo/seoRoutes';
import { defaultStore, type DurableStore } from './storage/durableStore';
import { processAccountBackgroundQueue } from './trading/tradingLedger';

let backgroundTickInFlight = false;

export function getServerMemorySnapshot() {
  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / 1_048_576) * 10) / 10;
  return {
    rssMb: toMb(mem.rss),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
  };
}

export function pruneServerIdleCaches(
  store: DurableStore = defaultStore,
  now = Date.now()
): void {
  marketDataRegistry.pruneExpiredCaches(now);
  pruneRateLimitBuckets(now);
  pruneOtpRateLimits(now);
  store.pruneExpiredState(now);
}

export function createExpressApp(store: DurableStore = defaultStore): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.json({
      status: 'ok',
      service: 'tradedia-web',
      storage: store.getStorageMode(),
      environment: process.env.NODE_ENV || 'development',
      memory: getServerMemorySnapshot(),
      timestamp: Date.now(),
    });
  });

  app.use(securityHeadersAndCors);
  app.use(createSeoInfraRouter());

  app.use('/api', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use(
    express.json({
      limit: '100kb',
      verify: (req, _res, buf) => {
        (req as AuthenticatedRequest).rawBody = buf;
      },
    })
  );

  app.use('/api', createMarketRouter());
  app.use('/api', createAuthRouter(store));
  app.use('/api', createPaymentRouter(store));
  app.use('/api', createPaperTradingRouter(store));
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'API endpoint not found.',
    });
  });

  return app;
}

export async function runServerBackgroundTradingTick(
  store: DurableStore = defaultStore,
  now = Date.now()
): Promise<void> {
  if (backgroundTickInFlight) return;
  backgroundTickInFlight = true;
  try {
    const marketStatus = getIndianMarketStatus(now);
    const ledgers = Object.values(store.getState().tradingLedgers);

    const activeLedgers = ledgers.filter((l) => {
      if (marketStatus.isOpen) {
        return (
          l.orders.some((o) => o.status === 'SCHEDULED' || o.status === 'PENDING') ||
          l.positions.length > 0
        );
      }
      // Outside regular NSE hours: only process ledgers with overdue RMS square-offs or expirable orders
      const hasOverduePosition = l.positions.some((p) => isPastIntradayCutoff(p.timestamp, now));
      const hasExpirableOrder = l.orders.some((o) => {
        if (o.status === 'PENDING') {
          return o.product === 'INTRADAY'
            ? isPastIntradayCutoff(o.timestamp, now)
            : isPastSessionClose(o.timestamp, now);
        }
        if (o.status === 'SCHEDULED' && o.scheduledForSession) {
          return (
            o.scheduledForSession < marketStatus.dateKey ||
            (o.scheduledForSession === marketStatus.dateKey &&
              marketStatus.sessionPhase === 'POST_CLOSE')
          );
        }
        return false;
      });
      return hasOverduePosition || hasExpirableOrder;
    });

    if (activeLedgers.length === 0) return;

    const symbols = new Set<string>();
    for (const l of activeLedgers) {
      if (marketStatus.isOpen) {
        for (const o of l.orders) {
          if (o.status === 'SCHEDULED' || o.status === 'PENDING') symbols.add(o.symbol);
        }
      }
      for (const p of l.positions) {
        if (marketStatus.isOpen || isPastIntradayCutoff(p.timestamp, now)) {
          symbols.add(p.symbol);
        }
      }
    }

    const quotes: Record<string, Stock | undefined> = {};
    const symbolList = Array.from(symbols);
    if (symbolList.length > 0) {
      const provider = marketDataRegistry.getProviderForUseCase('paper_trading');
      const bulk = await provider.getStockQuotes(symbolList, now);
      if (bulk.available && bulk.data) {
        for (const stock of bulk.data) {
          quotes[stock.symbol.toUpperCase()] = stock;
        }
      }
    }

    for (const l of activeLedgers) {
      await processAccountBackgroundQueue({
        userId: l.userId,
        quotes,
        store,
        now,
      });
    }
  } finally {
    backgroundTickInFlight = false;
  }
}
