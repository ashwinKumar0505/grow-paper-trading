import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFill,
  cancelOrder,
  computeBlockAmount,
  evaluatePending,
  migrateLegacyPaperState,
  processOrderQueue,
  SCHEDULED_ORDER_DISCLAIMER,
  submitOrder,
  type EngineState,
  type FillRequest,
  type OrderBookState,
} from './orderEngine';
import { calculateCharges } from './charges';
import { summarizePortfolio } from './portfolio';
import {
  classifyQuoteFreshness,
  getIndianMarketStatus,
  istDateMinuteToTimestamp,
} from './marketHours';
import type { Order, Stock } from '../types/market';
const initial = (): EngineState => ({ balance: 100000, holdings: [], positions: [] });
const request = (overrides: Partial<FillRequest> = {}): FillRequest => ({ symbol: 'TEST', stockName: 'Test', action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 10, fillPrice: 100, ...overrides });
function fill(state: EngineState, overrides: Partial<FillRequest> = {}) {
  const result = applyFill(state, request(overrides));
  if (!result.ok) throw new Error(result.message);
  assert.equal(result.ok, true);
  return result;
}
const near = (actual: number, expected: number, tolerance = 0.011) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('delivery weighted average survives partial sales and re-averaging without rounding drift', () => {
  let result = fill(initial(), { quantity: 1, fillPrice: 100 });
  result = fill(result.state, { quantity: 2, fillPrice: 101 });
  near(result.state.holdings[0].averagePrice, 302 / 3, 1e-10);
  result = fill(result.state, { action: 'SELL', quantity: 1, fillPrice: 110 });
  near(result.order.grossRealizedPnl!, 9.33);
  near(result.state.holdings[0].totalInvested, 604 / 3, 1e-10);
  result = fill(result.state, { quantity: 1, fillPrice: 90 });
  near(result.state.holdings[0].averagePrice, (604 / 3 + 90) / 3, 1e-10);
});
for (const side of ['BUY', 'SELL'] as const) {
  test(`${side} intraday averages, partially closes, releases proportional margin and reverses`, () => {
    const opposite = side === 'BUY' ? 'SELL' : 'BUY';
    let result = fill(initial(), { product: 'INTRADAY', action: side, quantity: 1 });
    result = fill(result.state, { product: 'INTRADAY', action: side, quantity: 2, fillPrice: 101 });
    near(result.state.positions[0].entryPrice, 302 / 3, 1e-10);
    result = fill(result.state, { product: 'INTRADAY', action: opposite, quantity: 1, fillPrice: 110 });
    near(result.order.grossRealizedPnl!, side === 'BUY' ? 9.33 : -9.33);
    near(result.state.positions[0].marginBlocked, 40.27);
    result = fill(result.state, { product: 'INTRADAY', action: opposite, quantity: 5, fillPrice: 105 });
    assert.equal(result.state.positions[0].action, opposite);
    assert.equal(result.state.positions[0].quantity, 3);
    near(result.state.positions[0].entryPrice, 105);
    near(result.state.positions[0].marginBlocked, 63);
    result = fill(result.state, { product: 'INTRADAY', action: side, quantity: 3, fillPrice: 105 });
    assert.equal(result.state.positions.length, 0);
  });
}
test('cash and net P&L reconcile after a complete mixed trading lifecycle', () => {
  let state = initial();
  const orders: Order[] = [];
  const trades: Partial<FillRequest>[] = [
    { quantity: 10 }, { quantity: 20, fillPrice: 110 }, { action: 'SELL', quantity: 12, fillPrice: 120 },
    { action: 'SELL', quantity: 18, fillPrice: 90 },
    { product: 'INTRADAY', action: 'SELL', quantity: 10 },
    { product: 'INTRADAY', action: 'BUY', quantity: 5, fillPrice: 90 },
    { product: 'INTRADAY', action: 'BUY', quantity: 10, fillPrice: 95 },
    { product: 'INTRADAY', action: 'SELL', quantity: 5, fillPrice: 100 },
  ];
  for (const trade of trades) { const result = fill(state, trade); state = result.state; orders.push(result.order); }
  const summary = summarizePortfolio(state.balance, state.holdings, state.positions, orders, []);
  near(summary.equity - 100000, summary.netPnl);
  assert.equal(state.holdings.length, 0);
  assert.equal(state.positions.length, 0);
});
test('delivery cannot short sell and insufficient funds leave state unchanged', () => {
  const state = initial(); const before = structuredClone(state);
  assert.equal(applyFill(state, request({ action: 'SELL' })).ok, false);
  assert.equal(applyFill(state, request({ quantity: 100000 })).ok, false);
  assert.deepEqual(state, before);
});
for (const bad of [0, -1, 1.5, NaN, Infinity]) test(`reject quantity ${bad}`, () => {
  assert.equal(applyFill(initial(), request({ quantity: bad })).ok, false);
});
for (const bad of [0, -1, NaN, Infinity]) test(`reject price ${bad}`, () => {
  assert.equal(applyFill(initial(), request({ fillPrice: bad })).ok, false);
});
test('losing intraday exit is allowed even when available cash goes negative', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const closed = fill({ ...opened.state, balance: 0 }, { product: 'INTRADAY', action: 'SELL', fillPrice: 1 });
  assert.equal(closed.state.positions.length, 0);
  assert.ok(closed.state.balance < 0);
});
test('reversal with inadequate margin rejects atomically', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const state = { ...opened.state, balance: 0 }; const before = structuredClone(state);
  assert.equal(applyFill(state, request({ product: 'INTRADAY', action: 'SELL', quantity: 1000 })).ok, false);
  assert.deepEqual(state, before);
});
test('intraday positions are exchange-specific', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const second = fill(opened.state, { product: 'INTRADAY', exchange: 'BSE', action: 'SELL' });
  assert.equal(second.state.positions.length, 2);
});
test('reservation includes fees and can be released without affecting account equity', () => {
  const state = initial();
  const amount = computeBlockAmount(state, { ...request(), price: 100 });
  assert.ok(amount > 1000);
  const pending = { ...fill(state).order, status: 'PENDING', blockedAmount: amount } as Order;
  const summary = summarizePortfolio(state.balance - amount, [], [], [pending], []);
  near(summary.equity, state.balance); near(summary.netPnl, 0);
});
test('stop-limit triggers persist across a price gap; limits never fill at worse prices', () => {
  const order = { ...fill(initial()).order, orderType: 'SL', triggerPrice: 105, limitPrice: 106 } as Order;
  assert.deepEqual(evaluatePending(order, 104), { fill: false, triggerNow: false });
  assert.deepEqual(evaluatePending(order, 110), { fill: false, triggerNow: true });
  assert.deepEqual(evaluatePending({ ...order, triggered: true }, 106), { fill: true, triggerNow: false });
  assert.equal(evaluatePending({ ...order, orderType: 'LIMIT' }, 107).fill, false);
  assert.equal(evaluatePending(order, NaN).fill, false);
});
test('charges include current NSE transaction fee, IPFT and delivery DP charge', () => {
  const fees = calculateCharges({ product: 'DELIVERY', action: 'SELL', quantity: 100, price: 1000 });
  near(fees.exchangeTxn, 3.07); near(fees.ipft, 0.1); near(fees.dp, 23.6);
  near(fees.total, Object.entries(fees).filter(([key]) => key !== 'total').reduce((s, [, v]) => s + v, 0));
  const small = calculateCharges({ product: 'DELIVERY', action: 'BUY', quantity: 1, price: 10 });
  near(small.brokerage, 0.25);
});
test('portfolio includes unrealized short losses, cash, margin, and fees exactly once', () => {
  const opened = fill(initial(), { product: 'INTRADAY', action: 'SELL' });
  const quote = { symbol: 'TEST', exchange: 'NSE', price: 110 } as Stock;
  const summary = summarizePortfolio(opened.state.balance, [], opened.state.positions, [opened.order], [quote]);
  near(summary.positionPnl, -100);
  near(summary.equity - 100000, summary.netPnl);
});
test('opposite pending orders reserve reversal margin plus fees; pure exits reserve nothing', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const params = { symbol: 'TEST', product: 'INTRADAY' as const, action: 'SELL' as const, exchange: 'NSE' as const, quantity: 15, price: 100 };
  const fees = calculateCharges(params).total;
  near(computeBlockAmount(opened.state, params), 100 + fees);
  near(computeBlockAmount(opened.state, { ...params, quantity: 10 }), 0);
});
test('auto square-off charges are debited exactly once', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const closed = fill(opened.state, { product: 'INTRADAY', action: 'SELL', extraCharge: 59 });
  near(closed.order.charges!, calculateCharges({ product: 'INTRADAY', action: 'SELL', quantity: 10, price: 100 }).total + 59);
  near(closed.state.balance, 100000 - opened.order.charges! - closed.order.charges!);
});
test('quotes from another exchange cannot revalue a position', () => {
  const opened = fill(initial(), { product: 'INTRADAY' });
  const summary = summarizePortfolio(opened.state.balance, [], opened.state.positions, [opened.order], [{ symbol: 'TEST', exchange: 'BSE', price: 200 } as Stock]);
  near(summary.positionPnl, 0);
});

