import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSupportedSymbolFormat,
  resolveCanonicalSymbol,
  resolveCatalogUpstoxInstrumentKey,
} from '../server/providers/symbolCatalog';
import { mergeUpstoxCandles } from '../server/providers/upstoxCandles';
import { UpstoxMarketDataProvider } from '../server/providers/upstoxProvider';
import type { UpstoxRawCandle } from '../server/providers/upstoxTypes';

const MARKET_OPEN_TS = Date.parse('2026-03-04T05:30:00.000Z'); // 11:00 IST

function makeJsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
}

test('Upstox instrument catalog maps aliases, equities, and indices while rejecting malformed symbols', () => {
  assert.equal(resolveCanonicalSymbol('ZOMATO'), 'ETERNAL');
  assert.equal(resolveCanonicalSymbol('TATAMOTORS'), 'TMPV');
  assert.equal(resolveCatalogUpstoxInstrumentKey('ZOMATO'), 'NSE_EQ|INE758T01015');
  assert.equal(resolveCatalogUpstoxInstrumentKey('ETERNAL'), 'NSE_EQ|INE758T01015');
  assert.equal(resolveCatalogUpstoxInstrumentKey('TATAMOTORS'), 'NSE_EQ|INE155A01022');
  assert.equal(resolveCatalogUpstoxInstrumentKey('TMPV'), 'NSE_EQ|INE155A01022');
  assert.equal(resolveCatalogUpstoxInstrumentKey('NIFTY 50'), 'NSE_INDEX|Nifty 50');
  assert.equal(resolveCatalogUpstoxInstrumentKey('SENSEX'), 'BSE_INDEX|SENSEX');
  assert.equal(resolveCatalogUpstoxInstrumentKey('BANK NIFTY'), 'NSE_INDEX|Nifty Bank');
  assert.equal(resolveCatalogUpstoxInstrumentKey('NIFTY IT'), 'NSE_INDEX|Nifty IT');
  assert.equal(resolveCatalogUpstoxInstrumentKey('NIFTY AUTO'), 'NSE_INDEX|Nifty Auto');
  assert.equal(isSupportedSymbolFormat('DUMMYHEG'), false);
  assert.equal(isSupportedSymbolFormat('---'), false);
  assert.equal(isSupportedSymbolFormat('RELIANCE'), true);
});

