import { ArrowRight, LineChart, Radar, Sparkles } from 'lucide-react';
import { navigate } from '../../../lib/navigation';
import type { Stock } from '../../../types/market';

interface StockAnalysisBannerProps {
  stock: Stock;
}

const HIGHLIGHTS = [
  '2-Year Strategy Backtests',
  'Chart Patterns & Indicators',
  'Support & Resistance Zones',
  'Financial Trends',
];

export function StockAnalysisBanner({ stock }: StockAnalysisBannerProps) {
  const handleOpenAnalysis = () => {
    navigate(`/screener/analysis?symbol=${encodeURIComponent(stock.symbol)}`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      aria-label={`Analyse ${stock.symbol} using backtested chart strategies`}
      className="rounded-2xl border border-[#00B386]/25 dark:border-[#00D09C]/25 bg-gradient-to-br from-[#F2FBF7] via-white to-[#ECF9F3] dark:from-[#12261E] dark:via-[#15201C] dark:to-[#1A1D24] p-6 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00B386]/30 bg-[#00B386]/10 dark:border-[#00D09C]/30 dark:bg-[#00D09C]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#008F6B] dark:text-[#00D09C]">
            <Radar className="w-3.5 h-3.5 shrink-0" />
            <span>Backtested Chart Strategies</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            Analyse {stock.symbol} using our backtested chart strategies
          </h3>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            Explore 2-year historical strategy backtests, multi-indicator technical signals, key support and resistance
            levels, and financial performance for {stock.name} in Stock Analysis.
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#00B386]/35 dark:border-[#00D09C]/35 bg-[#00B386]/10 dark:bg-[#00D09C]/15 px-2.5 py-1 text-[11px] font-semibold text-[#008F6B] dark:text-[#00D09C]">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>AI Powered</span>
            </span>
            {HIGHLIGHTS.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-gray-200/80 dark:border-[#283830] bg-white/80 dark:bg-[#111A16]/80 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleOpenAnalysis}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B88A] px-5 py-3 text-sm font-bold text-white dark:text-[#04261C] shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <LineChart className="w-4 h-4 shrink-0" />
            <span>Open Stock Analysis</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
}
