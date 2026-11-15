import React from 'react';
import { Wallet } from 'lucide-react';
import { formatINR } from '../../utils/pricing';

interface CheckoutOrderSummaryProps {
  isTopUp: boolean;
  plan: any;
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
  return (
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
  );
};
