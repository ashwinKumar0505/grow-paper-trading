import { ArrowRight, BookOpen, ChartCandlestick, GraduationCap } from 'lucide-react';
import { AppLink } from '../lib/navigation';

export function LearningSection({ onStartTrading }: { onStartTrading: () => void }) {
  return <section id="learn-and-practice" className="scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">One playbook. Two ways to grow.</p><h2 className="text-3xl font-extrabold tracking-tight">From spotting patterns to placing orders.</h2></div>
        <p className="max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">Learn at your own pace. Build confidence through practice, with no real money at risk.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-[#101c22] p-6 text-white sm:p-8">
          <div className="flex items-center justify-between"><GraduationCap className="h-7 w-7 text-emerald-400" /><span className="rounded-full border border-emerald-400/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">No sign-up needed</span></div>
          <h3 className="mt-6 text-2xl font-bold">Train your eye for charts</h3>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">Will price move up or down? Make your call, watch the next candles unfold, and get an explanation of the pattern behind the move.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-emerald-200">{['Unlimited practice', '3-life survival', '10-round challenge'].map(label => <span key={label} className="rounded-lg bg-emerald-500/10 px-3 py-2">{label}</span>)}</div>
          <AppLink href="/quiz" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">Start the chart quiz <ArrowRight className="h-4 w-4" /></AppLink>
          <AppLink href="/pattern-library" className="mt-5 flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:underline"><BookOpen className="h-4 w-4" />Browse the interactive pattern library</AppLink>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-[#141a24] sm:p-8">
          <ChartCandlestick className="h-7 w-7 text-emerald-500" />
          <h3 className="mt-6 text-2xl font-bold">Put your playbook to work</h3>
          <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500 dark:text-slate-400">Take what you learn to the paper trading desk. Explore NSE/BSE stocks, place virtual orders, and follow your positions in one portfolio.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">{['Up to ₹10L virtual funds', 'Equity & intraday', 'Portfolio tracking'].map(label => <span key={label} className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800">{label}</span>)}</div>
          <button onClick={onStartTrading} className="mt-7 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-5 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">Open paper trading <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  </section>;
}
