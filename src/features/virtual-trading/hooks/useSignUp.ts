import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { db,doc,setDoc } from '../../../lib/firebase';
import {
normalizeUsageQuota,
SUBSCRIPTION_PLANS
} from '../../../lib/subscription';
import {
UserProfile,
WalletTransaction
} from '../../../types/market';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setUser' | 'setBalance' | 'setInitialBalance' | 'setWatchlists' | 'setActiveWatchlistId' | 'setIsAuthModalOpen' | 'setShowLandingPage' | 'setWalletTransactions'> & Pick<TradingContextType, 'addToast'>;

export function useSignUp({ setUser, setBalance, setInitialBalance, setWatchlists, setActiveWatchlistId, setIsAuthModalOpen, setShowLandingPage, setWalletTransactions, addToast }: Options) {
  // Sign Up User (Google or Email OTP) with Firebase Firestore persistence + Free Starter Subscription Mapping
  const signUpUser = (data: {
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
    initialCash: number;
  }) => {
    // New signups start on Free Starter plan (max ₹1,00,000 paper wallet until upgraded)
    const starterLimit = SUBSCRIPTION_PLANS.free.maxWalletLimit;
    const clampedCash = Math.min(starterLimit, Math.max(1000, data.initialCash || starterLimit));
    const effectiveUid = data.uid || `user_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const now = Date.now();
    const profile: UserProfile = {
      uid: effectiveUid,
      name: data.name,
      email: data.email,
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
    // Trim watchlists to Free limit (1 watchlist, max 10 symbols)
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

    // Persist User + Subscription Mapping to Firebase Firestore
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      setDoc(
        userDocRef,
        {
          userId: effectiveUid,
          name: profile.name,
          email: profile.email,
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
        },
        { merge: true }
      ).catch((err) => console.warn('Firestore user write error:', err));

      const subDocRef = doc(db, 'subscriptions', `sub_free_${effectiveUid}`);
      setDoc(
        subDocRef,
        {
          subscriptionId: `sub_free_${effectiveUid}`,
          userId: effectiveUid,
          userEmail: profile.email,
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
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

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
