import { WorkspaceHeader } from './navigation/WorkspaceHeader';
import { AppLink, navigate } from '../lib/navigation';
import { LearningSection } from './LearningSection';
import { FloatingIllustration } from './FloatingIllustration';
import { ScreenerLivePreviewCard } from './landing/ScreenerLivePreviewCard';
import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { BrandLogo } from './BrandLogo';
import { INITIAL_STOCKS } from '../data/mockStocks';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Wallet,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Sparkles,
  Radar,
  Search,
  BookOpen,
  GraduationCap,
  Target,
  Award,
  ChartCandlestick,
  PlayCircle,
  Crown,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { getMaxYearlySavingsPercent, type PaidBillingCycle } from '../utils/pricing';
import { BillingToggle } from '../features/pricing/components/BillingToggle';
import { PricingCards } from '../features/pricing/components/PricingCards';

const MAX_YEARLY_SAVINGS = getMaxYearlySavingsPercent(Object.values(SUBSCRIPTION_PLANS));

export const LandingPage: React.FC = () => {
  const {
    user,
    setShowLandingPage,
    setSelectedStock,
    selectStockBySymbol,
    stocks,
    setCurrentTab,
    openAuthModal,
    subscriptionTier,
  } = useTrading();

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<PaidBillingCycle>('yearly');

  const handleGetStarted = () => {
    if (user) {
      setShowLandingPage(false);
      setCurrentTab('explore');
      navigate('/trade');
    } else {
      openAuthModal('signup');
    }
  };

  const handleLaunchTradeStock = (sym: string) => {
    const target = stocks.find((s) => s.symbol === sym);
    if (target) {
      setSelectedStock(target);
      setCurrentTab('stock-detail');
    } else {
      selectStockBySymbol(sym);
    }
    navigate('/trade');
  };

  const tickerList = stocks && stocks.length > 0 ? stocks : INITIAL_STOCKS;

  const faqs = [
    {
      q: 'What are the 3 tools included inside NiftyLens?',
      a: 'NiftyLens brings together three connected tools in one place: (1) AI-Powered Stock Screener & Stock Analysis to find bullish Swing and Intraday stocks across Nifty 500 using chart analysis and backtested strategies, (2) Virtual Trading Desk to practice Delivery and 5x Intraday orders with ₹1,00,000 to ₹10,00,000 in virtual capital, and (3) Interactive Learning & Guess the Chart to master 28+ candlestick patterns and replay market movements.',
    },
    {
      q: 'How does the AI-Powered Stock Screener evaluate stocks?',
      a: 'Our screener combines advanced technical chart analysis, multiple historically backtested strategies, and AI-powered technical insights across Nifty 500 stocks. It evaluates BUY, WAIT, and AVOID signals alongside confidence scores (0–100), reference entry zones, targets, stop-loss levels, and historical strategy statistics for both Swing and 15-minute Intraday trading.',
    },
    {
      q: 'What do I see when I search a stock in Stock Analysis?',
      a: 'Type any Nifty 500 stock (like Reliance, TCS, or HDFC Bank) to see a confidence-based verdict (BUY, WAIT, or AVOID), chart structure with support/resistance levels, company revenue & profit, historical strategy backtests (2-year on Beginner, up to 5-year on Advanced), and an AI insights layer.',
    },
    {
      q: 'How does the Virtual Trading Desk work?',
      a: 'Practice risk-free with ₹1,00,000 (scalable up to ₹10,00,000) in virtual capital. Place Delivery (CNC) or 5x leveraged Intraday (MIS) Market and Limit orders on real NSE stock prices, see realistic brokerage and statutory tax breakdowns, and track your live portfolio performance without risking real money.',
    },
    {
      q: 'How do the Chart Pattern Library and Guess the Chart Quiz help traders?',
      a: 'The Interactive Learning module breaks down 28+ classic candlestick and chart patterns with plain-English explanations, why the pattern works, and exact entry, stop-loss, and target rules — plus interactive chart replay and the Guess the Chart quiz to test your analysis skills.',
    },
    {
      q: 'Is any real money or SEBI brokerage account involved?',
      a: 'No. NiftyLens is strictly for educational learning, screening research, and risk-free paper trading simulation. All trades use virtual cash, historical backtests or AI insights never guarantee future profits, and nothing on the platform is investment advice.',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans transition-colors selection:bg-[#00D09C]/20 selection:text-[#00D09C]">
      <WorkspaceHeader />

      {/* =======================================================================
         1. HERO SECTION — 45% TEXT & CTAS LEFT / 55% FLOATING 3D LAPTOP RIGHT
         ======================================================================= */}
      <section className="pt-6 sm:pt-10 lg:pt-14 pb-12 sm:pb-18 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
          {/* Left Column: 45% width on desktop for text and CTAs */}
          <div className="w-full lg:w-[45%] space-y-6 text-left">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#00B386]/30 bg-[#00B386]/10 dark:border-[#00D09C]/30 dark:bg-[#00D09C]/10 px-3.5 py-1.5 text-xs font-extrabold text-[#008F6B] dark:text-[#00D09C]">
              <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
              <span>AI Stock Screener</span>
              <span>·</span>
              <span>Backtested Strategies</span>
              <span>·</span>
              <span>Virtual Trading</span>
              <span>·</span>
              <span>Interactive Learning</span>
            </div>

            <h1 className="text-3xl sm:text-5xl xl:text-[3.5rem] font-black text-[#15241D] dark:text-white tracking-tight leading-[1.08]">
              Backtested Stock Recommendations.{' '}
              <span className="text-[#00B386] dark:text-[#00D09C]">
                Chart Analysis &amp; Virtual Practice.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed max-w-2xl">
              Discover high-potential Indian stocks with <strong>AI-powered insights</strong>,{' '}
              <strong>advanced chart analysis</strong>, and{' '}
              <strong>multiple backtested trading strategies</strong>. Practice with virtual money and
              master trading through interactive learning.
            </p>

            {/* Primary 3-App Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => (user ? handleGetStarted() : openAuthModal('signup'))}
                className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-[#04261C] bg-[#00D09C] hover:bg-[#00B386] shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ChartCandlestick className="w-4 h-4" />
                <span>{user ? 'Open Paper Trading Desk' : 'Start Free Account Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <AppLink
                href="/screener"
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-white bg-[#0C1D16] hover:bg-[#12281F] border border-[#1D3A2D] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Radar className="w-4 h-4 text-[#00D09C]" />
                <span>Open Stock Screener</span>
              </AppLink>

              <AppLink
                href="/pricing"
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#15241D] dark:text-[#E9F2EE] bg-white dark:bg-[#111C17] border border-[#CFDCD5] dark:border-[#20332A] hover:border-[#00B386] dark:hover:border-[#00D09C] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>View Plans &amp; Pricing</span>
              </AppLink>
            </div>

            {/* Pillar Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <Radar className="w-4 h-4 shrink-0" />
                  <span>1. Stock Screener &amp; Backtests</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Backtested swing &amp; intraday strategies, chart analysis &amp; AI insights.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <ChartCandlestick className="w-4 h-4 shrink-0" />
                  <span>2. Virtual Trading</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Practice intraday &amp; swing trades risk-free with virtual capital.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>3. Learn &amp; Quiz</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  28+ interactive chart patterns &amp; Guess the Chart game.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: 55% width on desktop for the floating 3D laptop illustration */}
          <div className="w-full lg:w-[55%] flex items-center justify-center">
            <FloatingIllustration
              src="/images/landing/hero-trading.png"
              alt="NiftyLens 3D laptop dashboard showcasing Indian Stock Market charts, Smart Stock Screener with backtested strategies, Virtual Trading portfolio, and Interactive Learning"
              loading="eager"
              fetchPriority="high"
              glowVariant="emerald-blue"
              align="right"
              maxWidthClass="max-w-[540px] sm:max-w-[640px] lg:max-w-[740px]"
            />
          </div>
        </div>
      </section>

      {/* 3. CONTINUOUS LIVE NSE MARKET TICKER STRIP */}
      <section className="relative w-full py-3.5 border-b border-emerald-900/10 dark:border-[#20332A] bg-white dark:bg-[#111C17] overflow-hidden select-none">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-[#111C17] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-[#111C17] to-transparent z-10" />

        <div
          className="flex w-max cursor-pointer animate-marquee"
          style={{
            animation: 'tickerInfinite 120s linear infinite',
            willChange: 'transform',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.animationPlayState = 'running';
          }}
        >
          {[0, 1].map((trackIdx) => (
            <div
              key={trackIdx}
              className="flex items-center gap-8 shrink-0 pr-8"
              aria-hidden={trackIdx === 1 ? 'true' : undefined}
            >
              {tickerList.map((s, i) => {
                const isUp = s.change >= 0;
                return (
                  <div
                    key={`t${trackIdx}-${s.symbol}-${i}`}
                    onClick={() => navigate(`/screener/analysis?symbol=${s.symbol}`)}
                    className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity shrink-0"
                    title={`Click to analyse ${s.symbol}`}
                  >
                    <span className="font-extrabold text-[#15241D] dark:text-white">{s.symbol}</span>
                    <span className="font-mono tabular-nums text-[#5B7066] dark:text-[#9AB0A5]">
                      ₹{s.price.toFixed(2)}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-[11px] font-bold ${
                        isUp ? 'text-[#00B386] dark:text-[#00D09C]' : 'text-[#E0452B] dark:text-[#F0614A]'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {s.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-gray-300 dark:text-[#20332A] ml-4">·</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* =======================================================================
         4. VIRTUAL TRADING FEATURE SECTION — ILLUSTRATION LEFT / TEXT RIGHT
         ======================================================================= */}
      <section
        id="virtual-trading"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-b border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1880px] mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left on Desktop: Floating 3D Virtual Trading Illustration */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <FloatingIllustration
                src="/images/landing/virtual-trading.png"
                alt="NiftyLens Virtual Trading 3D illustration showing NIFTY 50 and SENSEX tickers, ₹1,00,000 Virtual Portfolio with +4.25% return, watchlist, and Intraday/Swing order execution"
                loading="lazy"
                glowVariant="emerald"
                delayMs={400}
                align="left"
                maxWidthClass="max-w-[520px] sm:max-w-[600px] lg:max-w-[660px]"
              />
            </div>

            {/* Right on Desktop: Description and Feature Highlights */}
            <div className="lg:col-span-6 space-y-6 text-left order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
                <ChartCandlestick className="w-3.5 h-3.5" />
                <span>Virtual Trading Desk · Risk-Free Practice</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
                Trade Smarter.{' '}
                <span className="text-[#00B386] dark:text-[#00D09C]">Practice Risk-Free.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                Practice trading Indian stocks with <strong>₹1,00,000 in virtual capital</strong>{' '}
                (scalable up to ₹10,00,000). Explore intraday and swing trading, manage positions,
                and track portfolio performance without risking real money.
              </p>

              {/* Key Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <Wallet className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>₹1,00,000 Virtual Capital</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Start with ₹1,00,000 in paper capital (expandable up to ₹10 Lakhs) and reset or top up anytime.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <Zap className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Intraday &amp; Swing Trading</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Execute multi-day Swing Delivery (CNC) orders or same-day 5x Intraday (MIS) setups with live NSE quotes.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <LineChartIcon className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Portfolio Performance Tracking</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Monitor real-time P&amp;L, active holdings, order history, and interactive candlestick &amp; line charts.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Real Taxes &amp; Brokerage Math</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    See exact brokerage, STT, NSE exchange fees, SEBI charges, stamp duty, and GST on every simulated trade.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-[#04261C] bg-[#00D09C] hover:bg-[#00B386] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Open Virtual Trading Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Live NSE benchmark quotes · 100% risk-free simulation
                </span>
              </div>
            </div>
          </div>

          {/* Preserved Virtual Portfolio & Order Execution Quick Strip */}
          <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7066] dark:text-[#9AB0A5]">
                  Virtual Trading Sandbox
                </span>
                <div className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#15241D] dark:text-white mt-0.5">
                  ₹1,00,000 – ₹10,00,000
                </div>
              </div>
              <div className="h-10 w-px bg-[#CFDCD5] dark:bg-[#20332A] hidden sm:block" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5B7066] dark:text-[#9AB0A5] block">
                  Supported Order Modes
                </span>
                <span className="mt-1 inline-block rounded-lg border border-[#00D09C]/30 bg-[#00D09C]/10 px-3 py-1 font-mono text-xs font-extrabold text-[#008F6B] dark:text-[#00D09C]">
                  Delivery (CNC) · 5x Intraday (MIS) · Market &amp; Limit
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetStarted}
              className="w-full sm:w-auto rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#04261C] font-extrabold text-xs sm:text-sm px-5 py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
            >
              <span>Start Paper Trading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =======================================================================
         5. AI-POWERED STOCK SCREENER SECTION — TEXT LEFT / ILLUSTRATION RIGHT
         ======================================================================= */}
      <section id="screener-suite" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto space-y-14">
          {/* Main Two-Column Feature Showcase: Left Copy, Right Illustration on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left on Desktop: Heading, Description, Feature Highlights, and CTAs */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Core Engine · AI Insights, Chart Analysis &amp; Backtested Strategies</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
                Discover High-Potential Stocks with{' '}
                <span className="text-[#00B386] dark:text-[#00D09C]">AI-Powered Insights.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                Find promising Indian stocks using <strong>advanced chart analysis</strong>,{' '}
                <strong>multiple backtested trading strategies</strong>, and{' '}
                <strong>AI-powered technical insights</strong>. Identify intraday and swing trading
                opportunities, evaluate historical performance, and make more informed trading
                decisions.
              </p>

              {/* 4 Required Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <BarChart2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Advanced Chart Analysis</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Identify technical patterns, support, resistance, momentum, and trend changes.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <TrendingUp className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Multiple Backtested Strategies</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Explore trading opportunities identified using strategies evaluated against historical market data.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <Sparkles className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>AI-Powered Insights</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Get additional technical analysis and contextual insights to support trading decisions.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <Target className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Confidence-Based Signals</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Evaluate BUY, WAIT, and AVOID signals alongside technical scores and historical statistics.
                  </p>
                </div>
              </div>

              {/* Existing Screener CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <AppLink
                  href="/screener"
                  className="px-5 py-3.5 rounded-xl bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B386] text-white dark:text-[#04261C] text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm"
                >
                  <span>Open Swing Screener</span>
                  <ArrowRight className="w-4 h-4" />
                </AppLink>
                <AppLink
                  href="/screener/intraday"
                  className="px-5 py-3.5 rounded-xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] hover:border-[#00D09C] text-xs sm:text-sm font-bold flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                  <span>Intraday 15m Picks</span>
                </AppLink>
                <AppLink
                  href="/screener/analysis"
                  className="px-5 py-3.5 rounded-xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] hover:border-[#00D09C] text-xs sm:text-sm font-bold flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                  <span>Analyse Any Stock</span>
                </AppLink>
              </div>
            </div>

            {/* Right on Desktop: Floating 3D Stock Screener Illustration */}
            <div className="lg:col-span-6">
              <FloatingIllustration
                src="/images/landing/stock-screener.png"
                alt="NiftyLens AI Stock Screener 3D illustration displaying Swing Trading, Intraday Trading, and Stock Analyser panels with technical indicators, breakout chart analysis, confidence score, and backtesting results"
                loading="lazy"
                glowVariant="blue-cyan"
                delayMs={200}
                align="right"
                maxWidthClass="max-w-[520px] sm:max-w-[600px] lg:max-w-[660px]"
              />
            </div>
          </div>

          {/* Preserved 3 Detailed Screener Strategy Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategy 1: Swing Trading Screener */}
            <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D09C]/15 text-[#00B386] dark:text-[#00D09C] grid place-items-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-3 py-1 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
                    Hold 3 Days – 2 Weeks
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[#15241D] dark:text-white">
                  1. Swing Trading Screener (Nifty 500)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Scans all 500 NSE stocks using backtested breakout, trend-following, and momentum strategies — ranking high-potential swing setups by technical confidence.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Confidence Score (0–100):</strong> See how strongly multiple indicators and backtested rules align.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Confirmed vs Watchlist:</strong> Know whether a breakout is active or awaiting confirmation.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Reference Plan:</strong> Entry zone, target price, stop-loss &amp; reward:risk ratio.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E2EAE6] dark:border-[#20332A] flex items-center justify-between">
                <span className="text-xs text-[#5B7066] dark:text-[#7F9C8E]">Scans 500 stocks in seconds</span>
                <AppLink
                  href="/screener"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
                >
                  <span>Run Swing Scan</span>
                  <ArrowRight className="w-4 h-4" />
                </AppLink>
              </div>
            </div>

            {/* Strategy 2: Intraday Screener */}
            <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D09C]/15 text-[#00B386] dark:text-[#00D09C] grid place-items-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-3 py-1 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
                    Same-Day 15-Min Trades
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[#15241D] dark:text-white">
                  2. Intraday Screener (Top 100 Liquid)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Monitors the 100 most liquid Nifty stocks on 15-minute candles during market hours (9:15 AM – 3:30 PM IST) for VWAP and volume-backed momentum bursts.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Auto-Refresh Every 5 Mins:</strong> Live countdown timer while NSE is open.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Live Signal Tracking:</strong> Tracks whether each intraday setup is Open, Hit Target, or Stopped Out.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Last Session Replay:</strong> Review the full day’s intraday strategy performance after market close.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E2EAE6] dark:border-[#20332A] flex items-center justify-between">
                <span className="text-xs text-[#5B7066] dark:text-[#7F9C8E]">All trades close by 3:20 PM IST</span>
                <AppLink
                  href="/screener/intraday"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
                >
                  <span>View Intraday Picks</span>
                  <ArrowRight className="w-4 h-4" />
                </AppLink>
              </div>
            </div>

            {/* Strategy 3: AI Stock Analysis */}
            <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D09C]/15 text-[#00B386] dark:text-[#00D09C] grid place-items-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <span className="rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-3 py-1 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
                    AI + Technical + Fundamental
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[#15241D] dark:text-white">
                  3. Stock Analysis (Any Stock)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Search any Nifty 500 company for an instant health check combining AI-powered technical commentary, chart structure, financials, and historical strategy backtests.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Confidence-Based Verdict:</strong> Clear <em>BUY</em>, <em>WAIT</em>, or <em>AVOID</em> signal with reference levels.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>Revenue, Profit &amp; Balance Sheet:</strong> Yearly/Quarterly financials &amp; valuation ratios.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span>
                      <strong>2- to 5-Year Strategy Backtests:</strong> Evaluate how historical signals performed on that stock.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E2EAE6] dark:border-[#20332A] flex items-center justify-between">
                <span className="text-xs text-[#5B7066] dark:text-[#7F9C8E]">Check any NSE 500 symbol</span>
                <AppLink
                  href="/screener/analysis"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
                >
                  <span>Search a Stock</span>
                  <ArrowRight className="w-4 h-4" />
                </AppLink>
              </div>
            </div>
          </div>

          {/* Interactive Screener & Stock Analysis Live Preview + Quick Stock Check Bar */}
          {/* <ScreenerLivePreviewCard onLaunchTradeStock={handleLaunchTradeStock} /> */}
        </div>
      </section>

      {/* =======================================================================
         6. INTERACTIVE LEARNING SECTION — ILLUSTRATION LEFT / TEXT RIGHT
         ======================================================================= */}
      <section
        id="learn-module"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-t border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1880px] mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left on Desktop: Floating 3D Interactive Learning Illustration */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <FloatingIllustration
                src="/images/landing/interactive-learning.png"
                alt="NiftyLens Interactive Learning 3D illustration featuring Learn Chart Patterns, Bullish Engulfing breakdown, Chart Pattern Library, Guess the Chart quiz, and Chart Replay"
                loading="lazy"
                glowVariant="indigo-emerald"
                delayMs={300}
                align="left"
                maxWidthClass="max-w-[520px] sm:max-w-[600px] lg:max-w-[660px]"
              />
            </div>

            {/* Right on Desktop: Text and Feature Highlights */}
            <div className="lg:col-span-6 space-y-6 text-left order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Chart Learning Studio · 28+ Patterns &amp; Quiz</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
                Learn Chart Patterns.{' '}
                <span className="text-[#00B386] dark:text-[#00D09C]">Predict Market Moves.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                Master candlestick patterns through <strong>interactive lessons</strong>,{' '}
                <strong>replay market movements</strong>, and test your knowledge with{' '}
                <strong>Guess the Chart quizzes</strong>. Build confidence by practicing chart
                analysis and learning from every decision.
              </p>

              {/* 4 Required Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <BookOpen className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Candlestick Pattern Library</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Explore 28+ reversal, continuation, and candlestick setups with entry, stop-loss, and target rules.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <PlayCircle className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Interactive Chart Replay</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Step through historical market setups candle by candle to see how patterns unfold in real time.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <GraduationCap className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Guess the Chart Quiz</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Test your instincts across Casual Quiz, 3-Life Survival, and 10-Round Challenge modes.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                    <Award className="w-4 h-4 text-[#00D09C] shrink-0" />
                    <span>Learning Progress &amp; Achievements</span>
                  </div>
                  <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                    Track your accuracy, win streaks, and detailed post-question explanations after every call.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <AppLink
                  href="/learn"
                  className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-[#04261C] bg-[#00D09C] hover:bg-[#00B386] shadow-sm transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Pattern Library</span>
                </AppLink>
                <AppLink
                  href="/quiz"
                  className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#15241D] dark:text-white bg-[#F3F6F4] dark:bg-[#111C17] border border-[#CFDCD5] dark:border-[#20332A] hover:border-[#00D09C] transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4 text-[#00D09C]" />
                  <span>Play Guess the Chart →</span>
                </AppLink>
              </div>
            </div>
          </div>

          {/* Preserved Interactive Pattern Lesson Breakdown Strip */}
          <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-white p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1D3A2D]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 px-3 py-1 text-xs font-bold text-[#00D09C]">
                  Sample Pattern Lesson · Double Bottom (W-Pattern)
                </span>
                <span className="rounded-full bg-[#00D09C]/20 px-2.5 py-1 text-xs font-bold text-[#00D09C]">
                  Bullish Reversal
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AppLink
                  href="/learn"
                  className="text-xs font-extrabold text-[#00D09C] hover:underline flex items-center gap-1"
                >
                  <span>Open Pattern Library</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </AppLink>
                <AppLink
                  href="/quiz"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00D09C] px-3.5 py-1.5 text-xs font-extrabold text-[#04261C] hover:bg-[#00B386]"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Guess the Chart</span>
                </AppLink>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                <span className="font-bold text-[#00D09C] block mb-1">Entry Rule</span>
                <span className="text-[#D6E6DE]">
                  Enter when price breaks decisively above the middle peak (neckline) with rising volume.
                </span>
              </div>
              <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                <span className="font-bold text-[#F0614A] block mb-1">Stop-Loss</span>
                <span className="text-[#D6E6DE]">
                  Place stop-loss just below the twin bottom support floor to manage downside risk.
                </span>
              </div>
              <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                <span className="font-bold text-[#5CB8FF] block mb-1">Profit Target</span>
                <span className="text-[#D6E6DE]">
                  Project the height of the W pattern upward from the neckline breakout level.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE INTEGRATED APPLICATIONS SECTION */}
      <LearningSection onStartTrading={handleGetStarted} />

      {/* =======================================================================
         7.5. START FREE & UPGRADE PACKAGES SECTION (FREE vs BEGINNER vs ADVANCED)
         ======================================================================= */}
      <section
        id="pricing-packages"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#F3F6F4] dark:bg-[#0B1310] border-t border-b border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1200px] mx-auto space-y-10">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-[#15241D] dark:text-white">
              Find the Right Plan for Your{' '}
              <span className="text-[#00B386] dark:text-[#00D09C]">Trading Journey</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed sm:text-lg text-[#5B7066] dark:text-[#9AB0A5]">
              Start learning and practicing for free. Unlock backtested stock screening, deeper chart analysis, and
              advanced paper trading as you grow.
            </p>
            <div className="pt-1">
              <BillingToggle
                value={billingCycle}
                onChange={setBillingCycle}
                savingsPercent={MAX_YEARLY_SAVINGS}
              />
            </div>
          </div>

          <PricingCards
            billingCycle={billingCycle}
            compareHref="/pricing#compare-plans"
            compareLabel="Compare all features & full plan details"
          />
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto space-y-8 text-left">
          <div className="text-center space-y-2">
            <div className="text-xs font-extrabold text-[#00B386] dark:text-[#00D09C] uppercase tracking-wider">
              Simple Answers
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#15241D] dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#5B7066] dark:text-[#9AB0A5]">
              Everything you need to know about NiftyLens AI Stock Screener, Virtual Trading, and Pattern Learning.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#111C17] rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-bold text-sm sm:text-base text-[#15241D] dark:text-white">
                      {faq.q}
                    </span>
                    <span className="text-[#5B7066] dark:text-[#9AB0A5] shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed border-t border-[#E2EAE6] dark:border-[#20332A]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM CTA BANNER */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto">
          <div className="bg-gradient-to-r from-[#0F2A1F] via-[#133628] to-[#0D241B] border border-[#1D3A2D] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="space-y-2.5 max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to scan stocks, practice trades, and master charts?
              </h3>
              <p className="text-xs sm:text-sm text-[#9AB0A5] leading-relaxed">
                Start with the AI-Powered Nifty 500 Stock Screener, practice risk-free on the Virtual Trading Desk, or explore 28+ setups in the Chart Pattern Library.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <AppLink
                href="/screener"
                className="px-7 py-3.5 rounded-xl font-extrabold text-sm bg-[#00D09C] text-[#04261C] hover:bg-[#00B386] shadow-md transition-all inline-flex items-center gap-2"
              >
                <Radar className="w-4 h-4" />
                <span>Open Stock Screener</span>
                <ArrowRight className="w-4 h-4" />
              </AppLink>
              <button
                type="button"
                onClick={handleGetStarted}
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <ChartCandlestick className="w-4 h-4 text-[#00D09C]" />
                <span>Launch Virtual Trading</span>
              </button>
              <AppLink
                href="/learn"
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all inline-flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#00D09C]" />
                <span>Learn Chart Patterns</span>
              </AppLink>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-white dark:bg-[#0E1713] border-t border-emerald-900/10 dark:border-[#20332A] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#5B7066] dark:text-[#9AB0A5] text-left">
        <div className="w-full max-w-[1880px] mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-emerald-900/10 dark:border-[#20332A]">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="cursor-pointer shrink-0"
              title="NiftyLens Homepage"
            >
              <BrandLogo />
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
              <AppLink href="/screener" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Swing Screener
              </AppLink>
              <AppLink href="/screener/intraday" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Intraday Screener
              </AppLink>
              <AppLink href="/screener/analysis" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Stock Analysis
              </AppLink>
              <AppLink href="/trade" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Virtual Trading
              </AppLink>
              <AppLink href="/learn" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Learn Patterns
              </AppLink>
              <AppLink href="/quiz" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Guess the Chart
              </AppLink>
            </div>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed text-[#5B7066] dark:text-[#7F9C8E]">
            <p>
              <strong>Disclaimer:</strong> NiftyLens is an educational stock screening, AI-assisted chart analysis, pattern learning, and paper trading platform created strictly for informational and strategy backtesting purposes. Historical backtesting and AI insights do not guarantee future profits. No real securities, equities, derivatives, commodities, or currencies are purchased or sold. All financial balances, portfolio holdings, orders, and gains or losses displayed are 100% simulated paper credits.
            </p>
            <p>
              This platform is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, sub-broker, portfolio manager, or investment adviser. Nothing on this website constitutes investment advice, financial guidance, tax advisory, or a recommendation to buy or sell any financial instrument.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-emerald-900/10 dark:border-[#20332A] text-[11px]">
            <div>© {new Date().getFullYear()} NiftyLens. NSE Stock Screener, Virtual Trading &amp; Chart Pattern Studio.</div>
            <div>Educational Research &amp; Paper Trading Sandbox · Virtual Capital: ₹1,00,000 – ₹10,00,000</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
