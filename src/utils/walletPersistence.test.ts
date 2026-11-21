import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  postAuthoritativeWalletReset,
  postAuthoritativeWalletTopUp,
  fetchAuthoritativeAccountProfile,
} from '../features/virtual-trading/services/paperTradingApi';
import { buildAuthoritativeUserProfileAndPortfolio } from '../features/virtual-trading/utils/accountRestore';
import { computeCommittedCapitalAmount } from '../features/virtual-trading/utils/portfolioRemoteAdapter';
import { isJwtTokenExpired, setStoredSessionToken } from '../lib/authSession';
import { issueSessionToken, resolveOrCreateCanonicalUser } from '../server/auth/authService';
import { DurableStore } from '../server/storage/durableStore';
import {
  addFreeTierVirtualCash,
  getOrCreateTradingLedger,
  processAccountBackgroundQueue,
  resetAuthoritativePortfolio,
} from '../server/trading/tradingLedger';

function makeTempStorePath(prefix: string): string {
  return path.join(os.tmpdir(), `${prefix}_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
}

test('wallet top-ups and manual resets persist on disk across server restarts and sync without resetting to 1L', async () => {
  const filePath = makeTempStorePath('niftylens_wallet_persist');
  const now = Date.parse('2026-03-04T05:30:00.000Z');
  try {
    const store1 = new DurableStore({ filePath });
    const user = resolveOrCreateCanonicalUser(
      { preferredUid: 'usr_wallet_persist_1', email: 'wallet.persist@example.com', name: 'Wallet Tester', authProvider: 'google' },
      store1,
      now
    );

    // Initial free ledger starts at 1L
    const initialLedger = getOrCreateTradingLedger(user.uid, store1, now);
    assert.equal(initialLedger.balance, 100_000);

    // Upgrade account to Beginner (10L cap)
    user.subscriptionTier = 'beginner';
    user.subscriptionBillingCycle = 'monthly';
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = now + 30 * 86_400_000;
    store1.persist();

    // Top up +9L to reach 10L cap
    const topUpRes = await addFreeTierVirtualCash({
      userId: user.uid, amount: 900_000, description: 'Added via Paper Wallet Top-Up', store: store1, now: now + 1000,
    });
    assert.equal(topUpRes.status, 200);
    assert.equal(topUpRes.success, true);
    assert.equal(topUpRes.ledger?.balance, 1_000_000);

    // Exceeding 10L cap is rejected
    const overCapRes = await addFreeTierVirtualCash({ userId: user.uid, amount: 50_000, store: store1, now: now + 2000 });
    assert.equal(overCapRes.status, 400);
    assert.equal(overCapRes.code, 'WALLET_CAP_EXCEEDED');

    // Simulate dev server restart: instantiate a brand-new DurableStore from disk
    const store2 = new DurableStore({ filePath });
    const reloadedUser = store2.getState().users[user.uid];
    assert.equal(reloadedUser.subscriptionTier, 'beginner');

    const syncedAfterRestart = await processAccountBackgroundQueue({
      userId: user.uid, quotes: {}, store: store2, now: now + 5000,
    });
    assert.equal(syncedAfterRestart.ledger.balance, 1_000_000);
    assert.equal(syncedAfterRestart.ledger.initialBalance, 1_000_000);
    assert.equal(syncedAfterRestart.ledger.walletTransactions[0].amount, 900_000);

    // Restored client profile + portfolio preserves 10L balance and beginner tier
    const restored = buildAuthoritativeUserProfileAndPortfolio({ serverUser: reloadedUser, serverLedger: syncedAfterRestart.ledger });
    assert.equal(restored.activeTier, 'beginner');
    assert.equal(restored.profile.subscriptionTier, 'beginner');
    assert.equal(restored.portfolio.balance, 1_000_000);
    assert.equal(restored.portfolio.walletTransactions.length, 2);

    // Manual reset to 5L persists across another server restart
    const resetRes = await resetAuthoritativePortfolio({ userId: user.uid, startingCash: 500_000, store: store2, now: now + 6000 });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.ledger?.balance, 500_000);

    const store3 = new DurableStore({ filePath });
    assert.equal(getOrCreateTradingLedger(user.uid, store3, now + 7000).balance, 500_000);
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

test('frontend wallet API client sends top-up, reset, and profile requests with bearer auth and handles expired JWTs', async () => {
  const now = 1_750_000_000_000;
  const validIssued = issueSessionToken(
    { uid: 'usr_tok_1', email: 'tok@example.com', name: 'Tok User', authProvider: 'email' },
    now,
    300_000
  );
  assert.equal(isJwtTokenExpired(validIssued.token, now + 1000), false);
  assert.equal(isJwtTokenExpired(validIssued.token, now + 300_001), true);

  // Firebase-style second-precision exp claim
  const fbPayload = Buffer.from(JSON.stringify({ exp: Math.floor((now - 60_000) / 1000) })).toString('base64url');
  const expiredFbJwt = `eyJhbGciOiJSUzI1NiJ9.${fbPayload}.sig`;
  assert.equal(isJwtTokenExpired(expiredFbJwt, now), true);

  // Mock localStorage + fetch to verify wallet API calls hit backend endpoints
  const storageMap = new Map<string, string>();
  const prevStorage = globalThis.localStorage;
  const prevFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; auth: string | null; body: string | null }> = [];

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
    },
  });

  const freshToken = issueSessionToken(
    { uid: 'usr_api_1', email: 'api@example.com', name: 'API User', authProvider: 'email' },
    Date.now(),
    3_600_000
  ).token;
  setStoredSessionToken(freshToken);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers || {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method || 'GET',
      auth: headers.Authorization || null,
      body: typeof init?.body === 'string' ? init.body : null,
    });
    if (url === '/api/paper-trading/wallet/topup') {
      return new Response(JSON.stringify({
        success: true, message: '₹9,00,000 added to your paper wallet.',
        state: { balance: 1_000_000, initialBalance: 1_000_000, holdings: [], positions: [], orders: [], executedOrderKeys: [], walletTransactions: [] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url === '/api/paper-trading/wallet/reset') {
      return new Response(JSON.stringify({
        success: true, message: 'Reset paper portfolio with ₹10,00,000 virtual cash.',
        state: { balance: 1_000_000, initialBalance: 1_000_000, holdings: [], positions: [], orders: [], executedOrderKeys: [], walletTransactions: [] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      success: true,
      user: { uid: 'usr_api_1', email: 'api@example.com', name: 'API User', subscriptionTier: 'beginner' },
      ledger: { balance: 1_000_000, initialBalance: 1_000_000, holdings: [], positions: [], orders: [], executedOrderKeys: [], walletTransactions: [] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const topUp = await postAuthoritativeWalletTopUp({ amount: 900_000, description: 'Added via Paper Wallet Top-Up' });
    assert.equal(topUp.ok, true);
    assert.equal(topUp.state?.balance, 1_000_000);

    const reset = await postAuthoritativeWalletReset({ startingCash: 1_000_000 });
    assert.equal(reset.ok, true);
    assert.equal(reset.state?.balance, 1_000_000);

    const profile = await fetchAuthoritativeAccountProfile();
    assert.equal(profile?.user.subscriptionTier, 'beginner');
    assert.equal(profile?.ledger.balance, 1_000_000);

    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.url}`),
      ['POST /api/paper-trading/wallet/topup', 'POST /api/paper-trading/wallet/reset', 'GET /api/account/profile']
    );
    assert.ok(calls.every((c) => c.auth === `Bearer ${freshToken}`));

    // Committed capital calculation subtracts MTF broker loan rather than double-counting MTF margin
    const committed = computeCommittedCapitalAmount({
      balance: 200_000,
      holdings: [{
        symbol: 'RELIANCE', stockName: 'Reliance', exchange: 'NSE', quantity: 100,
        averagePrice: 1000, totalInvested: 100_000, mtfLoanAmount: 80_000, mtfMarginBlocked: 20_000,
      }],
      positions: [],
      orders: [],
    });
    assert.equal(committed, 220_000);
  } finally {
    globalThis.fetch = prevFetch;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: prevStorage });
  }
});