const makeBook = (overrides: Partial<OrderBookState> = {}): OrderBookState => ({
  balance: 100000,
  holdings: [],
  positions: [],
  orders: [],
  executedOrderKeys: [],
  ...overrides,
});

const makeStock = (overrides: Partial<Stock> = {}): Stock => ({
  symbol: 'RELIANCE',
  name: 'Reliance Industries Ltd.',
  exchange: 'NSE',
  sector: 'Energy',
  price: 2500,
  previousClose: 2480,
  change: 20,
  changePercent: 0.81,
  open: 2485,
  high: 2515,
  low: 2475,
  close: 2500,
  volume: 5000000,
  week52High: 3000,
  week52Low: 2100,
  lowerCircuit: 2000,
  upperCircuit: 3000,
  sparkline: [2480, 2490, 2500],
  fundamentals: {
    marketCap: '₹17,00,000 Cr',
    peRatio: 25,
    pbRatio: 2.5,
    industryPe: 22,
    debtToEquity: 0.4,
    roe: 12,
    divYield: 0.3,
    eps: 100,
    bookValue: 1000,
  },
  about: 'Reliance Industries',
  ...overrides,
});

test('centralized NSE market calendar handles weekdays, weekends, holidays, and special sessions', () => {
  // Regular Tuesday 10:30 AM IST (2026-04-07)
  const openTs = istDateMinuteToTimestamp('2026-04-07', 10 * 60 + 30);
  const openStatus = getIndianMarketStatus(openTs);
  assert.equal(openStatus.isOpen, true);
  assert.equal(openStatus.statusLabel, 'Market Open');

  // Regular Tuesday 04:15 PM IST (Post-Close)
  const postCloseTs = istDateMinuteToTimestamp('2026-04-07', 16 * 60 + 15);
  const postCloseStatus = getIndianMarketStatus(postCloseTs);
  assert.equal(postCloseStatus.isOpen, false);
  assert.equal(postCloseStatus.statusLabel, 'Market Closed');
  assert.equal(postCloseStatus.nextSessionDateKey, '2026-04-08');

  // Weekend Saturday (2026-04-11) -> next session skips Sunday and opens Monday (2026-04-13)
  const satTs = istDateMinuteToTimestamp('2026-04-11', 11 * 60);
  const satStatus = getIndianMarketStatus(satTs);
  assert.equal(satStatus.isOpen, false);
  assert.equal(satStatus.isWeekend, true);
  assert.equal(satStatus.nextSessionDateKey, '2026-04-13');

  // Official NSE Holiday: Ambedkar Jayanti on Tuesday 2026-04-14
  const holidayTs = istDateMinuteToTimestamp('2026-04-14', 11 * 60);
  const holidayStatus = getIndianMarketStatus(holidayTs);
  assert.equal(holidayStatus.isOpen, false);
  assert.equal(holidayStatus.isHoliday, true);
  assert.equal(holidayStatus.holidayName, 'Dr. Baba Saheb Ambedkar Jayanti');
  assert.equal(holidayStatus.nextSessionDateKey, '2026-04-15');

  // Special Trading Session: Diwali Muhurat Trading on Sunday 2026-11-08 (18:00 - 19:00 IST)
  const specialOpenTs = istDateMinuteToTimestamp('2026-11-08', 18 * 60 + 15);
  const specialStatus = getIndianMarketStatus(specialOpenTs);
  assert.equal(specialStatus.isOpen, true);
  assert.equal(specialStatus.isSpecialSession, true);
  assert.equal(specialStatus.statusLabel, 'Market Open');
});

