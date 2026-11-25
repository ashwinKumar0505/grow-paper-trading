import React from 'react';
import { ArrowRight, Check, Crown, Leaf, Loader2, Zap } from 'lucide-react';
import type { SubscriptionPlanConfig, SubscriptionTier } from '../../../lib/subscription';
import { formatINR, type PlanCtaState, type PlanPriceView } from '../../../utils/pricing';
import type { PlanCardContent } from '../pricingConfig';
import { accentText, btnGold, btnPrimary, btnSecondary, btnStatic, textMuted, textStrong } from '../pricingStyles';
import { PricingFeatureList } from './PricingFeatureList';

interface PricingCardProps {
  plan: SubscriptionPlanConfig;
  content: PlanCardContent;
  price: PlanPriceView;
  ctaState: PlanCtaState;
  /** Shown on the active card, e.g. "Yearly · valid until 14 Dec 2026". */
  activeNote?: string;
  /** Optional differential upgrade pricing when upgrading from Beginner to Advanced. */
  upgradeDifference?: {
    payableINR: number;
    creditAppliedINR: number;
  };
  isLoading: boolean;
  onSelect: (tier: SubscriptionTier, state: PlanCtaState) => void;
}

const TIER_STYLE: Record<SubscriptionTier, { card: string; icon: string; Icon: typeof Leaf }> = {
  free: {
    card: 'border-[#D9E4DE] dark:border-[#1E3128] bg-white dark:bg-[#0F1A15] hover:border-[#B8CCC2] dark:hover:border-[#2E4a3c] motion-safe:hover:-translate-y-1',
    icon: 'bg-[#00D09C]/10 text-[#00936E] dark:text-[#00D09C]',
    Icon: Leaf,
  },
  beginner: {
    card: 'border-[#00B386] dark:border-[#00D09C]/70 bg-white dark:bg-[#11211A] shadow-[0_12px_40px_-20px_rgba(0,208,156,0.45)] lg:-translate-y-2 lg:motion-safe:hover:-translate-y-3',
    icon: 'bg-[#00D09C] text-[#04261C]',
    Icon: Zap,
  },
  advanced: {
    card: 'border-amber-500/40 dark:border-amber-400/30 bg-white dark:bg-[#121A14] hover:border-amber-500/70 dark:hover:border-amber-400/55 motion-safe:hover:-translate-y-1',
    icon: 'bg-amber-400/15 text-amber-600 dark:text-amber-300',
    Icon: Crown,
  },
};

function ctaLabel(
  tier: SubscriptionTier,
  state: PlanCtaState,
  planName: string,
  upgradeDifference?: { payableINR: number; creditAppliedINR: number }
): string {
  const short = planName.replace(' Package', '');
  switch (state) {
    case 'active':
      return 'Your current plan';
    case 'included':
      return 'Included in your plan';
    case 'open-desk':
      return 'Open Trading Desk';
    case 'renew':
      return `Renew ${short}`;
    default:
      if (tier === 'free') return 'Get Started Free';
      if (tier === 'advanced') {
        return upgradeDifference
          ? `Get Advanced · Pay ${formatINR(upgradeDifference.payableINR)}`
          : 'Get Advanced';
      }
      return `Upgrade to ${short}`;
  }
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  content,
  price,
  ctaState,
  activeNote,
  upgradeDifference,
  isLoading,
  onSelect,
}) => {
  const { tier } = content;
  const style = TIER_STYLE[tier];
  const isStatic = ctaState === 'active' || ctaState === 'included';
  const btnClass = isStatic ? btnStatic : tier === 'beginner' ? btnPrimary : tier === 'advanced' ? btnGold : btnSecondary;
  const headingId = `plan-${tier}-title`;

  return (
    <article
      aria-labelledby={headingId}
      className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 transition-[border-color,transform] duration-200 ${style.card}`}
    >
      {content.label && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
            tier === 'beginner'
              ? 'bg-[#00B386] text-white dark:bg-[#00D09C] dark:text-[#04261C]'
              : 'border border-amber-500/40 bg-white text-amber-700 dark:border-amber-400/40 dark:bg-[#121A14] dark:text-amber-300'
          }`}
        >
          {content.label}
        </span>
      )}

      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
          <style.Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 id={headingId} className={`text-lg font-extrabold ${textStrong}`}>
            {plan.name}
          </h3>
          <p className={`mt-0.5 text-sm leading-snug ${textMuted}`}>{content.description}</p>
        </div>
      </div>

      {/* Price — fixed min-height keeps the three cards aligned */}
      <div className="mt-6 min-h-[88px] border-b border-[#E3ECE7] pb-5 dark:border-[#1E3128]">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {upgradeDifference ? (
            <>
              <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${textStrong}`}>
                {formatINR(upgradeDifference.payableINR)}
              </span>
              <span className={`text-base line-through tabular-nums ${textMuted}`}>
                {formatINR(price.charged)}
              </span>
              <span className={`text-sm font-semibold ${textMuted}`}>{price.periodLabel}</span>
            </>
          ) : (
            <>
              <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${textStrong}`}>
                {formatINR(price.charged)}
              </span>
              <span className={`text-sm font-semibold ${textMuted}`}>{price.periodLabel}</span>
            </>
          )}
        </div>
        <p className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${textMuted}`}>
          {tier === 'free' ? (
            'No payment required'
          ) : upgradeDifference ? (
            <span className="font-semibold text-amber-600 dark:text-amber-300">
              Pay only the difference ({formatINR(upgradeDifference.creditAppliedINR)} Beginner credit applied)
            </span>
          ) : price.monthlyEquivalent !== null ? (
            <>
              <span>≈ {formatINR(price.monthlyEquivalent)}/month, billed yearly</span>
              {price.yearlySavings > 0 && (
                <span className={`rounded-full bg-[#00D09C]/10 px-2 py-0.5 text-[11px] font-bold ${accentText}`}>
                  Save {formatINR(price.yearlySavings)}
                </span>
              )}
            </>
          ) : (
            'Billed monthly'
          )}
        </p>
      </div>

      <PricingFeatureList heading={content.inheritsFrom} features={content.features} accent={tier === 'advanced' ? 'gold' : 'green'} />

      <div className="mt-auto pt-6">
        <button
          type="button"
          className={`w-full ${btnClass}`}
          disabled={isStatic || isLoading}
          aria-disabled={isStatic || isLoading}
          aria-busy={isLoading}
          onClick={() => onSelect(tier, ctaState)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Opening secure checkout…
            </>
          ) : (
            <>
              {ctaState === 'active' && <Check className="h-4 w-4" aria-hidden="true" />}
              {ctaLabel(tier, ctaState, plan.name, upgradeDifference)}
              {!isStatic && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </>
          )}
        </button>
        {activeNote && <p className={`mt-2 text-center text-xs ${textMuted}`}>{activeNote}</p>}
      </div>
    </article>
  );
};
