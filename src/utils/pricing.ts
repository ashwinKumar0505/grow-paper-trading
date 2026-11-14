import type { SubscriptionPlanConfig, SubscriptionTier } from '../lib/subscription';
import { tierRank } from '../lib/subscription';

export type PaidBillingCycle = 'monthly' | 'yearly';

/** Formats a rupee amount using the Indian numbering system (e.g. ₹10,00,000). */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Compact lakh label for virtual capital (100000 → "₹1L", 5000000 → "₹50L"). */
export function formatLakh(amount: number): string {
  return `₹${(amount / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
}

export interface PlanPriceView {
  /** Amount actually charged at checkout for the selected cycle. */
  charged: number;
  /** Billing period label for the charged amount. */
  periodLabel: string;
  /** Per-month equivalent when billed yearly (from plan configuration). */
  monthlyEquivalent: number | null;
  /** Rupees saved per year by paying yearly instead of 12 × monthly. 0 when no genuine saving. */
  yearlySavings: number;
  /** Whole-number saving percentage (floored so it is never overstated). */
  yearlySavingsPercent: number;
}

/** Derives the displayed price for a plan. Values come only from SUBSCRIPTION_PLANS. */
export function getPlanPriceView(plan: SubscriptionPlanConfig, cycle: PaidBillingCycle): PlanPriceView {
  const fullYearAtMonthly = plan.monthlyPrice * 12;
  const yearlySavings = Math.max(0, fullYearAtMonthly - plan.yearlyPrice);
  const yearlySavingsPercent =
    fullYearAtMonthly > 0 ? Math.floor((yearlySavings / fullYearAtMonthly) * 100) : 0;

  if (plan.monthlyPrice === 0 && plan.yearlyPrice === 0) {
    return { charged: 0, periodLabel: 'forever', monthlyEquivalent: null, yearlySavings: 0, yearlySavingsPercent: 0 };
  }

  if (cycle === 'yearly') {
    return {
      charged: plan.yearlyPrice,
      periodLabel: '/ year',
      monthlyEquivalent: plan.yearlyMonthlyEquivalent,
      yearlySavings,
      yearlySavingsPercent,
    };
  }

  return { charged: plan.monthlyPrice, periodLabel: '/ month', monthlyEquivalent: null, yearlySavings, yearlySavingsPercent };
}

/** Highest genuine yearly saving across plans, used by the billing toggle badge. */
export function getMaxYearlySavingsPercent(plans: SubscriptionPlanConfig[]): number {
  return plans.reduce((max, plan) => Math.max(max, getPlanPriceView(plan, 'yearly').yearlySavingsPercent), 0);
}

export type PlanCtaState =
  | 'signup' // logged out
  | 'active' // user's current, unexpired plan
  | 'renew' // user's current plan whose paid period has ended
  | 'included' // a lower tier already covered by the user's plan
  | 'open-desk' // free card shown to a logged-in paid user (free features are already included)
  | 'upgrade'; // a higher paid tier

export interface UpgradeAmountQuote {
  /** Final amount to charge at checkout. */
  payableINR: number;
  /** Standard full price for the target plan & cycle. */
  fullPriceINR: number;
  /** Credit deducted when upgrading from an active Beginner plan to Advanced. */
  creditAppliedINR: number;
  /** Whether a Beginner → Advanced differential discount was applied. */
  isDifferentialUpgrade: boolean;
}

/**
 * Calculates the amount payable for a target plan, applying the Beginner → Advanced
 * differential price (Advanced − Beginner) when the user is currently on Beginner.
 */
export function getUpgradeAmountQuote(params: {
  targetTier: 'beginner' | 'advanced';
  billingCycle: PaidBillingCycle;
  currentTier?: SubscriptionTier;
  plans: Record<SubscriptionTier, SubscriptionPlanConfig>;
}): UpgradeAmountQuote {
  const { targetTier, billingCycle, currentTier = 'free', plans } = params;
  const targetPlan = plans[targetTier];
  const fullPriceINR = billingCycle === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice;

  if (targetTier === 'advanced' && currentTier === 'beginner') {
    const beginnerPlan = plans.beginner;
    const creditAppliedINR = billingCycle === 'yearly' ? beginnerPlan.yearlyPrice : beginnerPlan.monthlyPrice;
    const payableINR = Math.max(0, fullPriceINR - creditAppliedINR);
    return {
      payableINR,
      fullPriceINR,
      creditAppliedINR,
      isDifferentialUpgrade: true,
    };
  }

  return {
    payableINR: fullPriceINR,
    fullPriceINR,
    creditAppliedINR: 0,
    isDifferentialUpgrade: false,
  };
}

/**
 * Decides which call-to-action a plan card should show. Pure UI state; payment
 * amounts are always resolved server-side by /api/payments/create-order.
 */
export function getPlanCtaState(params: {
  cardTier: SubscriptionTier;
  isLoggedIn: boolean;
  userTier: SubscriptionTier;
  expiresAt?: number | null;
  now?: number;
}): PlanCtaState {
  const { cardTier, isLoggedIn, userTier, expiresAt, now = Date.now() } = params;
  if (!isLoggedIn) return 'signup';

  if (cardTier === userTier) {
    const expired = cardTier !== 'free' && typeof expiresAt === 'number' && expiresAt > 0 && expiresAt < now;
    return expired ? 'renew' : 'active';
  }

  if (cardTier === 'free') return 'open-desk';
  return tierRank(cardTier) < tierRank(userTier) ? 'included' : 'upgrade';
}
