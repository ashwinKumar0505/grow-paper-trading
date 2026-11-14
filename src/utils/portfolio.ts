import type { Holding, IntradayPosition, Order, Stock } from '../types/market';

/** Cash excludes reserved funds. Add reservations exactly once to obtain equity. */
export function summarizePortfolio(balance: number, holdings: Holding[], positions: IntradayPosition[], orders: Order[], stocks: Stock[]) {
  const quote = (symbol: string, exchange: string) => {
    const price = stocks.find(s => s.symbol === symbol && s.exchange === exchange)?.price;
    return price !== undefined && Number.isFinite(price) && price > 0 ? price : undefined;
  };
  const invested = holdings.reduce((s, h) => s + h.totalInvested, 0);
  const mtfLoan = holdings.reduce((s, h) => s + (h.mtfLoanAmount ?? 0), 0);
  const holdingsValue = holdings.reduce((s, h) => s + (quote(h.symbol, h.exchange) ?? h.averagePrice) * h.quantity, 0);
  const positionPnl = positions.reduce((s, p) => s + ((quote(p.symbol, p.exchange) ?? p.entryPrice) - p.entryPrice) * p.quantity * (p.action === 'BUY' ? 1 : -1), 0);
  const margin = positions.reduce((s, p) => s + p.marginBlocked, 0);
  const reserved = orders
    .filter(o => o.status === 'PENDING' || o.status === 'SCHEDULED')
    .reduce((s, o) => s + (o.blockedAmount ?? 0), 0);
  const executed = orders.filter(o => o.status === 'EXECUTED');
  const fees = executed.reduce((s, o) => s + (o.charges ?? 0), 0);
  const realized = executed.reduce((s, o) => s + (o.grossRealizedPnl ?? (o.realizedPnl === undefined ? 0 : o.realizedPnl + (o.charges ?? 0))), 0);
  const unrealized = holdingsValue - invested + positionPnl;
  return { invested, holdingsValue, positionPnl, margin, reserved, fees, realized, unrealized,
    netPnl: realized + unrealized - fees,
    equity: balance + holdingsValue - mtfLoan + margin + reserved + positionPnl };
}
