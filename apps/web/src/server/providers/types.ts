import type {
  ChartPoint,
  Exchange,
  IndexData,
  MarketDataMetadata,
  MarketDepthItem,
  Stock,
  StockFundamentals,
  Timeframe,
} from '../../types/market';

export type ProviderId =
  | 'yahoo_finance'
  | 'upstox'
  | 'angel_one'
  | 'fyers'
  | 'truedata'
  | 'mock_test'
  | 'disabled';

export type MarketDataUseCase =
  | 'stock_analytics'
  | 'paper_trading'
  | 'historical_replay'
  | 'educational_synthetic';

export interface ProviderCapabilities {
  providerId: ProviderId;
  displayName: string;
  supportsStockSearch: boolean;
  supportsStockQuotes: boolean;
  supportsIndexQuotes: boolean;
  supportsHistoricalCandles: boolean;
  supportsIntradayCandles: boolean;
  supportsFundamentals: boolean;
  supportsMarketDepth: boolean;
  typicalDelaySeconds: number;
  isLicensedForCommercialRedistribution: boolean;
  isLicensedForPaperTrading: boolean;
}

export interface UseCaseDataPolicy {
  useCase: MarketDataUseCase;
  providerId: ProviderId;
  authorized: boolean;
  maxAllowedDelaySeconds: number;
  allowCachedStaleDisplay: boolean;
  allowOrderExecutionOnDelayed: boolean;
  reason?: string;
}

export interface MarketDataPolicySet {
  environment: 'development' | 'test' | 'production';
  stockAnalytics: UseCaseDataPolicy;
  paperTrading: UseCaseDataPolicy;
  historicalReplay: UseCaseDataPolicy;
  educationalSynthetic: UseCaseDataPolicy;
}

export interface StockSearchItem {
  symbol: string;
  providerSymbol: string;
  name: string;
  exchange: Exchange | string;
  sector: string;
  price: number | null;
}

export interface ProviderChartPayload {
  symbol: string;
  timeframe: Timeframe;
  points: ChartPoint[];
  previousClose: number | null;
  currentPrice: number | null;
}

export interface ProviderResponse<T> {
  available: boolean;
  data: T | null;
  metadata: MarketDataMetadata;
  error?: string;
}

export interface MarketDataProvider {
  readonly id: ProviderId;
  getCapabilities(): ProviderCapabilities;
  searchStocks(query: string, limit?: number, now?: number): Promise<ProviderResponse<StockSearchItem[]>>;
  getStockQuote(symbol: string, now?: number): Promise<ProviderResponse<Stock>>;
  getStockQuotes(symbols?: string[], now?: number): Promise<ProviderResponse<Stock[]>>;
  getIndexQuotes(now?: number): Promise<ProviderResponse<IndexData[]>>;
  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    now?: number
  ): Promise<ProviderResponse<ProviderChartPayload>>;
  getIntradayCandles(
    symbol: string,
    interval?: '2m' | '5m' | '15m',
    now?: number
  ): Promise<ProviderResponse<ProviderChartPayload>>;
  getFundamentals(symbol: string, now?: number): Promise<ProviderResponse<StockFundamentals>>;
  getMarketDepth(symbol: string, now?: number): Promise<ProviderResponse<MarketDepthItem>>;
}
