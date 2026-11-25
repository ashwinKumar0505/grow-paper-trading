import type {
  IndexData,
  MarketDepthItem,
  Stock,
  StockFundamentals,
  Timeframe,
} from '../../types/market';
import { buildMarketDataMetadata } from '../../utils/marketHours';
import { resolveMarketDataPolicies } from './marketDataPolicy';
import type {
  MarketDataPolicySet,
  MarketDataProvider,
  MarketDataUseCase,
  ProviderCapabilities,
  ProviderChartPayload,
  ProviderId,
  ProviderResponse,
  StockSearchItem,
} from './types';
import { UpstoxMarketDataProvider } from './upstoxProvider';
import { YahooFinanceProvider } from './yahooFinanceProvider';

class DisabledMarketDataProvider implements MarketDataProvider {
  readonly id: ProviderId;
  private reason: string;

  constructor(id: ProviderId = 'disabled', reason = 'Market data provider is not configured or authorized.') {
    this.id = id;
    this.reason = reason;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      providerId: this.id,
      displayName: `Unconfigured / Restricted Provider (${this.id})`,
      supportsStockSearch: false,
      supportsStockQuotes: false,
      supportsIndexQuotes: false,
      supportsHistoricalCandles: false,
      supportsIntradayCandles: false,
      supportsFundamentals: false,
      supportsMarketDepth: false,
      typicalDelaySeconds: 0,
      isLicensedForCommercialRedistribution: false,
      isLicensedForPaperTrading: false,
    };
  }

  private unavailable<T>(now = Date.now()): ProviderResponse<T> {
    return {
      available: false,
      data: null,
      metadata: buildMarketDataMetadata({
        source: this.id,
        freshness: 'UNAVAILABLE',
        providerAvailable: false,
        now,
      }),
      error: this.reason,
    };
  }

  async searchStocks(_q: string, _limit?: number, now?: number): Promise<ProviderResponse<StockSearchItem[]>> {
    return this.unavailable(now);
  }
  async getStockQuote(_s: string, now?: number): Promise<ProviderResponse<Stock>> {
    return this.unavailable(now);
  }
  async getStockQuotes(_s?: string[], now?: number): Promise<ProviderResponse<Stock[]>> {
    return this.unavailable(now);
  }
  async getIndexQuotes(now?: number): Promise<ProviderResponse<IndexData[]>> {
    return this.unavailable(now);
  }
  async getHistoricalCandles(_s: string, _tf: Timeframe, now?: number): Promise<ProviderResponse<ProviderChartPayload>> {
    return this.unavailable(now);
  }
  async getIntradayCandles(_s: string, _i?: '2m' | '5m' | '15m', now?: number): Promise<ProviderResponse<ProviderChartPayload>> {
    return this.unavailable(now);
  }
  async getFundamentals(_s: string, now?: number): Promise<ProviderResponse<StockFundamentals>> {
    return this.unavailable(now);
  }
  async getMarketDepth(_s: string, now?: number): Promise<ProviderResponse<MarketDepthItem>> {
    return this.unavailable(now);
  }
}

export class MarketDataProviderRegistry {
  private providers = new Map<ProviderId, MarketDataProvider>();
  private policies: MarketDataPolicySet;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.policies = resolveMarketDataPolicies(env);
    this.providers.set('upstox', new UpstoxMarketDataProvider({ env }));
    this.providers.set('yahoo_finance', new YahooFinanceProvider());
    this.providers.set('disabled', new DisabledMarketDataProvider('disabled'));
  }

  registerProvider(provider: MarketDataProvider): void {
    if (this.policies.environment === 'production' && provider.id === 'mock_test') {
      throw new Error('Cannot register mock_test market data provider in production.');
    }
    this.providers.set(provider.id, provider);
  }

  getPolicies(): MarketDataPolicySet {
    return this.policies;
  }

  refreshPolicies(env: Record<string, string | undefined> = process.env): MarketDataPolicySet {
    this.policies = resolveMarketDataPolicies(env);
    return this.policies;
  }

  getProviderForUseCase(useCase: MarketDataUseCase): MarketDataProvider {
    const policy =
      useCase === 'paper_trading'
        ? this.policies.paperTrading
        : useCase === 'historical_replay'
          ? this.policies.historicalReplay
          : useCase === 'educational_synthetic'
            ? this.policies.educationalSynthetic
            : this.policies.stockAnalytics;

    if (!policy.authorized) {
      return new DisabledMarketDataProvider(
        policy.providerId,
        policy.reason || `Market data provider "${policy.providerId}" is not authorized for ${useCase}.`
      );
    }

    const provider = this.providers.get(policy.providerId);
    if (!provider) {
      return new DisabledMarketDataProvider(
        policy.providerId,
        `Market data adapter for "${policy.providerId}" is not registered. Configure a licensed adapter before enabling ${useCase}.`
      );
    }
    return provider;
  }

  getUnderlyingUpstoxProvider(): UpstoxMarketDataProvider {
    return this.providers.get('upstox') as UpstoxMarketDataProvider;
  }

  getUnderlyingYahooProvider(): YahooFinanceProvider {
    return this.providers.get('yahoo_finance') as YahooFinanceProvider;
  }
}

export const marketDataRegistry = new MarketDataProviderRegistry();
