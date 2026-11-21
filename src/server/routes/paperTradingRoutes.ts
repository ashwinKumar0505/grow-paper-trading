import { Router, type Response } from 'express';
import type { PlaceOrderInput, Stock } from '../../types/market';
import { getIndianMarketStatus } from '../../utils/marketHours';
import { createRequireAuth, sanitizeErrorMessage, type AuthenticatedRequest } from '../middleware/security';
import { marketDataRegistry } from '../providers/providerRegistry';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import {
  addFreeTierVirtualCash,
  cancelAuthoritativeOrder,
  getOrCreateTradingLedger,
  migrateClientPortfolioOnce,
  processAccountBackgroundQueue,
  resetAuthoritativePortfolio,
  submitAuthoritativeOrder,
} from '../trading/tradingLedger';
import { createQuizProgressRouter } from './quizProgressRoutes';

export function createPaperTradingRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(store);

  async function resolveQuoteMapForAccount(userId: string, now = Date.now()): Promise<Record<string, Stock | undefined>> {
    const ledger = getOrCreateTradingLedger(userId, store, now);
    const symbols = new Set<string>();
    for (const o of ledger.orders) {
      if (o.status === 'PENDING' || o.status === 'SCHEDULED') symbols.add(o.symbol);
    }
    for (const p of ledger.positions) symbols.add(p.symbol);

    const provider = marketDataRegistry.getProviderForUseCase('paper_trading');
    const quotes: Record<string, Stock | undefined> = {};
    await Promise.all(
      Array.from(symbols).map(async (sym) => {
        const res = await provider.getStockQuote(sym, now);
        if (res.available && res.data) quotes[sym] = res.data;
      })
    );
    return quotes;
  }

  router.get('/paper-trading/state', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      const userId = req.authUser!.uid;
      const quotes = await resolveQuoteMapForAccount(userId, now);
      const processed = await processAccountBackgroundQueue({ userId, quotes, store, now });
      res.json({
        success: true, state: processed.ledger, changed: processed.changed,
        toasts: processed.toasts, squareOffPendingDataSymbols: processed.squareOffPendingDataSymbols,
        marketStatus: getIndianMarketStatus(now), timestamp: now,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to fetch paper trading state') });
    }
  });

  router.post('/paper-trading/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      const userId = req.authUser!.uid;
      const { state: clientState, migrateIfEmpty } = req.body || {};

      if (migrateIfEmpty && clientState && !store.getState().tradingLedgers[userId]) {
        migrateClientPortfolioOnce({ userId, clientState, store, now });
      }

      const quotes = await resolveQuoteMapForAccount(userId, now);
      const processed = await processAccountBackgroundQueue({ userId, quotes, store, now });

      res.json({
        success: true, state: processed.ledger, changed: processed.changed,
        toasts: processed.toasts, squareOffPendingDataSymbols: processed.squareOffPendingDataSymbols,
        marketStatus: getIndianMarketStatus(now), timestamp: now,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to sync paper trading state') });
    }
  });

  router.post('/paper-trading/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      const userId = req.authUser!.uid;
      const { order: orderInput, idempotencyKey } = req.body || {};
      const provider = marketDataRegistry.getProviderForUseCase('paper_trading');

      const result = await submitAuthoritativeOrder({
        userId,
        orderInput: orderInput as PlaceOrderInput,
        idempotencyKey:
          (typeof req.headers['x-idempotency-key'] === 'string' && req.headers['x-idempotency-key']) ||
          (typeof idempotencyKey === 'string' ? idempotencyKey : undefined),
        quoteResolver: async (symbol, ts) => {
          const quoteRes = await provider.getStockQuote(symbol, ts);
          return quoteRes.available ? quoteRes.data : null;
        },
        store,
        now,
      });

      res.status(result.status).json({
        success: result.success, message: result.message, code: result.code,
        requiredTier: result.requiredTier, order: result.order, state: result.ledger,
        toast: result.toast, marketStatus: getIndianMarketStatus(now), timestamp: now,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to submit order') });
    }
  });

  router.post('/paper-trading/orders/:orderId/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      const userId = req.authUser!.uid;
      const { orderId } = req.params;
      const result = await cancelAuthoritativeOrder({ userId, orderId, store, now });

      res.status(result.status).json({
        success: result.success, cancelled: result.cancelled, message: result.message,
        order: result.order, state: result.ledger, toast: result.toast,
        marketStatus: getIndianMarketStatus(now), timestamp: now,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to cancel order') });
    }
  });

  router.post('/paper-trading/wallet/topup', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.authUser!.uid;
      const result = await addFreeTierVirtualCash({
        userId,
        amount: Number(req.body?.amount),
        description: typeof req.body?.description === 'string' ? req.body.description : undefined,
        store,
      });
      res.status(result.status).json({
        success: result.success, code: result.code, requiredTier: result.requiredTier,
        message: result.message, state: result.ledger,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to top up virtual wallet') });
    }
  });

  router.post('/paper-trading/wallet/reset', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.authUser!.uid;
      const result = await resetAuthoritativePortfolio({
        userId,
        startingCash: typeof req.body?.startingCash === 'number' ? req.body.startingCash : undefined,
        store,
      });
      res.status(result.status).json({
        success: result.success, code: result.code, requiredTier: result.requiredTier,
        message: result.message, state: result.ledger,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to reset paper portfolio') });
    }
  });

  router.use(createQuizProgressRouter(store));
  return router;
}
