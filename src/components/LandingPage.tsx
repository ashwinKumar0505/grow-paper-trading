import React, { useState } from 'react';
import { useTrading, MAX_WALLET_LIMIT } from '../context/TradingContext';
import { GrowwLogo } from './GrowwLogo';
import { INITIAL_STOCKS } from '../data/mockStocks';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Wallet,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Lock,
  Phone,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Layers,
  Eye,
  Briefcase,
  Activity,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
  ExternalLink,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    user,
    setShowLandingPage,
    setSelectedStock,
    stocks,
    indices,
    marketStatus,
    isDarkMode,
    toggleTheme,
    setCurrentTab,
    openAuthModal,
  } = useTrading();

  // Interactive Stepper State
  const [activeStep, setActiveStep] = useState<number>(0);

  // Interactive FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Chart Timeframe Preview on Landing Page
  const [activePreviewTimeframe, setActivePreviewTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');

  const cashPresets = [
    { label: '₹1,00,000', value: 100000, desc: 'Beginner' },
    { label: '₹2,00,000', value: 200000, desc: 'Intermediate' },
    { label: '₹5,00,000', value: 500000, desc: 'Popular', badge: 'Recommended' },
    { label: '₹10,00,000', value: 1000000, desc: 'Max Limit (10L)', badge: 'Max Limit' },
  ];

  const handleGetStarted = () => {
    if (user) {
      setShowLandingPage(false);
      setCurrentTab('explore');
    } else {
      openAuthModal('signup');
    }
  };

  const handleSignIn = () => {
    openAuthModal('signin');
  };

  const handleLaunchTradeStock = (sym: string) => {
    const target = stocks.find((s) => s.symbol === sym);
    if (target) {
      setSelectedStock(target);
      setCurrentTab('stock-detail');
    }
    if (user) {
      setShowLandingPage(false);
    } else {
      openAuthModal('signup');
    }
  };

  // Top stocks for showcase
  const showcaseSymbols = ['RELIANCE', 'HDFCBANK', 'TCS', 'INFY'];
  const showcaseStocks = showcaseSymbols.map((sym) => {
    return (
      stocks.find((s) => s.symbol === sym) || {
        symbol: sym,
        name: sym,
        price: sym === 'RELIANCE' ? 2742.6 : sym === 'HDFCBANK' ? 1745.5 : sym === 'TCS' ? 3980.2 : 1894.4,
        change: 15.4,
        changePercent: 0.85,
        volume: 5000000,
        exchange: 'NSE',
      }
    );
  });

  // Ticker stocks list (guaranteed populated with real stocks data)
  const tickerList = stocks && stocks.length > 0 ? stocks : INITIAL_STOCKS;

  // FAQs list
  const faqs = [
    {
      q: 'Is this a real trading platform?',
      a: 'No, this is strictly an educational paper-trading simulator. All funds, balances, orders, and positions are 100% virtual. No real money is deposited, traded, or withdrawn.',
    },
    {
      q: 'What is the maximum wallet limit?',
      a: 'The maximum wallet balance is strictly capped at ₹10,00,000 (10 Lakhs) to maintain realistic retail trading simulations. Users cannot add funds beyond ₹10 Lakhs.',
    },
    {
      q: 'Can I deposit or withdraw money for trading?',
      a: 'No. This platform does not support real monetary deposits, withdrawals, or banking integrations. All balances are virtual paper cash for learning.',
    },
    {
      q: 'Are the stock prices and indices real?',
      a: 'Yes, quotes and charts reflect real NSE equity data and benchmarks during market hours, giving you realistic market experience.',
    },
    {
      q: 'Do I need to sign up again on each visit?',
      a: 'No! Once you enter your name, mobile, and starting virtual cash, your profile, portfolio, and transaction history are automatically saved in your browser.',
    },
    {
      q: 'Will my virtual P&L affect my taxes or credit score?',
      a: 'No. Since no real securities or funds are involved, there is zero tax, legal, or financial liability.',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F9FA] dark:bg-[#0E1117] text-[#1E2229] dark:text-[#E2E8F0] font-sans transition-colors selection:bg-[#00D09C]/20 selection:text-[#00D09C]">
      {/* 1. FIXED TOP HEADER BAR (Main Navigation on top, Black Ribbon below it) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#12161F]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#202533] transition-colors shadow-xs">
        {/* Main Header Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-8">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="cursor-pointer shrink-0"
              title="My Paper Trade Homepage"
            >
              <GrowwLogo />
            </div>

            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <a href="#how-it-works" className="hover:text-[#00D09C] transition-colors font-bold text-gray-900 dark:text-white">
                How It Works
              </a>
              <a href="#popular-stocks" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Stocks
              </a>
              <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#practice-charts" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Live Charts
              </a>
              <a href="#indices" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Indices
              </a>
              <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1E2330] transition-colors cursor-pointer"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGetStarted}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-[#00D09C] hover:bg-[#00c090] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignIn}
                  className="px-3 py-2 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1E2330] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={handleGetStarted}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-[#00D09C] hover:bg-[#00c090] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Black Background Section (Market Status & Indices Ribbon) placed below the main header */}
        <div className="bg-[#12161F] text-gray-300 text-xs py-1.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Clean Status Badge without cramped inner text */}
            <div
              className="flex items-center gap-2 text-[11px] shrink-0 cursor-default select-none"
              title={marketStatus.subText}
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${marketStatus.isOpen ? 'bg-[#00D09C] animate-pulse' : 'bg-amber-400'}`} />
              <span className={`font-bold tracking-wide ${marketStatus.isOpen ? 'text-[#00D09C]' : 'text-amber-400'}`}>
                {marketStatus.statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums overflow-x-auto max-w-full py-0.5 no-scrollbar">
              {indices.slice(0, 3).map((idx) => {
                const isUp = idx.change >= 0;
                return (
                  <div key={idx.symbol} className="flex items-center gap-1.5 shrink-0">
                    <span className="font-semibold text-gray-300">{idx.name}</span>
                    <span className="text-white font-bold">₹{idx.value.toLocaleString('en-IN')}</span>
                    <span className={isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'}>
                      {isUp ? '+' : ''}
                      {idx.change.toFixed(2)} ({isUp ? '+' : ''}
                      {idx.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION WITH VIRTUAL PORTFOLIO PREVIEW */}
      <section className="pt-28 sm:pt-36 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
              <span>Educational simulator only</span>
              <span>·</span>
              <span>No real money trading</span>
              <span>·</span>
              <span>No investment advice</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.08]">
              Learn Trading With <br className="hidden sm:inline" />
              <span className="text-[#00D09C]">Virtual Money</span>.
            </h1>

            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
              An authentic paper-trading simulator where users practice equity and intraday trading using virtual funds and live market quotes. No real-money trading, deposits, withdrawals, or investment advice is provided.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleGetStarted}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#00D09C] hover:bg-[#00c090] shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#how-it-works"
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1A1F2B] border border-gray-200 dark:border-[#282E3E] hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                View How Simulation Works
              </a>
            </div>

            {/* Checkmark Bullets */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-600 dark:text-gray-400 pt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C]" />
                <span>Virtual funds only (Up to 10L)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C]" />
                <span>Educational purpose</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C]" />
                <span>Risk-free learning</span>
              </span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Virtual Portfolio Card Preview */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-[#161A24] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-[#242A38] relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#222736]">
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Virtual Portfolio
                  </div>
                  <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-0.5">
                    ₹10,00,000.00
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Today's P&L</div>
                  <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-[#00D09C] bg-emerald-50 dark:bg-[#132A22] px-2.5 py-1 rounded-lg border border-[#00D09C]/30 mt-0.5 inline-block">
                    +₹8,420.50 (+0.84%)
                  </div>
                </div>
              </div>

              {/* Mini Session Line Chart */}
              <div className="py-4">
                <div className="relative h-28 w-full">
                  <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D09C" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00D09C" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 70 Q 60 40, 120 55 T 240 30 T 340 45 L 400 20 L 400 100 L 0 100 Z"
                      fill="url(#heroGradient)"
                    />
                    <path
                      d="M 0 70 Q 60 40, 120 55 T 240 30 T 340 45 L 400 20"
                      fill="none"
                      stroke="#00D09C"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Live Pulsing Dot */}
                    <circle cx="400" cy="20" r="4" fill="#00D09C" />
                    <circle cx="400" cy="20" r="8" fill="#00D09C" opacity="0.3" className="animate-ping" />
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1">
                  <span>09:15 AM (Open)</span>
                  <span>11:30 AM</span>
                  <span>01:30 PM</span>
                  <span>03:30 PM (Close)</span>
                </div>
              </div>

              {/* 4 Mini Stock Tickers */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-[#222736]">
                {showcaseStocks.slice(0, 4).map((s) => {
                  const isUp = s.change >= 0;
                  return (
                    <div
                      key={s.symbol}
                      onClick={() => handleLaunchTradeStock(s.symbol)}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1E2330] hover:bg-emerald-50/40 dark:hover:bg-[#1A2E26] border border-gray-100 dark:border-[#272D3D] transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">
                          {s.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {s.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                        ₹{s.price.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Footer Button */}
              <div className="pt-4">
                <button
                  onClick={handleGetStarted}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-[#00D09C] bg-emerald-50 dark:bg-[#132A22] hover:bg-emerald-100 dark:hover:bg-[#19362C] border border-[#00D09C]/30 transition-colors cursor-pointer"
                >
                  Get Started →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. IMPORTANT PLATFORM NOTICE (SEBI / EDUCATIONAL NOTICE) */}
      <section className="py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-[#131B2A] border border-blue-200 dark:border-blue-900/60 flex items-start gap-3.5 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold">Important Platform Notice: </span>
              <span>
                This platform is not a stock broker, investment adviser, research analyst, portfolio manager, or SEBI-registered intermediary. The platform is designed solely for education and simulation. All trades are executed using virtual funds and do not result in real securities transactions.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIVE STOCK TICKER STRIP (CONTINUOUS MOVING MARQUEE) */}
      <section className="relative w-full py-4 border-y border-gray-200 dark:border-[#202533] bg-white dark:bg-[#12161F] overflow-hidden select-none">
        {/* Soft edge gradient masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-[#12161F] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-[#12161F] to-transparent z-10" />

        {/* Marquee Continuous Running Track (Reduced speed: 120s for smooth, leisurely reading) */}
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
          {/* Track 1 */}
          <div className="flex items-center gap-8 shrink-0 pr-8">
            {tickerList.map((s, i) => {
              const isUp = s.change >= 0;
              return (
                <div
                  key={`t1-${s.symbol}-${i}`}
                  onClick={() => handleLaunchTradeStock(s.symbol)}
                  className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity shrink-0"
                >
                  <span className="font-extrabold text-gray-900 dark:text-white">{s.symbol}</span>
                  <span className="font-mono tabular-nums text-gray-600 dark:text-gray-300">
                    ₹{s.price.toFixed(2)}
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[11px] font-bold ${
                      isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {s.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-gray-300 dark:text-gray-700 ml-4">·</span>
                </div>
              );
            })}
          </div>

          {/* Track 2 (Exact duplicate for seamless infinite loop) */}
          <div className="flex items-center gap-8 shrink-0 pr-8" aria-hidden="true">
            {tickerList.map((s, i) => {
              const isUp = s.change >= 0;
              return (
                <div
                  key={`t2-${s.symbol}-${i}`}
                  onClick={() => handleLaunchTradeStock(s.symbol)}
                  className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity shrink-0"
                >
                  <span className="font-extrabold text-gray-900 dark:text-white">{s.symbol}</span>
                  <span className="font-mono tabular-nums text-gray-600 dark:text-gray-300">
                    ₹{s.price.toFixed(2)}
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[11px] font-bold ${
                      isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {s.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-gray-300 dark:text-gray-700 ml-4">·</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. HOW SIMULATION WORKS (INTERACTIVE STEPPER FORMAT) */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-gray-50/60 dark:bg-[#0B0E14] border-b border-gray-200 dark:border-[#202533] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step-by-Step Simulation Flow</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              How Simulation Works on <br className="hidden sm:inline" />
              <span className="text-[#00D09C]">My Paper Trade</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Experience true-to-life Indian market mechanics without risking a single rupee. From instant virtual capital setup to live tick execution in 5 simple steps.
            </p>
          </div>

          {/* Stepper Navigation Indicator Bar */}
          <div className="bg-white dark:bg-[#151923] p-3 sm:p-4 rounded-3xl border border-gray-200 dark:border-[#232A3B] shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { step: 0, num: '01', title: 'Virtual Capital', desc: 'Up to ₹10L Credit' },
                { step: 1, num: '02', title: 'Market Feeds', desc: 'NSE/BSE Equities' },
                { step: 2, num: '03', title: 'Order Execution', desc: 'Delivery & 5x MIS' },
                { step: 3, num: '04', title: 'Track Live P&L', desc: 'Real-time Returns' },
                { step: 4, num: '05', title: 'Recharge & Reset', desc: 'Unlimited Learning' },
              ].map((item) => {
                const isActive = activeStep === item.step;
                const isPassed = activeStep > item.step;
                return (
                  <button
                    key={item.step}
                    onClick={() => setActiveStep(item.step)}
                    className={`relative p-3 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-[#132A22] border-2 border-[#00D09C] shadow-sm'
                        : isPassed
                        ? 'bg-gray-50/70 dark:bg-[#1A202E] border border-emerald-500/30 hover:border-[#00D09C]/60'
                        : 'bg-transparent border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1A202E]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                          isActive
                            ? 'bg-[#00D09C] text-white shadow-xs'
                            : isPassed
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-[#00D09C]'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {isPassed ? '✓' : item.num}
                      </span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-extrabold text-[#00D09C] tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold truncate ${
                          isActive
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Showcase: Two Column Layout */}
          <div className="bg-white dark:bg-[#141822] rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-[#22293A] shadow-xl">
            {/* Step 0: Set Virtual Capital */}
            {activeStep === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] text-xs font-bold">
                    STEP 01 OF 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Instant Virtual Cash Setup <br />
                    <span className="text-[#00D09C]">Up to ₹10,00,000 (10L Limit)</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Get started in seconds with simulated starting capital. Verify with 1-click Google Sign-In or secure Email OTP authentication powered by Firebase. No bank account, credit card, or KYC required.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 pt-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Choose presets: ₹1,00,000, ₹2,00,000, ₹5,00,000 or custom up to ₹10 Lakhs max limit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Firebase Auth with Google 1-tap sign-in and verified 6-digit email OTP</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>100% Risk-Free: Zero real-money deposits, withdrawals, or debit charges</span>
                    </li>
                  </ul>
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Next: Market Feeds</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleGetStarted}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-[#1E2433] hover:bg-gray-200 dark:hover:bg-[#283145] text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      Try Sign Up Now
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup: Wallet & Auth Preview */}
                <div className="lg:col-span-6 bg-gray-50 dark:bg-[#191F2C] p-6 rounded-2xl border border-gray-200 dark:border-[#283145] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#283145]">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#00D09C]" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">Starting Paper Wallet</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#00D09C] font-extrabold">
                      Max Limit: ₹10,00,000
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#131720] border-2 border-[#00D09C] shadow-xs">
                      <div className="text-[10px] text-gray-400">Popular Choice</div>
                      <div className="font-mono text-base font-black text-[#00D09C]">₹5,00,000</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Moderate Capital</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145]">
                      <div className="text-[10px] text-gray-400">Pro Sandbox</div>
                      <div className="font-mono text-base font-black text-gray-900 dark:text-white">₹10,00,000</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Max Wallet Allowed</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#00D09C] font-bold text-xs">
                        G
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Google & OTP Authentication</div>
                        <div className="text-[10px] text-gray-400">Firebase Auth · Session Preserved</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#00D09C] bg-[#00D09C]/10 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Discover Real Equities */}
            {activeStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] text-xs font-bold">
                    STEP 02 OF 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Live NSE & BSE Market Feeds <br />
                    <span className="text-[#00D09C]">Official Exchange Timings</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Practice across 25+ top Indian stocks and benchmark indices. Live during market hours (09:15 AM - 03:30 PM IST), and strictly frozen at closing prices post-market so prices never wander unnaturally.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 pt-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Explore NIFTY 50, Top 20 Gainers, and Top 20 Losers in clean tabs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Realistic market hours clock: Pre-open, Live Market, and Post-Market status</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Interactive charts: 1D, 1W, 1M, 1Y line and candlestick views</span>
                    </li>
                  </ul>
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep(0)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-[#1E2433] hover:bg-gray-200 dark:hover:bg-[#283145] text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Next: Order Execution</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup: Equities Discovery Table */}
                <div className="lg:col-span-6 bg-gray-50 dark:bg-[#191F2C] p-5 rounded-2xl border border-gray-200 dark:border-[#283145] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#283145]">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#00D09C]" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">NSE Live Feed</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-[#00D09C] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#00D09C] animate-pulse" />
                      09:15 AM - 03:30 PM IST
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { sym: 'RELIANCE', name: 'Reliance Industries', price: '₹2,742.60', chg: '+1.60%', up: true },
                      { sym: 'TCS', name: 'Tata Consultancy Services', price: '₹3,980.20', chg: '+0.85%', up: true },
                      { sym: 'HDFCBANK', name: 'HDFC Bank Ltd', price: '₹1,745.50', chg: '-0.42%', up: false },
                    ].map((row) => (
                      <div
                        key={row.sym}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#131720] border border-gray-100 dark:border-[#262E40] flex items-center justify-between text-left"
                      >
                        <div>
                          <div className="font-extrabold text-xs text-gray-900 dark:text-white">{row.sym}</div>
                          <div className="text-[10px] text-gray-400">{row.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-xs text-gray-900 dark:text-white">{row.price}</div>
                          <div className={`text-[10px] font-mono font-bold ${row.up ? 'text-[#00D09C]' : 'text-rose-500'}`}>
                            {row.chg}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Order Execution */}
            {activeStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] text-xs font-bold">
                    STEP 03 OF 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Order Execution Engine <br />
                    <span className="text-[#00D09C]">Delivery (CNC) vs Intraday 5x (MIS)</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Test both positional investment and intraday day trading. Choose Delivery CNC for full cash purchases or Intraday MIS for 5x leverage on your buying power.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 pt-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Market Orders: Execute instantly at the prevailing live price</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Limit Orders: Automatically queued and executed when market reaches your target</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>5x Margin Leverage: Block only 20% margin on Intraday positions</span>
                    </li>
                  </ul>
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-[#1E2433] hover:bg-gray-200 dark:hover:bg-[#283145] text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Next: Track Live P&L</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup: Order Slip */}
                <div className="lg:col-span-6 bg-gray-50 dark:bg-[#191F2C] p-6 rounded-2xl border border-gray-200 dark:border-[#283145] space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#283145]">
                    <div>
                      <span className="font-extrabold text-sm text-gray-900 dark:text-white">RELIANCE</span>
                      <span className="text-xs text-gray-400 ml-1.5">NSE</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#00D09C]">₹2,742.60</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-[#132A22] border-2 border-[#00D09C] text-center">
                      <div className="text-[10px] font-bold text-[#00D09C] uppercase">Delivery (CNC)</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">1x Cash Required</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145] text-center">
                      <div className="text-[10px] font-bold text-gray-500 uppercase">Intraday (MIS)</div>
                      <div className="text-xs text-emerald-600 dark:text-[#00D09C] font-bold">5x Margin Power</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145] flex items-center justify-between">
                    <span className="text-xs text-gray-500">Simulated Quantity</span>
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">10 Shares</span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#00D09C] hover:bg-[#00c090] transition-colors cursor-pointer"
                  >
                    Simulate BUY Order (₹27,426.00)
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Track Live P&L */}
            {activeStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] text-xs font-bold">
                    STEP 04 OF 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Real-Time Portfolio & Returns <br />
                    <span className="text-[#00D09C]">Day P&L & Quick Positions Exit</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Track every rupee of your unrealized and realized returns tick-by-tick. Understand how position sizing, holding duration, and market volatility impact your bottom line.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 pt-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Live portfolio valuation with Day P&L and Total Returns breakdown</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Holdings inventory: Average purchase price, current value, and % gain</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Groww-style Buy, Sell to exit, and 1-Click Exit for Intraday positions</span>
                    </li>
                  </ul>
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-[#1E2433] hover:bg-gray-200 dark:hover:bg-[#283145] text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Next: Recharge & Backtest</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup: Live P&L Card */}
                <div className="lg:col-span-6 bg-gray-50 dark:bg-[#191F2C] p-6 rounded-2xl border border-gray-200 dark:border-[#283145] space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#283145]">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Live Portfolio P&L</div>
                      <div className="font-mono text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                        ₹5,48,250.00
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#00D09C] bg-emerald-50 dark:bg-[#132A22] px-2.5 py-1 rounded-lg border border-[#00D09C]/30">
                        +₹8,420.50 (+1.56%)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-gray-900 dark:text-white">TCS</span>
                        <span className="text-[10px] text-gray-400 ml-1.5 font-mono">10 Qty · Avg ₹3,920.00</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-bold text-[#00D09C]">+₹602.00</div>
                        <div className="text-[10px] text-[#00D09C]">+1.53%</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-[#222736] flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Status: Intraday Position</span>
                      <button className="text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:text-[#EB5B5B]">
                        Exit Position →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Recharge & Strategy Testing */}
            {activeStep === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] text-xs font-bold">
                    STEP 05 OF 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Unlimited Practice & Recharge <br />
                    <span className="text-[#00D09C]">Reset & Test New Setups</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Unlike real trading where mistakes cause painful financial losses, paper trading is designed for learning from trial and error. Add funds back up to ₹10 Lakhs or wipe the slate clean with a 1-click portfolio reset.
                  </p>
                  <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 pt-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Instant Add Money feature up to the strictly enforced ₹10 Lakh wallet limit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Reset Portfolio button allows clean testing of swing, intraday, or breakout rules</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                      <span>Zero psychological pressure: Build confidence and risk discipline before real markets</span>
                    </li>
                  </ul>
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-[#1E2433] hover:bg-gray-200 dark:hover:bg-[#283145] text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={handleGetStarted}
                      className="px-6 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <span>Start Paper Trading Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup: Wallet Recharge & Reset */}
                <div className="lg:col-span-6 bg-gray-50 dark:bg-[#191F2C] p-6 rounded-2xl border border-gray-200 dark:border-[#283145] space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#283145]">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#00D09C]" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">Wallet Management</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 font-semibold">Safe Sandbox</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#131720] border border-gray-200 dark:border-[#283145] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-400">Available Virtual Cash</div>
                      <div className="font-mono text-lg font-black text-[#00D09C]">₹10,00,000.00</div>
                    </div>
                    <button className="px-3 py-1.5 bg-[#00D09C] text-white rounded-lg text-xs font-bold">
                      + Add Money
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-[#132A22]/50 border border-[#00D09C]/20 flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Need a fresh start?</span>
                    <button className="font-bold text-[#00D09C] hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Portfolio</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. POPULAR STOCKS GRID */}
      <section id="popular-stocks" className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
                Practice on popular stocks
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
                Simulate trades on stocks India watches
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All prices shown are live NSE market data used for simulation only. No real orders are placed.
              </p>
            </div>

            <button
              onClick={handleGetStarted}
              className="text-xs font-bold text-[#00D09C] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View all 25+ stocks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showcaseStocks.map((s) => {
              const isUp = s.change >= 0;
              return (
                <div
                  key={s.symbol}
                  className="bg-white dark:bg-[#161A24] p-5 rounded-2xl border border-gray-200 dark:border-[#242A38] hover:border-[#00D09C] dark:hover:border-[#00D09C]/60 transition-all flex flex-col justify-between shadow-xs text-left"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-base text-gray-900 dark:text-white">
                        {s.symbol}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#202533] text-gray-500 dark:text-gray-400 font-bold">
                        {s.exchange}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {s.name}
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="font-mono tabular-nums text-xl font-black text-gray-900 dark:text-white">
                        ₹{s.price.toFixed(2)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-xs font-bold ${
                          isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {s.change.toFixed(2)} ({isUp ? '+' : ''}
                        {s.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={() => handleLaunchTradeStock(s.symbol)}
                      className="w-full py-2.5 rounded-xl font-bold text-xs text-[#00D09C] bg-emerald-50 dark:bg-[#132A22] hover:bg-emerald-100 dark:hover:bg-[#18362B] border border-[#00D09C]/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Simulate Trade</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. HIGH IMPACT KEY METRICS */}
      <section className="py-12 border-y border-gray-200 dark:border-[#202533] bg-white dark:bg-[#12161F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="font-mono tabular-nums text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
                ₹10,00,000
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Max Virtual Balance (10L Limit)
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-mono tabular-nums text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
                25+
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                NSE Bluechip Equities
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-mono tabular-nums text-2xl sm:text-4xl font-black text-[#00D09C]">
                ₹0
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Real Money Required
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-mono tabular-nums text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
                100%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Risk-Free Market Sandbox
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRACTICE-GRADE CHARTS SHOWCASE */}
      <section id="practice-charts" className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Chart Preview */}
          <div className="lg:col-span-7 bg-white dark:bg-[#161A24] p-6 rounded-3xl border border-gray-200 dark:border-[#242A38] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#222736]">
              <div>
                <div className="text-[11px] font-semibold text-gray-400">NIFTY 50 (Simulator)</div>
                <div className="font-mono tabular-nums text-2xl font-black text-gray-900 dark:text-white flex items-baseline gap-2">
                  <span>24,812.45</span>
                  <span className="text-xs font-bold text-[#00D09C]">+103.20 (+0.42%)</span>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#202533] rounded-lg text-xs font-mono">
                {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActivePreviewTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      activePreviewTimeframe === tf
                        ? 'bg-white dark:bg-[#161A24] text-gray-900 dark:text-white font-bold shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart Graphic */}
            <div className="py-6">
              <div className="h-52 w-full relative">
                <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="chartPreviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D09C" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#00D09C" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="currentColor" className="text-gray-100 dark:text-[#222736]" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="currentColor" className="text-gray-100 dark:text-[#222736]" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-gray-100 dark:text-[#222736]" strokeDasharray="3 3" />

                  {/* Previous close dashed line */}
                  <line x1="0" y1="95" x2="500" y2="95" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

                  {/* Curve based on selected timeframe */}
                  <path
                    d={
                      activePreviewTimeframe === '1D'
                        ? 'M 0 95 Q 80 60, 160 85 T 320 40 T 450 50 L 500 30 L 500 160 L 0 160 Z'
                        : activePreviewTimeframe === '1W'
                        ? 'M 0 110 Q 100 40, 220 70 T 380 30 L 500 45 L 500 160 L 0 160 Z'
                        : activePreviewTimeframe === '1M'
                        ? 'M 0 120 Q 120 90, 250 50 T 400 65 L 500 25 L 500 160 L 0 160 Z'
                        : 'M 0 130 Q 150 110, 280 40 T 420 50 L 500 15 L 500 160 L 0 160 Z'
                    }
                    fill="url(#chartPreviewGrad)"
                  />
                  <path
                    d={
                      activePreviewTimeframe === '1D'
                        ? 'M 0 95 Q 80 60, 160 85 T 320 40 T 450 50 L 500 30'
                        : activePreviewTimeframe === '1W'
                        ? 'M 0 110 Q 100 40, 220 70 T 380 30 L 500 45'
                        : activePreviewTimeframe === '1M'
                        ? 'M 0 120 Q 120 90, 250 50 T 400 65 L 500 25'
                        : 'M 0 130 Q 150 110, 280 40 T 420 50 L 500 15'
                    }
                    fill="none"
                    stroke="#00D09C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="500" cy={activePreviewTimeframe === '1D' ? 30 : activePreviewTimeframe === '1W' ? 45 : activePreviewTimeframe === '1M' ? 25 : 15} r="4" fill="#00D09C" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mt-2">
                <span>09:15 AM IST (NSE Open)</span>
                <span className="flex items-center gap-1.5 text-[#00D09C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] inline-block animate-ping" />
                  <span>Real Market Candles (NSE)</span>
                </span>
                <span>03:30 PM IST (NSE Close)</span>
              </div>
            </div>
          </div>

          {/* Right Explanations */}
          <div className="lg:col-span-5 space-y-5 text-left">
            <div className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
              Practice-grade charts
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              Live market charts. <br />
              Real learning experience.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Practice with live NSE market data using the same chart tools used across the industry — candlesticks, indicators, multi-timeframes — all within a fully simulated environment.
            </p>

            <ul className="space-y-3 text-xs text-gray-700 dark:text-gray-300 pt-2 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                <span>Tick-level NSE data for realistic simulation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                <span>Live 09:15 AM - 03:30 PM IST session alignment</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                <span>Both interactive Line and Candlestick modes</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                <span>One-click simulated order entry with instant execution</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={handleGetStarted}
                className="px-5 py-3 rounded-xl font-bold text-xs text-white bg-[#00D09C] hover:bg-[#00c090] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PRACTICE ON MAJOR INDICES */}
      <section id="indices" className="py-16 px-4 sm:px-6 bg-white dark:bg-[#12161F] border-y border-gray-200 dark:border-[#202533]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
                Benchmark indices
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  marketStatus.isOpen
                    ? 'bg-emerald-50 text-[#00D09C] border-[#00D09C]/30 dark:bg-emerald-950/40'
                    : 'bg-amber-50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 dark:bg-amber-950/40'
                }`}
              >
                {marketStatus.isOpen ? '● Live Exchange Data' : `○ ${marketStatus.statusLabel} · Official Closing Values`}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
              Practice on major indices
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {marketStatus.isOpen
                ? 'Live NSE & BSE index benchmarks during trading hours. Data updates directly from the exchange.'
                : 'Market is currently closed (09:15 AM - 03:30 PM IST session ended). Showing official NSE/BSE closing values.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {indices.map((idx) => {
              const isUp = idx.change >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="bg-gray-50 dark:bg-[#161A24] p-4 rounded-2xl border border-gray-200 dark:border-[#242A38] space-y-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                      {idx.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isUp ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="font-mono tabular-nums text-lg font-black text-gray-900 dark:text-white">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  {/* Sparkline */}
                  <div className="h-9 w-full">
                    <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                      <path
                        d={
                          isUp
                            ? 'M 0 18 Q 30 12, 50 14 T 80 8 L 100 4'
                            : 'M 0 6 Q 30 10, 50 8 T 80 16 L 100 20'
                        }
                        fill="none"
                        stroke={isUp ? '#00D09C' : '#EB5B5B'}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. VALUE PROPOSITION PILLARS */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-xl text-left">
            <div className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
              Educational Simulator
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
              A risk-free educational simulator for Indian market learners.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white dark:bg-[#161A24] p-7 rounded-3xl border border-gray-200 dark:border-[#242A38] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                Learn by simulating
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Skip theory alone. Simulate order placement against live NSE market data and learn from your own virtual P&L with zero real-money risk.
              </p>
            </div>

            <div className="bg-white dark:bg-[#161A24] p-7 rounded-3xl border border-gray-200 dark:border-[#242A38] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                Zero financial risk
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Every trade is virtual. Experiment with strategies using simulated funds up to ₹10 Lakhs. No real deposits, no withdrawals — ever.
              </p>
            </div>

            <div className="bg-white dark:bg-[#161A24] p-7 rounded-3xl border border-gray-200 dark:border-[#242A38] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                Authentic mechanics
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Experience real market mechanics: Delivery vs 5x Intraday MIS leverage, live profit and loss calculation, and customizable watchlists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. COMPLETE TRADING DESK FEATURES (6 BLOCKS) */}
      <section id="features" className="py-16 px-4 sm:px-6 bg-white dark:bg-[#12161F] border-y border-gray-200 dark:border-[#202533]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-left">
            <div className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
              Simulation tools
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
              A complete trading desk, simulated.
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              All features are designed for education and practice only. No real-money trading, investment advice, or securities execution is provided.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Paper Trading
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Real virtual capital to practice equities and derivatives simulation with realistic order matching.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Live NSE Data
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Real market quotes used for simulation — regular market hours, day open, high, low, and previous close.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Intraday & Delivery
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Toggle between standard CNC Delivery or MIS Intraday with realistic 5x leverage and margin requirements.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Watchlists
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Track and study 25+ symbols across sectors, market capitalization, and personalized watchlists.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Portfolio Tracking
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Track virtual holdings, asset allocation, sector breakdown, and real-time unrealized and realized P&L.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161A24] border border-gray-200 dark:border-[#242A38] space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#132A22] text-[#00D09C] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Wallet (₹10L Cap)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Add fake cash anytime to your wallet up to the ₹10 Lakhs ceiling, or reset your entire portfolio back to scratch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8 text-left">
          <div className="text-center space-y-2">
            <div className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">
              Common Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clear answers about our educational paper trading sandbox and features.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#161A24] rounded-2xl border border-gray-200 dark:border-[#242A38] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {faq.q}
                    </span>
                    <span className="text-gray-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-[#202533]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 13. BOTTOM CTA BANNER */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xl relative overflow-hidden">
            <div className="space-y-2 max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to practice trading on Indian markets?
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Join our sandbox today. Get up to ₹10,00,000 in simulated funds and start testing your delivery and intraday strategies with real NSE data.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 rounded-xl font-bold text-sm bg-white text-gray-900 hover:bg-gray-100 shadow-md transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 14. POLISHED FOOTER (NO PRICING SECTION OR PRICING PAGE) */}
      <footer className="bg-white dark:bg-[#12161F] border-t border-gray-200 dark:border-[#202533] py-12 px-4 sm:px-6 text-xs text-gray-500 dark:text-gray-400 text-left">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-[#202533]">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="cursor-pointer shrink-0"
              title="My Paper Trade Homepage"
            >
              <GrowwLogo />
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
              <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#popular-stocks" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Stocks
              </a>
              <a href="#indices" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Indices
              </a>
              <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                FAQ
              </a>
              <button
                onClick={handleGetStarted}
                className="text-[#00D09C] font-bold hover:underline cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Full Regulatory Disclaimer */}
          <div className="space-y-2 text-[11px] leading-relaxed text-gray-400">
            <p>
              <strong>Disclaimer:</strong> This application is a paper trading simulator created strictly for educational, informational, and strategy backtesting purposes. No real securities, equities, derivatives, commodities, or currencies are purchased or sold. All financial balances, portfolio holdings, orders, and gains or losses displayed are 100% simulated paper credits.
            </p>
            <p>
              This platform is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, sub-broker, portfolio manager, or investment adviser. Nothing on this website constitutes investment advice, financial guidance, tax advisory, or a recommendation to buy or sell any financial instrument.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-[#202533] text-[11px]">
            <div>© {new Date().getFullYear()} My Paper Trade. Educational Market Sandbox.</div>
            <div>Maximum Paper Wallet Balance: ₹10,00,000 (10 Lakhs)</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
