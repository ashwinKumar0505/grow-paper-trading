import type { FeatureLandingContent } from '../types';

export const SCREENER_LANDING_CONTENT: FeatureLandingContent = {
  route: '/ai-stock-screener',
  breadcrumbLabel: 'AI-Powered Stock Screener',
  eyebrow: 'Nifty 500 Technical & AI-Assisted Research',
  heroTitleStart: 'AI-Powered Stock Screener',
  heroTitleAccent: 'for Indian Equities.',
  heroDescription:
    'Scan Nifty 500 stocks faster with rule-based technical indicators, 2-year historical strategy backtests, and AI-powered stock analysis — built to help Indian market learners study swing and intraday chart setups objectively.',
  heroBullets: [
    'Swing Scanner across Nifty 500 daily setups',
    '15-Min Intraday Scanner on top 100 liquid stocks',
    'AI-assisted Stock Analysis with 2-year backtests',
  ],
  illustration: {
    src: '/images/landing/stock-screener.webp',
    alt: 'Tradedia AI-Powered Stock Screener illustration showcasing Swing Trading, Intraday Signals, and Stock Analysis with confidence scores and backtest metrics',
    glowVariant: 'blue-cyan',
  },
  primaryCta: {
    label: 'Explore Stock Screener',
    href: '/screener',
    ctaId: 'explore_stock_screener',
  },
  secondaryCta: {
    label: 'See Screener Plan Limits',
    href: '/pricing',
    ctaId: 'screener_view_pricing',
  },
  whatIsTitle: 'What Is a Technical Stock Screener?',
  whatIsParagraphs: [
    'A stock screener filters hundreds of listed equities using objective price, volume, and indicator rules so you do not have to inspect 500 charts manually every evening. Instead of relying on tips or guesswork, a technical analysis stock screener surfaces stocks whose current chart structure matches repeatable historical conditions.',
    'Tradedia combines quantitative multi-indicator scoring, candlestick and breakout pattern detection, 2-year historical strategy backtests, and plain-English AI-powered commentary across Indian NSE stocks — strictly for educational research and chart study.',
  ],
  featuresTitle: 'Three Integrated Screening & Stock Analysis Modules',
  featuresSubtitle:
    'Each module inside Tradedia serves a distinct learning timeframe, with clear plan-level access tiers.',
  features: [
    {
      title: 'Swing Trading Stock Screener',
      badge: 'Daily EOD Candles',
      description:
        'Evaluates NSE stocks on daily closes for breakout, trend-following, and momentum setups with 0–100 confidence scores, Confirmed vs Watchlist states, and reference entry, target, and stop-loss levels. Free shows Top 3 previews; Beginner unlocks Top 15 (Nifty 200); Advanced unlocks all Nifty 500 + live force refresh.',
    },
    {
      title: '15-Min Intraday Stock Screener',
      badge: 'Top 100 Liquid NSE',
      description:
        'Scans the 100 most liquid NSE stocks on 15-minute candles during market hours (9:15 AM – 3:30 PM IST) using Session VWAP, EMA-9 pullbacks, opening range breakouts, and volume surges. Beginner unlocks Top 5 picks; Advanced unlocks full results with 5-minute auto-refresh.',
    },
    {
      title: 'AI Stock Analysis (Any Nifty 500 Symbol)',
      badge: 'Technical + Financials',
      description:
        'Search any Nifty 500 company for a confidence-scored technical outlook, weighted indicator readings, support and resistance levels, quarterly/annual financials, 2-year historical strategy backtests, and plain-English commentary. Includes 3/day on Free, 15/day on Beginner, and unlimited Advanced Mode on Advanced.',
    },
  ],
  stepsTitle: 'How Stock Screening Works on Tradedia',
  stepsSubtitle: 'A transparent, repeatable pipeline from raw NSE price history to plain-English study notes.',
  steps: [
    {
      step: '01',
      title: 'Multi-Indicator & Pattern Scanning',
      description:
        'The analytics engine computes moving averages, momentum oscillators, volatility squeezes, VWAP alignment, relative volume, and classical chart structures across NSE data.',
    },
    {
      step: '02',
      title: 'Confidence Scoring & Historical Backtesting',
      description:
        'Aligned technical checks are weighted into a 0–100 confidence score alongside reference risk-reward levels and 2-year historical strategy context.',
    },
    {
      step: '03',
      title: 'Plain-English Commentary & Paper Practice',
      description:
        'Review clear explanations for why a setup triggered, inspect company financials, and optionally test the setup risk-free on the Tradedia Paper Trading Desk.',
    },
  ],
  audienceTitle: 'How the Stock Screener Helps Market Learners',
  audienceSubtitle: 'Built to shorten the gap between reading indicator definitions and studying live Indian charts.',
  audience: [
    {
      title: 'Save Hours of Manual Chart Filtering',
      description:
        'Focus your study sessions on NSE stocks showing structured trends, consolidations, or breakouts instead of scrolling through 500 symbols blindly.',
    },
    {
      title: 'Understand Why Each Indicator Matters',
      description:
        'Every technical reading is paired with plain-English explanations and indicator weights so beginners learn how EMA, RSI, MACD, and VWAP work together.',
    },
    {
      title: 'Connect Research Directly to Paper Trading',
      description:
        'Paid Beginner and Advanced plans support one-click handoff from screened setups into the virtual trading desk so you can test execution discipline without real risk.',
    },
  ],
  faqsTitle: 'AI-Powered Stock Screener — Frequently Asked Questions',
  faqs: [
    {
      q: 'Are Tradedia screener signals buy/sell tips or SEBI investment advice?',
      a: 'No. Tradedia is not SEBI-registered and does not provide investment advice or guaranteed calls. All screener outputs, confidence scores, and AI-assisted technical notes are automated educational research based on historical price and volume rules.',
    },
    {
      q: 'Which Indian stocks and timeframes are supported?',
      a: 'The Swing Screener and Stock Analysis cover up to Nifty 500 NSE equities using daily candles (with 2-year historical strategy backtests on Beginner and Advanced). The Intraday Screener monitors the top 100 liquid NSE stocks on 15-minute candles during market hours.',
    },
    {
      q: 'What is included on the Free plan versus Beginner and Advanced?',
      a: 'Free accounts get Top 3 Swing Screener previews and 3 Simple-Mode Stock Analyses per day. Beginner (₹299/mo) unlocks Top 15 Nifty 200 swing setups, Top 5 intraday signals, and 15 analyses/day with financials and 2-year backtests. Advanced (₹699/mo) unlocks full Nifty 500 scans, 5-minute intraday auto-refresh, and unlimited Advanced Mode analyses.',
    },
    {
      q: 'Do historical strategy backtests guarantee future stock performance?',
      a: 'Never. Historical backtests show how fixed technical rules behaved on past NSE price series, but market regimes change and past accuracy never guarantees future results.',
    },
  ],
  relatedLinks: [
    {
      href: '/paper-trading-india',
      title: 'Paper Trading in India',
      description: 'Test screened swing and intraday setups using ₹1L–₹50L virtual capital before risking real money.',
      ctaLabel: 'Explore Paper Trading',
    },
    {
      href: '/learn',
      title: 'Learn Chart Patterns Library',
      description: 'Master the exact reversal, continuation, and candlestick structures detected by technical screeners.',
      ctaLabel: 'Browse Chart Patterns',
    },
    {
      href: '/guess-the-chart',
      title: 'Guess the Chart Quiz',
      description: 'Train your visual chart recognition with interactive candlestick prediction challenges.',
      ctaLabel: 'Explore Guess the Chart',
    },
  ],
  finalCta: {
    title: 'Ready to Study Nifty 500 Charts with Objective Rules?',
    description:
      'Sign in with a free Tradedia account to preview the Swing Screener and run AI-assisted stock analysis on NSE stocks.',
    disclaimer:
      'SEBI & Research Disclaimer: Tradedia is an educational screening and technical analysis platform, not a SEBI-registered Research Analyst, Investment Adviser, or Stock Broker. Screener readings and historical backtests are informational only and never guarantee future returns.',
  },
};
