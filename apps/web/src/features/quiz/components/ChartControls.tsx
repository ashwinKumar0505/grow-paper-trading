import { ChartType, IndicatorSettings } from '../types/trading';
import { BarChart2, LineChart, Layers } from 'lucide-react';

interface Props {
  chartType: ChartType;
  onChartType: (type: ChartType) => void;
  indicators: IndicatorSettings;
  onIndicator: (key: keyof IndicatorSettings) => void;
}

const INDICATOR_OPTIONS: readonly [keyof IndicatorSettings, string][] = [
  ['showEma20', 'EMA 20'],
  ['showSma50', 'SMA 50'],
  ['showLevels', 'Support & Resistance'],
  ['showVolume', 'Volume'],
  ['showRsi', 'RSI (14)'],
];

export function ChartControls({ chartType, onChartType, indicators, onIndicator }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-900/20 dark:border-[#20332a] bg-emerald-50/40 dark:bg-[#0f1a15] px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-[#9ab0a5] mr-1">Chart Type:</span>
        <div className="inline-flex rounded-lg border border-emerald-900/15 dark:border-[#20332a] bg-white dark:bg-[#111c17] p-0.5">
          <button
            type="button"
            onClick={() => onChartType('candle')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
              chartType === 'candle'
                ? 'bg-[#00B386] text-white dark:bg-[#00D09C] dark:text-[#04261c]'
                : 'text-slate-600 dark:text-[#9ab0a5] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Candles
          </button>
          <button
            type="button"
            onClick={() => onChartType('line')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
              chartType === 'line'
                ? 'bg-[#00B386] text-white dark:bg-[#00D09C] dark:text-[#04261c]'
                : 'text-slate-600 dark:text-[#9ab0a5] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LineChart className="h-3.5 w-3.5" />
            Line
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-[#9ab0a5] mr-1">
          <Layers className="h-3.5 w-3.5 text-[#00B386] dark:text-[#00D09C]" />
          Overlays:
        </span>
        {INDICATOR_OPTIONS.map(([key, label]) => {
          const active = indicators[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onIndicator(key)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                active
                  ? 'border-[#00B386]/40 bg-[#00B386]/15 text-[#008f6b] dark:border-[#00D09C]/40 dark:bg-[#00D09C]/15 dark:text-[#00D09C]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-[#20332a] dark:bg-[#111c17] dark:text-[#9ab0a5] dark:hover:border-[#2c4538]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
