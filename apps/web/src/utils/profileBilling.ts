import type { SubscriptionPlanConfig, SubscriptionTier, UserUsageQuota } from '../lib/subscription';
import type { Holding, IntradayPosition, Order, Stock } from '../types/market';
import { summarizePortfolio } from './portfolio';

export interface BillingRecord {
  id: string;
  planName: string;
  billingCycle: string;
  amountINR: number;
  currency: string;
  status: string;
  dateMs: number;
  transactionId: string;
  receiptUrl: string | null;
}

export interface RemoteSubscriptionDoc {
  subscriptionId?: string;
  tier?: string;
  planName?: string;
  billingCycle?: string;
  status?: string;
  amountPaidINR?: number;
  currency?: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  activatedAt?: number;
}

export interface RazorpayInvoiceRecord {
  id: string;
  paymentId: string | null;
  subscriptionId: string | null;
  amountINR: number;
  currency: string;
  status: string;
  createdAt: number;
  receiptUrl: string | null;
  description: string | null;
}

export function formatProfileDate(timestamp?: number | null): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getSubscriptionStatusDisplay(params: {
  tier: SubscriptionTier;
  status?: 'active' | 'expired' | 'cancelled' | 'past_due' | 'halted';
  billingCycle?: string;
  expiresAt?: number | null;
}): {
  badgeLabel: string;
  tone: 'emerald' | 'amber' | 'muted';
  summaryText: string;
} {
  const { tier, status, billingCycle, expiresAt } = params;
  if (tier === 'free') {
    return {
      badgeLabel: 'Active',
      tone: 'emerald',
      summaryText: 'Free starter tier · No recurring charges',
    };
  }

  const expiryText = formatProfileDate(expiresAt);
  if (status === 'cancelled') {
    return {
      badgeLabel: 'Cancellation Scheduled',
      tone: 'amber',
      summaryText: expiresAt
        ? `Your plan remains active until ${expiryText}`
        : 'Auto-renewal cancelled · Active until end of cycle',
    };
  }

  if (status === 'past_due' || status === 'halted') {
    return {
      badgeLabel: status === 'halted' ? 'Payment Halted' : 'Payment Pending',
      tone: 'amber',
      summaryText: 'Renewal payment requires attention to keep paid entitlements active',
    };
  }

  if (status === 'expired') {
    return {
      badgeLabel: 'Expired',
      tone: 'muted',
      summaryText: 'Subscription period ended',
    };
  }

  const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
  return {
    badgeLabel: 'Active',
    tone: 'emerald',
    summaryText: `${cycleLabel} recurring subscription`,
  };
}

export function computeProfileWalletMetrics(params: {
  balance: number;
  holdings: Holding[];
  intradayPositions: IntradayPosition[];
  orders: Order[];
  stocks: Stock[];
  planConfig: SubscriptionPlanConfig;
  usageQuota: UserUsageQuota;
}) {
  const { balance, holdings, intradayPositions, orders, stocks, planConfig, usageQuota } = params;
  const summary = summarizePortfolio(balance, holdings, intradayPositions, orders, stocks);
  const mtfLoan = holdings.reduce((s, h) => s + (h.mtfLoanAmount ?? 0), 0);
  const investedMarketValue = Math.max(
    0,
    Math.round((summary.holdingsValue - mtfLoan + summary.margin + summary.positionPnl) * 100) / 100
  );
  const totalPortfolioValue = Math.max(0, Math.round(summary.equity * 100) / 100);
  const availableCash = Math.round(balance * 100) / 100;

  const dailyLimit = planConfig.analysisDailyLimit;
  const isUnlimitedAnalyses = dailyLimit >= 999;
  const dailyUsed = usageQuota.analysisSearchesCount || 0;
  const analysisUsagePercent = isUnlimitedAnalyses
    ? 0
    : Math.min(100, Math.round((dailyUsed / Math.max(1, dailyLimit)) * 100));

  return {
    totalPortfolioValue,
    availableCash,
    investedMarketValue,
    dailyUsed,
    dailyLimit,
    isUnlimitedAnalyses,
    analysisUsagePercent,
  };
}

export function mergeBillingHistoryRecords(params: {
  firestoreDocs: RemoteSubscriptionDoc[];
  razorpayItems: RazorpayInvoiceRecord[];
  fallbackPlanName?: string;
  fallbackCycle?: string;
}): BillingRecord[] {
  const { firestoreDocs, razorpayItems, fallbackPlanName = 'Subscription', fallbackCycle = 'monthly' } = params;
  const byTxId = new Map<string, BillingRecord>();

  for (const docItem of firestoreDocs) {
    if (docItem.tier === 'free' || docItem.tier === 'topup_1l') continue;
    const txId = docItem.razorpayPaymentId || docItem.subscriptionId || '';
    if (!txId) continue;

    byTxId.set(txId, {
      id: docItem.subscriptionId || txId,
      planName: docItem.planName || fallbackPlanName,
      billingCycle: docItem.billingCycle || fallbackCycle,
      amountINR: typeof docItem.amountPaidINR === 'number' ? docItem.amountPaidINR : 0,
      currency: docItem.currency || 'INR',
      status: docItem.status === 'cancelled' ? 'Cancelled' : 'Paid',
      dateMs: docItem.activatedAt || 0,
      transactionId: txId,
      receiptUrl: null,
    });
  }

  for (const inv of razorpayItems) {
    const txId = inv.paymentId || inv.id;
    const existing = byTxId.get(txId);
    if (existing) {
      existing.receiptUrl = inv.receiptUrl || existing.receiptUrl;
      if (inv.amountINR > 0 && existing.amountINR === 0) existing.amountINR = inv.amountINR;
      if (inv.createdAt > 0 && existing.dateMs === 0) existing.dateMs = inv.createdAt;
      continue;
    }

    if (inv.amountINR <= 0 && inv.status === 'issued') continue;
    byTxId.set(txId, {
      id: inv.id,
      planName: inv.description || fallbackPlanName,
      billingCycle: fallbackCycle,
      amountINR: inv.amountINR,
      currency: inv.currency || 'INR',
      status: inv.status === 'paid' || inv.status === 'captured' ? 'Paid' : inv.status,
      dateMs: inv.createdAt,
      transactionId: txId,
      receiptUrl: inv.receiptUrl,
    });
  }

  return Array.from(byTxId.values()).sort((a, b) => b.dateMs - a.dateMs);
}
