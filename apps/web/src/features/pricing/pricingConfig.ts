import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  ChartCandlestick,
  Gamepad2,
  ListChecks,
  Radar,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../lib/subscription';
import { formatLakhsWords } from '../../utils/pricing';
import {
  COMPARISON_CATEGORIES,
  PRICING_FAQS,
  type ComparisonCategory,
  type ComparisonCell,
  type ComparisonRow,
  type PricingFaqItem,
} from './pricingComparisonConfig';

export {
  COMPARISON_CATEGORIES,
  PRICING_FAQS,
  type ComparisonCategory,
  type ComparisonCell,
  type ComparisonRow,
  type PricingFaqItem,
};

export const PLAN_ORDER: SubscriptionTier[] = ['free', 'beginner', 'advanced'];

const { free: F, beginner: B, advanced: A } = SUBSCRIPTION_PLANS;

export interface PlanCardFeature {
  icon: LucideIcon;
  text: string;
}

export interface PlanCardContent {
  tier: SubscriptionTier;
  description: string;
  label?: string;
  inheritsFrom?: string;
  features: PlanCardFeature[];
}

export const PLAN_CARDS: Record<SubscriptionTier, PlanCardContent> = {
  free: {
    tier: 'free',
    description: 'Explore and learn at your own pace.',
    features: [
      { icon: Wallet, text: `${formatLakhsWords(F.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: 'Delivery (CNC) market orders' },
      { icon: Radar, text: `Top ${F.swingMaxSignals} backtested swing setups` },
      { icon: Sparkles, text: `${F.analysisDailyLimit} chart, technical & AI-powered stock analyses/day` },
      { icon: BookOpen, text: `${F.patternLibraryMaxFreePatterns} beginner chart patterns` },
      { icon: Gamepad2, text: `Guess the Chart · ${F.quizDailyLimit} questions/day` },
    ],
  },
  beginner: {
    tier: 'beginner',
    label: 'Recommended',
    description: 'For learners ready to practice more seriously.',
    inheritsFrom: 'Everything in Free, plus:',
    features: [
      { icon: Wallet, text: `${formatLakhsWords(B.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: '5x Intraday (MIS), MTF 5.00x, limit & after-market orders' },
      { icon: Radar, text: `Top ${B.swingMaxSignals} swing + ${B.intradayMaxSignals} intraday technical setups` },
      { icon: Sparkles, text: `${B.analysisDailyLimit} chart, technical & AI-powered analyses/day · 2-year backtests, levels & financials` },
      { icon: BookOpen, text: 'All 21 chart patterns unlocked' },
      { icon: Gamepad2, text: 'Unlimited quiz + Survival mode' },
      { icon: RotateCcw, text: `Free top-ups & resets up to ${formatLakhsWords(B.maxWalletLimit)}` },
    ],
  },
  advanced: {
    tier: 'advanced',
    label: 'For Advanced Traders',
    description: 'For active traders who want deeper tools and insights.',
    inheritsFrom: 'Everything in Beginner, plus:',
    features: [
      { icon: Wallet, text: `${formatLakhsWords(A.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: 'SL & SL-M stop-loss orders' },
      { icon: Radar, text: 'Full Nifty 500 backtested scan + live intraday refresh' },
      { icon: Sparkles, text: 'Unlimited chart, technical & AI-powered analysis + advanced backtest metrics' },
      { icon: BarChart3, text: 'Market depth (when supported by data feed)' },
      { icon: Gamepad2, text: '10-round single-player Challenge mode, all difficulties' },
      { icon: ListChecks, text: `Up to ${A.maxWatchlists} watchlists` },
    ],
  },
};
