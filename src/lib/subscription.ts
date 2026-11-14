export type SubscriptionTier = 'free' | 'beginner' | 'advanced';
export type BillingCycle = 'free' | 'monthly' | 'yearly';

export interface SubscriptionPlanConfig {
  id: SubscriptionTier;
  name: string;
  badge: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number; // total per year
  yearlyMonthlyEquivalent: number;
  maxWalletLimit: number;
  defaultStartingCash: number;
  maxWatchlists: number;
  maxStocksPerWatchlist: number;
  swingMaxSignals: number; // 3 for free, 15 for beginner, 500 for advanced
  swingAllowForceRefresh: boolean;
  intradayAccess: 'locked' | 'limited' | 'full';
  intradayMaxSignals: number; // 0 for free, 5 for beginner, 100 for advanced
  intradayAutoRefresh: boolean;
  analysisDailyLimit: number; // 3 for free, 15 for beginner, 999999 for advanced
  analysisAllowAdvancedMode: boolean; // Advanced mode + 2Y backtest
  analysisAllowFinancialsAndLevels: boolean; // Support/Resistance + Financials
  allowOneClickTradeFromScreener: 'none' | 'swing' | 'all';
  allowIntradayTrading: boolean; // 5x MIS in Paper Trading
  allowedOrderTypes: ('MARKET' | 'LIMIT' | 'SL' | 'SL-M')[];
  allowAmoOrders: boolean;
  allowMarketDepth: boolean;
  allowDetailedChargesBreakdown: boolean;
  allowUnlimitedWalletResets: boolean;
  patternLibraryMaxFreePatterns: number; // 8 for free, 999 for beginner/advanced
  patternLibraryAllowAllIndicators: boolean; // SMA50, RSI
  patternLibraryAllowVariations: boolean;
  quizDailyLimit: number; // 5 for free, 999999 for beginner/advanced
  quizAllowedModes: ('quiz' | 'survival' | 'tournament')[];
  quizAllowedDifficulties: ('Beginner' | 'Intermediate' | 'Advanced' | 'All')[];
  quizAllowHistoryDrawer: boolean;
  highlights: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlanConfig> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    badge: 'FREE FOREVER',
    tagline: 'Essential tools to explore Indian stocks, learn core patterns, and place delivery paper trades with ₹1 Lakh capital.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    maxWalletLimit: 100000, // ₹1,00,000 (1L)
    defaultStartingCash: 100000,
    maxWatchlists: 1,
    maxStocksPerWatchlist: 10,
    swingMaxSignals: 3,
    swingAllowForceRefresh: false,
    intradayAccess: 'locked',
    intradayMaxSignals: 0,
    intradayAutoRefresh: false,
    analysisDailyLimit: 3,
    analysisAllowAdvancedMode: false,
    analysisAllowFinancialsAndLevels: false,
    allowOneClickTradeFromScreener: 'none',
    allowIntradayTrading: false,
    allowedOrderTypes: ['MARKET'],
    allowAmoOrders: false,
    allowMarketDepth: false,
    allowDetailedChargesBreakdown: false,
    allowUnlimitedWalletResets: false,
    patternLibraryMaxFreePatterns: 8,
    patternLibraryAllowAllIndicators: false,
    patternLibraryAllowVariations: false,
    quizDailyLimit: 5,
    quizAllowedModes: ['quiz'],
    quizAllowedDifficulties: ['Beginner'],
    quizAllowHistoryDrawer: false,
    highlights: [
      '₹1,00,000 (1L) Virtual Capital + Auto Monthly Reset',
      'Optional +₹1,00,000 Wallet Top-Up for ₹50',
      'Delivery (CNC) Market Orders',
      'Top 3 Backtested Swing Screener Signals Preview',
      '3 Chart, Strategy & AI Stock Analyses / Day (Simple Mode)',
      '8 Beginner Candlestick Patterns in Library',
      'Guess the Chart Practice Mode (5 Questions / Day)',
      '1 Watchlist (up to 10 stocks)',
    ],
  },
  beginner: {
    id: 'beginner',
    name: 'Beginner Package',
    badge: 'MOST POPULAR',
    tagline: 'Built for developing swing & intraday traders who want ₹10 Lakhs capital, 5x MIS leverage, and deeper scans.',
    monthlyPrice: 299,
    yearlyPrice: 2899,
    yearlyMonthlyEquivalent: 242,
    maxWalletLimit: 1000000, // ₹10,00,000 (10L)
    defaultStartingCash: 1000000,
    maxWatchlists: 3,
    maxStocksPerWatchlist: 25,
    swingMaxSignals: 15,
    swingAllowForceRefresh: false,
    intradayAccess: 'limited',
    intradayMaxSignals: 5,
    intradayAutoRefresh: false,
    analysisDailyLimit: 15,
    analysisAllowAdvancedMode: false,
    analysisAllowFinancialsAndLevels: true,
    allowOneClickTradeFromScreener: 'swing',
    allowIntradayTrading: true,
    allowedOrderTypes: ['MARKET', 'LIMIT'],
    allowAmoOrders: false,
    allowMarketDepth: false,
    allowDetailedChargesBreakdown: true,
    allowUnlimitedWalletResets: true,
    patternLibraryMaxFreePatterns: 999,
    patternLibraryAllowAllIndicators: true,
    patternLibraryAllowVariations: true,
    quizDailyLimit: 999999,
    quizAllowedModes: ['quiz', 'survival'],
    quizAllowedDifficulties: ['Beginner', 'Intermediate'],
    quizAllowHistoryDrawer: false,
    highlights: [
      '₹10,00,000 (10L) Virtual Capital + Auto Monthly 10L Reset',
      'Unlimited Free Top-Ups (up to ₹10L Cap) & Unlimited Resets',
      'Delivery (CNC) + 5x Intraday (MIS) + MTF 5.00x Leverage',
      'Market & Limit Orders + Statutory Charges Breakdown',
      'Nifty 200 Swing Screener (Top 15 Backtested Setups) + 1-Click Trade',
      '15-Min Intraday Screener (Top 5 Strategy Picks / Session)',
      '15 Chart & AI Stock Analyses / Day + 2-Year Backtests, Levels & Financials',
      'All 28+ Interactive Chart Patterns Unlocked',
      'Unlimited Practice + 3-Life Survival Quiz (Beginner & Intermediate)',
    ],
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced Package',
    badge: 'PRO TRADER',
    tagline: 'Complete institutional-style workspace: full Nifty 500 scans, 5-min live intraday auto-refresh, 5Y backtests & ₹50L capital.',
    monthlyPrice: 699,
    yearlyPrice: 6699,
    yearlyMonthlyEquivalent: 558,
    maxWalletLimit: 5000000, // ₹50,00,000 (50L)
    defaultStartingCash: 5000000,
    maxWatchlists: 50,
    maxStocksPerWatchlist: 100,
    swingMaxSignals: 500,
    swingAllowForceRefresh: true,
    intradayAccess: 'full',
    intradayMaxSignals: 100,
    intradayAutoRefresh: true,
    analysisDailyLimit: 999999,
    analysisAllowAdvancedMode: true,
    analysisAllowFinancialsAndLevels: true,
    allowOneClickTradeFromScreener: 'all',
    allowIntradayTrading: true,
    allowedOrderTypes: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
    allowAmoOrders: true,
    allowMarketDepth: true,
    allowDetailedChargesBreakdown: true,
    allowUnlimitedWalletResets: true,
    patternLibraryMaxFreePatterns: 999,
    patternLibraryAllowAllIndicators: true,
    patternLibraryAllowVariations: true,
    quizDailyLimit: 999999,
    quizAllowedModes: ['quiz', 'survival', 'tournament'],
    quizAllowedDifficulties: ['Beginner', 'Intermediate', 'Advanced', 'All'],
    quizAllowHistoryDrawer: true,
    highlights: [
      '₹50,00,000 (50L) Max Virtual Capital + Auto Monthly 50L Reset',
      'Unlimited Free Top-Ups (up to ₹50L Cap) & Unlimited Resets',
      'All Order Types: Market, Limit, SL, SL-M & After-Market Orders (AMO)',
      'Full 5-Level Market Depth + Detailed Brokerage, STT & GST Breakdowns',
      'Full Nifty 500 Backtested Swing Screener + Live Force Refresh Data',
      'Real-Time 5-Min Auto-Refresh Intraday Screener (All Top 100 Liquid)',
      'Unlimited Chart & AI Stock Analysis + Advanced Mode & 5-Year Strategy Backtests',
      'All 28+ Patterns + All Overlays (EMA 20, SMA 50, RSI) & Ticker Variations',
      '10-Round Cash Challenge Tournament Mode + All Quiz Difficulties',
    ],
  },
};

