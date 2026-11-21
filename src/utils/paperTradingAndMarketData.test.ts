import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import { DurableStore } from '../server/storage/durableStore';
import {
  advanceHistoricalReplayClock,
  createHistoricalReplaySession,
  getVisibleReplayCandles,
  submitHistoricalReplayOrder,
} from '../server/trading/historicalReplay';
import {
  cancelAuthoritativeOrder,
  getOrCreateTradingLedger,
  processAccountBackgroundQueue,
  submitAuthoritativeOrder,
} from '../server/trading/tradingLedger';
import type { ChartPoint, Stock } from '../types/market';
import { summarizePortfolio } from './portfolio';

function makeTradableQuote(symbol: string, price: number, now: number): Stock {
  return {
    symbol, name: `${symbol} Ltd`, sector: 'Technology', exchange: 'NSE',
    price, previousClose: price - 10, change: 10, changePercent: 1,
    open: price - 5, high: price + 15, low: price - 15, close: price,
    volume: 500_000, week52High: price * 1.2, week52Low: price * 0.8,
    lowerCircuit: Math.round(price * 0.8), upperCircuit: Math.round(price * 1.2),
    fundamentals: {
      available: false, source: 'unavailable', marketCap: null, peRatio: null, pbRatio: null,
      industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null,
    },
    about: `${symbol} description`, sparkline: [price - 5, price],
    quoteTimestamp: now - 5_000, fetchedAt: now - 1_000,
    freshness: 'LIVE', isTradableQuote: true, isStale: false, providerAvailable: true,
  };
}

const MARKET_OPEN_TS = Date.parse('2026-03-04T05:30:00.000Z');
const INTRADAY_SQUAREOFF_TS = Date.parse('2026-03-04T09:55:00.000Z');
const AFTER_MARKET_TS = Date.parse('2026-03-04T13:30:00.000Z');

test('authoritative trading ledger validates orders, enforces margins and fees, prevents duplicate idempotency keys, and serializes concurrent submissions', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const user = resolveOrCreateCanonicalUser(
    { email: 'trader.ledger@example.com', name: 'Ledger Trader', authProvider: 'email' },
    store,
    MARKET_OPEN_TS
  );
  user.subscriptionTier = 'advanced';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = MARKET_OPEN_TS + 30 * 86_400_000;

  const ledger = getOrCreateTradingLedger(user.uid, store, MARKET_OPEN_TS);
  ledger.balance = 100_000;
  ledger.initialBalance = 100_000;

  const quoteResolver = async (sym: string, ts: number) => makeTradableQuote(sym, 1000, ts);

  const order1 = await submitAuthoritativeOrder({
    userId: user.uid, idempotencyKey: 'idem_buy_reliance_1',
    orderInput: { symbol: 'RELIANCE', stockName: 'Reliance Industries', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 20 },
    quoteResolver, store, now: MARKET_OPEN_TS,
  });
  assert.equal(order1.status, 200);
  assert.equal(order1.success, true);
  assert.equal(order1.order?.status, 'EXECUTED');
  const balanceAfterOrder1 = order1.ledger!.balance;
  assert.ok(balanceAfterOrder1 < 80_000);
  assert.equal(order1.ledger!.executions.length, 1);

  const duplicateOrder = await submitAuthoritativeOrder({
    userId: user.uid, idempotencyKey: 'idem_buy_reliance_1',
    orderInput: { symbol: 'RELIANCE', stockName: 'Reliance Industries', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 20 },
    quoteResolver, store, now: MARKET_OPEN_TS + 500,
  });
  assert.equal(duplicateOrder.status, 200);
  assert.equal(duplicateOrder.ledger!.balance, balanceAfterOrder1);
  assert.equal(duplicateOrder.ledger!.holdings[0].quantity, 20);
  assert.equal(duplicateOrder.ledger!.executions.length, 1);

  const [concA, concB] = await Promise.all([
    submitAuthoritativeOrder({
      userId: user.uid, idempotencyKey: 'conc_order_a',
      orderInput: { symbol: 'TCS', stockName: 'TCS', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 60 },
      quoteResolver, store, now: MARKET_OPEN_TS + 1000,
    }),
    submitAuthoritativeOrder({
      userId: user.uid, idempotencyKey: 'conc_order_b',
      orderInput: { symbol: 'INFY', stockName: 'Infosys', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 60 },
      quoteResolver, store, now: MARKET_OPEN_TS + 1000,
    }),
  ]);

  assert.equal([concA, concB].filter((r) => r.success).length, 1);
  assert.equal([concA, concB].filter((r) => !r.success).length, 1);
  assert.ok(getOrCreateTradingLedger(user.uid, store, MARKET_OPEN_TS).balance >= 0);
});

