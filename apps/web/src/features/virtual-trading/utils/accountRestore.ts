import {
  BillingCycle,
  normalizeUsageQuota,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  type UserUsageQuota,
} from '../../../lib/subscription';
import type { UserProfile } from '../../../types/market';
import type {
  ServerTradingLedgerState,
  ServerUserAccount,
} from '../services/paperTradingApi';
import {
  computeEffectiveWalletCap,
  extractPortfolioFromRemote,
} from './portfolioRemoteAdapter';
import {
  createDefaultPortfolioSnapshot,
  loadScopedPortfolioFromStorage,
  type PortfolioSnapshot,
} from './portfolioSync';
import { DEFAULT_WATCHLISTS } from './storageKeys';
import { resolveActiveTier, type RemoteUserRecord } from './userProfileSync';

export function buildAuthoritativeUserProfileAndPortfolio(params: {
  serverUser: ServerUserAccount;
  serverLedger: ServerTradingLedgerState;
  fallbackName?: string;
  fallbackEmail?: string;
  fallbackProvider?: 'google' | 'email';
  fallbackAvatar?: string;
}): {
  activeTier: SubscriptionTier;
  profile: UserProfile;
  portfolio: PortfolioSnapshot;
  usageQuota: UserUsageQuota;
} {
  const { serverUser, serverLedger } = params;
  const activeTier: SubscriptionTier = serverUser.subscriptionTier || 'free';
  const initialBalance =
    typeof serverLedger.initialBalance === 'number'
      ? serverLedger.initialBalance
      : serverLedger.balance;

  const portfolio: PortfolioSnapshot = {
    balance: serverLedger.balance,
    initialBalance,
    holdings: Array.isArray(serverLedger.holdings) ? serverLedger.holdings : [],
    intradayPositions: Array.isArray(serverLedger.positions) ? serverLedger.positions : [],
    orders: Array.isArray(serverLedger.orders) ? serverLedger.orders : [],
    executedOrderKeys: Array.isArray(serverLedger.executedOrderKeys)
      ? serverLedger.executedOrderKeys
      : [],
    watchlists:
      Array.isArray(serverLedger.watchlists) && serverLedger.watchlists.length > 0
        ? serverLedger.watchlists
        : DEFAULT_WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })),
    walletTransactions: Array.isArray(serverLedger.walletTransactions)
      ? serverLedger.walletTransactions
      : [],
    updatedAt: serverLedger.updatedAt || Date.now(),
  };

  const email = serverUser.email || params.fallbackEmail || '';
  const profile: UserProfile = {
    uid: serverUser.uid,
    name: serverUser.name || params.fallbackName || email.split('@')[0] || 'Trader',
    email,
    phone: serverUser.phone,
    authProvider: serverUser.authProvider || params.fallbackProvider || 'email',
    avatar: serverUser.avatar || params.fallbackAvatar || undefined,
    initialCash: initialBalance,
    createdAt: serverUser.createdAt || Date.now(),
    subscriptionTier: activeTier,
    subscriptionBillingCycle: (serverUser.subscriptionBillingCycle as BillingCycle) || 'free',
    subscriptionStatus: serverUser.subscriptionStatus || 'active',
    subscriptionUpdatedAt: serverUser.subscriptionUpdatedAt || Date.now(),
    subscriptionExpiresAt: serverUser.subscriptionExpiresAt ?? null,
    razorpayPaymentId: serverUser.razorpayPaymentId || undefined,
    razorpayOrderId: serverUser.razorpayOrderId || undefined,
    razorpaySubscriptionId: serverUser.razorpaySubscriptionId || undefined,
    subscriptionAutoPay: serverUser.subscriptionAutoPay,
    subscriptionUpiMandateId: serverUser.subscriptionUpiMandateId,
    paidTopUpCredit: serverLedger.paidTopUpCredit ?? serverUser.paidTopUpCredit ?? 0,
  };

  return {
    activeTier,
    profile,
    portfolio,
    usageQuota: normalizeUsageQuota(serverUser.usageQuota ?? null),
  };
}

export function buildRestoredUserProfileAndPortfolio(params: {
  uid: string;
  remote: RemoteUserRecord;
  fallbackName: string;
  fallbackEmail: string;
  fallbackProvider: 'google' | 'email';
  fallbackAvatar?: string;
  fallbackPhone?: string;
}): {
  activeTier: SubscriptionTier;
  profile: UserProfile;
  portfolio: PortfolioSnapshot;
} {
  const { uid, remote } = params;
  const activeTier: SubscriptionTier = resolveActiveTier(remote);
  const localPortfolio = loadScopedPortfolioFromStorage(uid);
  const tierMaxCash =
    computeEffectiveWalletCap(
      SUBSCRIPTION_PLANS[activeTier].maxWalletLimit,
      remote,
      localPortfolio?.walletTransactions
    ) ?? SUBSCRIPTION_PLANS[activeTier].maxWalletLimit;

  const restoredBalance =
    typeof remote.balance === 'number'
      ? Math.min(tierMaxCash, remote.balance)
      : SUBSCRIPTION_PLANS[activeTier].defaultStartingCash;
  const restoredInitial =
    typeof remote.initialBalance === 'number'
      ? Math.min(tierMaxCash, remote.initialBalance)
      : restoredBalance;

  const remotePortfolio = extractPortfolioFromRemote(remote, tierMaxCash);
  const portfolio =
    remotePortfolio || localPortfolio || createDefaultPortfolioSnapshot(restoredBalance);
  portfolio.balance = restoredBalance;
  portfolio.initialBalance = restoredInitial;

  const profile: UserProfile = {
    uid,
    name: remote.name || params.fallbackName,
    email: remote.email || params.fallbackEmail,
    phone: remote.phone || params.fallbackPhone,
    authProvider: (remote.authProvider as UserProfile['authProvider']) || params.fallbackProvider,
    avatar: params.fallbackAvatar || remote.avatar || undefined,
    initialCash: restoredInitial,
    createdAt: remote.createdAt || Date.now(),
    subscriptionTier: activeTier,
    subscriptionBillingCycle: (remote.subscriptionBillingCycle as BillingCycle) || 'free',
    subscriptionStatus: remote.subscriptionStatus || 'active',
    subscriptionUpdatedAt: remote.subscriptionUpdatedAt || Date.now(),
    subscriptionExpiresAt: remote.subscriptionExpiresAt ?? null,
    razorpayPaymentId: remote.razorpayPaymentId || undefined,
    razorpayOrderId: remote.razorpayOrderId || undefined,
    razorpaySubscriptionId: remote.razorpaySubscriptionId || undefined,
    subscriptionAutoPay: remote.subscriptionAutoPay,
    subscriptionUpiMandateId: remote.subscriptionUpiMandateId,
    paidTopUpCredit: remote.paidTopUpCredit ?? 0,
  };

  return { activeTier, profile, portfolio };
}
