import crypto from 'crypto';
import type { Stock } from '../../types/market';
import { AUTO_SQUARE_OFF_CHARGE } from '../../utils/charges';
import { classifyQuoteFreshness, getIndianMarketStatus, isPastIntradayCutoff, type MarketCalendarConfig } from '../../utils/marketHours';
import { applyFill, processOrderQueue, type EngineState } from '../../utils/orderEngine';
import type { DurableStore, DurableTradingLedger } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { getOrCreateTradingLedger } from './ledgerCapital';

const INSTANCE_ID = `inst_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;

/**
 * Authoritative background processor for pending orders, scheduled AMO orders, and 15:20 IST intraday square-off.
 * Never fabricates an execution price during intraday square-off if market data is unavailable!
 */
export async function processAccountBackgroundQueue(params: {
  userId: string;
  quotes: Record<string, Stock | undefined>;
  store?: DurableStore;
  calendar?: MarketCalendarConfig;
  now?: number;
}): Promise<{
  changed: boolean;
  ledger: DurableTradingLedger;
  toasts: Array<{ title: string; description: string; type: 'success' | 'error' | 'info' }>;
  squareOffPendingDataSymbols: string[];
}> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const marketStatus = getIndianMarketStatus(now, params.calendar);

  return store.withLock(`user:${params.userId}`, () => {
    const ledger = getOrCreateTradingLedger(params.userId, store, now);
    if (ledger.processingLockUntil && ledger.processingLockUntil > now && ledger.processingInstanceId && ledger.processingInstanceId !== INSTANCE_ID) {
      return { changed: false, ledger, toasts: [], squareOffPendingDataSymbols: ledger.squareOffPendingSymbols || [] };
    }

    ledger.processingLockUntil = now + 10000;
    ledger.processingInstanceId = INSTANCE_ID;

    try {
      const queueRes = processOrderQueue(
        { balance: ledger.balance, holdings: ledger.holdings, positions: ledger.positions, orders: ledger.orders, executedOrderKeys: ledger.executedOrderKeys },
        { quotes: params.quotes, now, marketStatus, calendar: params.calendar }
      );

      let engineState: EngineState = { balance: queueRes.state.balance, holdings: queueRes.state.holdings, positions: queueRes.state.positions };
      let nextOrders = queueRes.state.orders;
      const nextExecutedKeys = new Set(queueRes.state.executedOrderKeys || []);
      let changed = queueRes.changed;
      const toasts = [...queueRes.toasts];
      const pendingSquareOffSymbols = new Set<string>();

      for (const ord of queueRes.executedOrders) {
        ledger.executions.unshift({
          executionId: `EXE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
          orderId: ord.id, userId: params.userId, symbol: ord.symbol, action: ord.action, product: ord.product,
          quantity: ord.filledQuantity ?? ord.quantity, fillPrice: ord.executionPrice ?? ord.price,
          charges: ord.charges ?? 0, realizedPnl: ord.realizedPnl, timestamp: now,
        });
      }

      for (const pos of [...engineState.positions]) {
        if (!isPastIntradayCutoff(pos.timestamp, now, params.calendar)) continue;
        const quote = params.quotes[pos.symbol];
        const freshness = classifyQuoteFreshness(quote, marketStatus, now);
        const hasAuthenticQuote =
          quote && typeof quote.price === 'number' && Number.isFinite(quote.price) &&
          quote.price > 0 && quote.providerAvailable !== false && freshness.status !== 'UNAVAILABLE';

        if (!hasAuthenticQuote) {
          pendingSquareOffSymbols.add(pos.symbol);
          continue;
        }

        const sqKey = `rms_sq:${pos.id}`;
        if (nextExecutedKeys.has(sqKey)) continue;

        const fillRes = applyFill(engineState, {
          symbol: pos.symbol, stockName: pos.stockName, action: pos.action === 'BUY' ? 'SELL' : 'BUY',
          product: 'INTRADAY', orderType: 'MARKET', exchange: pos.exchange, quantity: pos.quantity,
          fillPrice: quote.price, extraCharge: AUTO_SQUARE_OFF_CHARGE, timestamp: now, placedAt: now, executedAt: now,
          idempotencyKey: sqKey, quoteFreshness: freshness.freshness,
          note: 'Auto square-off by RMS at 3:20 PM IST · ₹59 charge applied',
        });

        if (fillRes.ok) {
          engineState = fillRes.state;
          nextOrders = [fillRes.order, ...nextOrders];
          nextExecutedKeys.add(sqKey);
          changed = true;
          ledger.executions.unshift({
            executionId: `EXE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
            orderId: fillRes.order.id, userId: params.userId, symbol: fillRes.order.symbol,
            action: fillRes.order.action, product: 'INTRADAY', quantity: fillRes.order.quantity,
            fillPrice: quote.price, charges: fillRes.order.charges ?? 0, realizedPnl: fillRes.order.realizedPnl, timestamp: now,
          });
          toasts.push({
            title: 'Intraday position auto squared-off',
            description: `${pos.symbol} closed @ ₹${quote.price.toFixed(2)} (3:20 PM IST RMS · ₹59 fee).`,
            type: 'info',
          });
        }
      }

      const prevPendingKey = JSON.stringify(ledger.squareOffPendingSymbols || []);
      const nextPendingArr = Array.from(pendingSquareOffSymbols);
      if (JSON.stringify(nextPendingArr) !== prevPendingKey) {
        ledger.squareOffPendingSymbols = nextPendingArr;
        changed = true;
      }

      if (changed) {
        ledger.balance = engineState.balance;
        ledger.holdings = engineState.holdings;
        ledger.positions = engineState.positions;
        ledger.orders = nextOrders;
        ledger.executedOrderKeys = Array.from(nextExecutedKeys);
        ledger.version += 1;
        ledger.updatedAt = now;
      }

      return { changed, ledger, toasts, squareOffPendingDataSymbols: nextPendingArr };
    } finally {
      ledger.processingLockUntil = 0;
    }
  });
}
