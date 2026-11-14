/**
 * Presentation content for the /pricing page.
 *
 * Every limit shown here is derived from SUBSCRIPTION_PLANS (src/lib/subscription.ts),
 * which is the same configuration used for feature gating. Only wording lives here.
 */
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
import { formatINR, formatLakh } from '../../utils/pricing';

export const PLAN_ORDER: SubscriptionTier[] = ['free', 'beginner', 'advanced'];

const { free: F, beginner: B, advanced: A } = SUBSCRIPTION_PLANS;
const UNLIMITED_THRESHOLD = 999;
const limit = (n: number, unit: string) => (n >= UNLIMITED_THRESHOLD ? 'Unlimited' : `${n} ${unit}`);

/* ------------------------------------------------------------------ */
/* Plan cards                                                          */
/* ------------------------------------------------------------------ */

export interface PlanCardFeature {
  icon: LucideIcon;
  text: string;
}

export interface PlanCardContent {
  tier: SubscriptionTier;
  description: string;
  label?: string; // badge above the card
  inheritsFrom?: string; // "Everything in X, plus:"
  features: PlanCardFeature[];
}

export const PLAN_CARDS: Record<SubscriptionTier, PlanCardContent> = {
  free: {
    tier: 'free',
    description: 'Explore and learn at your own pace.',
    features: [
      { icon: Wallet, text: `${formatINR(F.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: 'Delivery (CNC) market orders' },
      { icon: Radar, text: `Top ${F.swingMaxSignals} backtested swing setups` },
      { icon: Sparkles, text: `${F.analysisDailyLimit} chart & AI stock analyses/day` },
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
      { icon: Wallet, text: `${formatINR(B.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: '5x Intraday (MIS), MTF 5.00x & limit orders' },
      { icon: Radar, text: `Top ${B.swingMaxSignals} swing + ${B.intradayMaxSignals} intraday strategy picks` },
      { icon: Sparkles, text: `${B.analysisDailyLimit} analyses/day · 2-year backtests, levels & financials` },
      { icon: BookOpen, text: 'All 28+ chart patterns unlocked' },
      { icon: Gamepad2, text: 'Unlimited quiz + Survival mode' },
      { icon: RotateCcw, text: `Free top-ups & resets up to ${formatLakh(B.maxWalletLimit)}` },
    ],
  },
  advanced: {
    tier: 'advanced',
    label: 'For Advanced Traders',
    description: 'For active traders who want deeper tools and insights.',
    inheritsFrom: 'Everything in Beginner, plus:',
    features: [
      { icon: Wallet, text: `${formatINR(A.defaultStartingCash)} virtual capital` },
      { icon: ChartCandlestick, text: 'SL, SL-M & after-market orders' },
      { icon: Radar, text: 'Full Nifty 500 backtested scan + live intraday refresh' },
      { icon: Sparkles, text: 'Unlimited chart & AI analysis + 5-year strategy backtests' },
      { icon: BarChart3, text: '5-level market depth' },
      { icon: Gamepad2, text: '10-round Challenge mode, all difficulties' },
      { icon: ListChecks, text: `Up to ${A.maxWatchlists} watchlists` },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Comparison matrix                                                   */
/* ------------------------------------------------------------------ */

/** `true` renders a check, `false` renders "not included", strings render as-is. */
export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  feature: string;
  tooltip?: string;
  values: Record<SubscriptionTier, ComparisonCell>;
}

export interface ComparisonCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  rows: ComparisonRow[];
}

const byTier = (fn: (tier: SubscriptionTier) => ComparisonCell): Record<SubscriptionTier, ComparisonCell> => ({
  free: fn('free'),
  beginner: fn('beginner'),
  advanced: fn('advanced'),
});
const plan = (t: SubscriptionTier) => SUBSCRIPTION_PLANS[t];
const ORDER_TYPE_LABEL: Record<string, string> = { MARKET: 'Market', LIMIT: 'Limit', SL: 'SL', 'SL-M': 'SL-M' };

export const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    id: 'screener',
    title: 'AI Stock Screener & Backtests',
    icon: Radar,
    rows: [
      {
        feature: 'Swing screener (backtested strategies)',
        tooltip: 'Daily scan for multi-day breakout, trend and momentum setups with entry, target and stop-loss levels.',
        values: { free: `Top ${F.swingMaxSignals} preview`, beginner: `Top ${B.swingMaxSignals} · Nifty 200`, advanced: 'Full Nifty 500 + live refresh' },
      },
      {
        feature: '15-min intraday screener',
        values: {
          free: false,
          beginner: `Top ${B.intradayMaxSignals} · manual refresh`,
          advanced: `Top ${A.intradayMaxSignals} · 5-min auto-refresh`,
        },
      },
      {
        feature: 'Chart, strategy & AI stock analysis',
        tooltip: 'Combines technical chart structure, backtested strategy rules and an AI commentary layer.',
        values: byTier((t) => limit(plan(t).analysisDailyLimit, 'per day')),
      },
      {
        feature: 'Support/resistance & financials',
        values: byTier((t) => plan(t).analysisAllowFinancialsAndLevels),
      },
      {
        feature: 'Historical strategy backtesting',
        tooltip: 'Replays rule-based strategies on historical price data (2 years on Beginner, up to 5 years with advanced mode on Advanced). Past results do not predict future returns.',
        values: {
          free: 'Summary view',
          beginner: '2-year backtested strategies',
          advanced: '5-year backtests & advanced mode',
        },
      },
      {
        feature: 'One-click trade from screener',
        values: { free: false, beginner: 'Swing setups', advanced: 'Swing + intraday' },
      },
    ],
  },
  {
    id: 'paper-trading',
    title: 'Paper Trading & Virtual Capital',
    icon: Wallet,
    rows: [
      {
        feature: 'Virtual capital',
        tooltip: 'Simulated money for practice trades. It has no cash value and cannot be withdrawn.',
        values: byTier((t) => formatINR(plan(t).defaultStartingCash)),
      },
      { feature: 'Automatic monthly reset', values: byTier((t) => `To ${formatLakh(plan(t).defaultStartingCash)}`) },
      {
        feature: 'Capital top-ups',
        values: { free: '₹50 per +₹1L', beginner: `Free, up to ${formatLakh(B.maxWalletLimit)}`, advanced: `Free, up to ${formatLakh(A.maxWalletLimit)}` },
      },
      { feature: 'Manual portfolio reset', values: byTier((t) => (plan(t).allowUnlimitedWalletResets ? 'Unlimited' : false)) },
      {
        feature: '5x Intraday (MIS) & MTF 5.00x',
        tooltip: 'Intraday (MIS) uses 5x leverage and auto squares off at 3:20 PM IST. MTF 5.00x lets you pay 20% margin and carry delivery holdings forward.',
        values: byTier((t) => plan(t).allowIntradayTrading),
      },
      {
        feature: 'Order types',
        tooltip: 'SL and SL-M are stop-loss orders that trigger at a set price, as a limit (SL) or market (SL-M) order.',
        values: byTier((t) => plan(t).allowedOrderTypes.map((o) => ORDER_TYPE_LABEL[o]).join(', ')),
      },
      {
        feature: 'After-market orders (AMO)',
        tooltip: 'Orders placed outside market hours that are queued for the next session.',
        values: byTier((t) => plan(t).allowAmoOrders),
      },
    ],
  },
  {
    id: 'learn',
    title: 'Learn Charts & Guess the Chart',
    icon: BookOpen,
    rows: [
      {
        feature: 'Pattern library',
        values: byTier((t) => (plan(t).patternLibraryMaxFreePatterns >= UNLIMITED_THRESHOLD ? 'All 28+ patterns' : `${plan(t).patternLibraryMaxFreePatterns} patterns`)),
      },
      { feature: 'Indicator overlays & variations', values: byTier((t) => plan(t).patternLibraryAllowAllIndicators && plan(t).patternLibraryAllowVariations) },
      { feature: 'Guess the Chart questions', values: byTier((t) => limit(plan(t).quizDailyLimit, 'per day')) },
      { feature: 'Game modes', values: { free: 'Practice', beginner: 'Practice, Survival', advanced: 'Practice, Survival, Challenge' } },
      {
        feature: 'Difficulty levels',
        values: { free: 'Beginner', beginner: 'Beginner, Intermediate', advanced: 'All levels' },
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Portfolio & Trading Analytics',
    icon: BarChart3,
    rows: [
      { feature: 'Holdings & P&L', values: { free: 'Holdings & open P&L', beginner: '+ Intraday & realized P&L', advanced: 'Full P&L' } },
      {
        feature: 'Charges breakdown',
        tooltip: 'Itemised brokerage, STT, exchange, SEBI and GST charges on each simulated order.',
        values: byTier((t) => plan(t).allowDetailedChargesBreakdown),
      },
      {
        feature: 'Market depth',
        tooltip: 'Top 5 bid and ask price levels with quantities.',
        values: byTier((t) => plan(t).allowMarketDepth),
      },
    ],
  },
  {
    id: 'premium',
    title: 'Additional Premium Features',
    icon: ListChecks,
    rows: [
      { feature: 'Watchlists', values: byTier((t) => `${plan(t).maxWatchlists} × ${plan(t).maxStocksPerWatchlist} stocks`) },
      { feature: 'Force-refresh live screener data', values: byTier((t) => plan(t).swingAllowForceRefresh) },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

export interface PricingFaqItem {
  q: string;
  a: string;
}

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    q: 'How does virtual trading work on NiftyLens?',
    a: 'You place simulated buy and sell orders on NSE stocks using virtual capital. No real money is invested, and simulated profits or losses cannot be withdrawn. The order types and products available depend on your plan.',
  },
  {
    q: 'How do virtual capital resets and top-ups work?',
    a: `At the start of each calendar month your balance is automatically reset to your plan's capital: ${formatINR(F.defaultStartingCash)} on Free, ${formatINR(B.defaultStartingCash)} on Beginner and ${formatINR(A.defaultStartingCash)} on Advanced. Free users can add +₹1,00,000 for ₹50 but cannot reset manually. Beginner and Advanced include free top-ups up to the plan limit and unlimited manual resets.`,
  },
  {
    q: 'What is included in each subscription?',
    a: 'Each plan unlocks a different level of the Stock Screener, Paper Trading Desk and Learn & Quiz modules. The "Compare Plans in Detail" table above lists the exact limits for every feature.',
  },
  {
    q: 'Can I upgrade or change my plan?',
    a: 'Yes. You can upgrade from Free to Beginner or Advanced, or from Beginner to Advanced, on this page. The upgrade activates after your Razorpay payment is verified, and your virtual balance is raised to the new plan\u2019s capital if it is currently lower.',
  },
  {
    q: 'What happens when my subscription expires?',
    a: 'Paid plans are one-time payments and do not auto-renew, so you are never charged automatically. A monthly purchase covers 30 days and a yearly purchase covers 365 days from activation. Your validity date is shown on your active plan card, and a Renew option appears there once the period has ended.',
  },
];
