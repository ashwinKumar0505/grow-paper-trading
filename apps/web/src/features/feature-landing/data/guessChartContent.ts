import type { FeatureLandingContent } from '../types';

export const GUESS_CHART_CONTENT: FeatureLandingContent = {
  route: '/guess-the-chart',
  breadcrumbLabel: 'Guess the Chart Quiz',
  eyebrow: 'Interactive Chart Pattern Quiz Arena',
  heroTitleStart: 'Guess the Chart.',
  heroTitleAccent: 'Master Candlestick Patterns by Doing.',
  heroDescription:
    'Turn passive reading into active skill with Tradedia’s stock market quiz. Study synthetic educational candlestick charts, predict whether price breaks up or down, reveal the next candles, and learn the trading logic behind every setup.',
  heroBullets: [
    '21 classic reversal, continuation & price-action setups',
    'Instant candle-by-candle outcome reveal & explanation',
    'Practice, 3-Life Survival & 10-Round Cash Challenge modes',
  ],
  illustration: {
    src: '/images/landing/interactive-learning.webp',
    alt: 'Tradedia Guess the Chart and interactive chart pattern learning illustration featuring candlestick patterns, quiz controls, and chart replay',
    glowVariant: 'indigo-emerald',
  },
  primaryCta: {
    label: 'Play Guess the Chart',
    href: '/quiz',
    ctaId: 'play_guess_the_chart',
  },
  secondaryCta: {
    label: 'Study 21 Chart Patterns Free',
    href: '/learn',
    ctaId: 'guess_chart_open_library',
  },
  whatIsTitle: 'What Is Guess the Chart?',
  whatIsParagraphs: [
    'Guess the Chart is Tradedia’s interactive technical analysis quiz designed to help learners recognize candlestick and chart patterns under realistic decision pressure. Instead of only memorizing static textbook diagrams, you inspect a developing setup, make a directional call, and immediately watch the follow-through candles unfold.',
    'Every scenario is procedurally generated as a synthetic educational chart based on 21 classic reversal, continuation, bilateral, and institutional price-action templates — paired with plain-English explanations, entry triggers, stop-loss levels, and target logic after each call.',
  ],
  featuresTitle: 'Quiz Modes, Difficulty Levels & Learning Tools',
  featuresSubtitle:
    'Start free with daily Beginner practice and unlock deeper quiz modes as your pattern reading improves.',
  features: [
    {
      title: 'Practice Mode (Free & Paid)',
      badge: 'Free: 5/Day · Paid: Unlimited',
      description:
        'Build pattern recognition one synthetic chart at a time with zero countdown pressure, live accuracy and streak counters, and detailed post-answer pattern lessons.',
    },
    {
      title: '3-Life Survival Mode',
      badge: 'Beginner & Advanced Plans',
      description:
        'Test consistency under pressure: you start with three lives, each wrong call costs one life, and consecutive correct reads build score combos toward your personal best.',
    },
    {
      title: '10-Round Cash Challenge',
      badge: 'Advanced Plan',
      description:
        'Single-player 10-round challenge with ₹10,000 separate challenge cash, dynamic position sizing per round, and a complete end-of-session scorecard.',
    },
    {
      title: '4 Structured Difficulty Levels',
      badge: 'Beginner to Mixed',
      description:
        'Progress from Beginner (clear shapes and trends, Free+) to Intermediate (Beginner+), Advanced (sharp institutional traps and sweeps), and Mixed Levels (Advanced).',
    },
    {
      title: 'Interactive Indicator & View Toggles',
      badge: 'EMA · SMA · Vol · RSI',
      description:
        'Switch between candlestick and line chart styles and toggle optional EMA 20, SMA 50, support/resistance levels, volume bars, and RSI momentum guides while studying setups.',
    },
    {
      title: 'Post-Answer Playbook & Performance Journal',
      badge: 'Learn Every Call',
      description:
        'Every question explains why the pattern worked, its entry trigger, stop-loss invalidation, and target rule — plus an Advanced Quiz Performance Journal tracking category win rates.',
    },
  ],
  stepsTitle: 'How the Interactive Candlestick Pattern Quiz Works',
  stepsSubtitle: 'Three quick steps to build sharper chart-reading instincts.',
  steps: [
    {
      step: '01',
      title: 'Inspect the Developing Chart Setup',
      description:
        'Study the candlestick structure, support and resistance zones, volume behavior, and optional moving average overlays before the breakout occurs.',
    },
    {
      step: '02',
      title: 'Predict UP (Buy) or DOWN (Sell)',
      description:
        'Commit to your read using the on-screen buttons or B / S keyboard shortcuts — building decision discipline instead of hindsight bias.',
    },
    {
      step: '03',
      title: 'Watch the Reveal & Review the Pattern Rules',
      description:
        'See the next 20 candles play out step by step, review whether your call matched the pattern bias, and learn the exact entry, stop-loss, and target rules.',
    },
  ],
  audienceTitle: 'Why Interactive Chart Pattern Learning Beats Passive Reading',
  audienceSubtitle: 'Active recall helps traders spot real structures faster when live markets move.',
  audience: [
    {
      title: 'Overcome Hindsight Bias',
      description:
        'Patterns always look obvious after the move finishes. Making a call before the right side of the chart appears trains real-time visual judgment.',
    },
    {
      title: 'Reinforce All 21 Core Patterns',
      description:
        'Revisit Double Tops, Double Bottoms, Head & Shoulders, Wedges, Rectangles, Pennants, Triangles, and liquidity traps across randomized variations.',
    },
    {
      title: 'Bridge Directly to Paper Trading',
      description:
        'Pair your pattern intuition from Guess the Chart with structured screening and risk-free execution on the Tradedia Paper Trading Desk.',
    },
  ],
  faqsTitle: 'Guess the Chart — Frequently Asked Questions',
  faqs: [
    {
      q: 'Can I try Guess the Chart before creating an account?',
      a: 'Yes. You can try up to 2 interactive synthetic chart challenges right on this page without signing in, and you can also study 8 foundational beginner chart patterns for free in the Learn Chart Patterns library with no login required.',
    },
    {
      q: 'Are Guess the Chart scenarios real historical stock charts?',
      a: 'No. Scenarios are procedurally generated synthetic educational charts modeled on 21 classic candlestick and price-action patterns so learners can practice clean setups repeatedly. They are strictly educational and do not predict real market outcomes.',
    },
    {
      q: 'What quiz limits apply on Free, Beginner, and Advanced plans?',
      a: 'Free Starter includes Practice Mode (Beginner difficulty, 5 questions/day). Beginner (₹299/mo) unlocks unlimited Practice, 3-Life Survival Mode, and Intermediate setups. Advanced (₹699/mo) adds the 10-Round Cash Challenge, Advanced & Mixed difficulties, and the Quiz Performance Journal.',
    },
    {
      q: 'Does Challenge Cash in the 10-Round Quiz affect my Paper Trading wallet?',
      a: 'No. The ₹10,000 challenge balance inside the 10-Round Cash Challenge is completely separate from your virtual paper trading portfolio on /trade.',
    },
  ],
  relatedLinks: [
    {
      href: '/learn',
      title: 'Learn Chart Patterns Library',
      description: 'Read step-by-step guides and interactive demonstrations for 21 classic candlestick and chart setups.',
      ctaLabel: 'Open Pattern Library',
    },
    {
      href: '/paper-trading-india',
      title: 'Paper Trading in India',
      description: 'Apply your chart-reading instincts on NSE stocks using ₹1L–₹50L in virtual capital.',
      ctaLabel: 'Explore Paper Trading',
    },
    {
      href: '/ai-stock-screener',
      title: 'AI-Powered Stock Screener',
      description: 'Discover daily swing and 15-minute intraday setups across Nifty 500 using rule-based chart analysis.',
      ctaLabel: 'Explore AI Stock Screener',
    },
  ],
  finalCta: {
    title: 'Ready to Test Your Chart-Reading Instincts?',
    description:
      'Launch the Guess the Chart Arena with a free Tradedia account or study our free chart pattern guides first.',
    disclaimer:
      'Educational Disclaimer: Guess the Chart uses synthetic educational chart scenarios for pattern learning only. Recognizing chart patterns never guarantees future price movement, and nothing on Tradedia constitutes SEBI investment advice.',
  },
};