test('quote freshness distinguishes LIVE, DELAYED, LAST_AVAILABLE, and STALE quotes', () => {
  const openTs = istDateMinuteToTimestamp('2026-04-07', 10 * 60 + 30);
  const openStatus = getIndianMarketStatus(openTs);

  // 30s old during market hours -> LIVE
  const live = classifyQuoteFreshness({ price: 2500, quoteTimestamp: openTs - 30_000 }, openStatus, openTs);
  assert.equal(live.freshness, 'LIVE');
  assert.equal(live.isTradable, true);

  // 5 minutes old during market hours -> DELAYED (still tradable)
  const delayed = classifyQuoteFreshness({ price: 2500, quoteTimestamp: openTs - 5 * 60_000 }, openStatus, openTs);
  assert.equal(delayed.freshness, 'DELAYED');
  assert.equal(delayed.isTradable, true);

  // 20 minutes old during market hours -> STALE (not tradable)
  const stale = classifyQuoteFreshness({ price: 2500, quoteTimestamp: openTs - 20 * 60_000 }, openStatus, openTs);
  assert.equal(stale.freshness, 'STALE');
  assert.equal(stale.isTradable, false);

  // Outside market hours -> LAST_AVAILABLE (not tradable for immediate fill)
  const closedTs = istDateMinuteToTimestamp('2026-04-07', 18 * 60);
  const closedStatus = getIndianMarketStatus(closedTs);
  const lastAvail = classifyQuoteFreshness({ price: 2500, quoteTimestamp: openTs }, closedStatus, closedTs);
  assert.equal(lastAvail.freshness, 'LAST_AVAILABLE');
  assert.equal(lastAvail.isTradable, false);
});

