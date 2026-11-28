import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import test from 'node:test';
import type { Express } from 'express';
import { resolveRouteSeo } from '../lib/seo/routeMetadata';
import { createExpressApp, runServerBackgroundTradingTick } from '../server/app';
import { marketDataRegistry } from '../server/providers/providerRegistry';
import { UpstoxMarketDataProvider } from '../server/providers/upstoxProvider';
import { DurableStore } from '../server/storage/durableStore';
import { getOrCreateTradingLedger } from '../server/trading/tradingLedger';
import { pruneMapEntries, setBoundedMapEntry } from '../server/utils/boundedCache';

function invokeGet(app: Express, urlPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    const req = new IncomingMessage(socket);
    req.url = urlPath;
    req.method = 'GET';
    req.headers = {};
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    res.write = ((chunk: unknown) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    }) as typeof res.write;
    res.end = ((chunk?: unknown) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      res.emit('finish');
      resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      return res;
    }) as typeof res.end;
    const handler = app as unknown as (r: IncomingMessage, w: ServerResponse, n: (e?: unknown) => void) => void;
    handler(req, res, (err?: unknown) => { if (err) reject(err); });
  });
}

test('boundedCache enforces LRU maxEntries cap and prunes expired entries', () => {
  const map = new Map<string, { value: number; cachedAt: number }>();
  setBoundedMapEntry(map, 'a', { value: 1, cachedAt: 100 }, 2);
  setBoundedMapEntry(map, 'b', { value: 2, cachedAt: 200 }, 2);
  setBoundedMapEntry(map, 'a', { value: 10, cachedAt: 300 }, 2);
  setBoundedMapEntry(map, 'c', { value: 3, cachedAt: 400 }, 2);
  assert.deepEqual([...map.keys()], ['a', 'c']);

  const removed = pruneMapEntries(map, (entry) => entry.cachedAt < 350, 2);
  assert.equal(removed, 1);
  assert.deepEqual([...map.keys()], ['c']);
});

test('DurableStore.withLock cleans up lock entries and honors conditional persist', async () => {
  let persistCalls = 0;
  const store = new DurableStore({ inMemoryOnly: true });
  const internal = store as unknown as { locks: Map<string, Promise<unknown>> };
  const origPersist = store.persist.bind(store);
  store.persist = () => {
    persistCalls += 1;
    origPersist();
  };

  await store.withLock('key-no-change', () => ({ changed: false }), {
    persist: (res) => res.changed,
  });
  assert.equal(persistCalls, 0);
  assert.equal(internal.locks.size, 0);

  await store.withLock('key-changed', () => ({ changed: true }), {
    persist: (res) => res.changed,
  });
  assert.equal(persistCalls, 1);
  assert.equal(internal.locks.size, 0);
});

test('runServerBackgroundTradingTick skips Upstox quote calls when closed for future AMO orders', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const saturdayNoonUtc = Date.parse('2026-03-07T06:30:00.000Z'); // Saturday 12:00 IST
  const ledger = getOrCreateTradingLedger('usr_amo_closed', store, saturdayNoonUtc);
  ledger.orders.push({
    id: 'ord_future_amo',
    symbol: 'RELIANCE',
    stockName: 'Reliance Industries',
    exchange: 'NSE',
    action: 'BUY',
    orderType: 'MARKET',
    product: 'DELIVERY',
    quantity: 1,
    price: 2500,
    totalAmount: 2500,
    marginUsed: 2500,
    status: 'SCHEDULED',
    timestamp: saturdayNoonUtc - 60_000,
    scheduledForSession: '2026-03-09',
  });

  let quoteCalls = 0;
  const provider = marketDataRegistry.getProviderForUseCase('paper_trading');
  const origGetQuotes = provider.getStockQuotes.bind(provider);
  provider.getStockQuotes = async (symbols, now) => {
    quoteCalls += 1;
    return origGetQuotes(symbols, now);
  };
  try {
    await runServerBackgroundTradingTick(store, saturdayNoonUtc);
    assert.equal(quoteCalls, 0, 'Closed-market tick must skip quote fetches for future AMO orders');

    ledger.positions.push({
      id: 'pos_overdue_rms',
      symbol: 'RELIANCE',
      stockName: 'Reliance Industries',
      exchange: 'NSE',
      action: 'BUY',
      quantity: 1,
      entryPrice: 2500,
      marginBlocked: 500,
      leverage: 5,
      timestamp: Date.parse('2026-03-06T05:00:00.000Z'), // Friday 10:30 IST
    });
    provider.getStockQuotes = async () => {
      quoteCalls += 1;
      return {
        available: false,
        data: [],
        metadata: {
          source: 'upstox',
          timestamp: null,
          fetchedAt: saturdayNoonUtc,
          freshness: 'UNAVAILABLE',
          status: 'UNAVAILABLE',
          delaySeconds: null,
          provenance: 'unavailable',
          available: false,
          isStale: true,
        },
      };
    };
    await runServerBackgroundTradingTick(store, saturdayNoonUtc);
    assert.equal(quoteCalls, 1, 'Overdue intraday RMS square-off must still run outside market hours');
  } finally {
    provider.getStockQuotes = origGetQuotes;
  }
});

test('UpstoxMarketDataProvider negative-caches unavailable fundamentals and prunes expired caches', async () => {
  let fetchCount = 0;
  const fakeFetch: typeof fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ status: 'error', data: null }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const provider = new UpstoxMarketDataProvider({
    env: { UPSTOX_ANALYTICS_TOKEN: 'test-token' },
    fetchFn: fakeFetch,
  });
  const t0 = Date.parse('2026-03-04T06:00:00.000Z');
  const first = await provider.getFundamentals('RELIANCE', t0);
  assert.equal(first.available, false);
  const callsAfterFirst = fetchCount;
  assert.ok(callsAfterFirst > 0);

  const second = await provider.getFundamentals('RELIANCE', t0 + 60_000);
  assert.equal(second.available, false);
  assert.equal(fetchCount, callsAfterFirst);

  provider.pruneExpiredCaches(t0 + 15 * 60_000);
  const third = await provider.getFundamentals('RELIANCE', t0 + 15 * 60_000);
  assert.equal(third.available, false);
  assert.ok(fetchCount > callsAfterFirst);
});

test('GET /api/health exposes memory metrics and resolveRouteSeo runs without React', async () => {
  const seo = resolveRouteSeo('/paper-trading-india');
  assert.equal(seo.statusCode, 200);
  assert.equal(seo.canonicalPath, '/paper-trading-india');

  const store = new DurableStore({ inMemoryOnly: true });
  const app = createExpressApp(store);
  const res = await invokeGet(app, '/api/health');
  assert.equal(res.status, 200);
  const body = JSON.parse(res.body) as {
    status: string;
    memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  };
  assert.equal(body.status, 'ok');
  assert.ok(body.memory.rssMb > 0 && body.memory.heapUsedMb > 0 && body.memory.heapTotalMb > 0);
});