test('pending-order cancellation, market-session AMO scheduling, and portfolio accounting reconciliation', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const user = resolveOrCreateCanonicalUser(
    { email: 'orders.recon@example.com', name: 'Recon Trader', authProvider: 'email' },
    store,
    MARKET_OPEN_TS
  );
  user.subscriptionTier = 'advanced';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = MARKET_OPEN_TS + 30 * 86_400_000;

  const ledger = getOrCreateTradingLedger(user.uid, store, MARKET_OPEN_TS);
  ledger.balance = 500_000;
  ledger.initialBalance = 500_000;
  const quoteResolver = async (sym: string, ts: number) => makeTradableQuote(sym, 1000, ts);

  const limitRes = await submitAuthoritativeOrder({
    userId: user.uid,
    orderInput: { symbol: 'HDFCBANK', stockName: 'HDFC Bank', action: 'BUY', product: 'DELIVERY', orderType: 'LIMIT', exchange: 'NSE', quantity: 10, limitPrice: 950 },
    quoteResolver, store, now: MARKET_OPEN_TS,
  });
  assert.equal(limitRes.success, true);
  assert.equal(limitRes.order?.status, 'PENDING');
  assert.ok((limitRes.order?.blockedAmount || 0) > 9500);

  const summaryDuringPending = summarizePortfolio(
    limitRes.ledger!.balance, limitRes.ledger!.holdings, limitRes.ledger!.positions,
    limitRes.ledger!.orders, [makeTradableQuote('HDFCBANK', 1000, MARKET_OPEN_TS)]
  );
  assert.equal(summaryDuringPending.equity, 500_000);

  const cancelRes = await cancelAuthoritativeOrder({
    userId: user.uid, orderId: limitRes.order!.id, store, now: MARKET_OPEN_TS + 2000,
  });
  assert.equal(cancelRes.cancelled, true);
  assert.equal(cancelRes.ledger.balance, 500_000);

  const amoRes = await submitAuthoritativeOrder({
    userId: user.uid,
    orderInput: { symbol: 'SBIN', stockName: 'State Bank of India', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 10 },
    quoteResolver, store, now: AFTER_MARKET_TS,
  });
  assert.equal(amoRes.success, true);
  assert.equal(amoRes.order?.status, 'SCHEDULED');
  assert.equal(amoRes.order?.isAmo, true);
});

test('historical replay session enforces isolated simulation clock and prevents look-ahead bias, and 15:20 IST square-off handles outages safely', async () => {
  const t1 = Date.parse('2026-02-02T04:00:00.000Z');
  const t2 = Date.parse('2026-02-02T04:15:00.000Z');
  const t3 = Date.parse('2026-02-02T04:30:00.000Z');
  const candles: ChartPoint[] = [
    { timestamp: t1, time: '09:30', price: 500, open: 495, high: 505, low: 490, close: 500, volume: 10000 },
    { timestamp: t2, time: '09:45', price: 480, open: 500, high: 502, low: 475, close: 480, volume: 15000 },
    { timestamp: t3, time: '10:00', price: 530, open: 480, high: 535, low: 478, close: 530, volume: 22000 },
  ];

  let session = createHistoricalReplaySession({
    sessionId: 'replay_test_1', userId: 'usr_replay_1', symbol: 'TATAMOTORS', candles, initialClockMs: t1, startingCash: 100_000,
  });
  assert.equal(getVisibleReplayCandles(session).length, 1);

  const limitSub = submitHistoricalReplayOrder(session, {
    action: 'BUY', product: 'DELIVERY', orderType: 'LIMIT', quantity: 10, limitPrice: 485,
  });
  assert.equal(limitSub.success, true);
  session = advanceHistoricalReplayClock(limitSub.session, t2);
  assert.equal(getVisibleReplayCandles(session).length, 2);
  assert.equal(session.orderBook.holdings[0].averagePrice, 480);

  const store = new DurableStore({ inMemoryOnly: true });
  const user = resolveOrCreateCanonicalUser(
    { email: 'intraday.rms@example.com', name: 'RMS Trader', authProvider: 'email' },
    store,
    MARKET_OPEN_TS
  );
  user.subscriptionTier = 'beginner';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = MARKET_OPEN_TS + 30 * 86_400_000;

  await submitAuthoritativeOrder({
    userId: user.uid,
    orderInput: { symbol: 'ICICIBANK', stockName: 'ICICI Bank', action: 'BUY', product: 'INTRADAY', orderType: 'MARKET', exchange: 'NSE', quantity: 50 },
    quoteResolver: async (sym, ts) => makeTradableQuote(sym, 1000, ts),
    store, now: MARKET_OPEN_TS,
  });

  const outageRun = await processAccountBackgroundQueue({ userId: user.uid, quotes: {}, store, now: INTRADAY_SQUAREOFF_TS });
  assert.equal(outageRun.ledger.positions.length, 1);
  assert.deepEqual(outageRun.squareOffPendingDataSymbols, ['ICICIBANK']);

  const recoveryRun = await processAccountBackgroundQueue({
    userId: user.uid,
    quotes: { ICICIBANK: makeTradableQuote('ICICIBANK', 1020, INTRADAY_SQUAREOFF_TS + 10_000) },
    store, now: INTRADAY_SQUAREOFF_TS + 10_000,
  });
  assert.equal(recoveryRun.ledger.positions.length, 0);
  assert.deepEqual(recoveryRun.squareOffPendingDataSymbols, []);
  assert.equal(recoveryRun.ledger.executions[0].fillPrice, 1020);
});
