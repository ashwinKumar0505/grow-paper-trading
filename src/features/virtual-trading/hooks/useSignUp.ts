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
  applyPortfolioSnapshot,
  buildRemotePortfolioPayload,
  createDefaultPortfolioSnapshot,
  extractPortfolioFromRemote,
  loadScopedPortfolioFromStorage,
} from '../utils/portfolioSync';
import { DEFAULT_WATCHLISTS } from '../utils/storageKeys';
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
  | 'setHoldings'
  | 'setIntradayPositions'
  | 'setOrders'
  | 'setExecutedOrderKeys'
  | 'setUsageQuota'
  | 'setWatchlists'
  | 'setActiveWatchlistId'
  | 'setIsAuthModalOpen'
  | 'setShowLandingPage'
  | 'setWalletTransactions'
  | 'isDarkMode'
> &
  Pick<TradingContextType, 'addToast'>;

export function useSignUp({
  setUser,
  setBalance,
  setInitialBalance,
  setHoldings,
  setIntradayPositions,
  setOrders,
  setExecutedOrderKeys,
  setUsageQuota,
  setWatchlists,
  setActiveWatchlistId,
  setIsAuthModalOpen,
  setShowLandingPage,
  setWalletTransactions,
  isDarkMode,
  addToast,
}: Options) {
  const portfolioSetters = {
    setBalance,
    setInitialBalance,
    setHoldings,
    setIntradayPositions,
    setOrders,
    setExecutedOrderKeys,
    setWatchlists,
    setWalletTransactions,
  };

  // Sign Up User (Google or Email OTP) — preserves existing paid subscription & portfolio if account exists
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

      const remotePortfolio = extractPortfolioFromRemote(existingRemote, tierMaxCash);
      const localPortfolio = loadScopedPortfolioFromStorage(effectiveUid);
      const resolvedPortfolio =
        remotePortfolio || localPortfolio || createDefaultPortfolioSnapshot(restoredBalance);
      resolvedPortfolio.balance = restoredBalance;
      resolvedPortfolio.initialBalance = restoredInitial;

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

      applyPortfolioSnapshot(portfolioSetters, resolvedPortfolio, effectiveUid, isDarkMode);
      setUser(restoredProfile);
      setUsageQuota(normalizeUsageQuota(existingRemote.usage ?? null));
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
    const initialTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Free Starter Account credit (${data.authProvider === 'google' ? 'Google' : 'Email OTP'} verified)`,
      timestamp: now,
    };
    const starterWatchlist = {
      ...DEFAULT_WATCHLISTS[0],
      symbols: DEFAULT_WATCHLISTS[0].symbols.slice(0, SUBSCRIPTION_PLANS.free.maxStocksPerWatchlist),
    };
    const newSnapshot = createDefaultPortfolioSnapshot(clampedCash);
    newSnapshot.watchlists = [starterWatchlist];
    newSnapshot.walletTransactions = [initialTx];

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

    applyPortfolioSnapshot(portfolioSetters, newSnapshot, effectiveUid, isDarkMode);
    setUser(profile);
    setUsageQuota(normalizeUsageQuota(null));
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
      subscriptionTier: 'free',
      subscriptionBillingCycle: 'free',
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: null,
      createdAt: profile.createdAt,
      ...buildRemotePortfolioPayload(newSnapshot, normalizeUsageQuota(null)),
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

    addToast(
      `Welcome, ${data.name}!`,
      `Free Starter Account activated with ₹${clampedCash.toLocaleString('en-IN')} virtual capital (1L Automatic Monthly Reset). Upgrade anytime for ₹10L–₹50L & Pro tools.`,
      'success'
    );
  };

  return { signUpUser };
}
