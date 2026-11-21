import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ChartScenario, TradeRecord } from '../types/trading';

interface OutcomeNumbersGridProps {
  isSurvival: boolean;
  isTournament: boolean;
  isWin: boolean;
  trade: TradeRecord;
  scenario: ChartScenario;
  survivalMaxLives: number;
  survivalLives: number;
  survivalStreak: number;
  survivalRoundsSurvived: number;
  tournamentRound: number;
  tournamentTotalRounds: number;
  tournamentBalance?: number;
}

export const OutcomeNumbersGrid: React.FC<OutcomeNumbersGridProps> = ({
  isSurvival,
  isTournament,
  isWin,
  trade,
  scenario,
  survivalMaxLives,
  survivalLives,
  survivalStreak,
  survivalRoundsSurvived,
  tournamentRound,
  tournamentTotalRounds,
  tournamentBalance,
}) => {
  if (isSurvival) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Lives Left</span>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: survivalMaxLives }).map((_, idx) => (
              <span key={idx} className="text-sm">
                {idx < survivalLives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          <span className={`text-[10px] font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isWin ? 'Safe' : '-1 Heart'}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Survival Streak</span>
          <span className="text-amber-400 text-base font-bold tabular-nums mt-0.5">
            {survivalStreak} 🔥
          </span>
          <span className="text-slate-500 text-[10px]">Multiplier active</span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Price Moved</span>
          <div className="flex items-center gap-1 text-sm font-semibold tabular-nums mt-0.5">
            {trade.priceChangePct >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
            </span>
          </div>
          <span className="text-slate-500 text-[10px]">Over {scenario.outcomeCount} candles</span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Surviving Sets</span>
          <span className="text-slate-100 text-sm font-bold tabular-nums mt-0.5">
            {survivalRoundsSurvived} Completed
          </span>
          <span className="text-slate-500 text-[10px]">{scenario.difficulty} Level</span>
        </div>
      </div>
    );
  }

  if (isTournament) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Round PnL</span>
          <span className={`text-base font-bold tabular-nums ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
          </span>
          <span className={`text-[10px] font-semibold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}% ROI
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Bet Size</span>
          <span className="text-slate-200 text-sm font-semibold tabular-nums mt-0.5">
            ₹{trade.positionSize.toLocaleString('en-IN')}
          </span>
          <span className="text-slate-500 text-[10px]">Virtual cash</span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">Price Moved</span>
          <div className="flex items-center gap-1 text-sm font-semibold tabular-nums mt-0.5">
            {trade.priceChangePct >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
            </span>
          </div>
          <span className="text-slate-500 text-[10px]">Over {scenario.outcomeCount} candles</span>
        </div>

        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] font-sans">New Balance</span>
          <span className="text-slate-100 text-sm font-bold tabular-nums mt-0.5">
            ₹{(tournamentBalance ?? trade.pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-slate-500 text-[10px]">Round {tournamentRound}/{tournamentTotalRounds}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
      <div className="flex flex-col">
        <span className="text-slate-500 text-[11px] font-sans">Quiz Verdict</span>
        <span className={`text-base font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isWin ? 'CORRECT +1' : 'INCORRECT'}
        </span>
        <span className="text-[10px] text-slate-400 font-sans">
          {isWin ? 'Great pattern eye!' : 'Review pattern below'}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-slate-500 text-[11px] font-sans">Your Guess</span>
        <span className="text-slate-200 text-sm font-bold mt-0.5">
          {trade.direction === 'BUY' ? '▲ UP (BUY)' : '▼ DOWN (SELL)'}
        </span>
        <span className="text-slate-500 text-[10px] font-sans">
          At entry ₹{trade.entryPrice.toFixed(2)}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-slate-500 text-[11px] font-sans">Actual Move</span>
        <div className="flex items-center gap-1 text-sm font-bold tabular-nums mt-0.5">
          {trade.priceChangePct >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
          </span>
        </div>
        <span className="text-slate-500 text-[10px]">Next {scenario.outcomeCount} candles</span>
      </div>

      <div className="flex flex-col">
        <span className="text-slate-500 text-[11px] font-sans">Exit Price</span>
        <span className="text-slate-200 text-sm font-semibold tabular-nums mt-0.5">
          ₹{trade.exitPrice.toFixed(2)}
        </span>
        <span className="text-slate-500 text-[10px] font-sans">{scenario.difficulty} Level</span>
      </div>
    </div>
  );
};
