import React, { useState } from 'react';
import { UserStats, PatternCategory } from '../types/trading';
import { X, Trophy, Flame, Trash2 } from 'lucide-react';
import { HistoryTradeItem } from './HistoryTradeItem';
import { HistoryCategoryEdge } from './HistoryCategoryEdge';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  onResetStats: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  stats,
  onResetStats,
}) => {
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories: PatternCategory[] = [
    'Reversal',
    'Continuation',
    'Bilateral',
    'Breakout',
    'Trend Following',
    'Fakeout / Liquidity',
    'Range & Squeeze',
  ];

  const categoryStats = categories.map((cat) => {
    const trades = stats.tradeHistory.filter((t) => t.patternCategory === cat);
    const wins = trades.filter((t) => t.isWin).length;
    const rate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    return {
      category: cat,
      total: trades.length,
      wins,
      rate,
    };
  });

  let totalGrossWin = 0;
  let totalGrossLoss = 0;
  stats.tradeHistory.forEach((t) => {
    if (t.pnl > 0) totalGrossWin += t.pnl;
    else totalGrossLoss += Math.abs(t.pnl);
  });
  const profitFactor = totalGrossLoss > 0 ? (totalGrossWin / totalGrossLoss).toFixed(2) : totalGrossWin > 0 ? '∞' : '0.00';

  const filteredHistory = filterCategory === 'all'
    ? stats.tradeHistory
    : stats.tradeHistory.filter((t) => t.patternCategory === filterCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0B0E14] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#121824]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              Journal & Performance Analytics
            </h2>
          </div>
          <button
            aria-label="Close quiz history"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Top Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#121824] p-3 rounded-xl border border-slate-800 flex flex-col font-mono">
              <span className="text-[11px] text-slate-500 font-sans">Net PnL</span>
              <span className={`text-base font-bold tabular-nums ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">
                Bal: ${stats.balance.toFixed(0)}
              </span>
            </div>

            <div className="bg-[#121824] p-3 rounded-xl border border-slate-800 flex flex-col font-mono">
              <span className="text-[11px] text-slate-500 font-sans">Win Rate</span>
              <span className="text-base font-bold text-slate-100 tabular-nums">
                {stats.winRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">
                {stats.wins}W / {stats.losses}L
              </span>
            </div>

            <div className="bg-[#121824] p-3 rounded-xl border border-slate-800 flex flex-col font-mono">
              <span className="text-[11px] text-slate-500 font-sans">Best Streak</span>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-base font-bold text-amber-400 tabular-nums">
                  {stats.bestStreak}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Current: {stats.currentStreak}
              </span>
            </div>

            <div className="bg-[#121824] p-3 rounded-xl border border-slate-800 flex flex-col font-mono">
              <span className="text-[11px] text-slate-500 font-sans">Profit Factor</span>
              <span className="text-base font-bold text-slate-100 tabular-nums">
                {profitFactor}
              </span>
              <span className="text-[10px] text-slate-500">
                Gross: ${totalGrossWin.toFixed(0)} / ${totalGrossLoss.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Pattern Category Performance */}
          <HistoryCategoryEdge categoryStats={categoryStats} />

          {/* Trade History Log Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">
                Trade Log ({filteredHistory.length})
              </h3>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[#121824] text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1 outline-none focus:border-slate-600"
              >
                <option value="all">All Setups</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 bg-[#121824] rounded-xl border border-slate-800 text-slate-500 text-xs">
                No trades recorded yet. Start testing setups to populate your journal!
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((trade) => (
                  <HistoryTradeItem
                    key={trade.id}
                    trade={trade}
                    isExpanded={expandedTradeId === trade.id}
                    onToggleExpand={() =>
                      setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#121824] flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset your quiz history and practice accuracy? Your paper trading portfolio will not change.')) {
                onResetStats();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-900/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>

          <button
            aria-label="Close quiz history"
            onClick={onClose}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
          >
            Close Journal
          </button>
        </div>
      </div>
    </div>
  );
};