test('market open executes marketable Buy and Sell orders immediately using actual market quotes', () => {
  const openTs = istDateMinuteToTimestamp('2026-04-07', 10 * 60);
  const quote = makeStock({ price: 2500, quoteTimestamp: openTs });

  const buyRes = submitOrder(
    makeBook(),
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'BUY',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 10,
    },
    { stock: quote, now: openTs }
  );

  assert.equal(buyRes.success, true);
  assert.equal(buyRes.order?.status, 'EXECUTED');
  assert.equal(buyRes.order?.executionPrice, 2500);
  assert.equal(buyRes.order?.placedAt, openTs);
  assert.equal(buyRes.order?.executedAt, openTs);
  assert.equal(buyRes.state.holdings[0]?.quantity, 10);

  // Sell 4 shares during market hours at updated market quote
  const higherQuote = makeStock({ price: 2550, quoteTimestamp: openTs + 60_000 });
  const sellRes = submitOrder(
    buyRes.state,
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'SELL',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 4,
    },
    { stock: higherQuote, now: openTs + 60_000 }
  );

  assert.equal(sellRes.success, true);
  assert.equal(sellRes.order?.status, 'EXECUTED');
  assert.equal(sellRes.order?.executionPrice, 2550);
  assert.equal(sellRes.state.holdings[0]?.quantity, 6);
});

