import express, { type Express } from 'express';
import type { Stock } from '../types/market';
import {
  securityHeadersAndCors,
  type AuthenticatedRequest,
} from './middleware/security';
import { marketDataRegistry } from './providers/providerRegistry';
import { createAuthRouter } from './routes/authRoutes';
import { createMarketRouter } from './routes/marketRoutes';
import { createPaperTradingRouter } from './routes/paperTradingRoutes';
import { createPaymentRouter } from './routes/paymentRoutes';
import { defaultStore, type DurableStore } from './storage/durableStore';
import { processAccountBackgroundQueue } from './trading/tradingLedger';

export function createExpressApp(store: DurableStore = defaultStore): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(securityHeadersAndCors);

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

  return app;
}

export async function runServerBackgroundTradingTick(
  store: DurableStore = defaultStore,
  now = Date.now()
): Promise<void> {
  const ledgers = Object.values(store.getState().tradingLedgers);
  const activeLedgers = ledgers.filter(
    (l) =>
      l.orders.some((o) => o.status === 'SCHEDULED' || o.status === 'PENDING') ||
      l.positions.length > 0
  );
  if (activeLedgers.length === 0) return;

  const symbols = new Set<string>();
  for (const l of activeLedgers) {
    for (const o of l.orders) {
      if (o.status === 'SCHEDULED' || o.status === 'PENDING') symbols.add(o.symbol);
    }
    for (const p of l.positions) {
      symbols.add(p.symbol);
    }
  }

  const provider = marketDataRegistry.getProviderForUseCase('paper_trading');
  const quotes: Record<string, Stock | undefined> = {};
  await Promise.all(
    Array.from(symbols).map(async (sym) => {
      const res = await provider.getStockQuote(sym, now);
      if (res.available && res.data) {
        quotes[sym] = res.data;
      }
    })
  );

  for (const l of activeLedgers) {
    await processAccountBackgroundQueue({
      userId: l.userId,
      quotes,
      store,
      now,
    });
  }
}
