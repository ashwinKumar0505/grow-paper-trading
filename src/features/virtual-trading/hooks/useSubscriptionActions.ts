import type { RefObject } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { db,doc,setDoc } from '../../../lib/firebase';
import {
BillingCycle,
SUBSCRIPTION_PLANS,
SubscriptionTier
} from '../../../lib/subscription';
import {
UserProfile,
WalletTransaction
} from '../../../types/market';
import { OrderBookState } from '../../../utils/orderEngine';
import {
  normalizeEmail,
  persistUserProfileToFirestore,
} from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';
const round2 = (n: number) => Math.round(n * 100) / 100;
type Options = Pick<TradingState, 'user' | 'balance' | 'setUser' | 'setInitialBalance' | 'setWalletTransactions' | 'initialBalance'> & Pick<TradingContextType, 'addToast'> & { commitEngine: (patch: Partial<OrderBookState>) => void; engineRef: RefObject<OrderBookState> };

export function useSubscriptionActions({ user, balance, setUser, commitEngine, setInitialBalance, setWalletTransactions, addToast, engineRef, initialBalance }: Options) {
  // Upgrade or Change Subscription Tier (Persists to Firebase Firestore `users` & `subscriptions` + LocalStorage)
  const upgradeSubscription = async ({
    tier,
    billingCycle = 'monthly',
    razorpayPaymentId,
    razorpayOrderId,
    amountPaid,
    subscriptionAutoPay,
    subscriptionUpiMandateId,
  }: {
    tier: SubscriptionTier;
    billingCycle?: BillingCycle;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    amountPaid?: number;
    subscriptionAutoPay?: boolean;
    subscriptionUpiMandateId?: string;
  }) => {
    const now = Date.now();
    const targetPlan = SUBSCRIPTION_PLANS[tier];
    const effectiveCycle: BillingCycle = tier === 'free' ? 'free' : billingCycle;
    const durationMs =
      effectiveCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : effectiveCycle === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 0;
    const expiresAt = tier === 'free' ? null : now + durationMs;
    const paymentId = razorpayPaymentId || (tier === 'free' ? undefined : `pay_demo_${now}`);
    const orderId = razorpayOrderId || (tier === 'free' ? undefined : `order_demo_${now}`);

    const currentUser = user || {
      uid: `user_demo_${now}`,
      name: 'Nifty Lens Trader',
      email: 'demo@niftylens.in',
      authProvider: 'email' as const,
      initialCash: targetPlan.defaultStartingCash,
      createdAt: now,
    };

    const effectiveUid = currentUser.uid || `user_${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newBalance =
      tier === 'free'
        ? Math.min(targetPlan.maxWalletLimit, balance)
        : Math.max(balance, targetPlan.defaultStartingCash);

    const updatedProfile: UserProfile = {
      ...currentUser,
      uid: effectiveUid,
      initialCash: newBalance,
      subscriptionTier: tier,
      subscriptionBillingCycle: effectiveCycle,
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: expiresAt,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      subscriptionAutoPay: tier === 'free' ? false : (subscriptionAutoPay ?? true),
      subscriptionUpiMandateId: subscriptionUpiMandateId || undefined,
    };

    setUser(updatedProfile);
    const shouldClearOldOrders =
      tier !== 'free' &&
      newBalance > balance &&
      engineRef.current.holdings.length === 0 &&
      engineRef.current.positions.length === 0;
    commitEngine(shouldClearOldOrders ? { balance: newBalance, orders: [] } : { balance: newBalance });
    setInitialBalance(newBalance);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(updatedProfile));
      localStorage.setItem('groww_paper_user_v1', JSON.stringify(updatedProfile));
    } catch {}

    // Record wallet upgrade credit transaction if balance increased
    if (newBalance > balance) {
      const bonus = newBalance - balance;
      const upgradeTx: WalletTransaction = {
        id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: 'DEPOSIT',
        amount: bonus,
        description: `${targetPlan.name} upgrade wallet boost (+₹${bonus.toLocaleString('en-IN')})`,
        timestamp: now,
      };
      setWalletTransactions((prev) => [upgradeTx, ...prev]);
    }

    // Persist User + Subscription Mapping in Firebase Firestore (both users/{uid} & users_by_email/{email})
    try {
      await persistUserProfileToFirestore(effectiveUid, updatedProfile.email, {
        userId: effectiveUid,
        name: updatedProfile.name,
        email: normalizeEmail(updatedProfile.email),
        authProvider: updatedProfile.authProvider,
        avatar: updatedProfile.avatar || '',
        balance: newBalance,
        initialBalance: newBalance,
        subscriptionTier: tier,
        subscriptionBillingCycle: effectiveCycle,
        subscriptionStatus: 'active',
        subscriptionUpdatedAt: now,
        subscriptionExpiresAt: expiresAt,
        razorpayPaymentId: paymentId || '',
        razorpayOrderId: orderId || '',
        subscriptionAutoPay: updatedProfile.subscriptionAutoPay ?? false,
        subscriptionUpiMandateId: updatedProfile.subscriptionUpiMandateId || '',
        updatedAt: now,
      });

      const subId = paymentId || `sub_${tier}_${effectiveUid}_${now}`;
      const subPayload = {
        subscriptionId: subId,
        userId: effectiveUid,
        userEmail: updatedProfile.email,
        userName: updatedProfile.name,
        tier,
        planName: targetPlan.name,
        billingCycle: effectiveCycle,
        status: 'active',
        amountPaidINR:
          amountPaid ??
          (tier === 'free' ? 0 : effectiveCycle === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice),
        currency: 'INR',
        paymentGateway: 'Razorpay',
        razorpayPaymentId: paymentId || null,
        razorpayOrderId: orderId || null,
        maxWalletLimit: targetPlan.maxWalletLimit,
        activatedAt: now,
        expiresAt,
      };

      await setDoc(doc(db, 'subscriptions', subId), subPayload, { merge: true });
      await setDoc(doc(db, 'users', effectiveUid, 'subscriptions', subId), subPayload, { merge: true });
    } catch (e) {
      console.warn('Firestore subscription sync notice:', e);
    }

    addToast(
      `${targetPlan.name} Activated!`,
      tier === 'free'
        ? `Switched to Free Starter Plan (₹1,00,000 wallet limit with 1L automatic monthly reset).`
        : `Payment verified! Unlocked ${targetPlan.name} features & ₹${targetPlan.maxWalletLimit.toLocaleString('en-IN')} virtual capital capacity.`,
      'success'
    );
  };

  // Credit +₹1,00,000 Top-Up for Free Tier Users (₹50 paid top-up)
  const creditFreeWalletTopUp = async (paymentId?: string, orderId?: string) => {
    const now = Date.now();
    const topUpAmount = 100000; // ₹1,00,000 (1L)
    const currentCash = engineRef.current.balance;
    const newBalance = round2(currentCash + topUpAmount);
    commitEngine({ balance: newBalance });
    setInitialBalance((prev) => round2(prev + topUpAmount));

    const topUpTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: topUpAmount,
      description: `+₹1,00,000 Wallet Top-Up (₹50 Paid · Ref ${paymentId || 'TOPUP'})`,
      timestamp: now,
    };
    setWalletTransactions((prev) => [topUpTx, ...prev]);

    if (user?.uid) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            balance: newBalance,
            initialBalance: Math.max(initialBalance, newBalance),
            lastTopUpPaymentId: paymentId || '',
            lastTopUpOrderId: orderId || '',
            updatedAt: now,
          },
          { merge: true }
        );
      } catch {}
    }

    addToast(
      '+₹1,00,000 Top-Up Credited!',
      `₹1,00,000 has been added to your paper wallet. New available cash: ₹${newBalance.toLocaleString('en-IN')}.`,
      'success'
    );
  };

  return { upgradeSubscription, creditFreeWalletTopUp };
}
