import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GameMode, TradeDirection } from '../types/trading';

interface ActionDockProps {
  mode: GameMode;
  outcomeCount: number;
  onTrade: (direction: TradeDirection, positionSize: number) => void;
  disabled: boolean;
  userBalance: number;
  positionSize: number;
  onChangePositionSize: (size: number) => void;
  tournamentRound?: number;
  tournamentTotalRounds?: number;
  survivalLives?: number;
  survivalMaxLives?: number;
  survivalStreak?: number;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  mode,
  outcomeCount,
  onTrade,
  disabled,
  userBalance,
  positionSize,
  onChangePositionSize,
  tournamentRound = 1,
  tournamentTotalRounds = 10,
  survivalLives = 3,
  survivalMaxLives = 3,
  survivalStreak = 0,
}) => {
  const isTournament = mode === 'tournament';
  const isSurvival = mode === 'survival';

  return (
    <div className="w-full bg-[var(--quiz-panel)] border-t border-[var(--quiz-border)]/80 px-4 py-3 select-none">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Question Prompt */}
        <div className="flex flex-col text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isSurvival ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
            <span className="text-sm font-bold text-[var(--quiz-text)] font-sans">
              {isSurvival
                ? `Survival Mode: Will price go UP or DOWN next?`
                : isTournament
                ? `Round ${tournamentRound} of ${tournamentTotalRounds}: Will price go UP or DOWN?`
                : 'Will the price go UP or DOWN next?'}
            </span>
          </div>
          <p className="text-xs text-[var(--quiz-muted)] mt-0.5">
            {isSurvival
              ? `Predict the next ${outcomeCount} candles. Every wrong prediction costs 1 life!`
              : isTournament
              ? `Predict the next ${outcomeCount} candles. Risk virtual cash to grow your balance!`
              : `Look at the pattern before the Entry Line. Predict the next ${outcomeCount} candles.`}
          </p>
        </div>

        {/* Center: Survival Hearts or Tournament Bet Amount */}
        {isSurvival && (
          <div className="flex items-center gap-3 bg-[var(--quiz-bg)] px-3.5 py-1.5 rounded-xl border border-[var(--quiz-border)]">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[var(--quiz-muted)] font-sans text-[11px]">Lives:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: survivalMaxLives }).map((_, idx) => (
                  <span key={idx} className="text-sm">
                    {idx < survivalLives ? '❤️' : '🖤'}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-l border-[var(--quiz-border)] pl-2.5 flex items-center gap-1 text-xs font-mono">
              <span className="text-amber-700 dark:text-amber-400 font-bold">{survivalStreak}</span>
              <span className="text-[var(--quiz-muted)] text-[10px]">streak</span>
            </div>
          </div>
        )}
        {isTournament && (
          <div className="flex items-center gap-3 bg-[var(--quiz-bg)] px-3.5 py-1.5 rounded-xl border border-[var(--quiz-border)]">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[var(--quiz-muted)] font-sans text-[11px]">Bet:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">${positionSize.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    disabled={disabled || amt > userBalance}
                    onClick={() => onChangePositionSize(Math.min(amt, userBalance))}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      positionSize === amt
                        ? 'bg-[var(--quiz-subtle)] text-[var(--quiz-text)] font-bold border border-[var(--quiz-border)]'
                        : 'text-[var(--quiz-muted)] bg-[var(--quiz-subtle)]/50 hover:bg-[var(--quiz-subtle)] hover:text-[var(--quiz-text)] disabled:opacity-30'
                    }`}
                  >
                    ${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Tactile BUY (UP) / SELL (DOWN) Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-center">
          {/* UP (BUY) Button */}
          <button
            disabled={disabled}
            onClick={() => onTrade('BUY', isTournament ? positionSize : 1000)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white px-3 sm:px-7 py-2.5 whitespace-nowrap rounded-xl font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            <span>UP (BUY)</span>
            <kbd className="hidden sm:inline bg-emerald-700/60 text-emerald-700 dark:text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ml-1">
              B
            </kbd>
          </button>

          {/* DOWN (SELL) Button */}
          <button
            disabled={disabled}
            onClick={() => onTrade('SELL', isTournament ? positionSize : 1000)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white px-3 sm:px-7 py-2.5 whitespace-nowrap rounded-xl font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            <span>DOWN (SELL)</span>
            <kbd className="hidden sm:inline bg-rose-700/60 text-rose-700 dark:text-rose-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ml-1">
              S
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