test('outside market hours queues orders as SCHEDULED (AMO), reserves funds/shares, and executes at next session open price', () => {
  // Place order after market close on Tuesday 2026-04-07 at 06:00 PM IST (last close ₹2500)
  const afterHoursTs = istDateMinuteToTimestamp('2026-04-07', 18 * 60);
  const closingQuote = makeStock({ price: 2500, quoteTimestamp: afterHoursTs - 3 * 3600_000 });

  const schedBuy = submitOrder(
    makeBook({ balance: 100000 }),
    {
      symbol: 'RELIANCE',
      stockName: closingQuote.name,
      action: 'BUY',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 10,
    },
    { stock: closingQuote, now: afterHoursTs }
  );

  assert.equal(schedBuy.success, true);
  assert.equal(schedBuy.order?.status, 'SCHEDULED');
  assert.equal(schedBuy.order?.isAmo, true);
  assert.equal(schedBuy.order?.scheduledForSession, '2026-04-08');
  assert.equal(schedBuy.order?.note, SCHEDULED_ORDER_DISCLAIMER);
  // Does not execute immediately at previous close
  assert.equal(schedBuy.state.holdings.length, 0);
  // Buying power is reserved
  assert.ok((schedBuy.order?.blockedAmount ?? 0) > 25000);
  near(schedBuy.state.balance, 100000 - (schedBuy.order?.blockedAmount ?? 0));

  // Portfolio summary counts SCHEDULED order's blockedAmount in reserved funds
  const closedSummary = summarizePortfolio(
    schedBuy.state.balance,
    schedBuy.state.holdings,
    schedBuy.state.positions,
    schedBuy.state.orders,
    [closingQuote]
  );
  near(closedSummary.reserved, schedBuy.order?.blockedAmount ?? 0);
  near(closedSummary.equity, 100000);

  // Calling processOrderQueue while market is still closed does not execute the scheduled order
  const stillClosed = processOrderQueue(schedBuy.state, {
    quotes: { RELIANCE: closingQuote },
    now: afterHoursTs + 3600_000,
  });
  assert.equal(stillClosed.changed, false);
  assert.equal(stillClosed.state.orders[0].status, 'SCHEDULED');

  // Next morning (Wednesday 2026-04-08 at 09:16 AM IST) market opens with a gap-up quote of ₹2535
  const nextOpenTs = istDateMinuteToTimestamp('2026-04-08', 9 * 60 + 16);
  const openingQuote = makeStock({ price: 2535, quoteTimestamp: nextOpenTs });

  const processed = processOrderQueue(schedBuy.state, {
    quotes: { RELIANCE: openingQuote },
    now: nextOpenTs,
  });

  assert.equal(processed.changed, true);
  assert.equal(processed.executedOrders.length, 1);
  assert.equal(processed.state.orders[0].status, 'EXECUTED');
  // Executed at the next session's actual opening price (₹2535), NOT the previous close (₹2500)!
  assert.equal(processed.state.orders[0].executionPrice, 2535);
  assert.equal(processed.state.orders[0].placedAt, afterHoursTs);
  assert.equal(processed.state.orders[0].executedAt, nextOpenTs);
  assert.equal(processed.state.holdings[0].quantity, 10);
  assert.equal(processed.state.holdings[0].averagePrice, 2535);

  // Idempotency: re-running processOrderQueue on the same state must not fill again
  const duplicateRun = processOrderQueue(processed.state, {
    quotes: { RELIANCE: openingQuote },
    now: nextOpenTs + 5000,
  });
  assert.equal(duplicateRun.changed, false);
  assert.equal(duplicateRun.executedOrders.length, 0);
  assert.equal(duplicateRun.state.holdings[0].quantity, 10);
});

test('scheduled orders reserve sellable shares to prevent duplicate sell commitments and support cancellation', () => {
  const afterHoursTs = istDateMinuteToTimestamp('2026-04-07', 19 * 60);
  const quote = makeStock({ price: 2500, quoteTimestamp: afterHoursTs });
  const initialBook = makeBook({
    balance: 50000,
    holdings: [
      {
        symbol: 'RELIANCE',
        stockName: quote.name,
        quantity: 10,
        averagePrice: 2400,
        totalInvested: 24000,
        exchange: 'NSE',
      },
    ],
  });

  // Schedule sell of 7 shares outside market hours
  const firstSell = submitOrder(
    initialBook,
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'SELL',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 7,
    },
    { stock: quote, now: afterHoursTs }
  );
  assert.equal(firstSell.success, true);
  assert.equal(firstSell.order?.status, 'SCHEDULED');

  // Attempting to schedule another sell of 5 shares (total 12 > 10 held) is rejected
  const duplicateSell = submitOrder(
    firstSell.state,
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'SELL',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 5,
    },
    { stock: quote, now: afterHoursTs + 1000 }
  );
  assert.equal(duplicateSell.success, false);
  assert.equal(duplicateSell.order?.status, 'REJECTED');

  // Cancelling the first scheduled sell releases the reserved shares
  const cancelled = cancelOrder(firstSell.state, firstSell.order!.id, afterHoursTs + 2000);
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.order?.status, 'CANCELLED');

  // Now scheduling a sell of 5 shares succeeds
  const retrySell = submitOrder(
    cancelled.state,
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'SELL',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 5,
    },
    { stock: quote, now: afterHoursTs + 3000 }
  );
  assert.equal(retrySell.success, true);
  assert.equal(retrySell.order?.status, 'SCHEDULED');
});

