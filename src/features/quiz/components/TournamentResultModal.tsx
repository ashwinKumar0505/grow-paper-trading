import React from 'react';
import { Trophy, TrendingUp, TrendingDown, RotateCcw, GraduationCap, CheckCircle2, XCircle, Award, Sparkles } from 'lucide-react';
import { TournamentState } from '../types/trading';

interface TournamentResultModalProps {
  tournamentState: TournamentState;
  onRestartTournament: () => void;
  onSwitchToQuiz: () => void;
  onGoHome?: () => void;
}

export const TournamentResultModal: React.FC<TournamentResultModalProps> = ({
  tournamentState,
  onRestartTournament,
  onSwitchToQuiz,
  onGoHome,
}) => {
  const { balance, startingBalance, trades, totalRounds } = tournamentState;
  const netPnl = balance - startingBalance;
  const roiPct = (netPnl / startingBalance) * 100;
  const isProfitable = netPnl >= 0;

  const wins = trades.filter((t) => t.isWin).length;
  const losses = trades.filter((t) => !t.isWin).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  // Best and worst trades
  const sortedTrades = [...trades].sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sortedTrades[0];

  // Trader Rank & Verdict
  let rankTitle = 'Market Apprentice';
  let rankBadge = '🛡️';
  let rankColor = 'text-slate-300';
  let rankDesc = 'You gained experience! Review chart shapes in Learn Quiz and sharpen your edge.';

  if (roiPct >= 40) {
    rankTitle = 'Wall Street Prodigy';
    rankBadge = '🏆';
    rankColor = 'text-amber-400';
    rankDesc = 'Exceptional pattern reading and high-conviction position sizing!';
  } else if (roiPct >= 15) {
    rankTitle = 'Master Swing Trader';
    rankBadge = '🥇';
    rankColor = 'text-emerald-400';
    rankDesc = 'Steady, consistent execution with smart capital preservation.';
  } else if (roiPct > 0) {
    rankTitle = 'Profitable Trader';
    rankBadge = '🥈';
    rankColor = 'text-blue-400';
    rankDesc = 'Solid green finish! You beat the market average with positive returns.';
  } else if (roiPct > -20) {
    rankTitle = 'Disciplined Trader';
    rankBadge = '🥉';
    rankColor = 'text-slate-200';
    rankDesc = 'Small drawdown. With a bit more patience on bounces, you will be in profit.';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-6 text-center border-b border-slate-800 bg-[#0B0E14] relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto shadow-[0_0_25px_rgba(245,158,11,0.25)] mb-3">
            {rankBadge}
          </div>

          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full inline-block mb-1">
            10-Round Challenge Completed
          </span>

          <h2 className={`text-2xl font-bold tracking-tight ${rankColor} font-sans`}>
            {rankTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {rankDesc}
          </p>
        </div>

        {/* Financial Scorecard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#121824] border-b border-slate-800 font-mono text-center">
          {/* Final Equity */}
          <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-sans uppercase">Final Equity</span>
            <span className="text-base font-bold text-slate-100 tabular-nums">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">Started $10,000</span>
          </div>

          {/* Net Return / ROI */}
          <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-sans uppercase">Net PnL</span>
            <span className={`text-base font-bold tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? '+' : ''}${netPnl.toFixed(2)}
            </span>
            <span className={`text-[10px] font-semibold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isProfitable ? '+' : ''}{roiPct.toFixed(1)}% ROI
            </span>
          </div>

          {/* Win Rate */}
          <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-sans uppercase">Win Rate</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">
              {winRate.toFixed(0)}%
            </span>
            <span className="text-[10px] text-slate-400">
              {wins}W · {losses}L ({trades.length} rds)
            </span>
          </div>

          {/* Best Trade */}
          <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-sans uppercase">Best Move</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">
              {bestTrade && bestTrade.pnl > 0 ? `+$${bestTrade.pnl.toFixed(0)}` : '$0'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {bestTrade ? bestTrade.patternName : '-'}
            </span>
          </div>
        </div>

        {/* Round-by-Round Breakdown Log */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-[#0B0E14]/40">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-sans">
            <span>Round-by-Round Log</span>
            <span>Outcome & PnL</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {trades.map((trade, idx) => (
              <div
                key={trade.id || idx}
                className="flex items-center justify-between bg-[#121824] px-3 py-2 rounded-lg border border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-slate-200 font-semibold font-sans">{trade.patternName}</span>
                    <span className="text-slate-500 text-[11px] ml-2">
                      ({trade.direction === 'BUY' ? 'UP' : 'DOWN'} • Bet: ${trade.positionSize.toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-bold tabular-nums ${trade.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </span>
                  {trade.isWin ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Actions */}
        <div className="p-4 bg-[#121824] border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onRestartTournament}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer font-sans"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Another $10k Challenge</span>
          </button>

          <button
            onClick={onSwitchToQuiz}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs py-3 rounded-xl transition-all cursor-pointer font-sans"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Back to Learn Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
