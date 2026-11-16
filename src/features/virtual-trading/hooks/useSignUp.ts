import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { db, doc, setDoc } from '../../../lib/firebase';
import {
  BillingCycle,
  normalizeUsageQuota,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../../lib/subscription';
import { UserProfile, WalletTransaction } from '../../../types/market';
import {
  buildEmailUid,
  fetchUserProfileFromFirestore,
  normalizeEmail,
  persistUserProfileToFirestore,
  resolveActiveTier,
} from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'setUser'
  | 'setBalance'
  | 'setInitialBalance'
  | 'setUsageQuota'
  | 'setWatchlists'
  | 'setActiveWatchlistId'
  | 'setIsAuthModalOpen'
  | 'setShowLandingPage'
  | 'setWalletTransactions'
> &
  Pick<TradingContextType, 'addToast'>;

export function useSignUp({
  setUser,
  setBalance,
  setInitialBalance,
  setUsageQuota,
  setWatchlists,
  setActiveWatchlistId,
  setIsAuthModalOpen,
  setShowLandingPage,
  setWalletTransactions,
  addToast,
}: Options) {
  // Sign Up User (Google or Email OTP) — preserves existing paid subscription if account already exists
  const signUpUser = async (data: {
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
    initialCash: number;
  }): Promise<void> => {
    const normalizedEmail = normalizeEmail(data.email);
    const effectiveUid = data.uid || buildEmailUid(normalizedEmail);
    const existingRemote = await fetchUserProfileFromFirestore(effectiveUid, normalizedEmail);

    if (existingRemote) {
      const activeTier: SubscriptionTier = resolveActiveTier(existingRemote);
      const tierMaxCash = SUBSCRIPTION_PLANS[activeTier].maxWalletLimit;
      const restoredBalance =
        typeof existingRemote.balance === 'number'
          ? Math.min(tierMaxCash, existingRemote.balance)
          : SUBSCRIPTION_PLANS[activeTier].defaultStartingCash;
      const restoredInitial =
        typeof existingRemote.initialBalance === 'number'
          ? Math.min(tierMaxCash, existingRemote.initialBalance)
          : restoredBalance;

      const restoredProfile: UserProfile = {
        uid: effectiveUid,
        name: existingRemote.name || data.name,
        email: normalizedEmail,
        phone: existingRemote.phone || data.phone,
        authProvider: data.authProvider || existingRemote.authProvider || 'email',
        avatar: data.avatar || existingRemote.avatar,
        initialCash: restoredInitial,
        createdAt: existingRemote.createdAt || Date.now(),
        subscriptionTier: activeTier,
        subscriptionBillingCycle: (existingRemote.subscriptionBillingCycle as BillingCycle) || 'free',
        subscriptionStatus: existingRemote.subscriptionStatus || 'active',
        subscriptionUpdatedAt: existingRemote.subscriptionUpdatedAt || Date.now(),
        subscriptionExpiresAt: existingRemote.subscriptionExpiresAt ?? null,
        razorpayPaymentId: existingRemote.razorpayPaymentId,
        razorpayOrderId: existingRemote.razorpayOrderId,
        subscriptionAutoPay: existingRemote.subscriptionAutoPay,
        subscriptionUpiMandateId: existingRemote.subscriptionUpiMandateId,
      };

      setUser(restoredProfile);
      setBalance(restoredBalance);
      setInitialBalance(restoredInitial);
      if (existingRemote.usage) {
        setUsageQuota(normalizeUsageQuota(existingRemote.usage));
      }
      try {
        localStorage.setItem('mypaper_user_v2', JSON.stringify(restoredProfile));
      } catch {}
      setIsAuthModalOpen(false);
      setShowLandingPage(false);
      addToast(
        `Welcome back, ${restoredProfile.name}!`,
        `Existing account restored (${SUBSCRIPTION_PLANS[activeTier].name}).`,
        'success'
      );
      return;
    }

    // New user: start on Free Starter plan (max ₹1,00,000 paper wallet until upgraded)
    const starterLimit = SUBSCRIPTION_PLANS.free.maxWalletLimit;
    const clampedCash = Math.min(starterLimit, Math.max(1000, data.initialCash || starterLimit));
    const now = Date.now();
    const profile: UserProfile = {
      uid: effectiveUid,
      name: data.name,
      email: normalizedEmail,
      phone: data.phone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar,
      initialCash: clampedCash,
      createdAt: now,
      subscriptionTier: 'free',
      subscriptionBillingCycle: 'free',
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: null,
    };
    setUser(profile);
    setBalance(clampedCash);
    setInitialBalance(clampedCash);
    setWatchlists((prev) => {
      const first = prev[0] || { id: 'default', name: 'My Watchlist', symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'] };
      return [{ ...first, symbols: first.symbols.slice(0, SUBSCRIPTION_PLANS.free.maxStocksPerWatchlist) }];
    });
    setActiveWatchlistId('default');
    setIsAuthModalOpen(false);
    setShowLandingPage(false);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    persistUserProfileToFirestore(effectiveUid, normalizedEmail, {
      userId: effectiveUid,
      name: profile.name,
      email: normalizedEmail,
      phone: profile.phone || '',
      avatar: profile.avatar || '',
      authProvider: profile.authProvider,
      balance: clampedCash,
      initialBalance: clampedCash,
      subscriptionTier: 'free',
      subscriptionBillingCycle: 'free',
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: null,
      usage: normalizeUsageQuota(null),
      createdAt: profile.createdAt,
      updatedAt: now,
    }).catch((err) => console.warn('Firestore user write error:', err));

    setDoc(
      doc(db, 'subscriptions', `sub_free_${effectiveUid}`),
      {
        subscriptionId: `sub_free_${effectiveUid}`,
        userId: effectiveUid,
        userEmail: normalizedEmail,
        userName: profile.name,
        tier: 'free',
        billingCycle: 'free',
        status: 'active',
        amountPaidINR: 0,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    ).catch(() => {});

    const initialTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Free Starter Account credit (${data.authProvider === 'google' ? 'Google' : 'Email OTP'} verified)`,
      timestamp: now,
    };
    setWalletTransactions([initialTx]);
    addToast(
      `Welcome, ${data.name}!`,
      `Free Starter Account activated with ₹${clampedCash.toLocaleString('en-IN')} virtual capital (1L Automatic Monthly Reset). Upgrade anytime for ₹10L–₹50L & Pro tools.`,
      'success'
    );
  };

  return { signUpUser };
}
