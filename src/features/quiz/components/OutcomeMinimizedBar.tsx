import React from 'react';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import { TradeRecord } from '../types/trading';

interface OutcomeMinimizedBarProps {
  isWin: boolean;
  isTournament: boolean;
  isLastRound: boolean;
  trade: TradeRecord;
  onRestore: () => void;
  onNext: () => void;
}

export const OutcomeMinimizedBar: React.FC<OutcomeMinimizedBarProps> = ({
  isWin,
  isTournament,
  isLastRound,
  trade,
  onRestore,
  onNext,
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#121824]/95 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2">
        {isWin ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-400" />
        )}
        <span className={`font-mono font-bold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isTournament ? (
            <>
              {isWin ? 'WIN' : 'LOSS'}: {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
            </>
          ) : (
            <>
              {isWin ? 'CORRECT' : 'INCORRECT'}: Price moved {trade.priceChangePct >= 0 ? '+' : ''}
              {trade.priceChangePct.toFixed(2)}%
            </>
          )}
        </span>
      </div>

      <button
        onClick={onRestore}
        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Show Lesson</span>
      </button>

      <button
        onClick={onNext}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-md transition-colors cursor-pointer"
      >
        <span>{isLastRound ? 'See Results' : 'Next Chart'}</span>
        <kbd className="bg-emerald-700 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono">
          Space
        </kbd>
      </button>
    </div>
  );
};
