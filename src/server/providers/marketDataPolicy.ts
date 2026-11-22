import type { MarketDataPolicySet, MarketDataUseCase, ProviderId, UseCaseDataPolicy } from './types';

const VALID_PROVIDERS: Set<ProviderId> = new Set([
  'yahoo_finance',
  'upstox',
  'angel_one',
  'fyers',
  'truedata',
  'mock_test',
  'disabled',
]);

function parseProviderId(raw: string | undefined, defaultId: ProviderId): ProviderId {
  const cleaned = (raw || '').trim().toLowerCase() as ProviderId;
  return VALID_PROVIDERS.has(cleaned) ? cleaned : defaultId;
}

/**
 * Resolves the active market-data policy set from environment configuration.
 *
 * Production safeguards:
 * - Never allows `mock_test` in production.
 * - Does not silently enable Yahoo Finance in production unless explicitly authorized via
 *   `ALLOW_DEV_MARKET_DATA_IN_PROD=true` (for controlled internal demos) AND separately
 *   authorized per use case (`AUTHORIZE_PAPER_TRADING_PROVIDER=true`, `AUTHORIZE_ANALYTICS_PROVIDER=true`).
 * - Never assumes that a provider authorized for stock analytics is automatically authorized
 *   for paper trading or historical replay.
 */
export function resolveMarketDataPolicies(
  env: Record<string, string | undefined> = process.env
): MarketDataPolicySet {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  const environment: 'development' | 'test' | 'production' =
    nodeEnv === 'production' ? 'production' : nodeEnv === 'test' ? 'test' : 'development';
  const isProd = environment === 'production';

  const defaultProvider: ProviderId = isProd ? 'disabled' : 'upstox';
  const analyticsProvider = parseProviderId(
    env.MARKET_DATA_PROVIDER_ANALYTICS || env.MARKET_DATA_PROVIDER,
    defaultProvider
  );
  const paperTradingProvider = parseProviderId(
    env.MARKET_DATA_PROVIDER_PAPER_TRADING || env.MARKET_DATA_PROVIDER,
    defaultProvider
  );
  const replayProvider = parseProviderId(
    env.MARKET_DATA_PROVIDER_REPLAY || env.MARKET_DATA_PROVIDER,
    defaultProvider
  );

  const allowDevProviderInProd = env.ALLOW_DEV_MARKET_DATA_IN_PROD === 'true';
  const explicitAnalyticsAuth = isProd
    ? env.AUTHORIZE_ANALYTICS_PROVIDER === 'true'
    : env.AUTHORIZE_ANALYTICS_PROVIDER !== 'false';
  const explicitPaperTradingAuth = isProd
    ? env.AUTHORIZE_PAPER_TRADING_PROVIDER === 'true' && env.ENABLE_LIVE_PAPER_TRADING !== 'false'
    : env.AUTHORIZE_PAPER_TRADING_PROVIDER !== 'false' && env.ENABLE_LIVE_PAPER_TRADING !== 'false';
  const explicitReplayAuth = isProd
    ? env.AUTHORIZE_HISTORICAL_REPLAY_PROVIDER === 'true'
    : env.AUTHORIZE_HISTORICAL_REPLAY_PROVIDER !== 'false';

  function buildUseCasePolicy(
    useCase: MarketDataUseCase,
    requestedProvider: ProviderId,
    explicitlyAuthorized: boolean,
    maxDelaySec: number
  ): UseCaseDataPolicy {
    if (requestedProvider === 'disabled') {
      return {
        useCase,
        providerId: 'disabled',
        authorized: false,
        maxAllowedDelaySeconds: maxDelaySec,
        allowCachedStaleDisplay: true,
        allowOrderExecutionOnDelayed: false,
        reason: `No market data provider is configured for ${useCase}.`,
      };
    }

    if (isProd && requestedProvider === 'mock_test') {
      return {
        useCase,
        providerId: 'disabled',
        authorized: false,
        maxAllowedDelaySeconds: maxDelaySec,
        allowCachedStaleDisplay: false,
        allowOrderExecutionOnDelayed: false,
        reason: 'Mock test market data provider is strictly prohibited in production.',
      };
    }

    if (isProd && requestedProvider === 'yahoo_finance' && !allowDevProviderInProd) {
      return {
        useCase,
        providerId: 'yahoo_finance',
        authorized: false,
        maxAllowedDelaySeconds: maxDelaySec,
        allowCachedStaleDisplay: false,
        allowOrderExecutionOnDelayed: false,
        reason:
          'Yahoo Finance adapter is restricted in production unless explicitly permitted for a non-commercial pilot (ALLOW_DEV_MARKET_DATA_IN_PROD=true).',
      };
    }

    if (!explicitlyAuthorized) {
      return {
        useCase,
        providerId: requestedProvider,
        authorized: false,
        maxAllowedDelaySeconds: maxDelaySec,
        allowCachedStaleDisplay: true,
        allowOrderExecutionOnDelayed: false,
        reason: `Provider "${requestedProvider}" is not explicitly authorized for ${useCase}.`,
      };
    }

    return {
      useCase,
      providerId: requestedProvider,
      authorized: true,
      maxAllowedDelaySeconds: maxDelaySec,
      allowCachedStaleDisplay: true,
      allowOrderExecutionOnDelayed: env.ALLOW_DELAYED_PAPER_EXECUTION !== 'false',
    };
  }

  return {
    environment,
    stockAnalytics: buildUseCasePolicy(
      'stock_analytics',
      analyticsProvider,
      explicitAnalyticsAuth,
      Number(env.ANALYTICS_MAX_DELAY_SECONDS || 900)
    ),
    paperTrading: buildUseCasePolicy(
      'paper_trading',
      paperTradingProvider,
      explicitPaperTradingAuth,
      Number(env.PAPER_TRADING_MAX_DELAY_SECONDS || 900)
    ),
    historicalReplay: buildUseCasePolicy(
      'historical_replay',
      replayProvider,
      explicitReplayAuth,
      86400 * 365 * 10
    ),
    educationalSynthetic: {
      useCase: 'educational_synthetic',
      providerId: 'disabled',
      authorized: true,
      maxAllowedDelaySeconds: 0,
      allowCachedStaleDisplay: false,
      allowOrderExecutionOnDelayed: false,
      reason: 'Guess the Chart & Pattern Library use local synthetic educational scenarios.',
    },
  };
}
