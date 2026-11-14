import { ArrowRight, BookOpen, ChartCandlestick, GraduationCap, Radar, Search, Sparkles, Zap } from 'lucide-react';
import { AppLink } from '../lib/navigation';

export function LearningSection({ onStartTrading }: { onStartTrading: () => void }) {
  return (
    <section id="applications" className="scroll-mt-28 px-4 py-14 sm:px-6 lg:px-8 sm:py-20 bg-white dark:bg-[#0e1713] border-y border-emerald-900/10 dark:border-[#20332a]">
      <div className="mx-auto w-full max-w-[1880px]">
        <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#00B386]/10 dark:bg-[#00D09C]/15 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-[#008f6b] dark:text-[#00D09C]">
              <Sparkles className="h-3.5 w-3.5" />
              Three Integrated Applications · One Green Workspace
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything you need in <span className="text-[#00B386] dark:text-[#00D09C]">NiftyLens</span>.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-[#9ab0a5]">
            Scan Nifty 500 stocks for actionable technical setups, practice risk-free orders on a Groww-style virtual desk, and master chart patterns through interactive lessons and quizzes.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* App 1: Stock Screener & Stock Analysis */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#1d3a2d] bg-gradient-to-br from-[#0f2a1f] via-[#123124] to-[#0c1d16] p-6 text-white sm:p-8 shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D09C] text-[#04261c]">
                  <Radar className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-[#00D09C]/30 bg-[#00D09C]/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#00D09C]">
                  01 · Stock Screener
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-extrabold text-white">
                Screener & Stock Recommendations
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#9ab0a5]">
                Screen Nifty 500 equities using AI-powered insights, historical backtested strategies, and technical chart analysis to get curated Swing & Intraday stock recommendations.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#d6e6de]">
                {[
                  'AI-Powered Stock Analysis',
                  'Backtested Pattern Screener',
                  '15-Min Intraday Recommendations',
                  'Reference Entry, Target & Stop-Loss',
                ].map((label) => (
                  <span key={label} className="rounded-lg border border-[#1d3a2d] bg-[#12281f] px-3 py-1.5 font-medium">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-[#1d3a2d] space-y-3">
              <AppLink
                href="/screener"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D09C] px-5 py-3 text-sm font-extrabold text-[#04261c] hover:bg-[#00b386] transition-colors"
              >
                <span>Open Stock Screener</span>
                <ArrowRight className="h-4 w-4" />
              </AppLink>
              <div className="flex items-center justify-between text-xs font-semibold text-[#9ab0a5] px-1">
                <AppLink href="/screener/intraday" className="hover:text-[#00D09C] inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-[#00D09C]" /> Intraday Scanner
                </AppLink>
                <AppLink href="/screener/analysis" className="hover:text-[#00D09C] inline-flex items-center gap-1">
                  <Search className="h-3.5 w-3.5 text-[#00D09C]" /> Stock Analysis
                </AppLink>
              </div>
            </div>
          </div>

          {/* App 2: Paper Trading Desk */}
          <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-[#F6F9F7] p-6 dark:border-[#20332a] dark:bg-[#111c17] sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00B386]/15 text-[#00B386] dark:bg-[#00D09C]/15 dark:text-[#00D09C]">
                  <ChartCandlestick className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-[#00B386]/30 bg-[#00B386]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#008f6b] dark:text-[#00D09C]">
                  02 · Paper Trading
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">
                Groww-Style Paper Trading
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-[#9ab0a5]">
                Execute simulated Delivery (CNC) and 5x Intraday (MIS) trades with real NSE quotes, realistic statutory charges, and up to ₹10,00,000 virtual capital.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-700 dark:text-[#d6e6de]">
                {[
                  'Up to ₹10L Virtual Cash',
                  'Delivery & 5x Intraday MIS',
                  'Groww-Style Live Charts',
                  'Realistic Brokerage & Taxes',
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-emerald-900/10 bg-white px-3 py-1.5 font-medium dark:border-[#20332a] dark:bg-[#16241e]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-emerald-900/10 dark:border-[#20332a] space-y-3">
              <button
                onClick={onStartTrading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00B386] hover:bg-[#009a73] dark:bg-[#00D09C] dark:hover:bg-[#00b386] px-5 py-3 text-sm font-extrabold text-white dark:text-[#04261c] transition-colors cursor-pointer"
              >
                <span>Launch Paper Trading</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-[#7f9c8e]">
                Includes Market & Limit orders, AMO, and 3:20 PM Intraday square-off
              </p>
            </div>
          </div>

          {/* App 3: Learn Chart Patterns & Guess the Chart */}
          <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-[#F6F9F7] p-6 dark:border-[#20332a] dark:bg-[#111c17] sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00B386]/15 text-[#00B386] dark:bg-[#00D09C]/15 dark:text-[#00D09C]">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-[#00B386]/30 bg-[#00B386]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#008f6b] dark:text-[#00D09C]">
                  03 · Learn & Quiz
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">
                Pattern Library & Guess the Chart
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-[#9ab0a5]">
                Study 28+ classic reversal, continuation, and candlestick patterns with step-by-step trade rules, then test your instincts in Guess the Chart.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-700 dark:text-[#d6e6de]">
                {[
                  '28+ Interactive Patterns',
                  'Why the Chart Works',
                  'Entry, Stop & Target Rules',
                  'Guess the Chart Arena',
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-emerald-900/10 bg-white px-3 py-1.5 font-medium dark:border-[#20332a] dark:bg-[#16241e]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-emerald-900/10 dark:border-[#20332a] space-y-3">
              <AppLink
                href="/learn"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#00B386] dark:border-[#00D09C] px-5 py-2.5 text-sm font-extrabold text-[#008f6b] dark:text-[#00D09C] hover:bg-[#00B386]/10 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Explore Pattern Library</span>
              </AppLink>
              <AppLink
                href="/quiz"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-950/90 dark:bg-[#16241e] hover:bg-emerald-900 px-4 py-2.5 text-xs font-bold text-[#00D09C] border border-[#00D09C]/30 transition-colors"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Play Guess the Chart Quiz →</span>
              </AppLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
