import { useEffect } from 'react';
import { auth,db,doc,getDoc,onAuthStateChanged,onSnapshot } from '../../../lib/firebase';
import {
BillingCycle,
normalizeUsageQuota,
SubscriptionTier
} from '../../../lib/subscription';
import type { UserProfile } from '../../../types/market';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setUser' | 'setBalance' | 'setUsageQuota' | 'user'>;

export function useAccountSync({ setUser, setBalance, setUsageQuota, user }: Options) {
  // Listen to Firebase Auth state and sync with Firestore profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: fbUser.uid,
              name: data.name || fbUser.displayName || 'Google Trader',
              email: data.email || fbUser.email || '',
              authProvider: (data.authProvider as UserProfile['authProvider']) || 'google',
              avatar: data.avatar || fbUser.photoURL || undefined,
              initialCash: data.initialBalance || 100000,
              createdAt: data.createdAt || Date.now(),
              subscriptionTier: (data.subscriptionTier as SubscriptionTier) || 'free',
              subscriptionBillingCycle: (data.subscriptionBillingCycle as BillingCycle) || 'free',
              subscriptionStatus: data.subscriptionStatus || 'active',
              subscriptionUpdatedAt: data.subscriptionUpdatedAt || Date.now(),
              subscriptionExpiresAt: data.subscriptionExpiresAt || null,
              razorpayPaymentId: data.razorpayPaymentId || undefined,
              razorpayOrderId: data.razorpayOrderId || undefined,
            });
            if (typeof data.balance === 'number') {
              setBalance(data.balance);
            }
            if (data.usage) {
              setUsageQuota(normalizeUsageQuota(data.usage));
            }
          }
        } catch (e) {
          console.warn('Firebase user restore notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener on active user's document (maps user to subscription in real time)
  useEffect(() => {
    if (!user?.uid) return;
    let unsub: (() => void) | undefined;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      unsub = onSnapshot(
        userDocRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data.subscriptionTier) {
            setUser((prev) => {
              if (!prev) return prev;
              if (
                prev.subscriptionTier === data.subscriptionTier &&
                prev.subscriptionBillingCycle === data.subscriptionBillingCycle &&
                prev.razorpayPaymentId === data.razorpayPaymentId
              ) {
                return prev;
              }
              return {
                ...prev,
                subscriptionTier: data.subscriptionTier as SubscriptionTier,
                subscriptionBillingCycle: (data.subscriptionBillingCycle as BillingCycle) || prev.subscriptionBillingCycle,
                subscriptionStatus: data.subscriptionStatus || 'active',
                subscriptionUpdatedAt: data.subscriptionUpdatedAt || prev.subscriptionUpdatedAt,
                subscriptionExpiresAt: data.subscriptionExpiresAt ?? prev.subscriptionExpiresAt,
                razorpayPaymentId: data.razorpayPaymentId || prev.razorpayPaymentId,
                razorpayOrderId: data.razorpayOrderId || prev.razorpayOrderId,
              };
            });
          }
        },
        () => {}
      );
    } catch {
      // Ignore offline snapshot error
    }
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

}
