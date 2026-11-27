export type AnalyticsConsentStatus = 'unset' | 'granted' | 'denied';

export interface AnalyticsConsentRecord {
  status: 'granted' | 'denied';
  updatedAt: number;
  version: 1;
}

export type AnalyticsPrimitive = string | number | boolean;

export type AnalyticsEventParams = Record<string, AnalyticsPrimitive | undefined>;

export interface AnalyticsConfig {
  measurementId: string;
  isProduction: boolean;
  enabled: boolean;
}

export interface SanitizedPageData {
  pagePath: string;
  pageLocation: string;
  pageTitle: string;
  pageKey: string;
}

export type AuthAnalyticsMethod = 'google' | 'email';

export type FeatureLandingPath =
  | '/paper-trading-india'
  | '/ai-stock-screener'
  | '/guess-the-chart';

export interface FeatureCtaClickPayload {
  sourcePage: string;
  ctaId: string;
  destinationPath: string;
  placement: 'hero' | 'section' | 'final_cta';
}

export interface ProductNavigationPayload {
  sourcePage: string;
  targetPage: string;
  navLocation: 'homepage_section' | 'feature_related' | 'footer' | 'inline';
}

export interface PaperTradeActivityPayload {
  activityType:
    | 'order_submitted'
    | 'position_exit'
    | 'order_cancelled'
    | 'wallet_topup'
    | 'portfolio_reset'
    | 'watchlist_add'
    | 'watchlist_remove'
    | 'watchlist_created';
  productType?: 'delivery' | 'intraday' | 'mtf';
  orderType?: 'market' | 'limit' | 'sl' | 'sl_m';
  orderStatus?: string;
}

export interface ScreenerUsagePayload {
  screenerMode: 'swing' | 'intraday' | 'stock_analysis';
  action: 'scan_completed' | 'force_refresh' | 'signal_inspected' | 'analysis_completed' | 'view_mode_changed';
  trigger?: 'initial' | 'manual';
  viewMode?: 'simple' | 'advanced';
}

export interface ChartPatternLearningPayload {
  action: 'pattern_selected' | 'outcome_revealed' | 'variation_generated' | 'guide_opened';
  patternName?: string;
  patternCategory?: string;
  difficulty?: string;
  isLocked?: boolean;
}

export interface QuizCompletionPayload {
  quizMode: 'practice' | 'survival' | 'tournament' | 'landing_preview';
  completionScope: 'question' | 'session';
  difficulty?: string;
  isCorrect?: boolean;
  patternCategory?: string;
  roundsCompleted?: number;
  correctCount?: number;
  bestStreak?: number;
}

export interface SubscriptionCompletedPayload {
  planTier: 'beginner' | 'advanced';
  billingCycle: 'monthly' | 'yearly';
  paymentType?: 'subscription' | 'order';
  previousTier?: 'free' | 'beginner' | 'advanced';
}

export type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface ImportMetaEnv {
    readonly VITE_GA_MEASUREMENT_ID?: string;
  }

  interface Window {
    dataLayer?: Array<IArguments | Record<string, unknown>>;
    gtag?: GtagFunction;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }

  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}
