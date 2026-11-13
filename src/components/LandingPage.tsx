import { MarketingHeader } from './navigation/MarketingHeader';
import { AppLink, navigate } from '../lib/navigation';
import { LearningSection } from './LearningSection';
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
  Info,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Layers,
  Eye,
  Activity,
  Sparkles,
  RefreshCw,
  Radar,
  Search,
  BookOpen,
  GraduationCap,
  Target,
  Clock,
  Award,
  ChartCandlestick,
} from 'lucide-react';

const DEMO_SWING_PICKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    confidence: 84,
    status: 'Confirmed Setup',
    buyAt: '₹1,336',
    target: '₹1,428',
    gainPct: '+6.9%',
    stopLoss: '₹1,298',
    rr: '2.4x',
    reason: 'Backtested 20-day resistance breakout + volume confirmation',
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    confidence: 79,
    status: 'Confirmed Setup',
    buyAt: '₹1,284',
    target: '₹1,365',
    gainPct: '+6.3%',
    stopLoss: '₹1,248',
    rr: '2.2x',
    reason: 'Backtested EMA 20/50/200 golden alignment + chart bounce',
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    confidence: 74,
    status: 'Watchlist Setup',
    buyAt: '₹3,980',
    target: '₹4,210',
    gainPct: '+5.8%',
    stopLoss: '₹3,875',
    rr: '2.1x',
    reason: 'Double bottom chart pattern with rising RSI momentum',
  },
];

const DEMO_INTRADAY_PICKS = [
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    confidence: 82,
    entry: '₹784.50',
    target: '₹802.00',
    stopLoss: '₹776.00',
    status: 'Open · Running',
    reason: '15-min opening range breakout above VWAP with 2.3x volume',
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    confidence: 78,
    entry: '₹832.00',
    target: '₹848.50',
    stopLoss: '₹824.50',
    status: 'Target Reached (+1.98%)',
    reason: 'Strong banking momentum + 15-min bullish flag breakout',
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    confidence: 75,
    entry: '₹1,745.00',
    target: '₹1,774.00',
    stopLoss: '₹1,731.00',
    status: 'Open · Running',
    reason: 'Price reclaimed day’s average traded price (VWAP) with buyers stepping in',
  },
];

