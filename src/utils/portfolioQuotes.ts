import type { Holding, IntradayPosition, Order, Stock } from '../types/market';

export function portfolioQuoteSymbols(holdings: Holding[], positions: IntradayPosition[], orders: Order[]): string[] {
  return [...new Set([...holdings, ...positions, ...orders.filter(o => o.status === 'PENDING' || o.status === 'SCHEDULED')]
    .filter(item => item.exchange === 'NSE')
    .map(item => item.symbol.toUpperCase()))].sort();
}

/** Reject failed/mismatched responses rather than inventing a price. */
export function mergePortfolioQuote(stocks: Stock[], symbol: string, quote: Stock): Stock[] {
  if (quote?.symbol !== symbol || quote.exchange !== 'NSE' || !Number.isFinite(quote.price) || quote.price <= 0) return stocks;
  const index = stocks.findIndex(s => s.symbol === symbol && s.exchange === quote.exchange);
  if (index === -1) return [...stocks, quote];
  return stocks.map((stock, i) => i === index ? { ...stock, ...quote } : stock);
}
