import React from 'react';
import {
  Heart,
  BarChart3,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Briefcase,
  Sliders,
  LogOut,
} from 'lucide-react';
import { DifficultyLevel, GameMode, QuizStats, SurvivalState, TournamentState } from '../types/trading';
import { QuizHud } from './QuizHud';

interface QuizToolbarProps {
  mode: GameMode;
  difficulty: DifficultyLevel;
  onSelectMode: (mode: GameMode) => void;
  onOpenModeSelect: () => void;
  quizStats: QuizStats;
  survivalState: SurvivalState;
  tournamentState: TournamentState;
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onGoHome?: () => void;
  onOpenLearnCharts?: () => void;
}

export const QuizToolbar: React.FC<QuizToolbarProps> = ({
  mode,
  difficulty,
  onOpenModeSelect,
  quizStats,
  survivalState,
  tournamentState,
  onOpenHistory,
  onOpenGuide,
  onGoHome,
  onOpenLearnCharts,
}) => {
  return (
    <div
      role="toolbar"
      aria-label="Quiz controls"
      className="w-full bg-[var(--quiz-bg)] border-b border-[var(--quiz-border)]/80 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap select-none shrink-0 z-20"
    >
      {/* Zone 1: Wordmark & Brand Identity */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active Mode & Level Indicator Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium select-none ml-1 bg-[var(--quiz-panel)] border-[var(--quiz-border)]">
          {mode === 'quiz' ? (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-semibold">Learn Quiz</span>
            </>
          ) : mode === 'survival' ? (
            <>
              <Heart className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 fill-current" />
              <span className="text-rose-700 dark:text-rose-300 font-semibold">Survival</span>
            </>
          ) : (
            <>
              <Briefcase className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">$10k Cash</span>
            </>
          )}
          <span className="text-slate-600">·</span>
          <span className="text-[var(--quiz-muted)] font-mono text-[11px]">{difficulty} Level</span>
        </div>

        {/* Choose Different Level / Game Button */}
        <button
          onClick={onOpenModeSelect}
          title="Choose a different game mode or difficulty level"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--quiz-text)] bg-[var(--quiz-panel)] hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-[var(--quiz-border)]/80 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span className="font-sans">Mode / Level</span>
        </button>

        {/* Quit Quiz Button */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            title="Quit quiz and return to setup"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--quiz-muted)] hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-100/30 dark:hover:bg-rose-950/30 border border-[var(--quiz-border)]/80 hover:border-rose-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Quit</span>
          </button>
        )}
      </div>

      {/* Zone 2: Mode-Specific HUD */}
      <QuizHud
        mode={mode}
        survivalState={survivalState}
        tournamentState={tournamentState}
        quizStats={quizStats}
      />

      {/* Zone 3: Global Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onOpenLearnCharts && (
          <button
            onClick={onOpenLearnCharts}
            title="Interactive Chart Pattern Study Deck"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          >
            <GraduationCap className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline font-sans">Learn Charts</span>
          </button>
        )}

        <button
          onClick={onOpenModeSelect}
          title="Change Quiz Mode & Difficulty"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden sm:inline font-sans">Modes</span>
        </button>

        <button
          onClick={onGoHome}
          title="How to Play & Overview"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden lg:inline font-sans">How to Play</span>
        </button>

        <button
          onClick={onOpenGuide}
          title="Pattern Cheat Sheet"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden lg:inline font-sans">Patterns</span>
        </button>

        <button
          onClick={onOpenHistory}
          title="Trade History & Performance"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline font-sans">History</span>
        </button>
      </div>
    </div>
  );
};
