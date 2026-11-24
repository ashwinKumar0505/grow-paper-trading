import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import { readBackendCsvCandles } from '../server/providers/diskCacheReader';
import { resolveMarketDataPolicies } from '../server/providers/marketDataPolicy';
import { MarketDataProviderRegistry } from '../server/providers/providerRegistry';
import { UpstoxMarketDataProvider } from '../server/providers/upstoxProvider';
import { DurableStore } from '../server/storage/durableStore';
import { getOrCreateTradingLedger, submitAuthoritativeOrder } from '../server/trading/tradingLedger';

const MARKET_OPEN_TS = Date.parse('2026-03-04T05:30:00.000Z'); // 11:00 IST

function makeJsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
}

test('Upstox token-only auth enforces Analytics Token, never substitutes daily token, and handles 401/429/500 clearly', async () => {
  const noTokenProvider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ACCESS_TOKEN: 'daily-token-must-not-be-used' },
  });
  const missingRes = await noTokenProvider.getStockQuote('RELIANCE', MARKET_OPEN_TS);
  assert.equal(missingRes.available, false);
  assert.match(missingRes.error || '', /UPSTOX_ANALYTICS_TOKEN/);
  assert.match(missingRes.error || '', /UPSTOX_ACCESS_TOKEN is not substituted/);

  let authCalls = 0;
  const invalidTokenProvider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'expired-token-1234' },
    fetchFn: async () => {
      authCalls++;
      return makeJsonResponse({ status: 'error', errors: [{ errorCode: 'UDAPI100050' }] }, 401);
    },
  });
  const unauthRes1 = await invalidTokenProvider.getStockQuote('RELIANCE', MARKET_OPEN_TS);
  const unauthRes2 = await invalidTokenProvider.getStockQuote('TCS', MARKET_OPEN_TS);
  assert.equal(unauthRes1.available, false);
  assert.match(unauthRes1.error || '', /invalid, expired, or revoked/i);
  assert.equal(unauthRes2.available, false);
  assert.equal(authCalls, 1); // Cooldown avoids spamming Upstox on invalid token

  let rateCalls = 0;
  const retryProvider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'valid-analytics-token' },
    baseRetryDelayMs: 50,
    maxRetries: 2,
    fetchFn: async () => {
      rateCalls++;
      if (rateCalls === 1) return makeJsonResponse({ status: 'error' }, 429);
      return makeJsonResponse({
        status: 'success',
        data: {
          'NSE_EQ:RELIANCE': {
            instrument_token: 'NSE_EQ|INE002A01018',
            last_price: 2950,
            net_change: 25,
            timestamp: String(MARKET_OPEN_TS - 1000),
            ohlc: { open: 2930, high: 2960, low: 2920, close: 2925 },
          },
        },
      });
    },
  });
  const retried = await retryProvider.getStockQuote('RELIANCE', MARKET_OPEN_TS);
  assert.equal(retried.available, true);
  assert.equal(retried.data?.price, 2950);
  assert.equal(rateCalls, 2);
});

test('Provider-separated disk caches never present Yahoo CSVs as Upstox data', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upstox-cache-test-'));
  const dailyDir = path.join(tmpDir, 'daily');
  const metaDir = path.join(tmpDir, 'meta');
  fs.mkdirSync(dailyDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });

  const csvBody = 'Date,Open,High,Low,Close,Volume\n2026-03-02,100,105,99,104,1000\n2026-03-03,104,108,103,107,1200\n';
  fs.writeFileSync(path.join(dailyDir, 'RELIANCE.csv'), csvBody);
  fs.writeFileSync(path.join(metaDir, 'yfinance_RELIANCE_1d_adj.meta.json'), JSON.stringify({ provider_id: 'yfinance' }));

  // Yahoo reads legacy CSV; Upstox MUST reject it
  assert.ok(readBackendCsvCandles('RELIANCE', 'daily', 'yahoo_finance', tmpDir));
  assert.equal(readBackendCsvCandles('RELIANCE', 'daily', 'upstox', tmpDir), null);

  // Upstox reads ONLY provider-prefixed CSV with verified upstox sidecar
  fs.writeFileSync(path.join(dailyDir, 'upstox_RELIANCE_raw.csv'), csvBody);
  assert.equal(readBackendCsvCandles('RELIANCE', 'daily', 'upstox', tmpDir), null); // missing sidecar
  fs.writeFileSync(path.join(metaDir, 'upstox_RELIANCE_1d_raw.meta.json'), JSON.stringify({ provider_id: 'upstox' }));
  assert.equal(readBackendCsvCandles('RELIANCE', 'daily', 'upstox', tmpDir)?.length, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Registry defaults to Upstox, preserves explicit Yahoo rollback, and honors authorization flags', async () => {
  const defaultPolicies = resolveMarketDataPolicies({ NODE_ENV: 'development' });
  assert.equal(defaultPolicies.stockAnalytics.providerId, 'upstox');
  assert.equal(defaultPolicies.paperTrading.providerId, 'upstox');

  const rollbackRegistry = new MarketDataProviderRegistry({
    NODE_ENV: 'development',
    MARKET_DATA_PROVIDER: 'yahoo_finance',
  });
  assert.equal(rollbackRegistry.getProviderForUseCase('stock_analytics').id, 'yahoo_finance');

  const upstoxProv = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'token-only' },
    fetchFn: async () =>
      makeJsonResponse({
        status: 'success',
        data: {
          'NSE_EQ:RELIANCE': {
            instrument_token: 'NSE_EQ|INE002A01018',
            last_price: 1350,
            ohlc: { open: 1340, high: 1360, low: 1335, close: 1345 },
            total_buy_quantity: 0,
            total_sell_quantity: 0,
            depth: { buy: [{ price: 0, orders: 0, quantity: 0 }], sell: [{ price: 0, orders: 0, quantity: 0 }] },
          },
        },
      }),
  });
  const caps = upstoxProv.getCapabilities();
  assert.equal(caps.providerId, 'upstox');
  assert.equal(caps.isLicensedForCommercialRedistribution, false);
  assert.equal(caps.isLicensedForPaperTrading, false);
  assert.equal(caps.supportsMarketDepth, true);
  assert.equal(caps.supportsFundamentals, true);

  const depth = await upstoxProv.getMarketDepth('RELIANCE', MARKET_OPEN_TS);
  assert.equal(depth.available, false);
  assert.equal(depth.metadata.status, 'UNAVAILABLE');
});

