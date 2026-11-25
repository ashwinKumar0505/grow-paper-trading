import type { RefObject } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { cancelRazorpaySubscription } from '../../../components/checkout/razorpayApi';
import { BillingCycle, SUBSCRIPTION_PLANS, SubscriptionTier } from '../../../lib/subscription';
import { UserProfile } from '../../../types/market';
import { OrderBookState } from '../../../utils/orderEngine';
import { fetchAuthoritativeAccountProfile } from '../services/paperTradingApi';
import {
  persistSubscriptionCancellationToFirestore,
  persistSubscriptionUpgradeToFirestore,
} from '../services/subscriptionPersistence';
import { buildAuthoritativeUserProfileAndPortfolio } from '../utils/accountRestore';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  'user' | 'balance' | 'setUser' | 'setInitialBalance' | 'setWalletTransactions' | 'setUsageQuota'
> &
  Pick<TradingContextType, 'addToast'> & {
    commitEngine: (patch: Partial<OrderBookState>) => void;
    engineRef: RefObject<OrderBookState>;
  };

const saveCachedUserProfile = (profile: UserProfile) => {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem('mypaper_user_v2', serialized);
    localStorage.setItem('groww_paper_user_v1', serialized);
  } catch {}
};

export function useSubscriptionActions({
  user, balance, setUser, commitEngine, setInitialBalance,
  setWalletTransactions, setUsageQuota, addToast, engineRef,
}: Options) {
  const syncFromAuthoritativeServer = async (): Promise<{ balance: number } | null> => {
    const serverAccount = await fetchAuthoritativeAccountProfile();
    if (!serverAccount) return null;
    const { profile, portfolio, usageQuota } = buildAuthoritativeUserProfileAndPortfolio({
      serverUser: serverAccount.user, serverLedger: serverAccount.ledger,
      fallbackName: user?.name, fallbackEmail: user?.email,
      fallbackProvider: user?.authProvider, fallbackAvatar: user?.avatar,
    });
    setUser(profile);
    commitEngine({
      balance: portfolio.balance, holdings: portfolio.holdings, positions: portfolio.intradayPositions,
      orders: portfolio.orders, executedOrderKeys: portfolio.executedOrderKeys,
    });
    setInitialBalance(portfolio.initialBalance);
    setWalletTransactions(portfolio.walletTransactions);
    setUsageQuota(usageQuota);
    saveCachedUserProfile(profile);
    return { balance: portfolio.balance };
  };

  const upgradeSubscription = async ({
    tier, billingCycle = 'monthly', razorpayPaymentId, razorpayOrderId,
    amountPaid, subscriptionAutoPay, subscriptionUpiMandateId,
  }: {
    tier: SubscriptionTier; billingCycle?: BillingCycle; razorpayPaymentId?: string;
    razorpayOrderId?: string; amountPaid?: number; subscriptionAutoPay?: boolean;
    subscriptionUpiMandateId?: string;
  }) => {
    const targetPlan = SUBSCRIPTION_PLANS[tier];
    if (user?.uid && tier !== 'free') {
      const synced = await syncFromAuthoritativeServer();
      if (synced) {
        addToast(
          `${targetPlan.name} Activated!`,
          `Payment verified! Unlocked ${targetPlan.name} features & ₹${targetPlan.maxWalletLimit.toLocaleString('en-IN')} virtual capital capacity.`,
          'success'
        );
        return;
      }
    }

    const now = Date.now();
    const effectiveCycle: BillingCycle = tier === 'free' ? 'free' : billingCycle;
    const durationMs = effectiveCycle === 'yearly' ? 365 * 86_400_000 : effectiveCycle === 'monthly' ? 30 * 86_400_000 : 0;
    const expiresAt = tier === 'free' ? null : now + durationMs;
    const paymentId = razorpayPaymentId || (tier === 'free' ? undefined : `pay_demo_${now}`);
    const orderId = razorpayOrderId || (tier === 'free' ? undefined : `order_demo_${now}`);
    const subscriptionId = orderId?.startsWith('sub_') ? orderId : undefined;

    const currentUser = user || {
      uid: `user_demo_${now}`, name: 'Tradedia Trader', email: 'demo@tradedia.in',
      authProvider: 'email' as const, initialCash: targetPlan.defaultStartingCash, createdAt: now,
    };

    const effectiveUid = currentUser.uid || `user_${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newBalance = tier === 'free' ? Math.min(targetPlan.maxWalletLimit, balance) : Math.max(balance, targetPlan.defaultStartingCash);

    const updatedProfile: UserProfile = {
      ...currentUser, uid: effectiveUid, initialCash: newBalance, subscriptionTier: tier,
      subscriptionBillingCycle: effectiveCycle, subscriptionStatus: 'active', subscriptionUpdatedAt: now,
      subscriptionExpiresAt: expiresAt, razorpayPaymentId: paymentId, razorpayOrderId: orderId,
      razorpaySubscriptionId: subscriptionId, subscriptionAutoPay: tier === 'free' ? false : (subscriptionAutoPay ?? true),
      subscriptionUpiMandateId: subscriptionUpiMandateId || undefined,
    };

    setUser(updatedProfile);
    const shouldClearOldOrders = tier !== 'free' && newBalance > balance && engineRef.current.holdings.length === 0 && engineRef.current.positions.length === 0;
    commitEngine(shouldClearOldOrders ? { balance: newBalance, orders: [] } : { balance: newBalance });
    setInitialBalance(newBalance);
    saveCachedUserProfile(updatedProfile);

    if (newBalance > balance) {
      const bonus = newBalance - balance;
      setWalletTransactions((prev) => [{
        id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: 'DEPOSIT', amount: bonus,
        description: `${targetPlan.name} upgrade wallet boost (+₹${bonus.toLocaleString('en-IN')})`, timestamp: now,
      }, ...prev]);
    }

    await persistSubscriptionUpgradeToFirestore({
      effectiveUid, updatedProfile, newBalance, tier, effectiveCycle,
      expiresAt, paymentId, orderId, subscriptionId, amountPaid, now,
    });
    addToast(
      `${targetPlan.name} Activated!`,
      tier === 'free'
        ? 'Switched to Free Starter Plan (₹1,00,000 wallet limit with 1L automatic monthly reset).'
        : `Payment verified! Unlocked ${targetPlan.name} features & ₹${targetPlan.maxWalletLimit.toLocaleString('en-IN')} virtual capital capacity.`,
      'success'
    );
  };

  const cancelSubscription = async (): Promise<{ success: boolean; expiresAt?: number; message?: string }> => {
    if (!user) return { success: false, message: 'No active user session.' };
    const subscriptionId = user.razorpaySubscriptionId || (user.razorpayOrderId?.startsWith('sub_') ? user.razorpayOrderId : undefined);
    let razorpayEndMs: number | undefined;
    if (subscriptionId) {
      try {
        const res = await cancelRazorpaySubscription(subscriptionId);
        if (!res.success) {
          const msg = res.message || 'Could not cancel Razorpay subscription. Please try again.';
          addToast('Cancellation Failed', msg, 'error');
          return { success: false, message: msg };
        }
        razorpayEndMs = res.currentEndMs || res.endedAtMs;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to reach payment server. Please try again.';
        addToast('Cancellation Failed', msg, 'error');
        return { success: false, message: msg };
      }
    }
    const now = Date.now();
    const cycleMs = user.subscriptionBillingCycle === 'yearly' ? 365 * 86_400_000 : 30 * 86_400_000;
    const effectiveExpiresAt = razorpayEndMs || user.subscriptionExpiresAt || (user.subscriptionUpdatedAt ? user.subscriptionUpdatedAt + cycleMs : now + cycleMs);
    const updatedProfile: UserProfile = {
      ...user, subscriptionStatus: 'cancelled', subscriptionAutoPay: false,
      subscriptionExpiresAt: effectiveExpiresAt, subscriptionUpdatedAt: now,
    };
    setUser(updatedProfile);
    saveCachedUserProfile(updatedProfile);
    const effectiveUid = user.uid || `user_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await persistSubscriptionCancellationToFirestore({
      effectiveUid, email: updatedProfile.email, razorpayPaymentId: user.razorpayPaymentId, effectiveExpiresAt, now,
    });
    const lastDateStr = new Date(effectiveExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    addToast('Subscription Cancelled', `Auto-renewal is off. Your plan stays active until ${lastDateStr}, then moves to Free Starter.`, 'info');
    return { success: true, expiresAt: effectiveExpiresAt };
  };

  return { upgradeSubscription, cancelSubscription };
}
