import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import {
  BillingCycle,
  normalizeUsageQuota,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../../lib/subscription';
import { UserProfile } from '../../../types/market';
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
  'balance' | 'setUser' | 'setBalance' | 'setInitialBalance' | 'setUsageQuota' | 'setIsAuthModalOpen' | 'setShowLandingPage'
> &
  Pick<TradingContextType, 'addToast'>;

export function useSignIn({
  balance,
  setUser,
  setBalance,
  setInitialBalance,
  setUsageQuota,
  setIsAuthModalOpen,
  setShowLandingPage,
  addToast,
}: Options) {
  // Sign In Existing User with Firebase (awaits Firestore so paid plans are restored immediately)
  const signInUser = async (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }): Promise<boolean> => {
    const normalizedEmail = normalizeEmail(data.email);
    let existingProfile: UserProfile | null = null;
    try {
      const saved = localStorage.getItem('mypaper_user_v2') || localStorage.getItem('groww_paper_user_v1');
      if (saved) existingProfile = JSON.parse(saved);
    } catch {}

    const effectiveUid = data.uid || existingProfile?.uid || buildEmailUid(normalizedEmail);
    const remote = await fetchUserProfileFromFirestore(effectiveUid, normalizedEmail);

    const activeTier: SubscriptionTier = remote
      ? resolveActiveTier(remote)
      : existingProfile?.subscriptionTier || 'free';
    const tierMaxCash = SUBSCRIPTION_PLANS[activeTier].maxWalletLimit;
    const userName = data.name || remote?.name || existingProfile?.name || normalizedEmail.split('@')[0];
    const userPhone = remote?.phone || existingProfile?.phone;

    const restoredBalance =
      typeof remote?.balance === 'number'
        ? Math.min(tierMaxCash, remote.balance)
        : Math.min(tierMaxCash, existingProfile?.initialCash || balance || tierMaxCash);
    const restoredInitialCash =
      typeof remote?.initialBalance === 'number'
        ? Math.min(tierMaxCash, remote.initialBalance)
        : restoredBalance;

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
    };

    setUser(profile);
    setBalance(restoredBalance);
    setInitialBalance(restoredInitialCash);
    if (remote?.usage) {
      setUsageQuota(normalizeUsageQuota(remote.usage));
    }

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

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
      balance: restoredBalance,
      initialBalance: restoredInitialCash,
      updatedAt: Date.now(),
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
