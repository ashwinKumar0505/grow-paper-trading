import React from 'react';
import {
  BarChart3,
  BookOpen,
  CandlestickChart,
  GraduationCap,
  Layers,
  LineChart,
  LogOut,
  Sliders,
} from 'lucide-react';
import type { ChartScenario, ChartType, DifficultyLevel, IndicatorSettings } from '../types/trading';

interface MobileQuizOptionsDrawerProps {
  difficulty: DifficultyLevel;
  scenario: ChartScenario;
  indicatorSettings: IndicatorSettings;
  onToggleIndicator: (key: keyof IndicatorSettings) => void;
  chartType: ChartType;
  onToggleChartType: (type: ChartType) => void;
  onClose: () => void;
  onOpenModeSelect: () => void;
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onGoHome?: () => void;
  onOpenLearnCharts?: () => void;
}

const GUIDE_OPTIONS: readonly { key: keyof IndicatorSettings; label: string; activeCls: string }[] = [
  { key: 'showEma20', label: 'Trend Line', activeCls: 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-700/50' },
  { key: 'showLevels', label: 'Floor & Ceiling', activeCls: 'bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-700/50' },
  { key: 'showVolume', label: 'Activity (Vol)', activeCls: 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-700/50' },
  { key: 'showRsi', label: 'Momentum (RSI)', activeCls: 'bg-purple-100/80 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-700/50' },
];

export const MobileQuizOptionsDrawer: React.FC<MobileQuizOptionsDrawerProps> = ({
  difficulty,
  scenario,
  indicatorSettings,
  onToggleIndicator,
  chartType,
  onToggleChartType,
  onClose,
  onOpenModeSelect,
  onOpenHistory,
  onOpenGuide,
  onGoHome,
  onOpenLearnCharts,
}) => {
  const runAndClose = (fn?: () => void) => {
    onClose();
    fn?.();
  };

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-20 bg-black/40" />
      <div
        id="mobile-quiz-options-panel"
        className="absolute left-0 right-0 top-full z-30 bg-[var(--quiz-panel)] border-b border-[var(--quiz-border)] px-3.5 py-3 space-y-3 shadow-2xl max-h-[72dvh] overflow-y-auto"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pb-2 border-b border-[var(--quiz-border)]/70">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[var(--quiz-text)]">
              Synthetic Scenario ({scenario.assetSymbol})
            </span>
            <span className="bg-[var(--quiz-subtle)] text-[var(--quiz-muted)] font-mono px-1.5 py-0.5 rounded">
              {scenario.timeframe}
            </span>
            <span className="text-[var(--quiz-muted)] font-mono">{difficulty}</span>
          </div>
          <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Educational Chart
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[var(--quiz-muted)]">Chart Style</span>
          <div className="flex items-center bg-[var(--quiz-bg)] p-0.5 rounded-lg border border-[var(--quiz-border)]">
            <button
              type="button"
              onClick={() => onToggleChartType('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                chartType === 'line' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--quiz-muted)]'
              }`}
            >
              <LineChart className="w-3 h-3" />
              <span>Normal</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleChartType('candle')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                chartType === 'candle' ? 'bg-blue-600 text-white font-semibold' : 'text-[var(--quiz-muted)]'
              }`}
            >
              <CandlestickChart className="w-3 h-3" />
              <span>Candles</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--quiz-muted)] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Chart Guides
          </span>
          <div className="flex flex-wrap gap-1.5">
            {GUIDE_OPTIONS.map(({ key, label, activeCls }) => {
              const active = indicatorSettings[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleIndicator(key)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-colors cursor-pointer ${
                    active ? `${activeCls} font-semibold` : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/40 border-transparent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--quiz-border)]/70">
          <button
            type="button"
            onClick={() => runAndClose(onOpenModeSelect)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--quiz-text)] bg-[var(--quiz-bg)] border border-[var(--quiz-border)] cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Mode / Level</span>
          </button>
          {onOpenLearnCharts && (
            <button
              type="button"
              onClick={() => runAndClose(onOpenLearnCharts)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Learn Charts</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => runAndClose(onOpenGuide)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--quiz-muted)] bg-[var(--quiz-bg)] border border-[var(--quiz-border)] cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Patterns</span>
          </button>
          <button
            type="button"
            onClick={() => runAndClose(onOpenHistory)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--quiz-muted)] bg-[var(--quiz-bg)] border border-[var(--quiz-border)] cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          {onGoHome && (
            <button
              type="button"
              onClick={() => runAndClose(onGoHome)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-[var(--quiz-bg)] border border-[var(--quiz-border)] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quit</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
