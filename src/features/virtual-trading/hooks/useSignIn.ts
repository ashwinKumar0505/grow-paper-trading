import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { BillingCycle, normalizeUsageQuota, SUBSCRIPTION_PLANS, SubscriptionTier } from '../../../lib/subscription';
import { UserProfile } from '../../../types/market';
import { fetchAuthoritativeAccountProfile } from '../services/paperTradingApi';
import { buildAuthoritativeUserProfileAndPortfolio } from '../utils/accountRestore';
import {
  applyPortfolioSnapshot, buildRemotePortfolioPayload, computeEffectiveWalletCap,
  createDefaultPortfolioSnapshot, extractPortfolioFromRemote, loadScopedPortfolioFromStorage,
} from '../utils/portfolioSync';
import {
  buildEmailUid, fetchUserProfileFromFirestore, normalizeEmail,
  persistUserProfileToFirestore, resolveActiveTier,
} from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'setUser' | 'setBalance' | 'setInitialBalance' | 'setHoldings'
  | 'setIntradayPositions' | 'setOrders' | 'setExecutedOrderKeys' | 'setWatchlists'
  | 'setWalletTransactions' | 'setUsageQuota' | 'setIsAuthModalOpen'
  | 'setShowLandingPage' | 'isDarkMode'
> & Pick<TradingContextType, 'addToast'>;

