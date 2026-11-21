import React from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatINR } from '../utils/pricing';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { CheckoutReceiptView } from './checkout/CheckoutReceiptView';
import { CheckoutOrderSummary } from './checkout/CheckoutOrderSummary';
import { useRazorpayCheckout } from './checkout/useRazorpayCheckout';

export const RazorpayCheckoutModal: React.FC = () => {
  const { user, openAuthModal } = useTrading();
  const {
    isOpen,
    plan,
    billingCycle,
    setBillingCycle,
    orderInfo,
    isCreatingOrder,
    isProcessing,
    checkoutError,
    paymentSuccess,
    upgradeQuote,
    amountINR,
    handleStartPayment,
    closeRazorpayCheckout,
  } = useRazorpayCheckout();

  if (!isOpen) return null;

  const renewalPeriod = billingCycle === 'yearly' ? 'year' : 'month';

  return (
    <Dialog
      open={isOpen}
      modal={false}
      onOpenChange={(open) => {
        if (!open && !isProcessing) closeRazorpayCheckout();
      }}
    >
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs animate-fade-in"
        onClick={() => !isProcessing && closeRazorpayCheckout()}
      />

      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden bg-[#0B1310] border border-[#1E2F28] shadow-2xl text-left max-h-[92vh] flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1E2F28] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#082219] border border-[#1E2F28] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 40 40" fill="none" className="w-5 h-5" aria-hidden="true">
                <circle cx="17.5" cy="17.5" r="10.5" stroke="#10B981" strokeWidth="2.8" />
                <path d="M25.5 25.5L32.5 32.5" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                <rect x="12.5" y="16" width="2.6" height="5" rx="0.8" fill="#10B981" />
                <rect x="16.5" y="13.5" width="2.6" height="6.5" rx="0.8" fill="#10B981" />
                <rect x="20.5" y="11" width="2.6" height="8" rx="0.8" fill="#10B981" />
              </svg>
            </div>
            <DialogTitle className="font-bold text-lg text-white tracking-tight">
              Complete Your Subscription
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review your subscription summary and continue to Razorpay to complete payment.
            </DialogDescription>
          </div>

          <button
            type="button"
            onClick={closeRazorpayCheckout}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {paymentSuccess ? (
            <CheckoutReceiptView
              paymentSuccess={paymentSuccess}
              billingCycle={billingCycle}
              onClose={closeRazorpayCheckout}
            />
          ) : (
            <form onSubmit={handleStartPayment} className="p-6 space-y-5">
              <CheckoutOrderSummary
                plan={plan}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
                amountINR={amountINR}
                upgradeQuote={upgradeQuote}
              />

              {!user && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>Sign in or create a free account to link this upgrade.</span>
                  <button
                    type="button"
                    onClick={() => {
                      closeRazorpayCheckout();
                      openAuthModal('signup');
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 text-[#06241B] font-bold cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {checkoutError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {checkoutError}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isProcessing || isCreatingOrder || !orderInfo}
                  className="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] dark:bg-[#10B981] dark:hover:bg-[#059669] text-[#042218] font-semibold text-base transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Razorpay…</span>
                    </>
                  ) : isCreatingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Checkout…</span>
                    </>
                  ) : (
                    <span>Subscribe &amp; Pay {formatINR(amountINR)}</span>
                  )}
                </Button>

                <div className="text-center space-y-1.5 pt-1">
                  <p className="text-xs text-[#9AB0A5] flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Secure payment powered by Razorpay</span>
                  </p>
                  <p className="text-xs text-[#6B8578] leading-relaxed">
                    Recurring {billingCycle} subscription · Renews at {formatINR(upgradeQuote.fullPriceINR)}/{renewalPeriod} until cancelled. Cancel anytime. Instant upgrade after successful payment.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
