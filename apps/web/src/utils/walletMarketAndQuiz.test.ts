import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  loadScopedQuizProgress,
  reconcileUserStats,
  saveScopedQuizProgress,
} from '../features/quiz/utils/quizStorage';
import { computeEffectiveWalletCap } from '../features/virtual-trading/utils/portfolioSync';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import { resolveMarketDataPolicies } from '../server/providers/marketDataPolicy';
import { resolveYahooSymbol } from '../server/providers/symbolCatalog';
import { YahooFinanceProvider } from '../server/providers/yahooFinanceProvider';
import { DurableStore } from '../server/storage/durableStore';
import {
  addFreeTierVirtualCash,
  applyMonthlyCapitalRefreshIfDue,
  computeCommittedCapital,
  creditLedgerOnTopUp,
  getOrCreateTradingLedger,
  migrateClientPortfolioOnce,
  resetAuthoritativePortfolio,
} from '../server/trading/tradingLedger';

const MARKET_OPEN_TS = Date.parse('2026-03-04T05:30:00.000Z');

test('wallet top-ups survive restoration without clamping and monthly capital refresh accounts for invested capital', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = MARKET_OPEN_TS;
  const freeUser = resolveOrCreateCanonicalUser({ email: 'topup.free@example.com', name: 'Free Topup User', authProvider: 'email' }, store, now);

  creditLedgerOnTopUp(freeUser.uid, 100_000, 'pay_topup_a', store, now);
  const ledgerAfterTopUps = creditLedgerOnTopUp(freeUser.uid, 100_000, 'pay_topup_b', store, now + 1000);
  assert.equal(ledgerAfterTopUps.balance, 300_000);
  assert.equal(ledgerAfterTopUps.paidTopUpCredit, 200_000);

  const cap = computeEffectiveWalletCap(100_000, { paidTopUpCredit: ledgerAfterTopUps.paidTopUpCredit }, ledgerAfterTopUps.walletTransactions);
  assert.equal(cap, 300_000);

  const migratedUser = resolveOrCreateCanonicalUser({ email: 'legacy.topup@example.com', name: 'Legacy Topup', authProvider: 'email' }, store, now);
  const migRes = migrateClientPortfolioOnce({
    userId: migratedUser.uid,
    clientState: {
      balance: 200_000, initialBalance: 200_000,
      walletTransactions: [{ id: 'TX-TOPUP-1', type: 'DEPOSIT', amount: 100_000, description: '+₹1,00,000 Virtual Capital Top-Up (₹50 · Ref pay_live_999)', timestamp: now }],
    },
    store, now,
  });
  assert.equal(migRes.migrated, true);
  assert.equal(migRes.ledger.balance, 200_000);
  assert.equal(migRes.ledger.paidTopUpCredit, 100_000);

  const monthUser = resolveOrCreateCanonicalUser({ email: 'monthly.user@example.com', name: 'Monthly User', authProvider: 'email' }, store, now);
  const monthLedger = getOrCreateTradingLedger(monthUser.uid, store, now);
  monthLedger.balance = 20_000;
  monthLedger.holdings = [{ symbol: 'RELIANCE', stockName: 'Reliance Industries', exchange: 'NSE', quantity: 90, averagePrice: 1000, totalInvested: 90_000 }];
  monthLedger.lastAutoResetMonth = '2025-01';

  assert.equal(applyMonthlyCapitalRefreshIfDue(monthLedger, 100_000, 'Free Starter', store, now), false);
  assert.equal(monthLedger.balance, 20_000);

  monthLedger.balance = 15_000;
  monthLedger.holdings[0].totalInvested = 50_000;
  monthLedger.lastAutoResetMonth = '2025-01';
  assert.equal(applyMonthlyCapitalRefreshIfDue(monthLedger, 100_000, 'Free Starter', store, now), true);
  assert.equal(monthLedger.balance, 50_000);
  assert.equal(computeCommittedCapital(monthLedger).totalCommitted, 100_000);

  assert.equal((await addFreeTierVirtualCash({ userId: freeUser.uid, amount: 50_000, store, now })).status, 403);
  assert.equal((await resetAuthoritativePortfolio({ userId: freeUser.uid, store, now })).status, 403);
});

