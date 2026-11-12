import React from 'react';
import {
  Activity,
  Flame,
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
  onSelectMode,
  onOpenModeSelect,
  quizStats,
  survivalState,
  tournamentState,
  onOpenHistory,
  onOpenGuide,
  onGoHome,
  onOpenLearnCharts,
}) => {
  const isTournament = mode === 'tournament';
  const tournamentPnl = tournamentState.balance - tournamentState.startingBalance;
  const isProfitable = tournamentPnl >= 0;
  const tournamentTrades = tournamentState.trades;
  const tournamentWins = tournamentTrades.filter((t) => t.isWin).length;
  const tournamentLosses = tournamentTrades.filter((t) => !t.isWin).length;

  const quizAccuracy =
    quizStats.totalQuestions > 0
      ? Math.round((quizStats.correctAnswers / quizStats.totalQuestions) * 100)
      : 0;

  return (
    <div role="toolbar" aria-label="Quiz controls" className="w-full bg-[var(--quiz-bg)] border-b border-[var(--quiz-border)]/80 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap select-none shrink-0 z-20">
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

        {/* Choose Different Level / Game Button -> routes to Mode Selection Page */}
        <button
          onClick={onOpenModeSelect}
          title="Choose a different game mode or difficulty level"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--quiz-text)] bg-[var(--quiz-panel)] hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] border border-[var(--quiz-border)]/80 hover:border-slate-600 transition-all cursor-pointer shadow-sm"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span className="font-sans">Mode / Level</span>
        </button>

        {/* Quit Quiz Button -> returns to Landing Page */}
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
      <div className="flex items-center gap-4 sm:gap-6 text-xs">
        {mode === 'survival' ? (
          // --- SURVIVAL HUD: Hearts, Streak, Score ---
          <div className="flex items-center gap-3 sm:gap-5 font-mono">
            {/* Lives Hearts */}
            <div className="flex items-center gap-1.5 bg-[var(--quiz-panel)] px-2.5 py-1 rounded-md border border-[var(--quiz-border)]">
              <span className="text-[var(--quiz-muted)] text-[10px] font-sans mr-0.5">Lives:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: survivalState.maxLives }).map((_, idx) => {
                  const isAlive = idx < survivalState.lives;
                  return isAlive ? (
                    <Heart
                      key={idx}
                      className="w-4 h-4 text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                    />
                  ) : (
                    <Heart key={idx} className="w-4 h-4 text-slate-700 stroke-slate-600" />
                  );
                })}
              </div>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 bg-[var(--quiz-panel)] px-2.5 py-1 rounded-md border border-[var(--quiz-border)]">
              <Flame
                className={`w-4 h-4 ${
                  survivalState.streak >= 3
                    ? 'text-amber-500 fill-amber-500 animate-bounce'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              />
              <span className="text-[var(--quiz-text)] font-bold tabular-nums">
                {survivalState.streak}
              </span>
              <span className="text-[10px] text-[var(--quiz-muted)] font-sans">streak</span>
            </div>

            {/* Points */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[var(--quiz-muted)] text-[10px] font-sans">Score</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums text-xs">
                {survivalState.score} pts
              </span>
            </div>
          </div>
        ) : mode === 'tournament' ? (
          // --- TOURNAMENT HUD: Virtual Equity, PnL, Round Progress ---
          <div className="flex items-center gap-4 sm:gap-6 font-mono">
            {/* Round Counter */}
            <div className="flex flex-col items-start bg-[var(--quiz-panel)] px-2.5 py-1 rounded-md border border-[var(--quiz-border)]">
              <span className="text-[var(--quiz-muted)] text-[10px] uppercase tracking-wider font-sans">
                Challenge
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-bold tabular-nums text-xs">
                Round {tournamentState.currentRound} / {tournamentState.totalRounds}
              </span>
            </div>

            {/* Virtual Cash Equity */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--quiz-muted)] text-[11px]">Virtual Equity:</span>
                <span className="text-[var(--quiz-text)] font-bold tabular-nums text-sm">
                  ${tournamentState.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span
                className={`text-[10px] tabular-nums font-semibold ${
                  isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {isProfitable ? '+' : ''}${tournamentPnl.toFixed(2)} (
                {isProfitable ? '+' : ''}
                {((tournamentPnl / tournamentState.startingBalance) * 100).toFixed(1)}%)
              </span>
            </div>

            {/* Record */}
            <div className="hidden md:flex flex-col items-end border-l border-[var(--quiz-border)] pl-4">
              <span className="text-[var(--quiz-muted)] text-[11px]">Scorecard:</span>
              <span className="text-[var(--quiz-muted)] font-bold tabular-nums">
                {tournamentWins}W · {tournamentLosses}L
              </span>
            </div>
          </div>
        ) : (
          // --- LEARN QUIZ HUD: Pure accuracy, score, streak ---
          <div className="flex items-center gap-4 sm:gap-6 font-mono">
            {/* Questions Answered & Score */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--quiz-muted)] text-[11px] font-sans">Score:</span>
                <span className="text-[var(--quiz-text)] font-bold tabular-nums text-sm">
                  {quizStats.correctAnswers} / {quizStats.totalQuestions}
                </span>
              </div>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold tabular-nums">
                {quizAccuracy}% accuracy
              </span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 bg-[var(--quiz-panel)] px-2.5 py-1 rounded-md border border-[var(--quiz-border)]">
              <Flame
                className={`w-4 h-4 ${
                  quizStats.currentStreak >= 3
                    ? 'text-amber-500 fill-amber-500 animate-bounce'
                    : quizStats.currentStreak > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-600'
                }`}
              />
              <div className="flex items-baseline gap-1">
                <span className="text-[var(--quiz-text)] font-bold tabular-nums">
                  {quizStats.currentStreak}
                </span>
                <span className="text-[10px] text-[var(--quiz-muted)] font-sans">streak</span>
              </div>
            </div>

            {/* Visual Dot History (last 5 answers) */}
            {quizStats.recentResults.length > 0 && (
              <div className="hidden md:flex items-center gap-1 bg-[var(--quiz-panel)] px-2 py-1 rounded-md border border-[var(--quiz-border)]">
                {quizStats.recentResults.slice(-5).map((isCorrect, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      isCorrect ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Global Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Learn Charts Interactive Page Button */}
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

        {/* Change Mode & Difficulty button */}
        <button
          onClick={onOpenModeSelect}
          title="Change Quiz Mode & Difficulty"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden sm:inline font-sans">Modes</span>
        </button>

        {/* How to Play / Guide */}
        <button
          onClick={onGoHome}
          title="How to Play & Overview"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden lg:inline font-sans">How to Play</span>
        </button>

        {/* Pattern Reference Guide */}
        <button
          onClick={onOpenGuide}
          title="Pattern Cheat Sheet"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden lg:inline font-sans">Patterns</span>
        </button>

        {/* History & Analytics Drawer */}
        <button
          onClick={onOpenHistory}
          title="Trade History & Performance"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[var(--quiz-muted)] hover:text-[var(--quiz-text)] hover:bg-[var(--quiz-subtle)]/80 border border-[var(--quiz-border)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline font-sans">History</span>
        </button>

        {/* Sound FX Toggle */}

      </div>
    </div>
  );
};