test('stale or unavailable quotes are rejected during market hours and hold scheduled orders until fresh quotes arrive', () => {
  const openTs = istDateMinuteToTimestamp('2026-04-08', 10 * 60);
  const staleQuote = makeStock({
    price: 2500,
    quoteTimestamp: openTs - 30 * 60_000, // 30 minutes old -> STALE
  });

  // Live order during market hours with a stale quote is rejected
  const liveAttempt = submitOrder(
    makeBook(),
    {
      symbol: 'RELIANCE',
      stockName: staleQuote.name,
      action: 'BUY',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 5,
    },
    { stock: staleQuote, now: openTs }
  );
  assert.equal(liveAttempt.success, false);
  assert.equal(liveAttempt.order?.status, 'REJECTED');

  // A scheduled order waiting for session open stays SCHEDULED while the quote is stale
  const afterHoursTs = istDateMinuteToTimestamp('2026-04-07', 20 * 60);
  const scheduled = submitOrder(
    makeBook(),
    {
      symbol: 'RELIANCE',
      stockName: staleQuote.name,
      action: 'BUY',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 5,
    },
    { stock: makeStock({ price: 2490, quoteTimestamp: afterHoursTs }), now: afterHoursTs }
  );
  assert.equal(scheduled.order?.status, 'SCHEDULED');

  const whileStale = processOrderQueue(scheduled.state, {
    quotes: { RELIANCE: staleQuote },
    now: openTs,
  });
  assert.equal(whileStale.changed, false);
  assert.equal(whileStale.state.orders[0].status, 'SCHEDULED');

  // Once a fresh quote arrives, the scheduled order executes immediately
  const freshQuote = makeStock({ price: 2510, quoteTimestamp: openTs });
  const whenFresh = processOrderQueue(scheduled.state, {
    quotes: { RELIANCE: freshQuote },
    now: openTs + 1000,
  });
  assert.equal(whenFresh.changed, true);
  assert.equal(whenFresh.state.orders[0].status, 'EXECUTED');
  assert.equal(whenFresh.state.orders[0].executionPrice, 2510);
});

test('partial fills, day order expiry (EXPIRED), and legacy simulation state migration work deterministically', () => {
  const openTs = istDateMinuteToTimestamp('2026-04-08', 11 * 60);
  const quote = makeStock({ price: 2500, quoteTimestamp: openTs });

  // Partial fill: order 10 shares when available liquidity is 6 shares
  const partial = submitOrder(
    makeBook(),
    {
      symbol: 'RELIANCE',
      stockName: quote.name,
      action: 'BUY',
      product: 'DELIVERY',
      orderType: 'MARKET',
      exchange: 'NSE',
      quantity: 10,
    },
    { stock: quote, now: openTs, availableLiquidity: 6 }
  );
  assert.equal(partial.success, true);
  assert.equal(partial.order?.status, 'EXECUTED');
  assert.equal(partial.order?.filledQuantity, 6);
  assert.equal(partial.order?.remainingQuantity, 4);
  assert.equal(partial.state.holdings[0].quantity, 6);
  // Remainder 4 shares queued as PENDING
  const pendingRem = partial.state.orders.find((o) => o.status === 'PENDING');
  assert.equal(pendingRem?.quantity, 4);

  // Advance past session close (03:35 PM IST) -> unexecuted PENDING order transitions to EXPIRED and refunds blocked cash
  const afterCloseTs = istDateMinuteToTimestamp('2026-04-08', 15 * 60 + 35);
  const expiredRes = processOrderQueue(partial.state, {
    quotes: { RELIANCE: quote },
    now: afterCloseTs,
  });
  assert.equal(expiredRes.changed, true);
  assert.equal(expiredRes.expiredOrders.length, 1);
  assert.equal(expiredRes.expiredOrders[0].status, 'EXPIRED');

  // Legacy simulation state migration strips `isSim` and converts after-hours PENDING AMO to SCHEDULED
  const migrated = migrateLegacyPaperState(
    {
      balance: 95000,
      isSimulating: true,
      orders: [
        {
          id: 'legacy-1',
          symbol: 'RELIANCE',
          stockName: 'Reliance Industries Ltd.',
          action: 'BUY',
          product: 'DELIVERY',
          orderType: 'MARKET',
          exchange: 'NSE',
          quantity: 2,
          price: 2500,
          status: 'PENDING',
          timestamp: afterCloseTs,
          totalAmount: 5000,
          marginUsed: 5000,
          blockedAmount: 5000,
          isAmo: true,
          isSim: true,
        },
      ],
    },
    afterCloseTs
  );
  assert.equal(migrated.orders?.[0].status, 'SCHEDULED');
  assert.equal('isSim' in (migrated.orders?.[0] || {}), false);
  assert.equal(migrated.orders?.[0].scheduledForSession, '2026-04-09');
});

