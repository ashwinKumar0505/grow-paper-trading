import React from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { TradeRecord } from '../types/trading';

interface HistoryTradeItemProps {
  trade: TradeRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const HistoryTradeItem: React.FC<HistoryTradeItemProps> = ({
  trade,
  isExpanded,
  onToggleExpand,
}) => {
  return (
    <div className="bg-[#121824] border border-slate-800/80 rounded-xl overflow-hidden transition-colors hover:border-slate-700">
      <div
        onClick={onToggleExpand}
        className="p-3 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          {trade.direction === 'BUY' ? (
            <span className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="p-1 rounded bg-rose-950 text-rose-400 border border-rose-800/60">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          )}

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <span>{trade.assetSymbol}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({trade.timeframe})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {trade.patternName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span
              className={`text-xs font-bold tabular-nums block ${
                trade.isWin ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(1)}%
            </span>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 bg-[#0B0E14] text-xs text-slate-400 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div>
              <span className="text-slate-600">Entry: </span>
              <span className="text-slate-300">${trade.entryPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-600">Exit: </span>
              <span className="text-slate-300">${trade.exitPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-600">Category: </span>
              <span className="text-slate-300">{trade.patternCategory}</span>
            </div>
            <div>
              <span className="text-slate-600">Bet Size: </span>
              <span className="text-slate-300">${trade.positionSize?.toLocaleString() || '1,000'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 leading-relaxed">
            {trade.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
