import React from 'react';
import type { PatternCategory } from '../types/trading';

interface CategoryStat {
  category: PatternCategory;
  total: number;
  wins: number;
  rate: number;
}

interface HistoryCategoryEdgeProps {
  categoryStats: CategoryStat[];
}

export const HistoryCategoryEdge: React.FC<HistoryCategoryEdgeProps> = ({ categoryStats }) => {
  return (
    <div className="bg-[#121824] p-4 rounded-xl border border-slate-800 space-y-3">
      <h3 className="text-xs font-semibold text-slate-300">
        Edge by Technical Pattern Setup
      </h3>

      <div className="space-y-2.5">
        {categoryStats.map((cat) => (
          <div key={cat.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                {cat.category}
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {cat.wins}/{cat.total} ({cat.rate.toFixed(0)}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cat.rate >= 60
                    ? 'bg-emerald-500'
                    : cat.rate >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${cat.total > 0 ? cat.rate : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
