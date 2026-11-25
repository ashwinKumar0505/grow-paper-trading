import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Heart, SlidersHorizontal } from 'lucide-react';
import type {
  ChartScenario,
  ChartType,
  DifficultyLevel,
  GameMode,
  IndicatorSettings,
  QuizStats,
  SurvivalState,
  TournamentState,
} from '../types/trading';
import { MobileQuizOptionsDrawer } from './MobileQuizOptionsDrawer';

interface MobileQuizBarProps {
  mode: GameMode;
  difficulty: DifficultyLevel;
  scenario: ChartScenario;
  tradeNumber: number;
  quizStats: QuizStats;
  survivalState: SurvivalState;
  tournamentState: TournamentState;
  indicatorSettings: IndicatorSettings;
  onToggleIndicator: (key: keyof IndicatorSettings) => void;
  chartType: ChartType;
  onToggleChartType: (type: ChartType) => void;
  onOpenModeSelect: () => void;
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onGoHome?: () => void;
  onOpenLearnCharts?: () => void;
}

export const MobileQuizBar: React.FC<MobileQuizBarProps> = ({
  mode,
  difficulty,
  scenario,
  tradeNumber,
  quizStats,
  survivalState,
  tournamentState,
  indicatorSettings,
  onToggleIndicator,
  chartType,
  onToggleChartType,
  onOpenModeSelect,
  onOpenHistory,
  onOpenGuide,
  onGoHome,
  onOpenLearnCharts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="md:hidden relative w-full bg-[var(--quiz-bg)] border-b border-[var(--quiz-border)]/80 select-none shrink-0 z-20"
      onKeyDown={(e) => { if (e.key === 'Escape' && isExpanded) setIsExpanded(false); }}
    >
      <div className="relative z-30 bg-[var(--quiz-bg)] px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 font-mono text-xs">
          <span className="font-bold text-[var(--quiz-text)] truncate">
            #{tradeNumber} {scenario.assetSymbol}
          </span>
          <span className="text-slate-600">·</span>

          {mode === 'survival' ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: survivalState.maxLives > 0 ? survivalState.maxLives : 3 }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className={`w-3.5 h-3.5 ${idx < survivalState.lives ? 'text-rose-500 fill-rose-500' : 'text-slate-600'}`}
                  />
                ))}
              </div>
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                <Flame className="w-3.5 h-3.5" />
                {survivalState.streak}
              </span>
            </div>
          ) : mode === 'tournament' ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-amber-700 dark:text-amber-400 font-bold">
                R{tournamentState.currentRound}/{tournamentState.totalRounds}
              </span>
              <span className="text-[var(--quiz-text)] font-bold tabular-nums">
                ₹{Math.round(tournamentState.balance).toLocaleString('en-IN')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[var(--quiz-text)] font-bold tabular-nums">
                {quizStats.correctAnswers}/{quizStats.totalQuestions}
              </span>
              <span className="flex items-center gap-0.5 text-[var(--quiz-muted)]">
                <Flame className={`w-3.5 h-3.5 ${quizStats.currentStreak > 0 ? 'text-amber-500' : 'text-slate-600'}`} />
                <span className="text-[var(--quiz-text)] font-bold">{quizStats.currentStreak}</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="mobile-quiz-options-panel"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--quiz-text)] bg-[var(--quiz-panel)] border border-[var(--quiz-border)] hover:bg-[var(--quiz-subtle)] transition-colors shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Options</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <MobileQuizOptionsDrawer
          difficulty={difficulty}
          scenario={scenario}
          indicatorSettings={indicatorSettings}
          onToggleIndicator={onToggleIndicator}
          chartType={chartType}
          onToggleChartType={onToggleChartType}
          onClose={() => setIsExpanded(false)}
          onOpenModeSelect={onOpenModeSelect}
          onOpenHistory={onOpenHistory}
          onOpenGuide={onOpenGuide}
          onGoHome={onGoHome}
          onOpenLearnCharts={onOpenLearnCharts}
        />
      )}
    </div>
  );
};
