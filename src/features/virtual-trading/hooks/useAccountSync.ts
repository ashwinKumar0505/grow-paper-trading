import { useEffect, useRef } from 'react';
import { exchangeGoogleServerSession } from '../../../components/auth/authModalService';
import { getActiveBearerToken } from '../../../lib/authSession';
import { auth, onAuthStateChanged } from '../../../lib/firebase';
import { normalizeUsageQuota } from '../../../lib/subscription';
import type { UserProfile } from '../../../types/market';
import {
  fetchAuthoritativeAccountProfile,
  type AuthoritativeAccountProfileResponse,
} from '../services/paperTradingApi';
import {
  buildAuthoritativeUserProfileAndPortfolio,
  buildRestoredUserProfileAndPortfolio,
} from '../utils/accountRestore';
import { applyPortfolioSnapshot } from '../utils/portfolioSync';
import {
  fetchUserProfileFromFirestore,
  persistUserProfileToFirestore,
} from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'setUser' | 'setBalance' | 'setInitialBalance' | 'setHoldings'
  | 'setIntradayPositions' | 'setOrders' | 'setExecutedOrderKeys'
  | 'setWatchlists' | 'setWalletTransactions' | 'setUsageQuota'
  | 'user' | 'isDarkMode'
>;

export function useAccountSync({
  setUser, setBalance, setInitialBalance, setHoldings, setIntradayPositions,
  setOrders, setExecutedOrderKeys, setWatchlists, setWalletTransactions,
  setUsageQuota, user, isDarkMode,
}: Options) {
  const authoritativeSyncedUidRef = useRef<string | null>(null);
  const isDarkModeRef = useRef(isDarkMode);
  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  const portfolioSetters = {
    setBalance, setInitialBalance, setHoldings, setIntradayPositions,
    setOrders, setExecutedOrderKeys, setWatchlists, setWalletTransactions,
  };

  const applyServerAccount = (
    serverAccount: AuthoritativeAccountProfileResponse,
    fallbacks?: {
      fallbackName?: string;
      fallbackEmail?: string;
      fallbackProvider?: 'google' | 'email';
      fallbackAvatar?: string;
    }
  ) => {
    const { profile, portfolio, usageQuota } = buildAuthoritativeUserProfileAndPortfolio({
      serverUser: serverAccount.user,
      serverLedger: serverAccount.ledger,
      ...fallbacks,
    });
    applyPortfolioSnapshot(portfolioSetters, portfolio, profile.uid, isDarkModeRef.current);
    setUser(profile);
    setUsageQuota(usageQuota);
    authoritativeSyncedUidRef.current = profile.uid ?? serverAccount.user.uid;
    try { localStorage.setItem('mypaper_user_v2', JSON.stringify(profile)); } catch {}
  };

  // Reconcile active session (Email OTP or Google) against authoritative backend profile & ledger
  useEffect(() => {
    if (!user?.uid) {
      authoritativeSyncedUidRef.current = null;
      return;
    }
    let cancelled = false;
    fetchAuthoritativeAccountProfile()
      .then((serverAccount) => {
        if (cancelled || !serverAccount) return;
        applyServerAccount(serverAccount, {
          fallbackName: user.name,
          fallbackEmail: user.email,
          fallbackProvider: user.authProvider,
          fallbackAvatar: user.avatar,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Restore Google session on reload/restart, preferring authoritative backend over Firestore fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      try {
        let token = await getActiveBearerToken();
        if (!token) {
          const idToken = await fbUser.getIdToken();
          await exchangeGoogleServerSession({
            idToken,
            fallbackUid: fbUser.uid,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
          });
          token = (await getActiveBearerToken()) || idToken;
        }

        const serverAccount = await fetchAuthoritativeAccountProfile(token);
        if (serverAccount) {
          applyServerAccount(serverAccount, {
            fallbackName: fbUser.displayName || 'Google Trader',
            fallbackEmail: fbUser.email || '',
            fallbackProvider: 'google',
            fallbackAvatar: fbUser.photoURL || undefined,
          });
          return;
        }

        if (authoritativeSyncedUidRef.current === fbUser.uid) return;
        const data = await fetchUserProfileFromFirestore(fbUser.uid, fbUser.email || undefined);
        if (!data) return;

        const { profile: restoredProfile, portfolio: resolvedPortfolio } =
          buildRestoredUserProfileAndPortfolio({
            uid: fbUser.uid,
            remote: data,
            fallbackName: fbUser.displayName || 'Google Trader',
            fallbackEmail: fbUser.email || '',
            fallbackProvider: 'google',
            fallbackAvatar: fbUser.photoURL || undefined,
          });

        applyPortfolioSnapshot(portfolioSetters, resolvedPortfolio, fbUser.uid, isDarkModeRef.current);
        setUser(restoredProfile);
        try { localStorage.setItem('mypaper_user_v2', JSON.stringify(restoredProfile)); } catch {}
        if (data.usage) {
          setUsageQuota(normalizeUsageQuota(data.usage));
        }
      } catch (e) {
        console.warn('Account restore notice:', e);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (
      !user ||
      !user.subscriptionTier ||
      user.subscriptionTier === 'free' ||
      !user.subscriptionExpiresAt ||
      user.subscriptionExpiresAt >= Date.now()
    ) {
      return;
    }

    const now = Date.now();
    const expiredProfile: UserProfile = {
      ...user,
      subscriptionTier: 'free',
      subscriptionBillingCycle: 'free',
      subscriptionStatus: 'expired',
      subscriptionAutoPay: false,
      subscriptionUpdatedAt: now,
    };
    setUser(expiredProfile);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(expiredProfile));
      localStorage.setItem('groww_paper_user_v1', JSON.stringify(expiredProfile));
    } catch {}

    if (user.uid) {
      persistUserProfileToFirestore(user.uid, user.email, {
        subscriptionTier: 'free',
        subscriptionBillingCycle: 'free',
        subscriptionStatus: 'expired',
        subscriptionAutoPay: false,
        subscriptionUpdatedAt: now,
        updatedAt: now,
      }).catch(() => {});
    }
  }, [user, setUser]);
}
