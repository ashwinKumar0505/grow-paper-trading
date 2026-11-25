export type Exchange = 'NSE' | 'BSE';
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
export type ChartType = 'line' | 'candlestick';
export type OrderProduct = 'DELIVERY' | 'INTRADAY' | 'MTF';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
export type OrderAction = 'BUY' | 'SELL';
export type OrderStatus = 'SCHEDULED' | 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

export type MarketDataStatus =
  | 'LIVE'
  | 'DELAYED'
  | 'HISTORICAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'SYNTHETIC_EDUCATIONAL';

export type QuoteFreshness =
  | 'LIVE'
  | 'DELAYED'
  | 'HISTORICAL'
  | 'LAST_AVAILABLE'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'SYNTHETIC_EDUCATIONAL';

export type DataProvenanceKind =
  | 'provider_live'
  | 'provider_delayed'
  | 'provider_historical'
  | 'cached_authentic'
  | 'synthetic_educational'
  | 'unavailable';

export interface MarketDataMetadata {
  source: string;
  timestamp: number | null;
  fetchedAt: number | null;
  freshness: QuoteFreshness;
  status: MarketDataStatus;
  delaySeconds: number | null;
  provenance: DataProvenanceKind;
  available: boolean;
  isStale: boolean;
  staleWarning?: string;
}

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
  available?: boolean;
  source?: string;
  marketCap: string | null;
  peRatio: number | null;
  pbRatio: number | null;
  industryPe: number | null;
  debtToEquity: number | null;
  roe: number | null;
  roce?: number | null;
  roa?: number | null;
  divYield: number | null;
  eps: number | null;
  bookValue: number | null;
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
  lowerCircuit?: number;
  upperCircuit?: number;
  fundamentals: StockFundamentals;
  about: string;
  sparkline: number[];
  tickDirection?: 'up' | 'down' | null;
  lastTickTime?: number;
  lastUpdated?: number;
  quoteTimestamp?: number;
  fetchedAt?: number;
  freshness?: QuoteFreshness;
  freshnessLabel?: string;
  isTradableQuote?: boolean;
  isStale?: boolean;
  providerAvailable?: boolean;
  staleWarning?: string;
  dataStatus?: MarketDataMetadata;
  marketDepth?: MarketDepthItem;
}

export interface MarketDepthItem {
  available?: boolean;
  source?: string;
  reason?: string;
  timestamp?: number | null;
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
  quoteTimestamp?: number;
  fetchedAt?: number;
  freshness?: QuoteFreshness;
  freshnessLabel?: string;
  isStale?: boolean;
  providerAvailable?: boolean;
  staleWarning?: string;
  dataStatus?: MarketDataMetadata;
}

export type {
  Order,
  PlaceOrderInput,
  Holding,
  IntradayPosition,
  Watchlist,
  PortfolioSummary,
  UserProfile,
  WalletTransaction,
} from './portfolioTypes';
