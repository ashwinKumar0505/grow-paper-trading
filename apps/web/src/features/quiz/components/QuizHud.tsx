import React from 'react';
import { Flame, Heart } from 'lucide-react';
import type { GameMode, QuizStats, SurvivalState, TournamentState } from '../types/trading';

interface QuizHudProps {
  mode: GameMode;
  survivalState: SurvivalState;
  tournamentState: TournamentState;
  quizStats: QuizStats;
}

export const QuizHud: React.FC<QuizHudProps> = ({
  mode,
  survivalState,
  tournamentState,
  quizStats,
}) => {
  const tournamentPnl = tournamentState.balance - tournamentState.startingBalance;
  const isProfitable = tournamentPnl >= 0;
  const tournamentTrades = tournamentState.trades;
  const tournamentWins = tournamentTrades.filter((t) => t.isWin).length;
  const tournamentLosses = tournamentTrades.filter((t) => !t.isWin).length;

  const quizAccuracy =
    quizStats.totalQuestions > 0
      ? Math.round((quizStats.correctAnswers / quizStats.totalQuestions) * 100)
      : 0;

  if (mode === 'survival') {
    return (
      <div className="flex items-center gap-3 sm:gap-5 font-mono text-xs">
        {/* Lives Hearts */}
        <div className="flex items-center gap-1.5 bg-[var(--quiz-panel)] px-2.5 py-1 rounded-md border border-[var(--quiz-border)]">
          <span className="text-[var(--quiz-muted)] text-[10px] font-sans mr-0.5">Lives:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: survivalMaxLivesOrFallback(survivalState.maxLives) }).map((_, idx) => {
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
    );
  }

  if (mode === 'tournament') {
    return (
      <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
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
              ₹{tournamentState.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span
            className={`text-[10px] tabular-nums font-semibold ${
              isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {isProfitable ? '+' : ''}₹{tournamentPnl.toFixed(2)} (
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
    );
  }

  return (
    <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
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
  );
};

function survivalMaxLivesOrFallback(maxLives: number) {
  return maxLives > 0 ? maxLives : 3;
}
