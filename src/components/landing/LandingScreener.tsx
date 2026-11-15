import {
  ArrowRight,
  BarChart2,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import { FloatingIllustration } from '../FloatingIllustration';
import type { LandingModel } from './useLandingPage';
import { LandingScreenerStrategyCard } from './LandingScreenerStrategyCard';

type Props = Pick<LandingModel, 'stocks' | 'handleLaunchTradeStock'>;

export function LandingScreener({}: Props) {
  return (
    <section id="screener-suite" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1880px] mx-auto space-y-14">
        {/* Main Two-Column Feature Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
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

            {/* 4 Feature Highlights */}
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

            {/* Screener CTAs */}
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
              alt="Nifty Lens AI Stock Screener 3D illustration displaying Swing Trading, Intraday Trading, and Stock Analyser panels with technical indicators, breakout chart analysis, confidence score, and backtesting results"
              loading="lazy"
              glowVariant="blue-cyan"
              delayMs={200}
              align="right"
              maxWidthClass="max-w-[520px] sm:max-w-[600px] lg:max-w-[660px]"
            />
          </div>
        </div>

        {/* 3 Detailed Screener Strategy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LandingScreenerStrategyCard
            icon={<TrendingUp className="w-6 h-6" />}
            tag="Hold 3 Days – 2 Weeks"
            title="1. Swing Trading Screener (Nifty 500)"
            description="Scans all 500 NSE stocks using backtested breakout, trend-following, and momentum strategies — ranking high-potential swing setups by technical confidence."
            features={[
              { title: 'Confidence Score (0–100)', desc: 'See how strongly multiple indicators and backtested rules align.' },
              { title: 'Confirmed vs Watchlist', desc: 'Know whether a breakout is active or awaiting confirmation.' },
              { title: 'Reference Plan', desc: 'Entry zone, target price, stop-loss & reward:risk ratio.' },
            ]}
            footerNote="Scans 500 stocks in seconds"
            ctaText="Run Swing Scan"
            ctaHref="/screener"
          />

          <LandingScreenerStrategyCard
            icon={<Zap className="w-6 h-6" />}
            tag="Same-Day 15-Min Trades"
            title="2. Intraday Screener (Top 100 Liquid)"
            description="Monitors the 100 most liquid Nifty stocks on 15-minute candles during market hours (9:15 AM – 3:30 PM IST) for VWAP and volume-backed momentum bursts."
            features={[
              { title: 'Auto-Refresh Every 5 Mins', desc: 'Live countdown timer while NSE is open.' },
              { title: 'Live Signal Tracking', desc: 'Tracks whether each intraday setup is Open, Hit Target, or Stopped Out.' },
              { title: 'Last Session Replay', desc: 'Review the full day’s intraday strategy performance after market close.' },
            ]}
            footerNote="All trades close by 3:20 PM IST"
            ctaText="View Intraday Picks"
            ctaHref="/screener/intraday"
          />

          <LandingScreenerStrategyCard
            icon={<Search className="w-6 h-6" />}
            tag="AI + Technical + Fundamental"
            title="3. Stock Analysis (Any Stock)"
            description="Search any Nifty 500 company for an instant health check combining AI-powered technical commentary, chart structure, financials, and historical strategy backtests."
            features={[
              { title: 'Confidence-Based Verdict', desc: 'Clear BUY, WAIT, or AVOID signal with reference levels.' },
              { title: 'Revenue, Profit & Balance Sheet', desc: 'Yearly/Quarterly financials & valuation ratios.' },
              { title: '2- to 5-Year Strategy Backtests', desc: 'Evaluate how historical signals performed on that stock.' },
            ]}
            footerNote="Check any NSE 500 symbol"
            ctaText="Search a Stock"
            ctaHref="/screener/analysis"
          />
        </div>
      </div>
    </section>
  );
}
