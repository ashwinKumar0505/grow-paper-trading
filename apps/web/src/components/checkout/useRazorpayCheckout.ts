import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useTrading } from '../../context/TradingContext';
import { trackSubscriptionCompleted } from '../../lib/analytics';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription';
import { getUpgradeAmountQuote } from '../../utils/pricing';
import { createRazorpayOrder, verifyRazorpayPayment } from './razorpayApi';
import { launchRazorpayCheckout } from './razorpaySdk';

export interface PaymentSuccessInfo {
  paymentId: string;
  orderId: string;
  planName: string;
  amount: number;
  newWalletLimit: number;
  isRecurring: boolean;
}

interface OrderInfoState {
  orderId: string;
  subscriptionId?: string;
  paymentType: 'subscription' | 'order';
  keyId: string;
  amount: number;
  amountInINR: number;
  fullPriceINR?: number;
  creditAppliedINR?: number;
  mode: 'razorpay_api';
}

export function useRazorpayCheckout() {
  const {
    user, subscriptionTier, razorpayModalState,
    closeRazorpayCheckout, upgradeSubscription, openAuthModal,
  } = useTrading();

  const { isOpen, tier, billingCycle: initialCycle } = razorpayModalState;
  const resolvedInitialCycle = initialCycle || 'yearly';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(resolvedInitialCycle);
  const [orderInfo, setOrderInfo] = useState<OrderInfoState | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);
  const wasOpenRef = useRef(false);

  const plan = SUBSCRIPTION_PLANS[tier];
  const upgradeQuote = getUpgradeAmountQuote({
    targetTier: tier,
    billingCycle,
    currentTier: subscriptionTier,
    plans: SUBSCRIPTION_PLANS,
  });
  const amountINR = orderInfo?.amountInINR ?? upgradeQuote.payableINR;

  useEffect(() => {
    if (isOpen) {
      setBillingCycle(resolvedInitialCycle);
      setPaymentSuccess(null);
      setCheckoutError(null);
      setIsProcessing(false);
    }
  }, [isOpen, resolvedInitialCycle, tier]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen) return;
    if (!wasOpen && billingCycle !== resolvedInitialCycle) return;
    if (!user?.uid) {
      setOrderInfo(null);
      setCheckoutError('Please sign in to your account before initiating a payment.');
      return;
    }
    let active = true;
    setIsCreatingOrder(true);
    setOrderInfo(null);
    setCheckoutError(null);

    createRazorpayOrder({
      tier, billingCycle, currentTier: subscriptionTier,
      enableAutoPay: true, userId: user.uid, email: user.email, name: user.name,
    })
      .then((data) => {
        if (!active) return;
        if (data.success && data.mode === 'razorpay_api' && data.keyId?.startsWith('rzp_') && (data.orderId || data.subscriptionId)) {
          setOrderInfo({
            orderId: data.orderId || data.subscriptionId || '',
            subscriptionId: data.subscriptionId,
            paymentType: data.paymentType || (data.subscriptionId ? 'subscription' : 'order'),
            keyId: data.keyId,
            amount: data.amount || data.amountInINR * 100,
            amountInINR: data.amountInINR,
            fullPriceINR: data.fullPriceINR,
            creditAppliedINR: data.creditAppliedINR,
            mode: 'razorpay_api',
          });
        } else {
          setCheckoutError(data.message || 'Payment gateway is not configured on this server. Paid checkout is currently unavailable.');
        }
      })
      .catch(() => { if (active) setCheckoutError('Unable to reach payment server. Please try again.'); })
      .finally(() => { if (active) setIsCreatingOrder(false); });

    return () => { active = false; };
  }, [isOpen, tier, billingCycle, resolvedInitialCycle, subscriptionTier, user?.uid, user?.email, user?.name]);

  const finalizeSuccessfulPayment = useCallback(
    async (paymentId: string, orderId: string, isReplay?: boolean) => {
      if (!isReplay) {
        await upgradeSubscription({
          tier,
          billingCycle,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          amountPaid: amountINR,
          subscriptionAutoPay: true,
        });
        trackSubscriptionCompleted({
          planTier: tier,
          billingCycle,
          paymentType: orderInfo?.paymentType || 'subscription',
          previousTier: subscriptionTier,
        });
      }
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#00D09C', '#F59E0B'] }); } catch {}
      setPaymentSuccess({
        paymentId,
        orderId,
        planName: plan.name,
        amount: amountINR,
        newWalletLimit: plan.maxWalletLimit,
        isRecurring: true,
      });
    },
    [upgradeSubscription, tier, billingCycle, amountINR, plan.name, plan.maxWalletLimit, orderInfo?.paymentType, subscriptionTier]
  );

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      closeRazorpayCheckout();
      openAuthModal('signup');
      return;
    }
    if (!orderInfo || isProcessing || isCreatingOrder) return;
    if (orderInfo.mode !== 'razorpay_api' || !orderInfo.keyId.startsWith('rzp_')) {
      setCheckoutError('Payment gateway is not configured on this server.');
      return;
    }

    setCheckoutError(null);
    setIsProcessing(true);
    await launchRazorpayCheckout({
      keyId: orderInfo.keyId, paymentType: orderInfo.paymentType, amount: orderInfo.amount,
      orderId: orderInfo.orderId, subscriptionId: orderInfo.subscriptionId,
      description: `${plan.name} (${billingCycle})`,
      userName: user.name, userEmail: user.email,
      notes: { tier, billingCycle, userId: user.uid },
      onDismiss: () => setIsProcessing(false),
      onFailure: (message) => { setCheckoutError(message); setIsProcessing(false); },
      onSuccess: async (response) => {
        try {
          const verification = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            tier, billingCycle,
            autoPayEnabled: true, userId: user.uid!,
          });
          if (!verification.success || !verification.verified) {
            setCheckoutError(verification.message || 'Payment signature verification failed.');
            return;
          }
          await finalizeSuccessfulPayment(
            response.razorpay_payment_id,
            response.razorpay_subscription_id || response.razorpay_order_id || orderInfo.orderId,
            verification.idempotentReplay
          );
        } catch {
          setCheckoutError('Payment verification failed. Please contact support with your payment ID.');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  return {
    isOpen, plan, billingCycle, setBillingCycle, orderInfo,
    isCreatingOrder, isProcessing, checkoutError, paymentSuccess,
    upgradeQuote, amountINR, handleStartPayment, closeRazorpayCheckout,
  };
}
