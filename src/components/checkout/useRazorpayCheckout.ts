import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useTrading } from '../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription';
import { getUpgradeAmountQuote } from '../../utils/pricing';
import { createRazorpayOrder, verifyRazorpayPayment } from './razorpayApi';

export interface PaymentSuccessInfo {
  paymentId: string;
  orderId: string;
  planName: string;
  amount: number;
  newWalletLimit: number;
  autoPayEnabled: boolean;
  upiMandateId?: string;
  upiId?: string;
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
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [upiId, setUpiId] = useState('trader@okicici');
  const [isUpiVerified, setIsUpiVerified] = useState(true);
  const [enableAutoPay, setEnableAutoPay] = useState(true);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const [orderInfo, setOrderInfo] = useState<{
    orderId: string;
    keyId: string;
    amountInINR: number;
    fullPriceINR?: number;
    creditAppliedINR?: number;
    upiMandateId?: string | null;
    mode: string;
  } | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessInfo | null>(null);

  const isTopUp = tier === 'topup_1l';
  const plan = isTopUp ? SUBSCRIPTION_PLANS.free : SUBSCRIPTION_PLANS[tier];

  const upgradeQuote = isTopUp
    ? {
        payableINR: 50,
        fullPriceINR: 50,
        creditAppliedINR: 0,
        isDifferentialUpgrade: false,
      }
    : getUpgradeAmountQuote({
        targetTier: tier,
        billingCycle,
        currentTier: subscriptionTier,
        plans: SUBSCRIPTION_PLANS,
      });

  const amountINR = upgradeQuote.payableINR;

  useEffect(() => {
    if (isOpen) {
      setBillingCycle(initialCycle || 'yearly');
      setPaymentSuccess(null);
      setIsProcessing(false);
      setEnableAutoPay(!isTopUp);
    }
  }, [isOpen, initialCycle, tier, isTopUp]);

  // Create order on backend whenever modal opens or tier/cycle changes
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsCreatingOrder(true);
    createRazorpayOrder({
      tier,
      billingCycle: isTopUp ? 'monthly' : billingCycle,
      currentTier: subscriptionTier,
      enableAutoPay: !isTopUp && paymentMethod === 'upi' && enableAutoPay,
      upiId: paymentMethod === 'upi' ? upiId : undefined,
      userId: user?.uid || 'demo_user',
      email: user?.email || 'trader@niftylens.in',
      name: user?.name || 'Nifty Lens Trader',
    })
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setOrderInfo({
            orderId: data.orderId,
            keyId: data.keyId,
            amountInINR: data.amountInINR,
            fullPriceINR: data.fullPriceINR,
            creditAppliedINR: data.creditAppliedINR,
            upiMandateId: data.upiMandateId,
            mode: data.mode,
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setOrderInfo({
          orderId: `order_${Date.now().toString(36)}`,
          keyId: 'nl_live_checkout',
          amountInINR: amountINR,
          fullPriceINR: upgradeQuote.fullPriceINR,
          creditAppliedINR: upgradeQuote.creditAppliedINR,
          upiMandateId: !isTopUp && enableAutoPay ? `mandate_upi_${Date.now().toString(36)}` : null,
          mode: 'demo',
        });
      })
      .finally(() => {
        if (active) setIsCreatingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [
    isOpen,
    tier,
    billingCycle,
    isTopUp,
    subscriptionTier,
    paymentMethod,
    enableAutoPay,
    upiId,
    user?.uid,
    user?.email,
    user?.name,
    amountINR,
    upgradeQuote.fullPriceINR,
    upgradeQuote.creditAppliedINR,
  ]);

  const nextRenewalDate = new Date(
    Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleSelectUpiApp = (appId: string, handle: string) => {
    setSelectedUpiApp(appId);
    const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'trader';
    setUpiId(`${prefix}${handle}`);
    setIsUpiVerified(true);
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      closeRazorpayCheckout();
      openAuthModal('signup');
      return;
    }

    setIsProcessing(true);
    const orderId = orderInfo?.orderId || `order_${Date.now()}`;
    const paymentId = `pay_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).slice(-4)}`;
    const autoPayActive = !isTopUp && paymentMethod === 'upi' && enableAutoPay;
    const mandateId = autoPayActive
      ? orderInfo?.upiMandateId || `mandate_upi_${Date.now().toString(36)}`
      : undefined;

    try {
      await new Promise((r) => setTimeout(r, 850));
      await verifyRazorpayPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: `sig_${paymentId}`,
        tier,
        billingCycle: isTopUp ? 'monthly' : billingCycle,
        autoPayEnabled: autoPayActive,
        upiMandateId: mandateId,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
        userId: user?.uid || 'demo_user',
      }).catch(() => {});

      if (isTopUp) {
        await creditFreeWalletTopUp(paymentId, orderId);
      } else {
        await upgradeSubscription({
          tier,
          billingCycle,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          amountPaid: amountINR,
          subscriptionAutoPay: autoPayActive,
          subscriptionUpiMandateId: mandateId,
        });
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00D09C', '#00B386', '#F59E0B'],
        });
      } catch {}

      setPaymentSuccess({
        paymentId,
        orderId,
        planName: isTopUp ? '+₹1,00,000 Wallet Top-Up' : plan.name,
        amount: amountINR,
        newWalletLimit: isTopUp ? balance + 100000 : plan.maxWalletLimit,
        autoPayEnabled: autoPayActive,
        upiMandateId: mandateId,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isOpen,
    tier,
    isTopUp,
    plan,
    billingCycle,
    setBillingCycle,
    paymentMethod,
    setPaymentMethod,
    selectedUpiApp,
    handleSelectUpiApp,
    upiId,
    setUpiId,
    isUpiVerified,
    setIsUpiVerified,
    enableAutoPay,
    setEnableAutoPay,
    selectedBank,
    setSelectedBank,
    orderInfo,
    isCreatingOrder,
    isProcessing,
    paymentSuccess,
    upgradeQuote,
    amountINR,
    nextRenewalDate,
    handleCompletePayment,
    closeRazorpayCheckout,
  };
}
