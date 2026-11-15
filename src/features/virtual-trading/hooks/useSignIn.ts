import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { db,doc,getDoc,setDoc } from '../../../lib/firebase';
import {
BillingCycle,
SUBSCRIPTION_PLANS,
SubscriptionTier
} from '../../../lib/subscription';
import {
UserProfile
} from '../../../types/market';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'balance' | 'setUser' | 'setBalance' | 'setIsAuthModalOpen' | 'setShowLandingPage'> & Pick<TradingContextType, 'addToast'>;

export function useSignIn({ balance, setUser, setBalance, setIsAuthModalOpen, setShowLandingPage, addToast }: Options) {
  // Sign In Existing User with Firebase
  const signInUser = (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }): boolean => {
    let existingProfile: UserProfile | null = null;
    try {
      const saved = localStorage.getItem('mypaper_user_v2') || localStorage.getItem('groww_paper_user_v1');
      if (saved) existingProfile = JSON.parse(saved);
    } catch {}

    const effectiveUid = data.uid || existingProfile?.uid || `user_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userName = data.name || existingProfile?.name || data.email.split('@')[0];
    const userPhone = existingProfile?.phone;
    const savedTier: SubscriptionTier = existingProfile?.subscriptionTier || 'free';
    const tierMaxCash = SUBSCRIPTION_PLANS[savedTier].maxWalletLimit;
    const userCash = Math.min(tierMaxCash, existingProfile?.initialCash || balance || tierMaxCash);

    const profile: UserProfile = {
      uid: effectiveUid,
      name: userName,
      email: data.email,
      phone: userPhone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar || existingProfile?.avatar,
      initialCash: userCash,
      createdAt: existingProfile?.createdAt || Date.now(),
      subscriptionTier: savedTier,
      subscriptionBillingCycle: existingProfile?.subscriptionBillingCycle || 'free',
      subscriptionStatus: existingProfile?.subscriptionStatus || 'active',
      subscriptionUpdatedAt: existingProfile?.subscriptionUpdatedAt || Date.now(),
      subscriptionExpiresAt: existingProfile?.subscriptionExpiresAt || null,
      razorpayPaymentId: existingProfile?.razorpayPaymentId,
      razorpayOrderId: existingProfile?.razorpayOrderId,
    };

    setUser(profile);
    if (balance > tierMaxCash) {
      setBalance(tierMaxCash);
    }
    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    // Fetch latest subscription mapping from Firestore if available, and update last login
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      getDoc(userDocRef)
        .then((snap) => {
          if (snap.exists()) {
            const remote = snap.data();
            const remoteTier = (remote.subscriptionTier as SubscriptionTier) || savedTier;
            const mergedProfile: UserProfile = {
              ...profile,
              subscriptionTier: remoteTier,
              subscriptionBillingCycle: (remote.subscriptionBillingCycle as BillingCycle) || profile.subscriptionBillingCycle,
              subscriptionStatus: remote.subscriptionStatus || 'active',
              subscriptionUpdatedAt: remote.subscriptionUpdatedAt || profile.subscriptionUpdatedAt,
              subscriptionExpiresAt: remote.subscriptionExpiresAt ?? profile.subscriptionExpiresAt,
              razorpayPaymentId: remote.razorpayPaymentId || profile.razorpayPaymentId,
              razorpayOrderId: remote.razorpayOrderId || profile.razorpayOrderId,
            };
            setUser(mergedProfile);
            localStorage.setItem('mypaper_user_v2', JSON.stringify(mergedProfile));
            if (typeof remote.balance === 'number') {
              setBalance(Math.min(SUBSCRIPTION_PLANS[remoteTier].maxWalletLimit, remote.balance));
            }
          } else {
            setDoc(
              userDocRef,
              {
                userId: effectiveUid,
                name: userName,
                email: data.email,
                authProvider: data.authProvider || 'email',
                avatar: profile.avatar || '',
                subscriptionTier: savedTier,
                subscriptionBillingCycle: profile.subscriptionBillingCycle || 'free',
                subscriptionStatus: 'active',
                balance: userCash,
                initialBalance: userCash,
                updatedAt: Date.now(),
              },
              { merge: true }
            ).catch(() => {});
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

    setIsAuthModalOpen(false);
    setShowLandingPage(false);
    addToast(
      `Welcome back, ${userName}!`,
      `Signed in (${SUBSCRIPTION_PLANS[savedTier].name}). Ready to trade.`,
      'success'
    );
    return true;
  };

  return { signInUser };
}