export function useSignIn({
  setUser, setBalance, setInitialBalance, setHoldings, setIntradayPositions,
  setOrders, setExecutedOrderKeys, setWatchlists, setWalletTransactions,
  setUsageQuota, setIsAuthModalOpen, setShowLandingPage, isDarkMode, addToast,
}: Options) {
  const portfolioSetters = {
    setBalance, setInitialBalance, setHoldings, setIntradayPositions,
    setOrders, setExecutedOrderKeys, setWatchlists, setWalletTransactions,
  };

  // Sign In Existing User (prefers authoritative backend account/ledger, falls back to Firestore/local)
  const signInUser = async (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }): Promise<boolean> => {
    const normalizedEmail = normalizeEmail(data.email);
    const serverAccount = await fetchAuthoritativeAccountProfile();
    if (serverAccount) {
      const { activeTier, profile, portfolio, usageQuota } =
        buildAuthoritativeUserProfileAndPortfolio({
          serverUser: serverAccount.user,
          serverLedger: serverAccount.ledger,
          fallbackName: data.name,
          fallbackEmail: normalizedEmail,
          fallbackProvider: data.authProvider,
          fallbackAvatar: data.avatar,
        });
      applyPortfolioSnapshot(portfolioSetters, portfolio, profile.uid, isDarkMode);
      setUser(profile);
      setUsageQuota(usageQuota);
      try { localStorage.setItem('mypaper_user_v2', JSON.stringify(profile)); } catch {}
      setIsAuthModalOpen(false);
      setShowLandingPage(false);
      addToast(
        `Welcome back, ${profile.name}!`,
        `Signed in (${SUBSCRIPTION_PLANS[activeTier].name}). Ready to trade.`,
        'success'
      );
      return true;
    }

    let existingProfile: UserProfile | null = null;
    try {
      const saved = localStorage.getItem('mypaper_user_v2') || localStorage.getItem('groww_paper_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        if (parsed.email && normalizeEmail(parsed.email) === normalizedEmail) {
          existingProfile = parsed;
        }
      }
    } catch {}

    const effectiveUid = data.uid || existingProfile?.uid || buildEmailUid(normalizedEmail);
    const remote = await fetchUserProfileFromFirestore(effectiveUid, normalizedEmail);

    const activeTier: SubscriptionTier = remote
      ? resolveActiveTier(remote)
      : existingProfile?.subscriptionTier || 'free';
    const localPortfolio = loadScopedPortfolioFromStorage(effectiveUid);
    const tierMaxCash =
      computeEffectiveWalletCap(
        SUBSCRIPTION_PLANS[activeTier].maxWalletLimit, remote, localPortfolio?.walletTransactions
      ) ?? SUBSCRIPTION_PLANS[activeTier].maxWalletLimit;
    const defaultCash = SUBSCRIPTION_PLANS[activeTier].defaultStartingCash;
    const userName = data.name || remote?.name || existingProfile?.name || normalizedEmail.split('@')[0];
    const userPhone = remote?.phone || existingProfile?.phone;

    const remotePortfolio = extractPortfolioFromRemote(remote, tierMaxCash);
    const resolvedPortfolio =
      remotePortfolio ||
      localPortfolio ||
      createDefaultPortfolioSnapshot(
        typeof remote?.balance === 'number' ? Math.min(tierMaxCash, remote.balance) : defaultCash
      );

    const restoredBalance =
      typeof remote?.balance === 'number'
        ? Math.min(tierMaxCash, remote.balance)
        : Math.min(tierMaxCash, resolvedPortfolio.balance);
    const restoredInitialCash =
      typeof remote?.initialBalance === 'number'
        ? Math.min(tierMaxCash, remote.initialBalance)
        : Math.min(tierMaxCash, resolvedPortfolio.initialBalance);

    resolvedPortfolio.balance = restoredBalance;
    resolvedPortfolio.initialBalance = restoredInitialCash;

    const profile: UserProfile = {
      uid: effectiveUid,
      name: userName,
      email: normalizedEmail,
      phone: userPhone,
      authProvider: data.authProvider || remote?.authProvider || 'email',
      avatar: data.avatar || remote?.avatar || existingProfile?.avatar,
      initialCash: restoredInitialCash,
      createdAt: remote?.createdAt || existingProfile?.createdAt || Date.now(),
      subscriptionTier: activeTier,
      subscriptionBillingCycle:
        (remote?.subscriptionBillingCycle as BillingCycle) || existingProfile?.subscriptionBillingCycle || 'free',
      subscriptionStatus: remote?.subscriptionStatus || existingProfile?.subscriptionStatus || 'active',
      subscriptionUpdatedAt: remote?.subscriptionUpdatedAt || existingProfile?.subscriptionUpdatedAt || Date.now(),
      subscriptionExpiresAt: remote?.subscriptionExpiresAt ?? existingProfile?.subscriptionExpiresAt ?? null,
      razorpayPaymentId: remote?.razorpayPaymentId || existingProfile?.razorpayPaymentId,
      razorpayOrderId: remote?.razorpayOrderId || existingProfile?.razorpayOrderId,
      subscriptionAutoPay: remote?.subscriptionAutoPay ?? existingProfile?.subscriptionAutoPay,
      subscriptionUpiMandateId: remote?.subscriptionUpiMandateId || existingProfile?.subscriptionUpiMandateId,
      paidTopUpCredit: remote?.paidTopUpCredit ?? existingProfile?.paidTopUpCredit ?? 0,
    };

    applyPortfolioSnapshot(portfolioSetters, resolvedPortfolio, effectiveUid, isDarkMode);
    setUser(profile);
    setUsageQuota(normalizeUsageQuota(remote?.usage ?? null));
    try { localStorage.setItem('mypaper_user_v2', JSON.stringify(profile)); } catch {}

    persistUserProfileToFirestore(effectiveUid, normalizedEmail, {
      userId: effectiveUid,
      name: userName,
      email: normalizedEmail,
      authProvider: profile.authProvider,
      avatar: profile.avatar || '',
      subscriptionTier: profile.subscriptionTier,
      subscriptionBillingCycle: profile.subscriptionBillingCycle,
      subscriptionStatus: profile.subscriptionStatus,
      subscriptionUpdatedAt: profile.subscriptionUpdatedAt,
      subscriptionExpiresAt: profile.subscriptionExpiresAt,
      ...(!remotePortfolio && localPortfolio
        ? buildRemotePortfolioPayload(resolvedPortfolio)
        : { balance: restoredBalance, initialBalance: restoredInitialCash, updatedAt: Date.now() }),
    }).catch((e) => console.warn('Firebase sync warning:', e));

    setIsAuthModalOpen(false);
    setShowLandingPage(false);
    addToast(
      `Welcome back, ${userName}!`,
      `Signed in (${SUBSCRIPTION_PLANS[activeTier].name}). Ready to trade.`,
      'success'
    );
    return true;
  };

  return { signInUser };
}
