import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portfolioQuoteSymbols, mergePortfolioQuote } from './portfolioQuotes';
import type { Stock, IntradayPosition, Order } from '../types/market';
const position = { symbol: 'MANAPPURAM', exchange: 'NSE' } as IntradayPosition;
const quote = { symbol: 'MANAPPURAM', exchange: 'NSE', price: 318.25 } as Stock;
test('restores search-only symbols from persisted positions and pending orders', () => {
  assert.deepEqual(portfolioQuoteSymbols([], [position, position], [
    { symbol: 'HDFCLIFE', exchange: 'NSE', status: 'PENDING' } as Order,
    { symbol: 'OLD', exchange: 'NSE', status: 'EXECUTED' } as Order,
  ]), ['HDFCLIFE', 'MANAPPURAM']);
  assert.deepEqual(mergePortfolioQuote([], 'MANAPPURAM', quote), [quote]);
});
test('refreshes an existing quote without duplicating the stock', () => {
  const updated = mergePortfolioQuote([quote], 'MANAPPURAM', { ...quote, price: 320 });
  assert.equal(updated.length, 1);
  assert.equal(updated[0].price, 320);
});
test('invalid or mismatched quotes never overwrite a valid quote', () => {
  const stocks = [quote];
  for (const bad of [NaN, Infinity, 0, -1]) assert.equal(mergePortfolioQuote(stocks, 'MANAPPURAM', { ...quote, price: bad }), stocks);
  assert.equal(mergePortfolioQuote(stocks, 'MANAPPURAM', { ...quote, exchange: 'BSE' }), stocks);
  assert.equal(mergePortfolioQuote(stocks, 'MANAPPURAM', { ...quote, symbol: 'OTHER' }), stocks);
});