export const LandingPage: React.FC = () => {
  const {
    user,
    setShowLandingPage,
    setSelectedStock,
    selectStockBySymbol,
    stocks,
    indices,
    marketStatus,
    setCurrentTab,
    openAuthModal,
  } = useTrading();

  // Hero Preview Tab: 'swing' | 'intraday' | 'analysis'
  const [heroTab, setHeroTab] = useState<'swing' | 'intraday' | 'analysis'>('swing');

  // Screener Deep-Dive Tab (50% weightage section)
  const [screenerTab, setScreenerTab] = useState<'swing' | 'intraday' | 'analysis'>('swing');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
      a: 'NiftyLens brings together three connected tools in one place: (1) Signal Screener & Stock Analysis to find bullish Swing and Intraday stocks across Nifty 500 or check any NSE stock in plain English, (2) Virtual Trading Desk to practice Delivery and 5x Intraday orders with up to ₹10 Lakhs virtual cash, and (3) Pattern Library & Guess the Chart to learn 28+ chart patterns and test your eye.',
    },
    {
      q: 'How does the Signal Screener pick stocks?',
      a: 'For Swing trading (holding a few days to 2 weeks), we scan all Nifty 500 stocks for upward trends, breakouts, and strong buying volume, then score each stock from 0 to 100 and calculate a Suggested Buy Price, Target Price, and Stop-Loss. For Intraday trading, we scan the 100 most-traded NSE stocks on 15-minute charts and auto-refresh every 5 minutes during market hours.',
    },
    {
      q: 'What do I see when I search a stock in Stock Analysis?',
      a: 'Type any Nifty 500 stock (like Reliance, TCS, or HDFC Bank) to see a plain-English verdict (Good time to buy, Wait for a better price, or Avoid for now), a confidence score, buy price range, target, stop-loss, an interactive price chart with support/resistance levels, company revenue & profit, and how our signals performed on that stock over the past 2 years.',
    },
    {
      q: 'How does the Virtual Trading Desk work?',
      a: 'You get up to ₹10,00,000 (10 Lakhs) in virtual paper cash. You can place Delivery (CNC) or 5x leveraged Intraday (MIS) Market and Limit orders on real NSE stock prices, see realistic brokerage and government tax breakdowns, and track your live P&L with zero real money at risk.',
    },
    {
      q: 'How do the Chart Pattern Library and Guess the Chart Quiz help beginners?',
      a: 'The Learn page breaks down 28+ classic chart patterns with a clear title, plain-English description, why the chart pattern works, and exact entry, stop-loss, and target rules — followed by an interactive chart where you can reveal the next candles. Clicking "Guess the Chart" lets you test your skill on real-looking setups.',
    },
    {
      q: 'Is any real money or SEBI brokerage account involved?',
      a: 'No. NiftyLens is strictly for learning, screening research, and risk-free paper trading simulation. All trades use virtual cash, and nothing on the platform is investment advice.',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans transition-colors selection:bg-[#00D09C]/20 selection:text-[#00D09C]">
      <MarketingHeader />

      {/* 1. HERO SECTION — SCREENER-LED + COMPLETE 3-IN-1 SUITE */}
      <section className="pt-8 sm:pt-12 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Clear Value Proposition */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#00B386]/30 bg-[#00B386]/10 dark:border-[#00D09C]/30 dark:bg-[#00D09C]/10 px-3.5 py-1.5 text-xs font-extrabold text-[#008F6B] dark:text-[#00D09C]">
              <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
              <span>Nifty 500 Screener</span>
              <span>·</span>
              <span>Stock Analysis</span>
              <span>·</span>
              <span>₹10L Virtual Trading</span>
              <span>·</span>
              <span>Pattern Lab</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-[#15241D] dark:text-white tracking-tight leading-[1.07]">
              Backtested stock recommendations.<br />
              <span className="text-[#00B386] dark:text-[#00D09C]">Chart analysis & virtual practice.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed max-w-2xl">
              <strong>NiftyLens</strong> uses <strong>historical backtested patterns and multi-indicator chart analysis</strong> across all Nifty 500 stocks to pick the best <strong>Swing & Intraday stock recommendations</strong> for you — then lets you practice every setup risk-free on a <strong>Groww-style virtual desk</strong> and master <strong>chart patterns</strong> in plain English.
            </p>

            {/* Primary 3-App Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <AppLink
                href="/screener"
                className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-[#04261C] bg-[#00D09C] hover:bg-[#00B386] shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Radar className="w-4 h-4" />
                <span>Open Signal Screener</span>
                <ArrowRight className="w-4 h-4" />
              </AppLink>

              <button
                onClick={handleGetStarted}
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-white bg-[#0C1D16] hover:bg-[#12281F] border border-[#1D3A2D] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ChartCandlestick className="w-4 h-4 text-[#00D09C]" />
                <span>Virtual Trading Desk</span>
              </button>

              <AppLink
                href="/learn"
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#15241D] dark:text-[#E9F2EE] bg-white dark:bg-[#111C17] border border-[#CFDCD5] dark:border-[#20332A] hover:border-[#00B386] dark:hover:border-[#00D09C] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Learn Charts & Quiz</span>
              </AppLink>
            </div>

            {/* Simple Weightage / Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <Radar className="w-4 h-4" />
                  <span>1. Signal Screener</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Swing picks, 15-min intraday alerts & full stock health check.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <ChartCandlestick className="w-4 h-4" />
                  <span>2. Virtual Trading</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Practice Delivery & 5x Intraday with ₹10L virtual funds.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <GraduationCap className="w-4 h-4" />
                  <span>3. Learn & Quiz</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  28+ interactive chart patterns & Guess the Chart game.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Screener & Stock Analysis Live Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-[#E9F2EE] p-5 sm:p-6 shadow-2xl space-y-5">
              {/* Top Bar with Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1D3A2D]">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D09C] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
                    Backtested Pattern & Chart Analysis Engine · Nifty 500
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                    Stock Recommendations & Reference Levels
                  </div>
                </div>

                <div className="inline-flex rounded-xl bg-[#12281F] p-1 border border-[#1D3A2D]">
                  {[
                    { id: 'swing' as const, label: 'Swing Picks' },
                    { id: 'intraday' as const, label: 'Intraday 15m' },
                    { id: 'analysis' as const, label: 'Stock Check' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHeroTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        heroTab === tab.id
                          ? 'bg-[#00D09C] text-[#04261C] shadow-xs'
                          : 'text-[#9AB0A5] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Swing Picks Preview */}
              {heroTab === 'swing' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#9AB0A5]">
                    <span>Hold for a few days to 2 weeks · Sorted by Confidence Score</span>
                    <span className="font-mono text-[#00D09C] font-bold">500 NSE Stocks Scanned</span>
                  </div>
                  <div className="space-y-2.5">
                    {DEMO_SWING_PICKS.map((pick) => (
                      <div
                        key={pick.symbol}
                        className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] hover:border-[#00D09C]/50 p-3.5 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#00D09C]/15 text-[#00D09C] font-extrabold text-xs grid place-items-center">
                              {pick.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">{pick.symbol}</span>
                                <span className="rounded-full bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D09C]">
                                  {pick.status}
                                </span>
                              </div>
                              <div className="text-xs text-[#8FA99C]">{pick.reason}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-[#0C1D16] border border-[#1D3A2D] px-2.5 py-1 text-xs font-mono font-bold text-[#00D09C]">
                              Confidence {pick.confidence}/100
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1D3A2D] grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Rec. Entry</span>
                            <strong className="font-mono text-white">{pick.buyAt}</strong>
                          </div>
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Target</span>
                            <strong className="font-mono text-[#00D09C]">
                              {pick.target} ({pick.gainPct})
                            </strong>
                          </div>
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Stop-Loss</span>
                            <strong className="font-mono text-[#F0614A]">{pick.stopLoss}</strong>
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/screener/analysis?symbol=${pick.symbol}`)}
                              className="px-2.5 py-1 rounded-lg bg-[#163025] hover:bg-[#1D3D30] text-[11px] font-bold text-[#00D09C] cursor-pointer"
                            >
                              Analyse
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLaunchTradeStock(pick.symbol)}
                              className="px-2.5 py-1 rounded-lg bg-[#00D09C] hover:bg-[#00B386] text-[11px] font-extrabold text-[#04261C] cursor-pointer"
                            >
                              Trade
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Intraday 15m Preview */}
              {heroTab === 'intraday' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#9AB0A5]">
                    <span>15-minute chart breakouts · Auto-refreshes every 5 mins</span>
                    <span className="font-mono text-[#00D09C] font-bold">3:20 PM Same-Day Exit</span>
                  </div>
                  <div className="space-y-2.5">
                    {DEMO_INTRADAY_PICKS.map((pick) => (
                      <div
                        key={pick.symbol}
                        className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] hover:border-[#00D09C]/50 p-3.5 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{pick.symbol}</span>
                              <span className="rounded-full bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D09C]">
                                {pick.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#8FA99C] mt-0.5">{pick.reason}</p>
                          </div>
                          <span className="rounded-lg bg-[#0C1D16] border border-[#1D3A2D] px-2.5 py-1 text-xs font-mono font-bold text-[#00D09C]">
                            Score {pick.confidence}
                          </span>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-[#1D3A2D] grid grid-cols-4 gap-2 text-xs items-center">
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Entry</span>
                            <strong className="font-mono text-white">{pick.entry}</strong>
                          </div>
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Intraday Target</span>
                            <strong className="font-mono text-[#00D09C]">{pick.target}</strong>
                          </div>
                          <div>
                            <span className="text-[#7F9C8E] block text-[10px]">Stop-Loss</span>
                            <strong className="font-mono text-[#F0614A]">{pick.stopLoss}</strong>
                          </div>
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => navigate('/screener/intraday')}
                              className="px-3 py-1 rounded-lg bg-[#00D09C] text-[#04261C] text-[11px] font-extrabold cursor-pointer"
                            >
                              View Live →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Stock Check Preview */}
              {heroTab === 'analysis' && (
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-[#00D09C]/40 bg-[#11241C] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-[#00D09C] font-bold uppercase">NSE: RELIANCE · Energy</span>
                        <h4 className="text-lg font-extrabold text-white">Reliance Industries Ltd</h4>
                      </div>
                      <div className="text-right">
                        <div className="rounded-xl bg-[#00D09C]/20 border border-[#00D09C]/40 px-3 py-1 text-xs font-extrabold text-[#00D09C]">
                          Our View: Good Time to Buy
                        </div>
                        <span className="text-[11px] text-[#9AB0A5] mt-1 block">Confidence: 84 / 100</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#D6E6DE] leading-relaxed">
                      Price is trading above its 20-day and 50-day averages with strong buying volume and a confirmed breakout above resistance.
                    </p>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1D3A2D] text-xs">
                      <div>
                        <span className="text-[10px] text-[#7F9C8E] block">Buy Zone</span>
                        <strong className="font-mono text-white">₹1,330 – ₹1,342</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7F9C8E] block">Target 1</span>
                        <strong className="font-mono text-[#00D09C]">₹1,428 (+6.9%)</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7F9C8E] block">Stop-Loss</span>
                        <strong className="font-mono text-[#F0614A]">₹1,298 (-2.8%)</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7F9C8E] block">Reward : Risk</span>
                        <strong className="font-mono text-[#00D09C]">2.4x</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AB0A5] px-1">
                    <span>Includes Price Chart, Support/Resistance, Revenue & Profit, and 2-Yr Backtest</span>
                    <AppLink
                      href="/screener/analysis?symbol=RELIANCE"
                      className="font-extrabold text-[#00D09C] hover:underline"
                    >
                      Open Full Analysis →
                    </AppLink>
                  </div>
                </div>
              )}

              {/* Research Note inside Preview */}
              <div className="rounded-xl bg-[#12281F] border border-[#1D3A2D] px-3.5 py-2 text-[11px] text-[#9AB0A5] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
                <span>
                  <strong className="text-white">Note:</strong> Screened using backtested patterns & chart analysis. Do research once from your side before buying any recommendation.
                </span>
              </div>

              {/* Card Bottom Bar */}
              <div className="pt-2 border-t border-[#1D3A2D] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-[#9AB0A5]">
                  <AppLink href="/screener" className="hover:text-[#00D09C] font-semibold">
                    Swing Scanner →
                  </AppLink>
                  <AppLink href="/screener/intraday" className="hover:text-[#00D09C] font-semibold">
                    Intraday Scanner →
                  </AppLink>
                  <AppLink href="/screener/analysis" className="hover:text-[#00D09C] font-semibold">
                    Stock Analysis →
                  </AppLink>
                </div>
                <AppLink
                  href="/screener"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D09C] text-[#04261C] hover:bg-[#00B386] transition-colors"
                >
                  Launch Screener →
                </AppLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE INTEGRATED APPLICATIONS SECTION (KEEPING USER'S FAVORITE SECTION) */}
      <LearningSection onStartTrading={handleGetStarted} />

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
         4. PILLAR 1 (50% WEIGHTAGE): SIGNAL SCREENER & STOCK ANALYSIS
         ======================================================================= */}
      <section id="screener-suite" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto space-y-12">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
                <Radar className="w-3.5 h-3.5" />
                <span>Core Engine · Signal Screener & Stock Analysis</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
                Backtested patterns & chart analysis.<br />
                <span className="text-[#00B386] dark:text-[#00D09C]">Picking the best stock recommendations for you.</span>
              </h2>
              <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                Instead of manually checking hundreds of charts every evening, NiftyLens screens all <strong>Nifty 500 stocks</strong> using <strong>historical backtested patterns, candlestick structures, and technical chart analysis</strong> to surface high-confidence stock recommendations — while reminding you to always do your own research before acting.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AppLink
                href="/screener"
                className="px-5 py-3 rounded-xl bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B386] text-white dark:text-[#04261C] text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm"
              >
                <span>Open Swing Screener</span>
                <ArrowRight className="w-4 h-4" />
              </AppLink>
              <AppLink
                href="/screener/intraday"
                className="px-5 py-3 rounded-xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] hover:border-[#00D09C] text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Intraday 15m Picks</span>
              </AppLink>
              <AppLink
                href="/screener/analysis"
                className="px-5 py-3 rounded-xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] hover:border-[#00D09C] text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Analyse Any Stock</span>
              </AppLink>
            </div>
          </div>

          {/* 3 Screener Capabilities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Capability 1: Swing Trading Scanner */}
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
                  1. Swing Trading Scanner (Nifty 500)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Checks all 500 NSE stocks for upward price trends, volume breakouts, and momentum — then ranks the strongest bullish picks so you know what is ready to rise.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Confidence Score (0–100):</strong> See how strongly multiple indicators agree.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Ready to Buy vs Watchlist:</strong> Know whether to enter now or wait for confirmation.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Complete Plan:</strong> Buy price, target sell price, expected date, stop-loss & reward:risk.</span>
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

            {/* Capability 2: Live Intraday Scanner */}
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
                  2. Live Intraday Scanner (Top 100)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Watches the 100 most liquid Nifty stocks on 15-minute candles during market hours (9:15 AM – 3:30 PM IST) and flags sharp moves backed by heavy buying volume.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Auto-Refresh Every 5 Mins:</strong> Live countdown timer while NSE is open.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Live Trade Tracking:</strong> Tracks whether each pick is Open, Hit Target, or Stopped Out.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Last Session Replay:</strong> Even after market close, review the full day’s intraday results.</span>
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

            {/* Capability 3: Deep Stock Analysis */}
            <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D09C]/15 text-[#00B386] dark:text-[#00D09C] grid place-items-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <span className="rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-3 py-1 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
                    Simple + Advanced Modes
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[#15241D] dark:text-white">
                  3. Instant Stock Analysis (Any Stock)
                </h3>
                <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Have a stock in mind? Search any Nifty 500 company to get a complete health check combining technical trends, price levels, company financials, and past signal accuracy.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Clear Verdict:</strong> Plain-English <em>Buy</em>, <em>Wait</em>, or <em>Avoid</em> with buy zone & targets.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>Revenue, Profit & Balance Sheet:</strong> Yearly/Quarterly financials & key ratios.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                    <span><strong>2-Year Signal Backtest:</strong> See how often past signals on that stock hit target.</span>
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

          {/* Interactive Quick Stock Analysis Bar */}
          <div className="rounded-3xl border border-[#1D3A2D] bg-gradient-to-r from-[#0C1D16] via-[#122B21] to-[#0C1D16] p-6 sm:p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-lg">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#00D09C]">
                Try Instant Stock Check
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold">
                Click any popular NSE stock to see its live buy/wait verdict, price chart & financials:
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'ITC'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => navigate(`/screener/analysis?symbol=${sym}`)}
                  className="px-3.5 py-2 rounded-xl bg-[#163025] hover:bg-[#00D09C] text-[#E9F2EE] hover:text-[#04261C] border border-[#234737] font-mono text-xs font-extrabold transition-all cursor-pointer"
                >
                  {sym} →
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
         5. PILLAR 2 (30% WEIGHTAGE): GROWW-STYLE VIRTUAL TRADING DESK
         ======================================================================= */}
      <section
        id="virtual-trading"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-y border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1880px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Clear Explanation of Virtual Trading (30% Weightage) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
              <ChartCandlestick className="w-3.5 h-3.5" />
              <span>Practice Desk · ₹10,00,000 Virtual Capital</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
              Found a good stock pick?<br />
              <span className="text-[#00B386] dark:text-[#00D09C]">Test it with virtual money first.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
              Once you spot a setup in the Signal Screener, jump straight to the <strong>Virtual Trading Desk</strong>. Experience the exact look, order pad, and market mechanics of top Indian apps like Groww — without risking a single rupee of real capital.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                  <Wallet className="w-4 h-4 text-[#00D09C]" />
                  <span>Up to ₹10 Lakhs Virtual Cash</span>
                </div>
                <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Start with ₹1L to ₹10L virtual funds. Recharge or reset your portfolio with one click anytime.
                </p>
              </div>

              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                  <Zap className="w-4 h-4 text-[#00D09C]" />
                  <span>Delivery (CNC) & 5x Intraday</span>
                </div>
                <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Practice multi-day Delivery holdings or same-day Intraday MIS trades with 5x margin power.
                </p>
              </div>

              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                  <LineChartIcon className="w-4 h-4 text-[#00D09C]" />
                  <span>Groww-Style Live Charts</span>
                </div>
                <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  Switch between Line, Candlestick, and Terminal views across 1D, 1W, 1M, 1Y, and All timeframes.
                </p>
              </div>

              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#15241D] dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-[#00D09C]" />
                  <span>Real Taxes & Brokerage Math</span>
                </div>
                <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
                  See exact brokerage, STT, NSE exchange fees, SEBI charges, stamp duty, and GST on every trade.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
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

          {/* Right: Virtual Portfolio & Order Pad Preview Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2EAE6] dark:border-[#20332A]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7066] dark:text-[#9AB0A5]">
                    Virtual Trading Portfolio
                  </span>
                  <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black text-[#15241D] dark:text-white mt-0.5">
                    ₹10,00,000.00
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#5B7066] dark:text-[#9AB0A5] block">
                    Simulated Day P&L
                  </span>
                  <span className="mt-1 inline-block rounded-lg border border-[#00D09C]/30 bg-[#00D09C]/10 px-3 py-1 font-mono text-xs sm:text-sm font-extrabold text-[#008F6B] dark:text-[#00D09C]">
                    +₹8,420.50 (+0.84%)
                  </span>
                </div>
              </div>

              {/* Clean Groww-style Static Endpoint Curve Preview */}
              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-white dark:bg-[#0C1511] p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-extrabold text-[#15241D] dark:text-white">
                    RELIANCE · NSE Live Session
                  </span>
                  <span className="font-mono font-bold text-[#00B386] dark:text-[#00D09C]">
                    ₹1,336.10 (+0.88%)
                  </span>
                </div>
                <div className="h-32 w-full">
                  <svg viewBox="0 0 420 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="deskPreviewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D09C" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#00D09C" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="76" x2="420" y2="76" stroke="#6C8579" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                    <path
                      d="M 0 76 L 35 64 L 70 68 L 110 52 L 150 58 L 195 42 L 240 48 L 285 34 L 330 38 L 375 24 L 375 100 L 0 100 Z"
                      fill="url(#deskPreviewGrad)"
                    />
                    <path
                      d="M 0 76 L 35 64 L 70 68 L 110 52 L 150 58 L 195 42 L 240 48 L 285 34 L 330 38 L 375 24"
                      fill="none"
                      stroke="#00D09C"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <circle cx="375" cy="24" r="4" fill="#00D09C" />
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#5B7066] dark:text-[#7F9C8E] pt-2 border-t border-[#E2EAE6] dark:border-[#1D3A2D]">
                  <span>09:15 AM</span>
                  <span>11:30 AM</span>
                  <span>01:30 PM</span>
                  <span>03:30 PM</span>
                </div>
              </div>

              {/* Order Execution Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#E2EAE6] dark:border-[#20332A] bg-white dark:bg-[#16241E] p-3">
                  <span className="text-[10px] uppercase font-bold text-[#5B7066] dark:text-[#9AB0A5]">Order Mode</span>
                  <div className="text-xs font-extrabold text-[#15241D] dark:text-white mt-0.5">
                    Delivery CNC / Intraday 5x
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2EAE6] dark:border-[#20332A] bg-white dark:bg-[#16241E] p-3">
                  <span className="text-[10px] uppercase font-bold text-[#5B7066] dark:text-[#9AB0A5]">Execution</span>
                  <div className="text-xs font-extrabold text-[#15241D] dark:text-white mt-0.5">
                    Market, Limit & Stop-Loss
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#04261C] font-extrabold text-xs p-3 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Start Paper Trading</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
         6. PILLAR 3 (20% WEIGHTAGE): LEARN CHART PATTERNS & GUESS THE CHART
         ======================================================================= */}
      <section id="learn-module" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Interactive Pattern Lesson Preview Card */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-white p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#1D3A2D]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 px-3 py-1 text-xs font-bold text-[#00D09C]">
                    Reversal Pattern · Beginner
                  </span>
                  <span className="rounded-full bg-[#00D09C]/20 px-2.5 py-1 text-xs font-bold text-[#00D09C]">
                    Bullish Bias
                  </span>
                </div>
                <AppLink
                  href="/quiz"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00D09C] px-3.5 py-1.5 text-xs font-extrabold text-[#04261C] hover:bg-[#00B386]"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Guess the Chart</span>
                </AppLink>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Double Bottom (W-Pattern)
                </h3>
                <p className="text-xs sm:text-sm text-[#9AB0A5] mt-1">
                  Plain-English meaning: <strong className="text-white">Price tests a floor twice and bounces up</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                  <span className="font-bold text-[#00D09C] block mb-1">Entry Rule</span>
                  <span className="text-[#D6E6DE]">Buy when price breaks above the middle peak (neckline).</span>
                </div>
                <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                  <span className="font-bold text-[#F0614A] block mb-1">Stop-Loss</span>
                  <span className="text-[#D6E6DE]">Place stop just below the twin bottom support floor.</span>
                </div>
                <div className="rounded-xl border border-[#1D3A2D] bg-[#12281F] p-3.5">
                  <span className="font-bold text-[#5CB8FF] block mb-1">Profit Target</span>
                  <span className="text-[#D6E6DE]">Height of the W pattern added to the breakout level.</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1D3A2D]">
                <span className="text-xs text-[#8FA99C]">
                  28+ interactive setups with &ldquo;Reveal Next Candles&rdquo;
                </span>
                <div className="flex items-center gap-3">
                  <AppLink
                    href="/learn"
                    className="text-xs font-extrabold text-[#00D09C] hover:underline flex items-center gap-1"
                  >
                    <span>Open Pattern Library</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </AppLink>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Copy for Learn & Guess the Chart (20% Weightage) */}
          <div className="lg:col-span-6 space-y-6 text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Chart Learning Studio · 28+ Patterns & Quiz</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-[#15241D] dark:text-white tracking-tight leading-tight">
              Learn what the chart is telling you.<br />
              <span className="text-[#00B386] dark:text-[#00D09C]">Then play Guess the Chart.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
              New to technical charts? Our <strong>Learn</strong> module breaks down 28+ classic reversal, continuation, and candlestick patterns into four simple parts: <strong>Title, Description, Why the Chart Works, and an Interactive Chart</strong> — with a one-click <strong>Guess the Chart</strong> quiz to test your instincts.
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                <span><strong>Spacious Pattern Sidebar:</strong> Filter by Reversal, Continuation, Bilateral, or Candlestick setups.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                <span><strong>Why the Chart Works:</strong> Understand buyer & seller psychology plus clear Entry, Stop-Loss, and Target rules.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
                <span><strong>Guess the Chart Arena:</strong> Predict UP or DOWN across Unlimited Practice, 3-Life Survival, and 10-Round Challenge modes.</span>
              </li>
            </ul>

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
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#15241D] dark:text-white bg-white dark:bg-[#111C17] border border-[#CFDCD5] dark:border-[#20332A] hover:border-[#00D09C] transition-colors flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4 text-[#00D09C]" />
                <span>Play Guess the Chart →</span>
              </AppLink>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BENCHMARK INDICES STRIP */}
      <section
        id="indices"
        className="py-14 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-y border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1880px] mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-extrabold text-[#00B386] dark:text-[#00D09C] uppercase tracking-wider">
                  Indian Market Benchmarks
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    marketStatus.isOpen
                      ? 'bg-emerald-50 text-[#00D09C] border-[#00D09C]/30 dark:bg-emerald-950/40'
                      : 'bg-amber-50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 dark:bg-amber-950/40'
                  }`}
                >
                  {marketStatus.isOpen
                    ? '● Live Exchange Session'
                    : `○ ${marketStatus.statusLabel} · Official Close`}
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-[#15241D] dark:text-white tracking-tight mt-1">
                Track major NSE & BSE indices alongside your scans
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {indices.map((idx) => {
              const isUp = idx.change >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="bg-[#F3F6F4] dark:bg-[#111C17] p-4 rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] space-y-2.5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#15241D] dark:text-white truncate">
                      {idx.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isUp ? 'text-[#00B386] dark:text-[#00D09C]' : 'text-[#E0452B] dark:text-[#F0614A]'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="font-mono tabular-nums text-lg font-black text-[#15241D] dark:text-white">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="h-8 w-full">
                    <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                      <path
                        d={
                          isUp
                            ? 'M 0 18 Q 30 12, 50 14 T 80 8 L 100 4'
                            : 'M 0 6 Q 30 10, 50 8 T 80 16 L 100 20'
                        }
                        fill="none"
                        stroke={isUp ? '#00D09C' : '#F0614A'}
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
              Everything you need to know about NiftyLens Signal Screener, Virtual Trading, and Pattern Learning.
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
                Start with the Nifty 500 Signal Screener, practice risk-free with ₹10,00,000 on the Virtual Trading Desk, or explore 28+ setups in the Chart Pattern Library.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <AppLink
                href="/screener"
                className="px-7 py-3.5 rounded-xl font-extrabold text-sm bg-[#00D09C] text-[#04261C] hover:bg-[#00B386] shadow-md transition-all inline-flex items-center gap-2"
              >
                <Radar className="w-4 h-4" />
                <span>Open Signal Screener</span>
                <ArrowRight className="w-4 h-4" />
              </AppLink>
              <button
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
              <strong>Disclaimer:</strong> NiftyLens is an educational stock screening, chart learning, and paper trading platform created strictly for informational and strategy backtesting purposes. No real securities, equities, derivatives, commodities, or currencies are purchased or sold. All financial balances, portfolio holdings, orders, and gains or losses displayed are 100% simulated paper credits.
            </p>
            <p>
              This platform is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, sub-broker, portfolio manager, or investment adviser. Nothing on this website constitutes investment advice, financial guidance, tax advisory, or a recommendation to buy or sell any financial instrument.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-emerald-900/10 dark:border-[#20332A] text-[11px]">
            <div>© {new Date().getFullYear()} NiftyLens. NSE Signal Screener, Virtual Trading & Chart Pattern Studio.</div>
            <div>Educational Research & Paper Trading Sandbox · Max Virtual Wallet: ₹10,00,000</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
