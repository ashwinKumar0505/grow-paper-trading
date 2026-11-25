import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STOCKS } from '../data/mockStocks';
import { SUBSCRIPTION_PLANS, normalizeUsageQuota } from '../lib/subscription';
import type { Holding, IntradayPosition, Stock } from '../types/market';
import {
  computeProfileWalletMetrics,
  getSubscriptionStatusDisplay,
  mergeBillingHistoryRecords,
} from './profileBilling';

const mockStock = (symbol: string, price: number): Stock => ({
  ...INITIAL_STOCKS[0],
  symbol,
  name: symbol,
  exchange: 'NSE',
  price,
  previousClose: price,
});

test('getSubscriptionStatusDisplay reports Cancellation Scheduled and active-until date', () => {
  const expiresAt = Date.UTC(2026, 11, 17, 12, 0, 0);
  const res = getSubscriptionStatusDisplay({
    tier: 'beginner',
    status: 'cancelled',
    billingCycle: 'monthly',
    expiresAt,
  });

  assert.equal(res.badgeLabel, 'Cancellation Scheduled');
  assert.equal(res.tone, 'amber');
  assert.match(res.summaryText, /^Your plan remains active until /);
  assert.match(res.summaryText, /Dec 2026/);
});

test('computeProfileWalletMetrics accurately computes portfolio, cash, invested value, and daily usage', () => {
  const holdings: Holding[] = [
    {
      symbol: 'TCS',
      stockName: 'TCS',
      exchange: 'NSE',
      quantity: 10,
      averagePrice: 3000,
      totalInvested: 30000,
    },
  ];
  const intradayPositions: IntradayPosition[] = [
    {
      id: 'POS-1',
      symbol: 'INFY',
      stockName: 'Infosys',
      exchange: 'NSE',
      action: 'BUY',
      quantity: 10,
      entryPrice: 1500,
      marginBlocked: 3000,
      leverage: 5,
      timestamp: Date.now(),
    },
  ];
  const stocks = [mockStock('TCS', 3200), mockStock('INFY', 1550)];
  const quota = { ...normalizeUsageQuota(null), analysisSearchesCount: 3 };

  const metrics = computeProfileWalletMetrics({
    balance: 90000,
    holdings,
    intradayPositions,
    orders: [],
    stocks,
    planConfig: SUBSCRIPTION_PLANS.beginner,
    usageQuota: quota,
  });

  // TCS current value = 32,000; INFY margin (3,000) + unrealized P&L (500) = 3,500 -> invested = 35,500
  assert.equal(metrics.availableCash, 90000);
  assert.equal(metrics.investedMarketValue, 35500);
  assert.equal(metrics.totalPortfolioValue, 125500);
  assert.equal(metrics.dailyUsed, 3);
  assert.equal(metrics.dailyLimit, 15);
  assert.equal(metrics.analysisUsagePercent, 20);
  assert.equal(metrics.isUnlimitedAnalyses, false);
});

test('mergeBillingHistoryRecords filters out topup_1l and attaches Razorpay receipt URLs', () => {
  const merged = mergeBillingHistoryRecords({
    firestoreDocs: [
      {
        subscriptionId: 'sub_123',
        tier: 'beginner',
        planName: 'Beginner Package',
        billingCycle: 'monthly',
        status: 'active',
        amountPaidINR: 299,
        razorpayPaymentId: 'pay_abc',
        activatedAt: 1000,
      },
      {
        subscriptionId: 'topup_999',
        tier: 'topup_1l',
        planName: 'Topup',
        amountPaidINR: 50,
        razorpayPaymentId: 'pay_topup',
        activatedAt: 2000,
      },
    ],
    razorpayItems: [
      {
        id: 'inv_1',
        paymentId: 'pay_abc',
        subscriptionId: 'sub_123',
        amountINR: 299,
        currency: 'INR',
        status: 'paid',
        createdAt: 1000,
        receiptUrl: 'https://rzp.io/i/test123',
        description: null,
      },
    ],
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].transactionId, 'pay_abc');
  assert.equal(merged[0].receiptUrl, 'https://rzp.io/i/test123');
  assert.equal(merged[0].amountINR, 299);
});
