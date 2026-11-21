import type { LucideIcon } from 'lucide-react';
import { BarChart3, BookOpen, ListChecks, Radar, Wallet } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../lib/subscription';
import { formatLakhsWords } from '../../utils/pricing';

const { free: F, beginner: B, advanced: A } = SUBSCRIPTION_PLANS;
const UNLIMITED_THRESHOLD = 999;
const limit = (n: number, unit: string) => (n >= UNLIMITED_THRESHOLD ? 'Unlimited' : `${n} ${unit}`);

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
    title: 'Rule-Based Stock Screener & Backtests',
    icon: Radar,
    rows: [
      {
        feature: 'Swing screener (backtested strategies)',
        tooltip: 'Daily scan for multi-day breakout, trend and momentum setups with entry, target and stop-loss levels.',
        values: { free: `Top ${F.swingMaxSignals} preview`, beginner: `Top ${B.swingMaxSignals} · Nifty 200`, advanced: 'Full Nifty 500 + live refresh' },
      },
      {
        feature: '15-min intraday screener',
        values: { free: false, beginner: `Top ${B.intradayMaxSignals} · manual refresh`, advanced: `Top ${A.intradayMaxSignals} · 5-min auto-refresh` },
      },
      {
        feature: 'Chart, strategy & technical stock analysis',
        tooltip: 'Combines technical chart structure, backtested strategy rules and rule-based quantitative commentary.',
        values: byTier((t) => limit(plan(t).analysisDailyLimit, 'per day')),
      },
      { feature: 'Support/resistance & financials', values: byTier((t) => plan(t).analysisAllowFinancialsAndLevels) },
      {
        feature: 'Historical strategy backtesting',
        tooltip: 'Replays rule-based strategies on 2-year historical price data (with full advanced indicator & risk diagnostics on Advanced). Past results do not predict future returns.',
        values: { free: 'Summary view', beginner: '2-year backtested strategies', advanced: '2-year backtests & advanced mode' },
      },
      { feature: 'One-click trade from screener', values: { free: false, beginner: 'Swing setups', advanced: 'Swing + intraday' } },
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
        values: byTier((t) => formatLakhsWords(plan(t).defaultStartingCash)),
      },
      { feature: 'Automatic monthly reset', values: byTier((t) => `To ${formatLakhsWords(plan(t).defaultStartingCash)}`) },
      {
        feature: 'Capital top-ups',
        values: { free: false, beginner: `Free, up to ${formatLakhsWords(B.maxWalletLimit)}`, advanced: `Free, up to ${formatLakhsWords(A.maxWalletLimit)}` },
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
        values: byTier((t) => (plan(t).patternLibraryMaxFreePatterns >= UNLIMITED_THRESHOLD ? 'All 21 patterns' : `${plan(t).patternLibraryMaxFreePatterns} patterns`)),
      },
      { feature: 'Indicator overlays & variations', values: byTier((t) => plan(t).patternLibraryAllowAllIndicators && plan(t).patternLibraryAllowVariations) },
      { feature: 'Guess the Chart questions', values: byTier((t) => limit(plan(t).quizDailyLimit, 'per day')) },
      { feature: 'Game modes', values: { free: 'Practice', beginner: 'Practice, Survival', advanced: 'Practice, Survival, 10-Round Challenge' } },
      { feature: 'Difficulty levels', values: { free: 'Beginner', beginner: 'Beginner, Intermediate', advanced: 'All levels' } },
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
        feature: 'Market depth (when supported by feed)',
        tooltip: 'Order book bid and ask levels when connected to a Level-2 market data provider.',
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

export interface PricingFaqItem {
  q: string;
  a: string;
}

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    q: 'How does paper trading work on Nifty Lens?',
    a: 'You place simulated buy and sell orders on NSE stocks using virtual capital. No real money is invested, and simulated profits or losses cannot be withdrawn. The order types and products available depend on your plan.',
  },
  {
    q: 'How do virtual capital resets and refills work?',
    a: `At the start of each calendar month your balance is automatically reset to your plan's capital: ${formatLakhsWords(F.defaultStartingCash)} on Free, ${formatLakhsWords(B.defaultStartingCash)} on Beginner and ${formatLakhsWords(A.defaultStartingCash)} on Advanced. Free accounts rely on the automatic monthly reset, while Beginner and Advanced subscriptions include free virtual refills up to the plan limit and unlimited manual resets.`,
  },
  {
    q: 'What is included in each subscription?',
    a: 'Each plan unlocks a different level of the Stock Screener, Paper Trading Desk and Learn & Quiz modules. The "Compare Plans in Detail" table above lists the exact limits for every feature.',
  },
  {
    q: 'Can I upgrade or change my plan?',
    a: 'Yes. You can upgrade from Free to Beginner or Advanced, or from Beginner to Advanced, on this page. Upgrading from Beginner to Advanced applies a flat tier price differential (Advanced price minus Beginner price for the selected billing cycle) and replaces your existing Beginner plan after payment verification.',
  },
  {
    q: 'How do subscription renewals and cancellations work?',
    a: 'Paid plans are recurring subscriptions billed automatically every month or year via Razorpay AutoPay until cancelled. You can cancel anytime from your Profile page—auto-renewal stops immediately, your paid features remain active until the end of your current billing period, and your account then moves to Free Starter.',
  },
];
