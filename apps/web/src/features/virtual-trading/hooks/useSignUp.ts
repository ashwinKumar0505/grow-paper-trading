import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { trackLogin, trackSignUp } from '../../../lib/analytics';
import { db, doc, setDoc } from '../../../lib/firebase';
import { normalizeUsageQuota, SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { UserProfile, WalletTransaction } from '../../../types/market';
import { fetchAuthoritativeAccountProfile } from '../services/paperTradingApi';
import {
  buildAuthoritativeUserProfileAndPortfolio,
  buildRestoredUserProfileAndPortfolio,
} from '../utils/accountRestore';
import {
  applyPortfolioSnapshot, buildRemotePortfolioPayload, createDefaultPortfolioSnapshot,
} from '../utils/portfolioSync';
import { DEFAULT_WATCHLISTS } from '../utils/storageKeys';
import {
  buildEmailUid, fetchUserProfileFromFirestore, normalizeEmail, persistUserProfileToFirestore,
} from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'setUser' | 'setBalance' | 'setInitialBalance' | 'setHoldings' | 'setIntradayPositions'
  | 'setOrders' | 'setExecutedOrderKeys' | 'setUsageQuota' | 'setWatchlists'
  | 'setActiveWatchlistId' | 'setIsAuthModalOpen' | 'setShowLandingPage'
  | 'setWalletTransactions' | 'isDarkMode'
> & Pick<TradingContextType, 'addToast'>;

export function useSignUp({
  setUser, setBalance, setInitialBalance, setHoldings, setIntradayPositions,
  setOrders, setExecutedOrderKeys, setUsageQuota, setWatchlists, setActiveWatchlistId,
  setIsAuthModalOpen, setShowLandingPage, setWalletTransactions, isDarkMode, addToast,
}: Options) {
  const portfolioSetters = {
    setBalance, setInitialBalance, setHoldings, setIntradayPositions,
    setOrders, setExecutedOrderKeys, setWatchlists, setWalletTransactions,
  };

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
    const serverAccount = await fetchAuthoritativeAccountProfile();
    if (serverAccount) {
      const { activeTier, profile, portfolio, usageQuota } =
        buildAuthoritativeUserProfileAndPortfolio({
          serverUser: serverAccount.user,
          serverLedger: serverAccount.ledger,
          fallbackName: data.name,
          fallbackEmail: normalizedEmail,
          fallbackProvider: data.authProvider || 'email',
          fallbackAvatar: data.avatar,
        });
      applyPortfolioSnapshot(portfolioSetters, portfolio, profile.uid, isDarkMode);
      setUser(profile);
      setUsageQuota(usageQuota);
      setActiveWatchlistId(portfolio.watchlists[0]?.id || 'default');
      try { localStorage.setItem('mypaper_user_v2', JSON.stringify(profile)); } catch {}
      setIsAuthModalOpen(false);
      setShowLandingPage(false);
      const isReturning =
        Date.now() - profile.createdAt > 15_000 ||
        activeTier !== 'free' ||
        portfolio.orders.length > 0 ||
        portfolio.walletTransactions.length > 1;
      addToast(
        isReturning ? `Welcome back, ${profile.name}!` : `Welcome, ${profile.name}!`,
        isReturning
          ? `Existing account restored (${SUBSCRIPTION_PLANS[activeTier].name}).`
          : `Free Starter Account activated with ₹${portfolio.balance.toLocaleString('en-IN')} virtual capital (1L Automatic Monthly Reset). Upgrade anytime for ₹10L–₹50L & Pro tools.`,
        'success'
      );
      if (isReturning) {
        trackLogin(profile.authProvider);
      } else {
        trackSignUp(profile.authProvider);
      }
      return;
    }

    const effectiveUid = data.uid || buildEmailUid(normalizedEmail);
    const existingRemote = await fetchUserProfileFromFirestore(effectiveUid, normalizedEmail);

    if (existingRemote) {
      const { activeTier, profile: restoredProfile, portfolio: resolvedPortfolio } =
        buildRestoredUserProfileAndPortfolio({
          uid: effectiveUid,
          remote: existingRemote,
          fallbackName: data.name,
          fallbackEmail: normalizedEmail,
          fallbackProvider: data.authProvider || 'email',
          fallbackAvatar: data.avatar,
          fallbackPhone: data.phone,
        });

      applyPortfolioSnapshot(portfolioSetters, resolvedPortfolio, effectiveUid, isDarkMode);
      setUser(restoredProfile);
      setUsageQuota(normalizeUsageQuota(existingRemote.usage ?? null));
      try { localStorage.setItem('mypaper_user_v2', JSON.stringify(restoredProfile)); } catch {}
      setIsAuthModalOpen(false);
      setShowLandingPage(false);
      addToast(
        `Welcome back, ${restoredProfile.name}!`,
        `Existing account restored (${SUBSCRIPTION_PLANS[activeTier].name}).`,
        'success'
      );
      trackLogin(restoredProfile.authProvider);
      return;
    }

    const starterLimit = SUBSCRIPTION_PLANS.free.maxWalletLimit;
    const clampedCash = Math.min(starterLimit, Math.max(1000, data.initialCash || starterLimit));
    const now = Date.now();
    const initialTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT', amount: clampedCash,
      description: `Free Starter Account credit (${data.authProvider === 'google' ? 'Google' : 'Email'} verified)`,
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
      uid: effectiveUid, name: data.name, email: normalizedEmail, phone: data.phone,
      authProvider: data.authProvider || 'email', avatar: data.avatar, initialCash: clampedCash,
      createdAt: now, subscriptionTier: 'free', subscriptionBillingCycle: 'free',
      subscriptionStatus: 'active', subscriptionUpdatedAt: now, subscriptionExpiresAt: null,
    };

    applyPortfolioSnapshot(portfolioSetters, newSnapshot, effectiveUid, isDarkMode);
    setUser(profile);
    setUsageQuota(normalizeUsageQuota(null));
    setActiveWatchlistId('default');
    setIsAuthModalOpen(false);
    setShowLandingPage(false);
    try { localStorage.setItem('mypaper_user_v2', JSON.stringify(profile)); } catch {}

    persistUserProfileToFirestore(effectiveUid, normalizedEmail, {
      userId: effectiveUid, name: profile.name, email: normalizedEmail,
      phone: profile.phone || '', avatar: profile.avatar || '', authProvider: profile.authProvider,
      subscriptionTier: 'free', subscriptionBillingCycle: 'free', subscriptionStatus: 'active',
      subscriptionUpdatedAt: now, subscriptionExpiresAt: null, createdAt: profile.createdAt,
      ...buildRemotePortfolioPayload(newSnapshot, normalizeUsageQuota(null)),
    }).catch((err) => console.warn('Firestore user write error:', err));

    setDoc(
      doc(db, 'subscriptions', `sub_free_${effectiveUid}`),
      {
        subscriptionId: `sub_free_${effectiveUid}`, userId: effectiveUid,
        userEmail: normalizedEmail, userName: profile.name, tier: 'free',
        billingCycle: 'free', status: 'active', amountPaidINR: 0, createdAt: now, updatedAt: now,
      },
      { merge: true }
    ).catch(() => {});

    addToast(
      `Welcome, ${data.name}!`,
      `Free Starter Account activated with ₹${clampedCash.toLocaleString('en-IN')} virtual capital (1L Automatic Monthly Reset). Upgrade anytime for ₹10L–₹50L & Pro tools.`,
      'success'
    );
    trackSignUp(profile.authProvider);
  };

  return { signUpUser };
}
