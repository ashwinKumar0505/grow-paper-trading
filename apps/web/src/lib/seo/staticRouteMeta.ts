import type { FeatureLandingRoute } from '../../features/feature-landing/types';
import { BRAND_NAME } from './constants';

export type LegalRouteKey = 'terms' | 'privacy' | 'refund-policy' | 'disclaimer' | 'contact';

export const FEATURE_LANDING_META: Record<
  FeatureLandingRoute,
  { label: string; title: string; description: string; keywords: string; ogImageAlt: string }
> = {
  '/paper-trading-india': {
    label: 'Paper Trading India',
    title: `Paper Trading in India – Virtual Stock Trading Simulator | ${BRAND_NAME}`,
    description:
      "Practise stock trading with virtual money on Tradedia, India's paper trading platform. Start free with ₹1,00,000 virtual capital and realistic NSE charges.",
    keywords:
      'paper trading India, paper trading platform, virtual stock trading, stock market simulator, paper trading for beginners, practise stock trading with virtual money, Tradedia',
    ogImageAlt: `${BRAND_NAME} Paper Trading platform for Indian stocks`,
  },
  '/ai-stock-screener': {
    label: 'AI-Powered Stock Screener',
    title: `AI-Powered Stock Screener India – Swing, Intraday & Analysis | ${BRAND_NAME}`,
    description:
      "Scan Nifty 500 stocks with Tradedia's AI-powered stock screener for India. Study swing setups, 15-minute intraday signals, indicators, and 2-year backtests.",
    keywords:
      'AI-powered stock screener, stock screener India, technical analysis stock screener, swing trading stock screener, intraday stock screener, AI stock analysis, Tradedia',
    ogImageAlt: `${BRAND_NAME} AI-Powered Stock Screener for NSE equities`,
  },
  '/guess-the-chart': {
    label: 'Guess the Chart Quiz',
    title: `Guess the Chart – Interactive Candlestick & Chart Pattern Quiz | ${BRAND_NAME}`,
    description:
      "Test your instincts with Tradedia's Guess the Chart stock market quiz. Practice 21 candlestick and chart patterns interactively with instant reveals and rules.",
    keywords:
      'Guess the Chart, stock market quiz, chart pattern quiz, candlestick pattern quiz, technical analysis quiz, interactive chart pattern learning, Tradedia',
    ogImageAlt: `${BRAND_NAME} Guess the Chart interactive candlestick pattern quiz`,
  },
};

export const CORE_KEYWORDS =
  'Tradedia, paper trading in India, virtual trading India, AI-powered stock screener, NSE stock screener, learn chart patterns, candlestick patterns, Nifty 500 analysis';

export const PUBLIC_PAGE_COPY = {
  home: {
    title: `${BRAND_NAME} – Paper Trading in India, AI-Powered Stock Screener & Chart Patterns`,
    description:
      'Practice paper trading in India with virtual capital, scan Nifty 500 stocks using the Tradedia AI-powered stock screener, and learn chart patterns interactively.',
    keywords: CORE_KEYWORDS,
  },
  learnHub: {
    title: `Learn Chart Patterns – 21 Candlestick & Price Action Guides | ${BRAND_NAME}`,
    description:
      'Learn chart patterns with the Tradedia interactive library. Study 21 reversal, continuation, bilateral, and candlestick setups with entry, stop-loss, and target rules.',
    keywords:
      'learn chart patterns, candlestick pattern library, reversal patterns, continuation patterns, price action guide India, Tradedia',
    ogImageAlt: `Learn Chart Patterns on ${BRAND_NAME}`,
  },
  pricing: {
    title: `Pricing & Plans – Paper Trading & AI Stock Screener | ${BRAND_NAME}`,
    description:
      'Compare Tradedia Free, Beginner, and Advanced plans for virtual paper trading in India, AI-powered Nifty 500 stock screening, and interactive chart pattern lessons.',
    keywords:
      'Tradedia pricing, paper trading app India plans, AI stock screener subscription, virtual trading India, chart pattern library',
    ogImageAlt: `${BRAND_NAME} Pricing & Membership Plans`,
  },
} as const;