export interface UserUsageQuota {
  dateKey: string; // YYYY-MM-DD
  analysisSearchesCount: number;
  quizQuestionsCount: number;
  lastPortfolioResetMonth: string; // YYYY-MM
  portfolioResetsThisMonth: number;
  lastAutoResetMonth?: string; // YYYY-MM for automatic monthly balance reset
}

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeUsageQuota(raw?: Partial<UserUsageQuota> | null): UserUsageQuota {
  const today = getTodayKey();
  const month = getCurrentMonthKey();
  return {
    dateKey: today,
    analysisSearchesCount: raw?.dateKey === today ? (raw.analysisSearchesCount || 0) : 0,
    quizQuestionsCount: raw?.dateKey === today ? (raw.quizQuestionsCount || 0) : 0,
    lastPortfolioResetMonth: month,
    portfolioResetsThisMonth: raw?.lastPortfolioResetMonth === month ? (raw.portfolioResetsThisMonth || 0) : 0,
    lastAutoResetMonth: raw?.lastAutoResetMonth || month,
  };
}

export function tierRank(tier: SubscriptionTier): number {
  if (tier === 'advanced') return 3;
  if (tier === 'beginner') return 2;
  return 1;
}

export function hasTierAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return tierRank(userTier) >= tierRank(requiredTier);
}
