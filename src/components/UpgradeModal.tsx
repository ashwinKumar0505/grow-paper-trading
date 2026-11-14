import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { PLAN_CARDS } from '../features/pricing/pricingConfig';
import { formatINR, getPlanPriceView, getUpgradeAmountQuote } from '../utils/pricing';
import { navigate } from '../lib/navigation';
import {
  Check,
  Crown,
  Lock,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

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
        {/* Clean Minimal Header */}
        <div className="px-6 py-5 sm:px-7 border-b border-[#1E2F28] flex items-start justify-between gap-4 bg-[#111C17]/70">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-2.5 py-0.5 text-[11px] font-semibold text-[#00D09C]">
              <Lock className="w-3 h-3" />
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

          {/* 2 Clean Plan Cards matching /pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Beginner Package Card */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors ${
                subscriptionTier === 'beginner'
                  ? 'border-[#1E2F28] bg-[#111C17]/60 opacity-80'
                  : 'border-[#00D09C]/60 bg-[#111C17]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#00D09C]/10 border border-[#00D09C]/25 flex items-center justify-center text-[#00D09C]">
                      <Zap className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{beginnerPlan.name}</h4>
                      <p className="text-[11px] text-[#9AB0A5]">{PLAN_CARDS.beginner.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#00D09C] shrink-0">
                    Most Popular
                  </span>
                </div>

                <div className="mt-4 pb-4 border-b border-[#1E2F28]">
                  <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatINR(beginnerPrice.charged)}
                    </span>
                    <span className="text-xs text-[#9AB0A5]">{beginnerPrice.periodLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B8578] font-mono tabular-nums">
                    {billingCycle === 'yearly' && beginnerPrice.monthlyEquivalent !== null
                      ? `= ${formatINR(beginnerPrice.monthlyEquivalent)} / month · billed annually`
                      : `Or ${formatINR(beginnerPlan.yearlyPrice)} / year (save 20%)`}
                  </p>
                </div>

                <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B8578]">
                  {PLAN_CARDS.beginner.inheritsFrom}
                </p>

                <ul className="mt-2.5 space-y-2 text-xs text-[#D6E6DE]">
                  {PLAN_CARDS.beginner.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00D09C]/15 text-[#00D09C]">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.75} />
                      </span>
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-[#1E2F28]">
                {subscriptionTier === 'beginner' || subscriptionTier === 'advanced' ? (
                  <div className="w-full py-2.5 text-center rounded-xl bg-[#16241E] border border-[#1E2F28] text-xs font-semibold text-[#9AB0A5]">
                    {subscriptionTier === 'beginner' ? 'Current Active Plan' : 'Included in Advanced'}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeUpgradeModal();
                      openRazorpayCheckout('beginner', billingCycle);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Upgrade to Beginner
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Package Card */}
            <div className="rounded-2xl border border-amber-400/40 bg-[#111C17] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-300">
                      <Crown className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{advancedPlan.name}</h4>
                      <p className="text-[11px] text-[#9AB0A5]">{PLAN_CARDS.advanced.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-400/15 border border-amber-400/35 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
                    For Advanced Traders
                  </span>
                </div>

                <div className="mt-4 pb-4 border-b border-[#1E2F28]">
                  <div className="flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatINR(advancedQuote.payableINR)}
                    </span>
                    {advancedQuote.isDifferentialUpgrade && (
                      <span className="text-xs text-[#6B8578] line-through">
                        {formatINR(advancedQuote.fullPriceINR)}
                      </span>
                    )}
                    <span className="text-xs text-[#9AB0A5]">{advancedPrice.periodLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B8578] font-mono tabular-nums">
                    {advancedQuote.isDifferentialUpgrade ? (
                      <span className="text-[#00D09C]">
                        Includes −{formatINR(advancedQuote.creditAppliedINR)} Beginner credit · Pay difference only
                      </span>
                    ) : billingCycle === 'yearly' && advancedPrice.monthlyEquivalent !== null ? (
                      `= ${formatINR(advancedPrice.monthlyEquivalent)} / month · billed annually`
                    ) : (
                      `Or ${formatINR(advancedPlan.yearlyPrice)} / year (save 20%)`
                    )}
                  </p>
                </div>

                <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B8578]">
                  {PLAN_CARDS.advanced.inheritsFrom}
                </p>

                <ul className="mt-2.5 space-y-2 text-xs text-[#D6E6DE]">
                  {PLAN_CARDS.advanced.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.75} />
                      </span>
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-[#1E2F28]">
                {subscriptionTier === 'advanced' ? (
                  <div className="w-full py-2.5 text-center rounded-xl bg-[#16241E] border border-[#1E2F28] text-xs font-semibold text-[#9AB0A5]">
                    Current Active Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeUpgradeModal();
                      openRazorpayCheckout('advanced', billingCycle);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {advancedQuote.isDifferentialUpgrade
                      ? `Get Advanced · Pay ${formatINR(advancedQuote.payableINR)}`
                      : 'Get Advanced'}
                  </button>
                )}
              </div>
            </div>
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
