export type Exchange = 'NSE' | 'BSE';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

export type ChartType = 'line' | 'candlestick';

export type OrderProduct = 'DELIVERY' | 'INTRADAY';

export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

export type OrderAction = 'BUY' | 'SELL';

export type OrderStatus = 'EXECUTED' | 'PENDING' | 'CANCELLED' | 'REJECTED';

export interface ChartPoint {
  time: string;
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockFundamentals {
  marketCap: string;
  peRatio: number;
  pbRatio: number;
  industryPe: number;
  debtToEquity: number;
  roe: number;
  divYield: number;
  eps: number;
  bookValue: number;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  exchange: Exchange;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  week52High: number;
  week52Low: number;
  fundamentals: StockFundamentals;
  about: string;
  sparkline: number[];
  tickDirection?: 'up' | 'down' | null;
  lastTickTime?: number;
}

export interface MarketDepthItem {
  bids: { price: number; orders: number; quantity: number }[];
  asks: { price: number; orders: number; quantity: number }[];
  totalBuyQty: number;
  totalSellQty: number;
}

export interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

export interface Order {
  id: string;
  symbol: string;
  stockName: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  price: number;
  limitPrice?: number;
  status: OrderStatus;
  timestamp: number;
  totalAmount: number;
  marginUsed: number;
  note?: string;
  /** Stop-loss trigger price (SL / SL-M orders) */
  triggerPrice?: number;
  /** Whether an SL / SL-M order has been triggered and is now working in the market */
  triggered?: boolean;
  /** After Market Order — queued while market is closed, executes at next open */
  isAmo?: boolean;
  /** Placed while "simulation" mode was on (outside real market hours) */
  isSim?: boolean;
  /** Funds blocked in the wallet while the order is pending */
  blockedAmount?: number;
  /** Total statutory charges + brokerage deducted for this order */
  charges?: number;
  /** Realised P&L (net of charges) booked by this order, if it closed a position */
  realizedPnl?: number;
  /** Realized price movement before fees; used to avoid double-counting fees. */
  grossRealizedPnl?: number;
  /** Average fill price */
  avgPrice?: number;
}

export interface Holding {
  symbol: string;
  stockName: string;
  quantity: number;
  averagePrice: number;
  totalInvested: number;
  exchange: Exchange;
}

export interface IntradayPosition {
  id: string;
  symbol: string;
  stockName: string;
  action: OrderAction; // BUY (Long) or SELL (Short)
  quantity: number;
  entryPrice: number;
  marginBlocked: number;
  leverage: number; // 5x
  timestamp: number;
  exchange: Exchange;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export interface PortfolioSummary {
  currentValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  availableCash: number;
  lockedMargin: number;
}

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  authProvider: 'google' | 'email';
  avatar?: string;
  initialCash: number;
  createdAt: number;
}

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'BUY' | 'SELL' | 'SQUARE_OFF';
  amount: number;
  description: string;
  timestamp: number;
}
