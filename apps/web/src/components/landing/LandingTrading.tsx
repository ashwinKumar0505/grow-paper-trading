import {
ArrowRight,
ChartCandlestick,
LineChart as LineChartIcon,
ShieldCheck,
Wallet,
Zap
} from 'lucide-react';
import { trackProductNavigation } from '../../lib/analytics';
import { AppLink } from '../../lib/navigation';
import { FloatingIllustration } from '../FloatingIllustration';
import type { LandingModel } from './useLandingPage';
type Props = Pick<LandingModel, 'stocks' | 'handleGetStarted'>;
export function LandingTrading({ stocks, handleGetStarted }: Props) {
return (
<section
        id="virtual-trading"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-b border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1880px] mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left on Desktop: Floating 3D Paper Trading Illustration */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <FloatingIllustration
                src="/images/landing/virtual-trading.webp"
                alt="Tradedia Paper Trading 3D illustration showing NIFTY 50 and SENSEX tickers, ₹1,00,000 Virtual Portfolio with +4.25% return, watchlist, and Intraday/Swing order execution"
                loading="lazy"
                glowVariant="emerald"
                delayMs={400}
                align="left"
                width={1254}
                height={1254}
                maxWidthClass="max-w-[520px] sm:max-w-[600px] lg:max-w-[660px]"
              />
            </div>

            {/* Right on Desktop: Description and Feature Highlights */}
            <div className="lg:col-span-6 space-y-6 text-left order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00D09C]/15 text-[#008F6B] dark:text-[#00D09C] border border-[#00D09C]/30 text-xs font-extrabold uppercase tracking-wider">
                <ChartCandlestick className="w-3.5 h-3.5" />
                <span>Paper Trading Desk · Risk-Free Practice</span>
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
                  <span>Open Paper Trading Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <AppLink
                  href="/paper-trading-india"
                  onClick={() =>
                    trackProductNavigation({
                      sourcePage: '/',
                      targetPage: '/paper-trading-india',
                      navLocation: 'homepage_section',
                    })
                  }
                  className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#15241D] dark:text-white bg-[#F3F6F4] dark:bg-[#111C17] border border-[#CFDCD5] dark:border-[#20332A] hover:border-[#00B386] dark:hover:border-[#00D09C] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                </AppLink>
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
                  Paper Trading Sandbox
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
);
}
