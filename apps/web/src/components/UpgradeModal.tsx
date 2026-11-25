import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { PLAN_CARDS } from '../features/pricing/pricingConfig';
import { formatINR, getPlanPriceView, getUpgradeAmountQuote } from '../utils/pricing';
import { navigate } from '../lib/navigation';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { UpgradePlanCard } from './upgrade/UpgradePlanCard';

export const UpgradeModal: React.FC = () => {
  const {
    subscriptionTier,
    upgradeModalState,
    closeUpgradeModal,
    openRazorpayCheckout,
  } = useTrading();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  if (!upgradeModalState.isOpen) return null;

  const { requiredTier, featureName, featureDescription } = upgradeModalState;
  const currentPlan = SUBSCRIPTION_PLANS[subscriptionTier];
  const beginnerPlan = SUBSCRIPTION_PLANS.beginner;
  const advancedPlan = SUBSCRIPTION_PLANS.advanced;

  const beginnerPrice = getPlanPriceView(beginnerPlan, billingCycle);
  const advancedPrice = getPlanPriceView(advancedPlan, billingCycle);
  const advancedQuote = getUpgradeAmountQuote({
    targetTier: 'advanced',
    billingCycle,
    currentTier: subscriptionTier,
    plans: SUBSCRIPTION_PLANS,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade Subscription"
    >
      <div className="fixed inset-0" onClick={closeUpgradeModal} />

      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0B1310] border border-[#1E2F28] shadow-2xl overflow-hidden z-10 text-left max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 sm:px-7 border-b border-[#1E2F28] flex items-start justify-between gap-4 bg-[#111C17]/70">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-2.5 py-0.5 text-[11px] font-semibold text-[#00D09C]">
              <Lock className="w-3 dot-3" />
              <span>
                {requiredTier === 'advanced'
                  ? 'Available on Advanced Package'
                  : 'Available on Beginner & Advanced'}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {featureName || 'Choose Your Plan'}
            </h3>

            <p className="text-xs sm:text-sm text-[#9AB0A5] max-w-xl leading-relaxed">
              {featureDescription ||
                'Unlock higher virtual capital, 5x Intraday & MTF 5.00x leverage, backtested strategy screeners, and interactive chart patterns.'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeUpgradeModal}
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Close upgrade modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
          {/* Current Plan & Billing Toggle Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#9AB0A5] flex items-center gap-2">
              <span>Current plan:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111C17] border border-[#1E2F28] text-white font-semibold">
                {currentPlan.name} ({formatINR(currentPlan.maxWalletLimit)} cap)
              </span>
            </div>

            <div className="inline-flex items-center rounded-full bg-[#111C17] p-1 border border-[#1E2F28]">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-[#00D09C] text-[#06241B]'
                    : 'text-[#9AB0A5] hover:text-white'
                }`}
              >
                <span>Yearly</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    billingCycle === 'yearly'
                      ? 'bg-[#06241B]/20 text-[#06241B]'
                      : 'bg-[#00D09C]/15 text-[#00D09C]'
                  }`}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* 2 Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UpgradePlanCard
              tierKey="beginner"
              plan={beginnerPlan}
              planCardData={PLAN_CARDS.beginner}
              priceView={beginnerPrice}
              billingCycle={billingCycle}
              subscriptionTier={subscriptionTier}
              onSelect={() => {
                closeUpgradeModal();
                openRazorpayCheckout('beginner', billingCycle);
              }}
            />

            <UpgradePlanCard
              tierKey="advanced"
              plan={advancedPlan}
              planCardData={PLAN_CARDS.advanced}
              priceView={advancedPrice}
              quote={advancedQuote}
              billingCycle={billingCycle}
              subscriptionTier={subscriptionTier}
              onSelect={() => {
                closeUpgradeModal();
                openRazorpayCheckout('advanced', billingCycle);
              }}
            />
          </div>

          {/* Footer Bar */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9AB0A5]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00D09C]" />
              <span>UPI AutoPay supported · Instant activation · Automatic monthly capital resets</span>
            </span>

            <button
              type="button"
              onClick={() => {
                closeUpgradeModal();
                navigate('/pricing');
              }}
              className="font-semibold text-[#00D09C] hover:underline cursor-pointer"
            >
              Compare all features →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
