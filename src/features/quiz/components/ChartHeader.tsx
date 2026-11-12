import React from 'react';
import { ChartScenario, IndicatorSettings, ChartType } from '../types/trading';
import { Layers, LineChart, CandlestickChart, BookOpen } from 'lucide-react';

interface ChartHeaderProps {
  scenario: ChartScenario;
  tradeNumber: number;
  indicatorSettings: IndicatorSettings;
  onToggleIndicator: (key: keyof IndicatorSettings) => void;
  chartType: ChartType;
  onToggleChartType: (type: ChartType) => void;
  onOpenGuide?: () => void;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  scenario,
  tradeNumber,
  indicatorSettings,
  onToggleIndicator,
  chartType,
  onToggleChartType,
  onOpenGuide,
}) => {
  return (
    <div className="w-full bg-[var(--quiz-panel)] border-b border-[var(--quiz-border)]/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none shrink-0">
      {/* Left: Setup & Asset Metadata */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="font-mono text-[var(--quiz-muted)] font-semibold">
          Trade #{tradeNumber}
        </span>
        <span className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-[var(--quiz-text)] font-bold tracking-tight">
            {scenario.assetSymbol}
          </span>
          <span className="text-[var(--quiz-muted)] text-[11px] hidden sm:inline">
            ({scenario.assetName})
          </span>
        </div>
        <span className="text-slate-600">·</span>
        <span className="bg-[var(--quiz-subtle)] text-[var(--quiz-muted)] font-mono px-1.5 py-0.5 rounded text-[11px]">
          {scenario.timeframe}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-[var(--quiz-muted)] text-[11px]">
          Predict next {scenario.outcomeCount} candles
        </span>
      </div>

      {/* Right: Chart Style Switcher & Beginner Guide Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Normal vs Candle Chart Switch */}
        <div className="flex items-center bg-[var(--quiz-bg)] p-0.5 rounded-md border border-[var(--quiz-border)] mr-1">
          <button
            onClick={() => onToggleChartType('line')}
            title="Normal Chart: Simple, clean line like Apple Stocks & Robinhood"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              chartType === 'line'
                ? 'bg-blue-600 text-[var(--quiz-text)] font-semibold'
                : 'text-[var(--quiz-muted)] hover:text-[var(--quiz-text)]'
            }`}
          >
            <LineChart className="w-3 h-3" />
            <span>Normal</span>
          </button>
          <button
            onClick={() => onToggleChartType('candle')}
            title="Candle Chart: Classic trading bars with high, low, open, close"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              chartType === 'candle'
                ? 'bg-blue-600 text-[var(--quiz-text)] font-semibold'
                : 'text-[var(--quiz-muted)] hover:text-[var(--quiz-text)]'
            }`}
          >
            <CandlestickChart className="w-3 h-3" />
            <span>Candles</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[var(--quiz-muted)] text-[11px] flex items-center gap-1 mr-0.5">
            <Layers className="w-3.5 h-3.5" />
            Guides:
          </span>

          {/* EMA 20 */}
          <button
            onClick={() => onToggleIndicator('showEma20')}
            title="Yellow Trend Line: shows if price is generally heading up or down"
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-all cursor-pointer ${
              indicatorSettings.showEma20
                ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-800/60 font-semibold'
                : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/40 hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-transparent'
            }`}
          >
            Trend Line
          </button>

          {/* Floor & Ceiling */}
          <button
            onClick={() => onToggleIndicator('showLevels')}
            title="Floor & Ceiling: key price lines that price has bounced off"
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-all cursor-pointer ${
              indicatorSettings.showLevels
                ? 'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-800/60 font-semibold'
                : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/40 hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-transparent'
            }`}
          >
            Floor & Ceiling
          </button>

          {/* Volume */}
          <button
            onClick={() => onToggleIndicator('showVolume')}
            title="Volume bars: shows how many people are actively buying and selling"
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-all cursor-pointer ${
              indicatorSettings.showVolume
                ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-800/60 font-semibold'
                : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/40 hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-transparent'
            }`}
          >
            Activity (Vol)
          </button>

          {/* RSI */}
          <button
            onClick={() => onToggleIndicator('showRsi')}
            title="RSI: shows if price is exhausted high (overbought) or low (oversold)"
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-all cursor-pointer ${
              indicatorSettings.showRsi
                ? 'bg-purple-100/80 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-800/60 font-semibold'
                : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/40 hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-transparent'
            }`}
          >
            Momentum (RSI)
          </button>

          {/* Quick Cheat Sheet reference modal button */}
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              title="Open 15 Popular Chart Patterns Cheat Sheet & Visual Guide"
              className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer ml-1 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Cheat Sheet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
