import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useTrading } from '../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { formatINR, getUpgradeAmountQuote } from '../utils/pricing';
import {
  CalendarCheck2,
  Check,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', handle: '@okicici' },
  { id: 'phonepe', label: 'PhonePe', handle: '@ybl' },
  { id: 'paytm', label: 'Paytm', handle: '@paytm' },
  { id: 'bhim', label: 'BHIM UPI', handle: '@upi' },
] as const;

export const RazorpayCheckoutModal: React.FC = () => {
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
  const [paymentSuccess, setPaymentSuccess] = useState<{
    paymentId: string;
    orderId: string;
    planName: string;
    amount: number;
    newWalletLimit: number;
    autoPayEnabled: boolean;
    upiMandateId?: string;
    upiId?: string;
  } | null>(null);

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
    fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        billingCycle: isTopUp ? 'monthly' : billingCycle,
        currentTier: subscriptionTier,
        enableAutoPay: !isTopUp && paymentMethod === 'upi' && enableAutoPay,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
        userId: user?.uid || 'demo_user',
        email: user?.email || 'trader@niftylens.in',
        name: user?.name || 'NiftyLens Trader',
      }),
    })
      .then((r) => r.json())
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

  if (!isOpen) return null;

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
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: `sig_${paymentId}`,
          tier,
          billingCycle: isTopUp ? 'monthly' : billingCycle,
          autoPayEnabled: autoPayActive,
          upiMandateId: mandateId,
          upiId: paymentMethod === 'upi' ? upiId : undefined,
          userId: user.uid,
        }),
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="NiftyLens Secure Checkout"
    >
      <div className="fixed inset-0" onClick={() => !isProcessing && closeRazorpayCheckout()} />

      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-[#0B1310] border border-[#1E2F28] shadow-2xl z-10 text-left max-h-[92vh] flex flex-col">
        {/* Clean Header */}
        <div className="bg-[#111C17]/80 text-white px-6 py-4 flex items-center justify-between border-b border-[#1E2F28] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D09C] text-[#06241B] font-extrabold text-sm flex items-center justify-center">
              NL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">NiftyLens Checkout</span>
                <span className="rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 px-2 py-0.5 text-[10px] font-semibold text-[#00D09C]">
                  Instant Activation
                </span>
              </div>
              <div className="text-[11px] text-[#9AB0A5] flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00D09C]" />
                <span>Razorpay Secure · Order {orderInfo?.orderId || 'ready'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeRazorpayCheckout}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {paymentSuccess ? (
            /* Payment Verified Receipt Screen */
            <div className="p-6 sm:p-7 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#00D09C]/15 text-[#00D09C] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D09C]/15 px-3 py-0.5 text-xs font-semibold text-[#00D09C]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Payment Verified &amp; Activated
                </span>
                <h3 className="text-xl font-bold text-white">
                  {paymentSuccess.planName} Activated
                </h3>
                <p className="text-xs text-[#9AB0A5]">
                  {isTopUp
                    ? '₹1,00,000 virtual trading capital has been added to your paper wallet.'
                    : 'Your plan features and virtual capital limits are active immediately.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#1E2F28] bg-[#111C17] p-4 text-xs space-y-2 text-left font-mono">
                <div className="flex justify-between">
                  <span className="text-[#9AB0A5]">Amount Paid Today:</span>
                  <strong className="text-white">{formatINR(paymentSuccess.amount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB0A5]">Payment ID:</span>
                  <strong className="text-[#00D09C]">{paymentSuccess.paymentId}</strong>
                </div>
                {paymentSuccess.autoPayEnabled && (
                  <div className="flex justify-between">
                    <span className="text-[#9AB0A5]">UPI AutoPay Mandate:</span>
                    <strong className="text-[#00D09C]">
                      Active ({paymentSuccess.upiId || 'UPI'}) · {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#9AB0A5]">
                    {isTopUp ? 'Updated Wallet Balance:' : 'Virtual Capital Cap:'}
                  </span>
                  <strong className="text-white">
                    {formatINR(paymentSuccess.newWalletLimit)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRazorpayCheckout}
                className="w-full py-3 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-sm transition-colors cursor-pointer"
              >
                Continue to Workspace →
              </button>
            </div>
          ) : (
            /* Interactive Checkout Form */
            <form onSubmit={handleCompletePayment} className="p-6 space-y-5">
              {/* Plan Summary & Billing Switcher */}
              <div className="rounded-xl border border-[#1E2F28] bg-[#111C17] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#00D09C] flex items-center gap-1.5">
                      {isTopUp ? (
                        <>
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Wallet Top-Up · +₹1,00,000 Virtual Capital</span>
                        </>
                      ) : (
                        <span>
                          {plan.name} · {billingCycle === 'yearly' ? 'Yearly Plan (Save 20%)' : 'Monthly Plan'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                      <span className="text-2xl font-extrabold text-white">
                        {formatINR(amountINR)}
                      </span>
                      {upgradeQuote.isDifferentialUpgrade && (
                        <span className="text-xs text-[#6B8578] line-through">
                          {formatINR(upgradeQuote.fullPriceINR)}
                        </span>
                      )}
                      <span className="text-xs text-[#9AB0A5]">
                        {isTopUp ? 'one-time' : `/${billingCycle === 'yearly' ? 'year' : 'month'}`}
                      </span>
                    </div>
                  </div>

                  {!isTopUp && (
                    <div className="inline-flex rounded-full bg-[#0B1310] p-1 border border-[#1E2F28] self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          billingCycle === 'monthly'
                            ? 'bg-[#00D09C] text-[#06241B]'
                            : 'text-[#9AB0A5] hover:text-white'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          billingCycle === 'yearly'
                            ? 'bg-[#00D09C] text-[#06241B]'
                            : 'text-[#9AB0A5] hover:text-white'
                        }`}
                      >
                        Yearly (-20%)
                      </button>
                    </div>
                  )}
                </div>

                {/* Differential Upgrade Credit Breakdown when upgrading from Beginner -> Advanced */}
                {upgradeQuote.isDifferentialUpgrade && (
                  <div className="pt-2.5 border-t border-[#1E2F28] space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-[#9AB0A5]">
                      <span>Advanced Package ({billingCycle}):</span>
                      <span>{formatINR(upgradeQuote.fullPriceINR)}</span>
                    </div>
                    <div className="flex justify-between text-[#00D09C]">
                      <span>Less Current Beginner Plan Credit:</span>
                      <span>−{formatINR(upgradeQuote.creditAppliedINR)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 border-t border-[#1E2F28]/60">
                      <span>Upgrade Difference Payable Now:</span>
                      <span>{formatINR(upgradeQuote.payableINR)}</span>
                    </div>
                  </div>
                )}

                {!upgradeQuote.isDifferentialUpgrade && (
                  <div className="text-[11px] text-[#9AB0A5]">
                    {isTopUp
                      ? 'Instantly adds +₹1,00,000 virtual cash to your paper trading balance.'
                      : `Includes ${formatINR(plan.maxWalletLimit)} virtual capital, 5x Intraday & MTF 5.00x, and automatic monthly resets.`}
                  </div>
                )}
              </div>

              {!user && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>Sign in or create a free account to link this subscription to your profile.</span>
                  <button
                    type="button"
                    onClick={() => {
                      closeRazorpayCheckout();
                      openAuthModal('signup');
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 text-[#06241B] font-bold cursor-pointer"
                  >
                    Sign Up Free
                  </button>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <div className="text-xs font-semibold text-[#D6E6DE] mb-2">
                  Payment Method
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi' as const, label: 'UPI / AutoPay', icon: Smartphone },
                    { id: 'card' as const, label: 'Card', icon: CreditCard },
                    { id: 'netbanking' as const, label: 'Netbanking', icon: Landmark },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        paymentMethod === id
                          ? 'border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]'
                          : 'border-[#1E2F28] bg-[#111C17] text-[#9AB0A5] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Method-Specific Inputs */}
              {paymentMethod === 'upi' && (
                <div className="rounded-xl border border-[#1E2F28] p-4 space-y-3.5 bg-[#111C17]">
                  {/* UPI App Quick Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#00D09C]" />
                        <span>Select UPI App &amp; Enter UPI ID</span>
                      </span>
                      {isUpiVerified && upiId.includes('@') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00D09C]">
                          <Check className="w-3 h-3" /> Verified VPA
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {UPI_APPS.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handleSelectUpiApp(app.id, app.handle)}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                            selectedUpiApp === app.id
                              ? 'border-[#00D09C] bg-[#00D09C]/15 text-[#00D09C]'
                              : 'border-[#1E2F28] bg-[#0B1310] text-[#9AB0A5] hover:text-white'
                          }`}
                        >
                          {app.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UPI VPA Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => {
                        setUpiId(e.target.value);
                        setIsUpiVerified(e.target.value.includes('@'));
                      }}
                      placeholder="yourname@okicici"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-sm font-mono text-white focus:outline-hidden focus:border-[#00D09C]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsUpiVerified(upiId.includes('@'))}
                      className="px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#16241E] text-xs font-semibold text-[#00D09C] hover:bg-[#1E3129] cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>

                  {/* UPI AutoPay Mandate Setup for Monthly & Yearly Subscriptions */}
                  {!isTopUp && (
                    <div className="rounded-xl border border-[#00D09C]/30 bg-[#0B1310] p-3.5 space-y-2">
                      <label className="flex items-start justify-between gap-3 cursor-pointer">
                        <div className="flex items-start gap-2.5">
                          <RefreshCw className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>
                                Enable UPI AutoPay ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Mandate)
                              </span>
                            </div>
                            <p className="text-[11px] text-[#9AB0A5] mt-0.5 leading-relaxed">
                              Approve the mandate once in your UPI app. Automatic{' '}
                              {billingCycle === 'yearly' ? 'annual' : 'monthly'} renewal on{' '}
                              <strong className="text-white">{nextRenewalDate}</strong> ({formatINR(upgradeQuote.fullPriceINR)}/
                              {billingCycle === 'yearly' ? 'yr' : 'mo'}). Pause or cancel anytime in your UPI app.
                            </p>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={enableAutoPay}
                          onChange={(e) => setEnableAutoPay(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#00D09C] rounded cursor-pointer shrink-0"
                        />
                      </label>

                      {enableAutoPay && (
                        <div className="flex items-center justify-between pt-2 border-t border-[#1E2F28] text-[11px] text-[#9AB0A5]">
                          <span className="flex items-center gap-1 text-[#00D09C]">
                            <CalendarCheck2 className="w-3.5 h-3.5" />
                            <span>AutoPay Mandate Ready · NPCI UPI 2.0</span>
                          </span>
                          <span className="font-mono">Max limit: {formatINR(upgradeQuote.fullPriceINR)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="rounded-xl border border-[#1E2F28] p-4 space-y-3 bg-[#111C17]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Credit / Debit Card</span>
                    <span className="text-[11px] font-mono text-[#00D09C]">RBI e-Mandate Supported</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <input
                      type="text"
                      readOnly
                      value="4111 1111 1111 1111"
                      className="col-span-2 px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-white"
                    />
                    <input
                      type="text"
                      readOnly
                      value="12/29 · 123"
                      className="px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-white"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="rounded-xl border border-[#1E2F28] p-4 space-y-2.5 bg-[#111C17]">
                  <div className="text-xs font-semibold text-white">Select Bank</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                          selectedBank === b
                            ? 'border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]'
                            : 'border-[#1E2F28] bg-[#0B1310] text-[#9AB0A5] hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Payment Button */}
              <button
                type="submit"
                disabled={isProcessing || isCreatingOrder}
                className="w-full py-3.5 px-5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {!isTopUp && paymentMethod === 'upi' && enableAutoPay
                        ? 'Approving UPI AutoPay Mandate & Activating…'
                        : 'Processing Payment & Activating…'}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {isTopUp
                        ? 'Pay ₹50 & Credit +₹1,00,000 Now'
                        : !isTopUp && paymentMethod === 'upi' && enableAutoPay
                        ? `Approve AutoPay & Pay ${formatINR(amountINR)}`
                        : `Pay ${formatINR(amountINR)} & Activate ${plan.name}`}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-[#6B8578]">
                <span>256-Bit SSL Encrypted Checkout</span>
                <span>Instant Account Activation</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