test('Upstox provider fetches bulk quotes with alias dedup, index quotes, partial responses, and search without leaking instrument keys', async () => {
  const requestedUrls: string[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    requestedUrls.push(url);
    assert.equal((init?.headers as Record<string, string>)?.Authorization, 'Bearer test-analytics-token');

    if (url.includes('/v2/market-quote/quotes') && url.includes('INE758T01015')) {
      return makeJsonResponse({
        status: 'success',
        data: {
          'NSE_EQ:ETERNAL': {
            instrument_token: 'NSE_EQ|INE758T01015',
            symbol: 'ETERNAL',
            last_price: 265.5,
            net_change: 5.5,
            volume: 12_345_678,
            last_trade_time: String(MARKET_OPEN_TS - 2000),
            lower_circuit_limit: 234,
            upper_circuit_limit: 286,
            ohlc: { open: 261, high: 268, low: 259.5, close: 260 },
          },
        },
      });
    }
    if (url.includes('/v2/market-quote/quotes') && url.includes('Nifty%2050')) {
      return makeJsonResponse({
        status: 'success',
        data: {
          'NSE_INDEX:Nifty 50': {
            instrument_token: 'NSE_INDEX|Nifty 50',
            last_price: 24500.25,
            net_change: 150.25,
            timestamp: String(MARKET_OPEN_TS - 1000),
            ohlc: { open: 24400, high: 24550, low: 24380, close: 24350 },
          },
          'BSE_INDEX:SENSEX': {
            instrument_token: 'BSE_INDEX|SENSEX',
            last_price: 80500,
            net_change: 400,
            timestamp: String(MARKET_OPEN_TS - 1000),
            ohlc: { open: 80200, high: 80600, low: 80100, close: 80100 },
          },
        },
      });
    }
    if (url.includes('/v2/instruments/search')) {
      return makeJsonResponse({
        status: 'success',
        data: [
          {
            instrument_key: 'NSE_EQ|INE758T01015',
            tradingsymbol: 'ETERNAL',
            name: 'ETERNAL LIMITED',
            exchange: 'NSE',
            segment: 'NSE_EQ',
            last_price: 265.5,
          },
        ],
      });
    }
    return makeJsonResponse({ status: 'success', data: {} });
  };

  const provider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'test-analytics-token' },
    fetchFn: fakeFetch,
  });

  // Alias ZOMATO + ETERNAL + missing symbol TCS (partial response) -> single deduplicated bulk request
  const bulk = await provider.getStockQuotes(['ZOMATO', 'ETERNAL', 'TCS'], MARKET_OPEN_TS);
  assert.equal(bulk.available, true);
  assert.equal(bulk.data?.length, 2);
  assert.equal(bulk.data?.[0].symbol, 'ZOMATO');
  assert.equal(bulk.data?.[0].price, 265.5);
  assert.equal(bulk.data?.[0].previousClose, 260);
  assert.equal(bulk.data?.[0].change, 5.5);
  assert.equal(bulk.data?.[0].lowerCircuit, 234);
  assert.equal(bulk.data?.[0].upperCircuit, 286);
  assert.equal(bulk.data?.[0].freshness, 'LIVE');
  assert.equal(bulk.data?.[1].symbol, 'ETERNAL');
  assert.equal(requestedUrls.filter((u) => u.includes('/v2/market-quote/quotes')).length, 1);
  assert.equal(requestedUrls[0].split('INE758T01015').length - 1, 1);

  const indices = await provider.getIndexQuotes(MARKET_OPEN_TS);
  assert.equal(indices.available, true);
  assert.equal(indices.data?.length, 2);
  assert.equal(indices.data?.[0].symbol, 'NIFTY 50');
  assert.equal(indices.data?.[0].change, 150.25);

  const search = await provider.searchStocks('ZOMATO', 5, MARKET_OPEN_TS);
  assert.equal(search.available, true);
  assert.equal(search.data?.[0].symbol, 'ETERNAL');
  assert.equal(search.data?.[0].providerSymbol, 'ETERNAL.NS');
  assert.equal(search.data?.[0].providerSymbol.includes('NSE_EQ|'), false);
});

test('Upstox candle merger sorts ascending, deduplicates IST daily dates with intraday precedence, and handles 1D closed-market fallback', async () => {
  const historical: UpstoxRawCandle[] = [
    ['2026-03-04T00:00:00+05:30', 102, 106, 101, 104, 1000, 0],
    ['2026-03-03T00:00:00+05:30', 100, 103, 99, 102, 900, 0],
    ['2026-03-02T00:00:00+05:30', 98, 101, 97, 100, 800, 0],
  ];
  const intraday: UpstoxRawCandle[] = [
    ['2026-03-04T09:15:00+05:30', 102, 108, 101, 107.5, 1500, 0],
  ];
  const merged = mergeUpstoxCandles(historical, intraday, '1M', true);
  assert.equal(merged.length, 3);
  assert.ok(merged[0].timestamp < merged[1].timestamp && merged[1].timestamp < merged[2].timestamp);
  assert.equal(merged[2].close, 107.5);
  assert.equal(merged[2].volume, 1500);

  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/v3/historical-candle/intraday/')) {
      return makeJsonResponse({ status: 'success', data: { candles: [] } });
    }
    return makeJsonResponse({
      status: 'success',
      data: {
        candles: [
          ['2026-03-03T15:25:00+05:30', 2905, 2910, 2900, 2908, 5000, 0],
          ['2026-03-03T15:20:00+05:30', 2900, 2906, 2898, 2905, 4500, 0],
          ['2026-03-02T15:25:00+05:30', 2880, 2890, 2875, 2888, 4000, 0],
        ],
      },
    });
  };
  const provider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'test-token' },
    fetchFn: fakeFetch,
  });
  const chart1D = await provider.getHistoricalCandles('RELIANCE', '1D', MARKET_OPEN_TS);
  assert.equal(chart1D.available, true);
  assert.equal(chart1D.data?.points.length, 2); // Only latest trading day (2026-03-03)
  assert.equal(chart1D.data?.points[0].close, 2905);
  assert.equal(chart1D.data?.points[1].close, 2908);
  assert.ok(calls.some((u) => u.includes('/minutes/5/')));
});
