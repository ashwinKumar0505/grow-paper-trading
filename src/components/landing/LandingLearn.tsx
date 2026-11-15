import {
ArrowRight,
Award,
BookOpen,
GraduationCap,
PlayCircle
} from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import { FloatingIllustration } from '../FloatingIllustration';
export function LandingLearn() {
return (
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
                alt="Nifty Lens Interactive Learning 3D illustration featuring Learn Chart Patterns, Bullish Engulfing breakdown, Chart Pattern Library, Guess the Chart quiz, and Chart Replay"
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
);
}
