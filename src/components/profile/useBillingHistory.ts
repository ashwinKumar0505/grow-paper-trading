import { useCallback, useEffect, useState } from 'react';
import { collection, db, getDocs } from '../../lib/firebase';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../lib/subscription';
import type { UserProfile } from '../../types/market';
import {
  mergeBillingHistoryRecords,
  type BillingRecord,
  type RemoteSubscriptionDoc,
} from '../../utils/profileBilling';
import { fetchRazorpayBillingHistory } from '../checkout/razorpayApi';

export function useBillingHistory(
  isOpen: boolean,
  user: UserProfile | null,
  subscriptionTier: SubscriptionTier
) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const firestoreDocs: RemoteSubscriptionDoc[] = [];

      if (user.uid) {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'subscriptions'));
          snap.forEach((docSnap) => {
            firestoreDocs.push(docSnap.data() as RemoteSubscriptionDoc);
          });
        } catch {
          // Continue to Razorpay API / profile fallback if Firestore offline
        }
      }

      const subId =
        user.razorpaySubscriptionId ||
        (user.razorpayOrderId?.startsWith('sub_') ? user.razorpayOrderId : undefined);
      const payId = user.razorpayPaymentId;

      let razorpayItems: Awaited<ReturnType<typeof fetchRazorpayBillingHistory>>['items'] = [];
      if (subId || (payId && !payId.startsWith('pay_demo_'))) {
        try {
          const rzpRes = await fetchRazorpayBillingHistory({
            subscriptionId: subId,
            paymentId: payId,
          });
          if (rzpRes.success && Array.isArray(rzpRes.items)) {
            razorpayItems = rzpRes.items;
          }
        } catch {
          // Preserve Firestore records even if Razorpay endpoint is unreachable
        }
      }

      // Include current user payment reference only when user has a paid subscription & real paymentId
      if (
        firestoreDocs.length === 0 &&
        razorpayItems.length === 0 &&
        subscriptionTier !== 'free' &&
        user.razorpayPaymentId
      ) {
        const plan = SUBSCRIPTION_PLANS[subscriptionTier];
        const cycle = user.subscriptionBillingCycle === 'yearly' ? 'yearly' : 'monthly';
        firestoreDocs.push({
          subscriptionId: subId || user.razorpayOrderId || user.razorpayPaymentId,
          tier: subscriptionTier,
          planName: plan.name,
          billingCycle: cycle,
          status: user.subscriptionStatus || 'active',
          amountPaidINR: cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
          currency: 'INR',
          razorpayPaymentId: user.razorpayPaymentId,
          razorpayOrderId: user.razorpayOrderId,
          activatedAt: user.subscriptionUpdatedAt || user.createdAt,
        });
      }

      const merged = mergeBillingHistoryRecords({
        firestoreDocs,
        razorpayItems,
        fallbackPlanName: SUBSCRIPTION_PLANS[subscriptionTier]?.name || 'Subscription',
        fallbackCycle: user.subscriptionBillingCycle || 'monthly',
      });
      setRecords(merged);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load billing history.');
    } finally {
      setIsLoading(false);
    }
  }, [user, subscriptionTier]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  return { records, isLoading, errorMsg, reload: loadHistory };
}
