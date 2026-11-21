import { db, doc, setDoc } from '../../../lib/firebase';
import {
  BillingCycle,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../../lib/subscription';
import type { UserProfile } from '../../../types/market';
import { normalizeEmail, persistUserProfileToFirestore } from '../utils/userProfileSync';

export async function persistSubscriptionUpgradeToFirestore(params: {
  effectiveUid: string;
  updatedProfile: UserProfile;
  newBalance: number;
  tier: SubscriptionTier;
  effectiveCycle: BillingCycle;
  expiresAt: number | null;
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  amountPaid?: number;
  now: number;
}): Promise<void> {
  const {
    effectiveUid,
    updatedProfile,
    newBalance,
    tier,
    effectiveCycle,
    expiresAt,
    paymentId,
    orderId,
    subscriptionId,
    amountPaid,
    now,
  } = params;
  const targetPlan = SUBSCRIPTION_PLANS[tier];

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
      razorpaySubscriptionId: subscriptionId || '',
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
        (tier === 'free'
          ? 0
          : effectiveCycle === 'yearly'
            ? targetPlan.yearlyPrice
            : targetPlan.monthlyPrice),
      currency: 'INR',
      paymentGateway: 'Razorpay',
      razorpayPaymentId: paymentId || null,
      razorpayOrderId: orderId || null,
      maxWalletLimit: targetPlan.maxWalletLimit,
      activatedAt: now,
      expiresAt,
    };

    await setDoc(doc(db, 'subscriptions', subId), subPayload, { merge: true });
    await setDoc(doc(db, 'users', effectiveUid, 'subscriptions', subId), subPayload, {
      merge: true,
    });
  } catch (e) {
    console.warn('Firestore subscription sync notice:', e);
  }
}

export async function persistSubscriptionCancellationToFirestore(params: {
  effectiveUid: string;
  email: string;
  razorpayPaymentId?: string;
  effectiveExpiresAt: number;
  now: number;
}): Promise<void> {
  const { effectiveUid, email, razorpayPaymentId, effectiveExpiresAt, now } = params;
  try {
    await persistUserProfileToFirestore(effectiveUid, email, {
      subscriptionStatus: 'cancelled',
      subscriptionAutoPay: false,
      subscriptionExpiresAt: effectiveExpiresAt,
      subscriptionUpdatedAt: now,
      updatedAt: now,
    });
    if (razorpayPaymentId) {
      const cancelMeta = {
        status: 'cancelled',
        cancelledAt: now,
        expiresAt: effectiveExpiresAt,
        autoPayEnabled: false,
      };
      await setDoc(doc(db, 'subscriptions', razorpayPaymentId), cancelMeta, { merge: true });
      await setDoc(
        doc(db, 'users', effectiveUid, 'subscriptions', razorpayPaymentId),
        cancelMeta,
        { merge: true }
      );
    }
  } catch (e) {
    console.warn('Firestore cancellation sync notice:', e);
  }
}
