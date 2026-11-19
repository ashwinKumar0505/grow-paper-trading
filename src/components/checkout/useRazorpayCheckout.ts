import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useTrading } from '../../context/TradingContext';
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
  mode: 'razorpay_api' | 'demo';
}

export function useRazorpayCheckout() {
  const {
    user,
    balance,
    subscriptionTier,
    razorpayModalState,
    closeRazorpayCheckout,
    upgradeSubscription,
    creditFreeWalletTopUp,
    openAuthModal,
  } = useTrading();

  const { isOpen, tier, billingCycle: initialCycle } = razorpayModalState;
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialCycle || 'yearly');
  const [orderInfo, setOrderInfo] = useState<OrderInfoState | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);

  const isTopUp = tier === 'topup_1l';
  const plan = isTopUp ? SUBSCRIPTION_PLANS.free : SUBSCRIPTION_PLANS[tier];

  const upgradeQuote = isTopUp
    ? { payableINR: 50, fullPriceINR: 50, creditAppliedINR: 0, isDifferentialUpgrade: false }
    : getUpgradeAmountQuote({
        targetTier: tier,
        billingCycle,
        currentTier: subscriptionTier,
        plans: SUBSCRIPTION_PLANS,
      });

  const amountINR = orderInfo?.amountInINR ?? upgradeQuote.payableINR;

  useEffect(() => {
    if (isOpen) {
      setBillingCycle(initialCycle || 'yearly');
      setPaymentSuccess(null);
      setCheckoutError(null);
      setIsProcessing(false);
    }
  }, [isOpen, initialCycle, tier]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsCreatingOrder(true);
    setOrderInfo(null);
    setCheckoutError(null);

    createRazorpayOrder({
      tier,
      billingCycle: isTopUp ? 'monthly' : billingCycle,
      currentTier: subscriptionTier,
      enableAutoPay: !isTopUp,
      userId: user?.uid || 'demo_user',
      email: user?.email || 'trader@niftylens.in',
      name: user?.name || 'Nifty Lens Trader',
    })
      .then((data) => {
        if (!active) return;
        if (data.success && (data.orderId || data.subscriptionId)) {
          setOrderInfo({
            orderId: data.orderId || data.subscriptionId || '',
            subscriptionId: data.subscriptionId,
            paymentType: data.paymentType || (data.subscriptionId ? 'subscription' : 'order'),
            keyId: data.keyId,
            amount: data.amount || data.amountInINR * 100,
            amountInINR: data.amountInINR,
            fullPriceINR: data.fullPriceINR,
            creditAppliedINR: data.creditAppliedINR,
            mode: data.mode,
          });
        } else {
          setCheckoutError(data.message || 'Could not initialize Razorpay checkout.');
        }
      })
      .catch(() => {
        if (active) setCheckoutError('Unable to reach payment server. Please try again.');
      })
      .finally(() => {
        if (active) setIsCreatingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, tier, billingCycle, isTopUp, subscriptionTier, user?.uid, user?.email, user?.name]);

  const finalizeSuccessfulPayment = useCallback(
    async (paymentId: string, orderId: string) => {
      if (isTopUp) {
        await creditFreeWalletTopUp(paymentId, orderId);
      } else {
        await upgradeSubscription({
          tier,
          billingCycle,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          amountPaid: amountINR,
          subscriptionAutoPay: true,
        });
      }
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#10B981', '#00D09C', '#F59E0B'] });
      } catch {}
      setPaymentSuccess({
        paymentId,
        orderId,
        planName: isTopUp ? '+₹1,00,000 Wallet Top-Up' : plan.name,
        amount: amountINR,
        newWalletLimit: isTopUp ? balance + 100000 : plan.maxWalletLimit,
        isRecurring: !isTopUp,
      });
    },
    [isTopUp, creditFreeWalletTopUp, upgradeSubscription, tier, billingCycle, amountINR, plan.name, plan.maxWalletLimit, balance]
  );

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      closeRazorpayCheckout();
      openAuthModal('signup');
      return;
    }
    if (!orderInfo || isProcessing || isCreatingOrder) return;

    setCheckoutError(null);
    setIsProcessing(true);

    if (orderInfo.mode === 'razorpay_api' && orderInfo.keyId.startsWith('rzp_')) {
      await launchRazorpayCheckout({
        keyId: orderInfo.keyId,
        paymentType: orderInfo.paymentType,
        amount: orderInfo.amount,
        orderId: orderInfo.orderId,
        subscriptionId: orderInfo.subscriptionId,
        description: isTopUp ? '+₹1,00,000 Virtual Wallet Top-Up' : `${plan.name} (${billingCycle})`,
        userName: user.name,
        userEmail: user.email,
        notes: { tier, billingCycle: isTopUp ? 'monthly' : billingCycle, userId: user.uid || 'demo_user' },
        onDismiss: () => setIsProcessing(false),
        onFailure: (message) => {
          setCheckoutError(message);
          setIsProcessing(false);
        },
        onSuccess: async (response) => {
          try {
            const verification = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier,
              billingCycle: isTopUp ? 'monthly' : billingCycle,
              autoPayEnabled: !isTopUp,
              userId: user.uid || 'demo_user',
            });
            if (!verification.success || !verification.verified) {
              setCheckoutError(verification.message || 'Payment signature verification failed.');
              return;
            }
            await finalizeSuccessfulPayment(
              response.razorpay_payment_id,
              response.razorpay_subscription_id || response.razorpay_order_id || orderInfo.orderId
            );
          } catch {
            setCheckoutError('Payment verification failed. Please contact support with your payment ID.');
          } finally {
            setIsProcessing(false);
          }
        },
      });
      return;
    }

    const paymentId = `pay_demo_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).slice(-4)}`;
    try {
      await new Promise((r) => setTimeout(r, 600));
      await verifyRazorpayPayment({
        razorpay_order_id: orderInfo.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: `sig_${paymentId}`,
        tier,
        billingCycle: isTopUp ? 'monthly' : billingCycle,
        autoPayEnabled: !isTopUp,
        userId: user.uid || 'demo_user',
      });
      await finalizeSuccessfulPayment(paymentId, orderInfo.orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isOpen, isTopUp, plan, billingCycle, setBillingCycle,
    orderInfo, isCreatingOrder, isProcessing, checkoutError, paymentSuccess,
    upgradeQuote, amountINR, handleStartPayment, closeRazorpayCheckout,
  };
}
