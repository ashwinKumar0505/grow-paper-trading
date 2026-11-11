import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFill, computeBlockAmount, evaluatePending, type EngineState, type FillRequest } from './orderEngine';
import { calculateCharges } from './charges';
import { summarizePortfolio } from './portfolio';
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
