import React from 'react';
import { Check, Crown, Zap } from 'lucide-react';
import { formatINR } from '../../utils/pricing';

interface PlanCardProps {
  tierKey: 'beginner' | 'advanced';
  plan: any;
  planCardData: any;
  priceView: any;
  quote?: any;
  billingCycle: 'monthly' | 'yearly';
  subscriptionTier: string;
  onSelect: () => void;
}

export const UpgradePlanCard: React.FC<PlanCardProps> = ({
  tierKey,
  plan,
  planCardData,
  priceView,
  quote,
  billingCycle,
  subscriptionTier,
  onSelect,
}) => {
  const isBeginner = tierKey === 'beginner';

  if (isBeginner) {
    const isCurrent = subscriptionTier === 'beginner';
    const isIncluded = subscriptionTier === 'advanced';

    return (
      <div
        className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors ${
          isCurrent
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
                <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                <p className="text-[11px] text-[#9AB0A5]">{planCardData.description}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#00D09C] shrink-0">
              Most Popular
            </span>
          </div>

          <div className="mt-4 pb-4 border-b border-[#1E2F28]">
            <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {formatINR(priceView.charged)}
              </span>
              <span className="text-xs text-[#9AB0A5]">{priceView.periodLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#6B8578] font-mono tabular-nums">
              {billingCycle === 'yearly' && priceView.monthlyEquivalent !== null
                ? `= ${formatINR(priceView.monthlyEquivalent)} / month · billed annually`
                : `Or ${formatINR(plan.yearlyPrice)} / year (save 20%)`}
            </p>
          </div>

          <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B8578]">
            {planCardData.inheritsFrom}
          </p>

          <ul className="mt-2.5 space-y-2 text-xs text-[#D6E6DE]">
            {planCardData.features.map((f: any) => (
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
          {isCurrent || isIncluded ? (
            <div className="w-full py-2.5 text-center rounded-xl bg-[#16241E] border border-[#1E2F28] text-xs font-semibold text-[#9AB0A5]">
              {isCurrent ? 'Current Active Plan' : 'Included in Advanced'}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Upgrade to Beginner
            </button>
          )}
        </div>
      </div>
    );
  }

  // Advanced package card
  const isCurrent = subscriptionTier === 'advanced';

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-[#111C17] p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-300">
              <Crown className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">{plan.name}</h4>
              <p className="text-[11px] text-[#9AB0A5]">{planCardData.description}</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-400/15 border border-amber-400/35 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
            For Advanced Traders
          </span>
        </div>

        <div className="mt-4 pb-4 border-b border-[#1E2F28]">
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {formatINR(quote?.payableINR ?? priceView.charged)}
            </span>
            {quote?.isDifferentialUpgrade && (
              <span className="text-xs text-[#6B8578] line-through">
                {formatINR(quote.fullPriceINR)}
              </span>
            )}
            <span className="text-xs text-[#9AB0A5]">{priceView.periodLabel}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6B8578] font-mono tabular-nums">
            {quote?.isDifferentialUpgrade ? (
              <span className="text-[#00D09C]">
                Includes −{formatINR(quote.creditAppliedINR)} Beginner credit · Pay difference only
              </span>
            ) : billingCycle === 'yearly' && priceView.monthlyEquivalent !== null ? (
              `= ${formatINR(priceView.monthlyEquivalent)} / month · billed annually`
            ) : (
              `Or ${formatINR(plan.yearlyPrice)} / year (save 20%)`
            )}
          </p>
        </div>

        <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B8578]">
          {planCardData.inheritsFrom}
        </p>

        <ul className="mt-2.5 space-y-2 text-xs text-[#D6E6DE]">
          {planCardData.features.map((f: any) => (
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
        {isCurrent ? (
          <div className="w-full py-2.5 text-center rounded-xl bg-[#16241E] border border-[#1E2F28] text-xs font-semibold text-[#9AB0A5]">
            Current Active Plan
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="w-full py-2.5 px-4 rounded-xl border border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            {quote?.isDifferentialUpgrade
              ? `Get Advanced · Pay ${formatINR(quote.payableINR)}`
              : 'Get Advanced'}
          </button>
        )}
      </div>
    </div>
  );
};
