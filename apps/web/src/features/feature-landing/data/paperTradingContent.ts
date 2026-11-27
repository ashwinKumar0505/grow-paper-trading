import type { FeatureLandingContent } from '../types';

export const PAPER_TRADING_CONTENT: FeatureLandingContent = {
  route: '/paper-trading-india',
  breadcrumbLabel: 'Paper Trading India',
  eyebrow: 'Flagship NSE Paper Trading Platform',
  heroTitleStart: 'Paper Trading in India.',
  heroTitleAccent: 'Practise Risk-Free with Virtual Money.',
  heroDescription:
    'Tradedia is a dedicated stock market simulator built for Indian equity learners. Practise stock trading with virtual money across NSE stocks, test delivery and intraday strategies, and review realistic statutory charges without risking real capital.',
  heroBullets: [
    'Start free with ₹1,00,000 virtual capital',
    'Delivery (CNC), 5x Intraday (MIS) & MTF 5.00x',
    'Realistic NSE brokerage, STT & GST math',
  ],
  illustration: {
    src: '/images/landing/virtual-trading.webp',
    alt: 'Tradedia Paper Trading platform preview showing NIFTY 50 and SENSEX indices, ₹1,00,000 virtual portfolio, stock watchlist, and simulated NSE order execution',
    glowVariant: 'emerald',
  },
  primaryCta: {
    label: 'Start Paper Trading',
    href: '/trade',
    ctaId: 'start_paper_trading',
  },
  secondaryCta: {
    label: 'Compare Virtual Capital Plans',
    href: '/pricing',
    ctaId: 'paper_trading_view_pricing',
  },
  whatIsTitle: 'What Is Paper Trading?',
  whatIsParagraphs: [
    'Paper trading — also known as virtual stock trading — lets you place simulated buy and sell orders on real Indian stock market prices using virtual money instead of real savings. Every position, profit, and loss is tracked in a paper portfolio so you can learn order mechanics safely.',
    'On Tradedia, your paper trading platform mirrors core NSE workflows: live and last-available NSE benchmark quotes, Delivery (CNC) and 5x leveraged Intraday (MIS) margins, After-Market Orders (AMO), and statutory transaction cost breakdowns including STT, SEBI fees, stamp duty, and GST.',
  ],
  featuresTitle: 'Everything Built Into the Tradedia Paper Trading Desk',
  featuresSubtitle:
    'Every tool on this page reflects actual capabilities live inside the Tradedia virtual trading workspace.',
  features: [
    {
      title: 'Virtual Capital from ₹1L to ₹50L',
      badge: 'Free to Advanced',
      description:
        'Start free with ₹1,00,000 virtual capital and automatic monthly resets. Beginner (₹10L) and Advanced (₹50L) tiers add free virtual top-ups and unlimited manual resets.',
    },
    {
      title: 'Simulated Order Modes & Product Types',
      badge: 'CNC · MIS · MTF',
      description:
        'Place Delivery (CNC) Market and After-Market Orders (AMO) on Free, unlock 5x Intraday (MIS), MTF 5.00x, and Limit orders on Beginner, and add SL and SL-M stop-loss orders on Advanced.',
    },
    {
      title: 'Multi-Timeframe Charts & Fundamentals',
      badge: '1D to ALL',
      description:
        'Study interactive NSE price charts across intraday and multi-year timeframes alongside company key ratios, valuation metrics, and watchlists for fast tracking.',
    },
    {
      title: 'Live Portfolio, Holdings & Order History',
      badge: 'Full Audit Trail',
      description:
        'Monitor open intraday positions, delivery holdings, weighted average buy prices, realized and unrealized P&L, wallet transactions, and every executed or pending order.',
    },
    {
      title: 'Realistic Indian Brokerage & Statutory Taxes',
      badge: 'STT · GST · Stamp Duty',
      description:
        'Simulated executions account for brokerage, STT, NSE exchange transaction charges, IPFT, SEBI fees, stamp duty, and GST so your practice P&L stays grounded in reality.',
    },
    {
      title: '3:20 PM IST Intraday Auto Square-Off',
      badge: 'RMS Simulation',
      description:
        'Simulated intraday (MIS) positions follow NSE session hours and automatically square off at 3:20 PM IST, helping you build real intraday risk discipline.',
    },
  ],
  stepsTitle: 'How to Start Paper Trading in 3 Simple Steps',
  stepsSubtitle: 'Go from signing up to placing your first simulated NSE equity trade in minutes.',
  steps: [
    {
      step: '01',
      title: 'Create Your Free Tradedia Account',
      description:
        'Sign up with Google or Email to activate your Free Starter account with ₹1,00,000 in virtual capital and automatic monthly resets.',
    },
    {
      step: '02',
      title: 'Explore NSE Stocks & Analyse Charts',
      description:
        'Browse NIFTY 50, SENSEX, and leading NSE stocks, inspect multi-timeframe charts and fundamentals, and organize stocks in your watchlist.',
    },
    {
      step: '03',
      title: 'Place Simulated Orders & Track P&L',
      description:
        'Execute Delivery or Intraday simulated orders, inspect itemized charges, and review your holdings and trade history as market prices move.',
    },
  ],
  audienceTitle: 'Who Benefits from Paper Trading for Beginners & Active Learners?',
  audienceSubtitle: 'Designed for Indian market learners at every stage of skill development.',
  audience: [
    {
      title: 'First-Time Equity Learners',
      description:
        'Learn how market orders, limit orders, after-market orders, delivery margins, and brokerage charges work before ever funding a live brokerage account.',
    },
    {
      title: 'Strategy & Swing Testers',
      description:
        'Combine setups from the Tradedia AI-powered stock screener with disciplined simulated entries, stop-loss placement, and portfolio tracking.',
    },
    {
      title: 'Intraday Discipline Builders',
      description:
        'Practise 5x MIS position sizing and 3:20 PM IST square-off rules on a realistic stock market simulator with zero real-money stress.',
    },
  ],
  faqsTitle: 'Paper Trading in India — Frequently Asked Questions',
  faqs: [
    {
      q: 'Is Tradedia paper trading free to start in India?',
      a: 'Yes. Every Free Starter account starts with ₹1,00,000 in virtual capital, automatic monthly resets, Delivery (CNC) Market orders, After-Market Orders (AMO), and 1 watchlist. Paid Beginner and Advanced tiers unlock higher virtual capital caps (₹10L–₹50L), 5x Intraday (MIS), MTF 5.00x, Limit, SL, and SL-M orders.',
    },
    {
      q: 'Does virtual stock trading on Tradedia involve real money or a demat account?',
      a: 'No. All balances, holdings, profits, and losses on Tradedia are 100% simulated virtual credits. You do not need a demat account, no real shares are bought or sold, and simulated profits cannot be withdrawn.',
    },
    {
      q: 'How realistic are the prices and execution rules in the simulator?',
      a: 'Tradedia uses NSE equity market quotes when available during exchange hours and labels delayed or closed-market states transparently. Simulated orders include Indian statutory charges and 3:20 PM IST intraday square-off, though paper fills cannot replicate live exchange liquidity, slippage, or circuit halts.',
    },
    {
      q: 'Can I reset or refill my virtual trading wallet if I lose virtual cash?',
      a: 'Free accounts receive an automatic monthly reset back to ₹1,00,000 at the start of each calendar month. Beginner and Advanced subscribers also get free top-ups up to their plan cap and unlimited manual portfolio resets anytime.',
    },
  ],
  relatedLinks: [
    {
      href: '/ai-stock-screener',
      title: 'AI-Powered Stock Screener',
      description: 'Scan Nifty 500 equities for swing, intraday, and deep-dive technical setups before testing them on the paper desk.',
      ctaLabel: 'Explore AI Stock Screener',
    },
    {
      href: '/learn',
      title: 'Learn Chart Patterns Library',
      description: 'Study 21 reversal, continuation, and candlestick setups with entry, stop-loss, and profit target rules.',
      ctaLabel: 'Browse Chart Patterns',
    },
    {
      href: '/guess-the-chart',
      title: 'Guess the Chart Quiz',
      description: 'Sharpen your pattern-reading speed on interactive synthetic chart scenarios before placing virtual trades.',
      ctaLabel: 'Explore Guess the Chart',
    },
  ],
  finalCta: {
    title: 'Ready to Practise Stock Trading with Virtual Money?',
    description:
      'Open the Tradedia Paper Trading Desk with ₹1,00,000 in free virtual capital and start building real market habits safely.',
    disclaimer:
      'Educational Disclaimer: Tradedia is an educational paper trading simulator and is not registered with SEBI as a stock broker, investment adviser, or research analyst. All trading balances and P&L are 100% simulated; past or simulated performance does not predict real-market results.',
  },
};
