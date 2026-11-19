import React from 'react';
import { useTrading } from '../context/TradingContext';
import { AppLink } from '../lib/navigation';
import {
  ArrowRight,
  BookOpen,
  ChartCandlestick,
  CheckCircle2,
  GraduationCap,
  Radar,
  Sparkles,
} from 'lucide-react';
import { AuthGateIllustration } from './auth/AuthGateIllustration';

interface AuthGatePlaceholderProps {
  feature?: 'screener' | 'trade' | 'quiz' | 'profile';
}

const FEATURE_COPY = {
  screener: {
    eyebrow: 'NIFTYLENS QUANTITATIVE STOCK SCREENER',
    title: 'Sign in to access Technical Screeners & Chart Analysis',
    description:
      'Unlock our Nifty 500 Swing & Intraday Screener powered by historical backtested patterns, multi-indicator chart analysis, and technical pivot, resistance, and risk-level projections.',
  },
  trade: {
    eyebrow: 'NIFTYLENS PAPER TRADING PLATFORM',
    title: 'Sign in to access the Paper Trading Desk',
    description:
      'Practice your technical strategies risk-free with up to ₹10,00,000 in virtual capital, Delivery (CNC) and 5x Intraday (MIS) orders, and live NSE session charts.',
  },
  quiz: {
    eyebrow: 'GUESS THE CHART · INTERACTIVE QUIZ ARENA',
    title: 'Sign in to play Guess the Chart Quiz',
    description:
      'Test your pattern-reading instincts across Unlimited Practice, 3-Life Survival, and 10-Round Challenge modes while tracking your accuracy and streaks.',
  },
  profile: {
    eyebrow: 'NIFTYLENS ACCOUNT & SUBSCRIPTION',
    title: 'Sign in to view your Profile & Subscription',
    description:
      'Manage your Nifty Lens membership, view billing & renewal details, and check your virtual capital limits.',
  },
};

export const AuthGatePlaceholder: React.FC<AuthGatePlaceholderProps> = ({ feature = 'screener' }) => {
  const { openAuthModal } = useTrading();
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.screener;

  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] w-full bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-10 lg:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Copy, Benefits & Login/Signup Actions */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00D09C]/30 bg-[#00D09C]/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#008F6B] dark:text-[#00D09C]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copy.eyebrow}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#15241D] dark:text-white leading-tight">
            {copy.title}
          </h1>

          <p className="text-sm sm:text-base text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
            {copy.description}
          </p>

          {/* One Account Unlocks All 3 Modules */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#5B7066] dark:text-[#7F9C8E]">
              One free Nifty Lens account unlocks:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <Radar className="w-4 h-4 shrink-0" />
                  <span>Stock Screener</span>
                </div>
                <p className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5] leading-snug">
                  Backtested Swing & Intraday technical setups + full chart analysis.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <ChartCandlestick className="w-4 h-4 shrink-0" />
                  <span>Paper Trading</span>
                </div>
                <p className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5] leading-snug">
                  Up to ₹10L virtual cash for Delivery & 5x Intraday practice.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Guess the Chart</span>
                </div>
                <p className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5] leading-snug">
                  Interactive chart prediction quiz with accuracy & streak tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Primary Login / Signup CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="px-6 py-3.5 rounded-xl bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B386] text-white dark:text-[#04261C] font-extrabold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="px-6 py-3.5 rounded-xl border border-[#CFDCD5] dark:border-[#2C4538] bg-[#F6F9F7] dark:bg-[#16241E] hover:border-[#00B386] dark:hover:border-[#00D09C] text-[#15241D] dark:text-white font-bold text-sm transition-all cursor-pointer"
            >
              Sign In to Existing Account
            </button>
          </div>

          {/* Open-Access Learn Link */}
          <div className="pt-2 border-t border-[#E2EAE6] dark:border-[#20332A] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5B7066] dark:text-[#9AB0A5]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#00D09C]" />
              <span>Want to study chart patterns first? No login required for the Pattern Library.</span>
            </span>
            <AppLink
              href="/learn"
              className="inline-flex items-center gap-1.5 font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Browse Learn Charts (Free Access) →</span>
            </AppLink>
          </div>
        </div>

        {/* Right Column: Custom Nifty Lens Illustration */}
        <div className="lg:col-span-5">
          <AuthGateIllustration />
        </div>
      </div>
    </div>
  );
};
