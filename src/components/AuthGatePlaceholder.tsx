import React from 'react';
import { useTrading } from '../context/TradingContext';
import { AppLink } from '../lib/navigation';
import {
  ArrowRight,
  BookOpen,
  ChartCandlestick,
  CheckCircle2,
  GraduationCap,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface AuthGatePlaceholderProps {
  feature?: 'screener' | 'trade' | 'quiz';
}

const FEATURE_COPY = {
  screener: {
    eyebrow: 'NIFTYLENS STOCK SCREENER & STOCK RECOMMENDATIONS',
    title: 'Sign in to access Stock Recommendations & Chart Analysis',
    description:
      'Unlock our Nifty 500 Swing & Intraday Screener powered by historical backtested patterns, multi-indicator chart analysis, and complete entry, target, and stop-loss recommendations.',
  },
  trade: {
    eyebrow: 'NIFTYLENS VIRTUAL TRADING PLATFORM',
    title: 'Sign in to access the Virtual Trading Desk',
    description:
      'Practice your stock recommendations risk-free with up to ₹10,00,000 in virtual capital, Delivery (CNC) and 5x Intraday (MIS) orders, and live NSE session charts.',
  },
  quiz: {
    eyebrow: 'GUESS THE CHART · INTERACTIVE QUIZ ARENA',
    title: 'Sign in to play Guess the Chart Quiz',
    description:
      'Test your pattern-reading instincts across Unlimited Practice, 3-Life Survival, and 10-Round Challenge modes while tracking your accuracy and streaks.',
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
              One free NiftyLens account unlocks:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <Radar className="w-4 h-4 shrink-0" />
                  <span>Stock Screener</span>
                </div>
                <p className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5] leading-snug">
                  Backtested Swing & Intraday stock recommendations + full stock analysis.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B386] dark:text-[#00D09C]">
                  <ChartCandlestick className="w-4 h-4 shrink-0" />
                  <span>Virtual Trading</span>
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

        {/* Right Column: Custom NiftyLens Illustration */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl border border-[#1D3A2D] bg-gradient-to-br from-[#0C1D16] via-[#122B21] to-[#0A1812] p-6 text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between text-xs text-[#9AB0A5] mb-4">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#00D09C]">
                <ShieldCheck className="w-4 h-4" />
                NiftyLens Member Workspace
              </span>
              <span className="rounded-md bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00D09C]">
                NSE · NIFTY 500
              </span>
            </div>

            {/* Vector Illustration of Chart Analysis, Backtest Signals & Lens */}
            <svg
              viewBox="0 0 360 230"
              className="w-full h-auto rounded-xl bg-[#091510] border border-[#1D3A2D] p-3"
              role="img"
              aria-label="NiftyLens Screener, Virtual Trading and Chart Analysis Illustration"
            >
              <defs>
                <linearGradient id="authAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D09C" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#00D09C" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Subtle Chart Grid */}
              <g stroke="#183126" strokeDasharray="3 3" strokeWidth="1">
                <line x1="16" y1="45" x2="344" y2="45" />
                <line x1="16" y1="95" x2="344" y2="95" />
                <line x1="16" y1="145" x2="344" y2="145" />
                <line x1="16" y1="195" x2="344" y2="195" />
              </g>

              {/* Area + Trendline */}
              <path
                d="M 24 175 L 70 152 L 112 162 L 158 122 L 200 132 L 248 84 L 296 64 L 332 42 L 332 205 L 24 205 Z"
                fill="url(#authAreaGrad)"
              />
              <path
                d="M 24 175 L 70 152 L 112 162 L 158 122 L 200 132 L 248 84 L 296 64 L 332 42"
                fill="none"
                stroke="#00D09C"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Candlesticks */}
              {[
                { x: 45, top: 142, bot: 178, o: 168, c: 150, up: true },
                { x: 88, top: 146, bot: 174, o: 152, c: 165, up: false },
                { x: 132, top: 118, bot: 158, o: 148, c: 126, up: true },
                { x: 176, top: 115, bot: 145, o: 124, c: 134, up: false },
                { x: 222, top: 78, bot: 124, o: 116, c: 86, up: true },
                { x: 268, top: 58, bot: 96, o: 84, c: 66, up: true },
                { x: 314, top: 34, bot: 74, o: 64, c: 44, up: true },
              ].map((bar, i) => {
                const color = bar.up ? '#00D09C' : '#F0614A';
                const y = Math.min(bar.o, bar.c);
                const h = Math.max(6, Math.abs(bar.c - bar.o));
                return (
                  <g key={i}>
                    <line x1={bar.x} y1={bar.top} x2={bar.x} y2={bar.bot} stroke={color} strokeWidth="1.8" />
                    <rect x={bar.x - 6} y={y} width="12" height={h} rx="2" fill={color} />
                  </g>
                );
              })}

              {/* Optical Chart Magnifying Lens Highlight */}
              <circle
                cx="255"
                cy="78"
                r="38"
                fill="rgba(0, 208, 156, 0.08)"
                stroke="#00D09C"
                strokeWidth="2.2"
              />
              <line
                x1="283"
                y1="106"
                x2="306"
                y2="129"
                stroke="#00D09C"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Floating Signal Tag inside Illustration */}
              <rect x="24" y="22" width="168" height="44" rx="10" fill="#12281F" stroke="#00D09C" strokeWidth="1.2" />
              <circle cx="42" cy="44" r="5" fill="#00D09C" />
              <text x="54" y="40" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">
                BACKTESTED PATTERN
              </text>
              <text x="54" y="54" fill="#00D09C" fontSize="9.5" fontWeight="600" fontFamily="monospace">
                Confidence: 86/100 · R:R 2.4x
              </text>
            </svg>

            <div className="mt-4 flex items-center justify-between text-[11px] text-[#9AB0A5]">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00D09C]" />
                Instant Google or Email OTP Sign-In
              </span>
              <span className="font-semibold text-white">100% Free Sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