test('Stale Upstox quotes during upstream outage are blocked by paper-trading execution safeguards', async () => {
  let failUpstream = false;
  const provider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'valid-token' },
    maxRetries: 0,
    fetchFn: async () => {
      if (failUpstream) return makeJsonResponse({ status: 'error' }, 503);
      return makeJsonResponse({
        status: 'success',
        data: {
          'NSE_EQ:RELIANCE': {
            instrument_token: 'NSE_EQ|INE002A01018',
            last_price: 2500,
            net_change: 20,
            last_trade_time: String(MARKET_OPEN_TS - 2000),
            ohlc: { open: 2485, high: 2510, low: 2480, close: 2480 },
          },
        },
      });
    },
  });

  const liveRes = await provider.getStockQuote('RELIANCE', MARKET_OPEN_TS);
  assert.equal(liveRes.available, true);
  assert.equal(liveRes.data?.isTradableQuote, true);

  // Simulate upstream outage 30 seconds later (past QUOTE_TTL_MS)
  failUpstream = true;
  const staleNow = MARKET_OPEN_TS + 30_000;
  const staleRes = await provider.getStockQuote('RELIANCE', staleNow);
  assert.equal(staleRes.available, true);
  assert.equal(staleRes.data?.isStale, true);
  assert.equal(staleRes.data?.providerAvailable, false);
  assert.equal(staleRes.data?.isTradableQuote, false);

  const store = new DurableStore({ inMemoryOnly: true });
  const user = resolveOrCreateCanonicalUser(
    { email: 'stale.guard@example.com', name: 'Stale Guard', authProvider: 'email' },
    store,
    staleNow
  );
  getOrCreateTradingLedger(user.uid, store, staleNow);
  const orderRes = await submitAuthoritativeOrder({
    userId: user.uid,
    orderInput: {
      symbol: 'RELIANCE', stockName: 'Reliance Industries Ltd.',
      action: 'BUY', product: 'DELIVERY', orderType: 'MARKET', exchange: 'NSE', quantity: 5,
    },
    quoteResolver: async (sym, ts) => (await provider.getStockQuote(sym, ts)).data,
    store,
    now: staleNow,
  });
  assert.equal(orderRes.success, false);
  assert.equal(orderRes.order?.status, 'REJECTED');
  assert.match(orderRes.order?.rejectionReason || '', /stale or unavailable/i);
});

test('Browser screener scanCache isolates cached snapshots across market-data providers', async () => {
  const { CACHE_KEYS, loadCachedScan, saveCachedScan, syncActiveScreenerProvider } = await import(
    '../features/screener/utils/scanCache.js'
  );
  syncActiveScreenerProvider('yfinance');
  saveCachedScan(CACHE_KEYS.financialsPrefix + 'RELIANCE', {
    available: true,
    source: 'Yahoo Finance (company filings)',
    yearly: [{ period: 'FY25', end_date: '2025-03-31', revenue: 1e12, net_profit: 1e11 }],
  });
  assert.ok(loadCachedScan(CACHE_KEYS.financialsPrefix + 'RELIANCE'));

  syncActiveScreenerProvider('upstox');
  assert.equal(loadCachedScan(CACHE_KEYS.financialsPrefix + 'RELIANCE'), null);

  saveCachedScan(CACHE_KEYS.financialsPrefix + 'RELIANCE', {
    available: true,
    source: 'Upstox Company Fundamentals API',
    data_provenance: { provider_id: 'upstox' },
    yearly: [{ period: 'FY25', end_date: '2025-03-31', revenue: 1e12, net_profit: 1e11 }],
  });
  assert.equal(loadCachedScan(CACHE_KEYS.financialsPrefix + 'RELIANCE')?.providerId, 'upstox');
});