export const LEGAL_META: Record<
  LegalRouteKey,
  { label: string; title: string; description: string }
> = {
  terms: {
    label: 'Terms of Service',
    title: `Terms of Service | ${BRAND_NAME}`,
    description:
      'Read Tradedia Terms of Service for educational paper trading in India, AI-powered stock screening tools, subscriptions, and Indian law disclosures.',
  },
  privacy: {
    label: 'Privacy Policy',
    title: `Privacy Policy | ${BRAND_NAME}`,
    description:
      'Learn how Tradedia collects, stores, and protects your account, virtual trading simulation data, Razorpay payment metadata, and consent-based analytics.',
  },
  'refund-policy': {
    label: 'Cancellation & Refund Policy',
    title: `Cancellation & Refund Policy | ${BRAND_NAME}`,
    description:
      'Review Tradedia subscription cancellation rules, 7-day first-time refund eligibility window, and Razorpay refund processing timelines.',
  },
  disclaimer: {
    label: 'SEBI & Market Risk Disclaimer',
    title: `SEBI & Market Risk Disclaimer | ${BRAND_NAME}`,
    description:
      'Statutory SEBI and market risk disclosures for Tradedia. Tradedia is an educational paper trading and chart learning platform, not a SEBI-registered adviser.',
  },
  contact: {
    label: 'Contact & Support',
    title: `Contact & Support | ${BRAND_NAME}`,
    description:
      'Contact Tradedia customer support, billing assistance, and our compliance team in Bengaluru, India for account or subscription questions.',
  },
};

export interface AuthGatedRouteMeta {
  title: string;
  description: string;
  robots: 'noindex, follow' | 'noindex, nofollow';
}

export const AUTH_GATED_META: Record<string, AuthGatedRouteMeta> = {
  '/trade': {
    title: `Paper Trading Desk | ${BRAND_NAME}`,
    description:
      'Sign in to Tradedia to practice risk-free virtual paper trading on NSE stocks with Delivery (CNC) and 5x Intraday (MIS) orders.',
    robots: 'noindex, follow',
  },
  '/screener': {
    title: `AI-Powered Swing Stock Screener | ${BRAND_NAME}`,
    description:
      'Sign in to scan Nifty 500 equities with Tradedia AI-powered swing trading strategies, technical scores, and 2-year historical backtests.',
    robots: 'noindex, follow',
  },
  '/screener/intraday': {
    title: `Intraday Stock Screener | ${BRAND_NAME}`,
    description:
      'Sign in to view 15-minute intraday stock setups and live technical signals across top liquid NSE stocks on Tradedia.',
    robots: 'noindex, follow',
  },
  '/screener/analysis': {
    title: `Stock Analysis & Backtesting | ${BRAND_NAME}`,
    description:
      'Sign in to run AI-powered technical analysis, financials, support/resistance levels, and 2-year strategy backtests on any Nifty 500 stock.',
    robots: 'noindex, follow',
  },
  '/quiz': {
    title: `Guess the Chart Quiz | ${BRAND_NAME}`,
    description:
      'Sign in to sharpen your candlestick and chart pattern reading skills in Tradedia Guess the Chart practice, survival, and challenge modes.',
    robots: 'noindex, follow',
  },
  '/quiz/play': {
    title: `Guess the Chart Arena | ${BRAND_NAME}`,
    description:
      'Sign in to play Guess the Chart on Tradedia and test your chart pattern recognition skills.',
    robots: 'noindex, follow',
  },
  '/profile': {
    title: `My Profile & Subscription | ${BRAND_NAME}`,
    description: 'Manage your Tradedia account, virtual capital limits, and subscription billing.',
    robots: 'noindex, nofollow',
  },
};
