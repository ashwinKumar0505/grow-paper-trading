import {
ArrowRight,
ChartCandlestick,
Crown,
GraduationCap,
Radar
} from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import { FloatingIllustration } from '../FloatingIllustration';
import type { LandingModel } from './useLandingPage';
type Props = Pick<LandingModel, 'user' | 'stocks' | 'openAuthModal' | 'handleGetStarted'>;
export function LandingHero({ user, stocks, openAuthModal, handleGetStarted }: Props) {
return (
<section className="pt-6 sm:pt-10 lg:pt-14 pb-12 sm:pb-18 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
          {/* Left Column: 45% width on desktop for text and CTAs */}
          <div className="w-full lg:w-[45%] space-y-6 text-left">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#00B386]/30 bg-[#00B386]/10 dark:border-[#00D09C]/30 dark:bg-[#00D09C]/10 px-3.5 py-1.5 text-xs font-extrabold text-[#008F6B] dark:text-[#00D09C]">
              <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
              <span>Paper Trading</span>
              <span>·</span>
              <span>AI Stock Screener</span>
              <span>·</span>
              <span>Backtested Strategies</span>
              <span>·</span>
              <span>Interactive Learning</span>
            </div>

            <h1 className="text-3xl sm:text-5xl xl:text-[3.5rem] font-black  text-[#00B386] dark:text-[#00D09C]  tracking-tight leading-[1.08]">
              Real time Paper Trading.{' '}
              <span className="text-[#15241D] dark:text-white">
                Backtested Screeners &amp; Chart Analysis.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed max-w-2xl">
              Practice intraday and delivery trades risk-free with{' '}
              <strong>virtual capital and live NSE quotes</strong>. Discover high-potential Indian
              stocks with <strong>AI-powered insights</strong>,{' '}
              <strong>advanced chart analysis</strong>, and{' '}
              <strong>backtested trading strategies</strong>.
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
                  <ChartCandlestick className="w-4 h-4 shrink-0" />
                  <span>1. Paper Trading</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Practice intraday &amp; swing trades risk-free with virtual capital.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-white/80 dark:bg-[#111C17] p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <Radar className="w-4 h-4 shrink-0" />
                  <span>2. Stock Screener &amp; Backtests</span>
                </div>
                <p className="mt-1 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
                  Backtested swing &amp; intraday strategies, chart analysis &amp; AI insights.
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
              alt="Nifty Lens 3D laptop dashboard showcasing Indian Stock Market charts, Smart Stock Screener with backtested strategies, Paper Trading portfolio, and Interactive Learning"
              loading="eager"
              fetchPriority="high"
              glowVariant="emerald-blue"
              align="right"
              maxWidthClass="max-w-[540px] sm:max-w-[640px] lg:max-w-[740px]"
            />
          </div>
        </div>
      </section>
);
}