test('market-data provider policies, symbol catalog, outage/stale handling, and removal of fabricated fallbacks', async () => {
  assert.equal(resolveYahooSymbol('ZOMATO'), 'ETERNAL.NS');
  assert.equal(resolveYahooSymbol('TATAMOTORS'), 'TMPV.NS');

  const prodDefaultPolicies = resolveMarketDataPolicies({ NODE_ENV: 'production' });
  assert.equal(prodDefaultPolicies.stockAnalytics.authorized, false);
  assert.equal(prodDefaultPolicies.paperTrading.authorized, false);

  const analyticsOnlyProd = resolveMarketDataPolicies({
    NODE_ENV: 'production', MARKET_DATA_PROVIDER_ANALYTICS: 'upstox', AUTHORIZE_ANALYTICS_PROVIDER: 'true',
  });
  assert.equal(analyticsOnlyProd.stockAnalytics.authorized, true);
  assert.equal(analyticsOnlyProd.paperTrading.authorized, false);

  const provider = new YahooFinanceProvider();
  const depth = await provider.getMarketDepth('RELIANCE');
  assert.equal(depth.data?.available, false);
  assert.deepEqual(depth.data?.bids, []);
  assert.deepEqual(depth.data?.asks, []);
  assert.equal(depth.metadata.status, 'UNAVAILABLE');
  const fundamentals = await provider.getFundamentals('RELIANCE');
  assert.equal(fundamentals.data?.available, false);
  assert.equal(fundamentals.metadata.status, 'UNAVAILABLE');

  const screenerClientPath = path.resolve(process.cwd(), 'src/features/screener/api/client.js');
  const screenerClientCode = fs.readFileSync(screenerClientPath, 'utf8');
  assert.equal(screenerClientCode.includes('buildFinancialsFallback'), false);
  assert.equal(screenerClientCode.includes('buildSwingFallback'), false);
  assert.equal(screenerClientCode.includes('buildIntradayFallback'), false);
  assert.equal(screenerClientCode.includes('buildStockAnalysisFallback'), false);
  assert.ok(screenerClientCode.includes('Historical Financial Statements (Provider Feed)'));
});

test('quiz storage isolates accounts and reconciles player balance math accurately', () => {
  const memMap = new Map<string, string>();
  const mockStorage: Storage = {
    get length() { return memMap.size; },
    clear() { memMap.clear(); },
    getItem(key: string) { return memMap.has(key) ? memMap.get(key)! : null; },
    key(index: number) { return Array.from(memMap.keys())[index] ?? null; },
    removeItem(key: string) { memMap.delete(key); },
    setItem(key: string, value: string) { memMap.set(key, value); },
  };

  saveScopedQuizProgress(
    'usr_account_a',
    {
      quizStats: { totalQuestions: 10, correctAnswers: 8, currentStreak: 4, bestStreak: 6, recentResults: [true, true, true, true] },
      stats: { balance: 112_500, startingBalance: 100_000, totalTrades: 2, wins: 2, losses: 0, winRate: 100, currentStreak: 2, bestStreak: 2, netProfit: 12_500, tradeHistory: [] },
      survivalBestStreak: 7,
    },
    mockStorage
  );

  const loadedB = loadScopedQuizProgress('usr_account_b', mockStorage);
  assert.equal(loadedB.quizStats.totalQuestions, 0);
  assert.equal(loadedB.stats.totalTrades, 0);
  assert.equal(loadedB.stats.balance, 10_000);
  assert.equal(loadedB.survivalState.bestStreak, 0);
  assert.equal(loadScopedQuizProgress(null, mockStorage).quizStats.totalQuestions, 0);

  const loadedA = loadScopedQuizProgress('usr_account_a', mockStorage);
  assert.equal(loadedA.quizStats.totalQuestions, 10);
  assert.equal(loadedA.quizStats.correctAnswers, 8);
  assert.equal(loadedA.stats.balance, 112_500);
  assert.equal(loadedA.survivalState.bestStreak, 7);

  const reconciled = reconcileUserStats({
    balance: 100_000, startingBalance: 100_000, totalTrades: 2, wins: 1, losses: 1,
    winRate: 50, currentStreak: 0, bestStreak: 1, netProfit: 4_250.5,
    tradeHistory: [
      { id: 't1', roundNumber: 1, scenarioId: 's1', assetSymbol: 'RELIANCE', assetName: 'Reliance Industries', timeframe: '1D', patternName: 'Double Bottom', patternCategory: 'Reversal', direction: 'BUY', entryPrice: 1000, exitPrice: 1060, priceChangePct: 6, leverage: 1, positionSize: 100000, pnl: 6000, pnlPct: 6, isWin: true, timestamp: 1, explanation: 'Breakout above neckline' },
      { id: 't2', roundNumber: 2, scenarioId: 's2', assetSymbol: 'TCS', assetName: 'Tata Consultancy Services', timeframe: '1D', patternName: 'Head and Shoulders', patternCategory: 'Reversal', direction: 'SELL', entryPrice: 2000, exitPrice: 2017.5, priceChangePct: -0.87, leverage: 1, positionSize: 100000, pnl: -1749.5, pnlPct: -1.75, isWin: false, timestamp: 2, explanation: 'Invalidated above right shoulder' },
    ],
  });

  assert.equal(reconciled.wins, 1);
  assert.equal(reconciled.losses, 1);
  assert.equal(reconciled.netProfit, 4250.5);
  assert.equal(reconciled.balance, 104250.5);
});
