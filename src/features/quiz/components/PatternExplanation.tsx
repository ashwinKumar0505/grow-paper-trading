import {
BookOpen,
CheckCircle2,
Eye,
GraduationCap,
Lightbulb,
ShieldAlert,
Target,
TrendingDown,
TrendingUp
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { navigate } from '../../../lib/navigation';

import type { PatternLesson } from '../hooks/usePatternLesson';

type Props = Pick<PatternLesson, 'category' | 'pattern' | 'isBullish'>;

export function PatternExplanation({ category, pattern, isBullish }: Props) {
  return <>
          {/* 1. TITLE SECTION */}
          <section className="rounded-2xl border border-[#1d3a2d] bg-gradient-to-br from-[#0f2a1f] via-[#133628] to-[#0d241b] p-6 sm:p-7 text-white shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00d09c]/15 border border-[#00d09c]/30 px-3 py-1 text-xs font-bold text-[#00d09c]">
                    {pattern.cheatSheetGroup === 'Special' ? 'Candlestick & Special' : pattern.cheatSheetGroup} Pattern
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d6e6de]">
                    {pattern.difficulty} Level
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                      isBullish
                        ? 'bg-[#00d09c]/20 text-[#00d09c] border border-[#00d09c]/30'
                        : 'bg-[#f0614a]/20 text-[#ff8a75] border border-[#f0614a]/30'
                    }`}
                  >
                    {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isBullish ? 'Bullish Bias (Upward)' : 'Bearish Bias (Downward)'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  { pattern.name }
                </h1>
                <p className="text-sm text-[#9ab0a5]">
                  Plain-English meaning: <strong className="text-white">{pattern.simpleName}</strong> · Category:{' '}
                  <strong className="text-white">{pattern.category}</strong>
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <Button variant="unstyled" size="unstyled"
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-[#00d09c]" />
                  <span>Test in Guess the Chart →</span>
                </Button>
              </div>
            </div>
          </section>

          {/* 2. DESCRIPTION SECTION */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#00b386] dark:text-[#00d09c]">
              <BookOpen className="w-4 h-4" />
              <span>Pattern Description</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-7 text-[#15241d] dark:text-[#e9f2ee]">
              {pattern.explanation}
            </p>
            {pattern.proTip && (
              <div className="flex items-start gap-3 rounded-xl border border-[#00b386]/25 dark:border-[#00d09c]/25 bg-[#00b386]/[0.07] dark:bg-[#00d09c]/[0.07] p-4 text-xs sm:text-sm leading-6">
                <Lightbulb className="w-4 h-4 text-[#00b386] dark:text-[#00d09c] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#008f6b] dark:text-[#00d09c]">Pro Tip: </span>
                  <span className="text-[#15241d] dark:text-[#d6e6de]">{pattern.proTip}</span>
                </div>
              </div>
            )}
          </section>

          {/* 3. WHY THIS CHART WORKS & TRADE PLAN */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#00b386] dark:text-[#00d09c]">
                <Eye className="w-4 h-4" />
                <span>Why This Chart Pattern Works</span>
              </div>
              <p className="mt-2.5 text-sm sm:text-[15px] leading-7 text-[#15241d] dark:text-[#e9f2ee]">
                {pattern.keyObservation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00b386] dark:text-[#00d09c]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Entry Trigger</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.entryRule}
                </p>
              </div>

              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#e0452b] dark:text-[#f0614a]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Stop-Loss / Invalidation</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.stopLossRule}
                </p>
              </div>

              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1a7fd1] dark:text-[#5cb8ff]">
                  <Target className="w-4 h-4 shrink-0" />
                  <span>Profit Target</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.targetRule}
                </p>
              </div>
            </div>
          </section>

  </>;
}