test('MTF 5.00x (20% margin, 80% broker funded) executes, reconciles equity, and repays loan on sell', () => {
  // Buy 100 shares at ₹1,000 = ₹1,00,000 turnover using MTF 5.00x
  // User margin = 20% = ₹20,000; Broker loan = 80% = ₹80,000
  const buyRes = fill(initial(), {
    product: 'MTF',
    action: 'BUY',
    quantity: 100,
    fillPrice: 1000,
  });

  const buyFees = calculateCharges({ product: 'MTF', action: 'BUY', quantity: 100, price: 1000 });
  // Groww MTF brokerage is 0.1% of turnover = ₹100; STT is 0.1% delivery = ₹100; Stamp duty = 0.015% = ₹15
  near(buyFees.brokerage, 100);
  near(buyFees.stt, 100);
  near(buyFees.stampDuty, 15);

  assert.equal(buyRes.state.holdings.length, 1);
  assert.equal(buyRes.state.holdings[0].quantity, 100);
  near(buyRes.state.holdings[0].mtfMarginBlocked ?? 0, 20000);
  near(buyRes.state.holdings[0].mtfLoanAmount ?? 0, 80000);
  near(buyRes.state.balance, 100000 - 20000 - buyFees.total);

  // Portfolio equity reconciles immediately after MTF buy (cash + 100k holding - 80k loan = 100k - fees)
  const quoteAt1050 = { symbol: 'TEST', exchange: 'NSE', price: 1050 } as Stock;
  const summaryAfterBuy = summarizePortfolio(
    buyRes.state.balance,
    buyRes.state.holdings,
    buyRes.state.positions,
    [buyRes.order],
    [quoteAt1050]
  );
  near(summaryAfterBuy.unrealized, 5000);
  near(summaryAfterBuy.equity - 100000, summaryAfterBuy.netPnl);

  // Sell 40 shares at ₹1,100 (partial exit repays 40% of broker loan = ₹32,000)
  const partialSell = fill(buyRes.state, {
    product: 'MTF',
    action: 'SELL',
    quantity: 40,
    fillPrice: 1100,
  });
  assert.equal(partialSell.state.holdings[0].quantity, 60);
  near(partialSell.state.holdings[0].mtfMarginBlocked ?? 0, 12000);
  near(partialSell.state.holdings[0].mtfLoanAmount ?? 0, 48000);

  // Sell remaining 60 shares at ₹1,100
  const fullSell = fill(partialSell.state, {
    product: 'MTF',
    action: 'SELL',
    quantity: 60,
    fillPrice: 1100,
  });
  assert.equal(fullSell.state.holdings.length, 0);

  const finalSummary = summarizePortfolio(
    fullSell.state.balance,
    fullSell.state.holdings,
    fullSell.state.positions,
    [buyRes.order, partialSell.order, fullSell.order],
    []
  );
  near(finalSummary.equity - 100000, finalSummary.netPnl);
});


