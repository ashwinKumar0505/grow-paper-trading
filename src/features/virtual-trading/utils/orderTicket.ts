import type { OrderType } from '../../../types/market';
export const BUY = '#00B386';
export const SELL = '#EB5B3C';

export const inr = (n: number, digits = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  MARKET: 'Market',
  LIMIT: 'Limit',
  SL: 'SL',
  'SL-M': 'SL-M',
};

