import React from 'react';
import type { SubscriptionPlanConfig } from '../../lib/subscription';
import { formatINR } from '../../utils/pricing';

interface CheckoutOrderSummaryProps {
  isTopUp: boolean;
  plan: SubscriptionPlanConfig;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  amountINR: number;
  upgradeQuote: {
    payableINR: number;
    fullPriceINR: number;
    creditAppliedINR: number;
    isDifferentialUpgrade: boolean;
  };
}

export const CheckoutOrderSummary: React.FC<CheckoutOrderSummaryProps> = ({
  isTopUp,
  plan,
  billingCycle,
  setBillingCycle,
  amountINR,
  upgradeQuote,
}) => {
  const cycleLabel = isTopUp
    ? 'One-time'
    : billingCycle === 'yearly'
    ? 'Yearly Subscription'
    : 'Monthly Subscription';
  const planTitle = isTopUp ? 'Wallet Top-Up (+₹1,00,000)' : plan.name;
  const planDescription = isTopUp
    ? 'Instantly adds +₹1,00,000 virtual capital to your paper trading balance.'
    : `Includes ${formatINR(plan.maxWalletLimit)} virtual capital, 5x Intraday & MTF, and automated resets.`;

  return (
    <div className="space-y-5">
      {/* Plan Summary */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-lg font-bold text-white leading-snug">{planTitle}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {cycleLabel}
            </p>
          </div>

          {!isTopUp && (
            <div className="inline-flex rounded-full bg-[#111C17] p-1 border border-[#1E2F28] shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  billingCycle === 'monthly'
                    ? 'bg-[#10B981] text-[#042218]'
                    : 'text-[#9AB0A5] hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  billingCycle === 'yearly'
                    ? 'bg-[#10B981] text-[#042218]'
                    : 'text-[#9AB0A5] hover:text-white'
                }`}
              >
                Yearly (-20%)
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-[#9AB0A5] leading-relaxed">{planDescription}</p>
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-xl bg-[#111C17] p-4 sm:p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between text-[#9AB0A5]">
          <span>
            {isTopUp ? 'Wallet Top-Up' : `${plan.name} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`}
          </span>
          <span className="font-mono tabular-nums font-medium text-white">
            {formatINR(upgradeQuote.fullPriceINR)}
          </span>
        </div>

        {upgradeQuote.isDifferentialUpgrade && upgradeQuote.creditAppliedINR > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span>Beginner Plan Credit</span>
            <span className="font-mono tabular-nums font-medium">
              −{formatINR(upgradeQuote.creditAppliedINR)}
            </span>
          </div>
        )}

        {!isTopUp && billingCycle === 'yearly' && (
          <div className="flex items-center justify-between text-emerald-400">
            <span>Yearly Subscription Savings</span>
            <span className="font-medium">20% off</span>
          </div>
        )}

        <div className="pt-3 border-t border-[#1E2F28] flex items-baseline justify-between gap-4">
          <span className="text-base font-semibold text-white">
            {isTopUp ? 'Total to Pay' : 'Due Today'}
          </span>
          <div className="text-right font-mono tabular-nums">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {formatINR(amountINR)}
            </span>
            {!isTopUp && (
              <span className="text-sm text-[#9AB0A5] ml-1">
                /{billingCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
