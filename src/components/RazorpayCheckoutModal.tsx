import React from 'react';
import { useTrading } from '../context/TradingContext';
import { formatINR } from '../utils/pricing';
import {
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CheckoutReceiptView } from './checkout/CheckoutReceiptView';
import { CheckoutOrderSummary } from './checkout/CheckoutOrderSummary';
import { CheckoutPaymentMethods } from './checkout/CheckoutPaymentMethods';
import { useRazorpayCheckout } from './checkout/useRazorpayCheckout';

export const RazorpayCheckoutModal: React.FC = () => {
  const { user, openAuthModal } = useTrading();
  const {
    isOpen,
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
  } = useRazorpayCheckout();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Nifty Lens Secure Checkout"
    >
      <div className="fixed inset-0" onClick={() => !isProcessing && closeRazorpayCheckout()} />

      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-[#0B1310] border border-[#1E2F28] shadow-2xl z-10 text-left max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#111C17]/80 text-white px-6 py-4 flex items-center justify-between border-b border-[#1E2F28] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D09C] text-[#06241B] font-extrabold text-sm flex items-center justify-center">
              NL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">Nifty Lens Checkout</span>
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
            <CheckoutReceiptView
              paymentSuccess={paymentSuccess}
              isTopUp={isTopUp}
              billingCycle={billingCycle}
              onClose={closeRazorpayCheckout}
            />
          ) : (
            <form onSubmit={handleCompletePayment} className="p-6 space-y-5">
              <CheckoutOrderSummary
                isTopUp={isTopUp}
                plan={plan}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
                amountINR={amountINR}
                upgradeQuote={upgradeQuote}
              />

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

              <CheckoutPaymentMethods
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                selectedUpiApp={selectedUpiApp}
                onSelectUpiApp={handleSelectUpiApp}
                upiId={upiId}
                setUpiId={setUpiId}
                isUpiVerified={isUpiVerified}
                setIsUpiVerified={setIsUpiVerified}
                isTopUp={isTopUp}
                enableAutoPay={enableAutoPay}
                setEnableAutoPay={setEnableAutoPay}
                billingCycle={billingCycle}
                nextRenewalDate={nextRenewalDate}
                upgradeQuote={upgradeQuote}
                selectedBank={selectedBank}
                setSelectedBank={setSelectedBank}
              />

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
