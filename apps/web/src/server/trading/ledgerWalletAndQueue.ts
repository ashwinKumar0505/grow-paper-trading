import crypto from 'crypto';
import { getCurrentMonthKey, normalizeUsageQuota, type SubscriptionTier } from '../../lib/subscription';
import { resolveAuthoritativeUserTier } from '../entitlements/entitlementService';
import type { DurableStore, DurableTradingLedger } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { computeCommittedCapital, getOrCreateTradingLedger } from './ledgerCapital';

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function addFreeTierVirtualCash(params: {
  userId: string;
  amount: number;
  description?: string;
  store?: DurableStore;
  now?: number;
}): Promise<{
  status: number;
  success: boolean;
  code?: string;
  requiredTier?: SubscriptionTier;
  message: string;
  ledger?: DurableTradingLedger;
}> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 400, success: false, message: 'Enter a valid positive top-up amount.' };
  }

  return store.withLock(`user:${params.userId}`, () => {
    const user = store.getState().users[params.userId];
    const { tier, plan } = resolveAuthoritativeUserTier(user, now);
    if (tier === 'free') {
      return {
        status: 403, success: false, code: 'SUBSCRIPTION_REQUIRED', requiredTier: 'beginner',
        message: 'Free virtual refills require a Beginner or Advanced subscription. Free Starter accounts reset automatically each month.',
      };
    }

    const ledger = getOrCreateTradingLedger(params.userId, store, now);
    const { totalCommitted } = computeCommittedCapital(ledger);
    const maxCap = plan.maxWalletLimit + (ledger.paidTopUpCredit || 0);
    const allowedAdd = Math.max(0, r2(maxCap - totalCommitted));

    if (allowedAdd <= 0 || amount > allowedAdd) {
      return {
        status: 400, success: false, code: 'WALLET_CAP_EXCEEDED',
        requiredTier: tier === 'beginner' ? 'advanced' : undefined,
        message: allowedAdd <= 0
          ? `Your portfolio is already at the ₹${maxCap.toLocaleString('en-IN')} virtual capital cap for ${plan.name}.`
          : `You can add at most ₹${allowedAdd.toLocaleString('en-IN')} to stay within your ₹${maxCap.toLocaleString('en-IN')} plan cap.`,
      };
    }

    ledger.balance = r2(ledger.balance + amount);
    ledger.initialBalance = r2(ledger.initialBalance + amount);
    ledger.version += 1;
    ledger.updatedAt = now;
    ledger.walletTransactions.unshift({
      id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      type: 'DEPOSIT', amount: r2(amount),
      description: params.description || `Virtual capital top-up (${plan.name})`, timestamp: now,
    });
    store.appendAudit({
      userId: params.userId, category: 'WALLET', action: 'PLAN_TOPUP_ADDED',
      details: { amount, newBalance: ledger.balance }, timestamp: now,
    });

    return { status: 200, success: true, message: `₹${amount.toLocaleString('en-IN')} added to your paper wallet.`, ledger };
  });
}

export async function resetAuthoritativePortfolio(params: {
  userId: string;
  startingCash?: number;
  store?: DurableStore;
  now?: number;
}): Promise<{
  status: number;
  success: boolean;
  code?: string;
  requiredTier?: SubscriptionTier;
  message: string;
  ledger?: DurableTradingLedger;
}> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();

  return store.withLock(`user:${params.userId}`, () => {
    const user = store.getState().users[params.userId];
    const { tier, plan } = resolveAuthoritativeUserTier(user, now);
    if (tier === 'free' || !plan.allowUnlimitedWalletResets) {
      return {
        status: 403, success: false, code: 'MANUAL_RESET_ENTITLEMENT_REQUIRED', requiredTier: 'beginner',
        message: 'Manual portfolio reset requires the Beginner or Advanced Package.',
      };
    }

    const requestedCash = params.startingCash ?? plan.defaultStartingCash;
    if (!Number.isFinite(requestedCash) || requestedCash < 1000) {
      return { status: 400, success: false, message: 'Starting virtual cash must be at least ₹1,000.' };
    }
    if (requestedCash > plan.maxWalletLimit) {
      return {
        status: 403, success: false, code: 'RESET_AMOUNT_EXCEEDS_PLAN_CAP', requiredTier: 'advanced',
        message: `${plan.name} supports portfolio resets up to ₹${plan.maxWalletLimit.toLocaleString('en-IN')}.`,
      };
    }

    const clampedCash = r2(Math.min(plan.maxWalletLimit, Math.max(1000, requestedCash)));
    const ledger = getOrCreateTradingLedger(params.userId, store, now);
    ledger.balance = clampedCash;
    ledger.initialBalance = clampedCash;
    ledger.holdings = [];
    ledger.positions = [];
    ledger.orders = [];
    ledger.squareOffPendingSymbols = [];
    ledger.version += 1;
    ledger.updatedAt = now;
    ledger.walletTransactions = [{
      id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      type: 'DEPOSIT', amount: clampedCash,
      description: `Portfolio reset credit (${plan.name})`, timestamp: now,
    }];

    if (user) {
      const nextQuota = normalizeUsageQuota(user.usageQuota);
      nextQuota.lastPortfolioResetMonth = getCurrentMonthKey();
      nextQuota.portfolioResetsThisMonth += 1;
      user.usageQuota = nextQuota;
      user.updatedAt = now;
    }

    store.appendAudit({
      userId: params.userId, category: 'WALLET', action: 'PORTFOLIO_MANUAL_RESET',
      details: { startingCash: clampedCash }, timestamp: now,
    });

    return { status: 200, success: true, message: `Reset paper portfolio with ₹${clampedCash.toLocaleString('en-IN')} virtual cash.`, ledger };
  });
}
