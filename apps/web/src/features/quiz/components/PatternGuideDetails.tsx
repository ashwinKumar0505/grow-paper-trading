import React from 'react';
import {
  AlertCircle,
  AlertOctagon,
  ArrowRightCircle,
  Check,
  Target,
} from 'lucide-react';
import type { PatternTemplate } from '../utils/dataGenerator';

interface PatternGuideDetailsProps {
  current: PatternTemplate;
}

export const PatternGuideDetails: React.FC<PatternGuideDetailsProps> = ({ current }) => {
  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#121824]">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                current.expectedDirection === 'BUY'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  : 'bg-rose-950 text-rose-400 border border-rose-800/50'
              }`}
            >
              {current.expectedDirection === 'BUY' ? 'GOES UP (BUY)' : 'GOES DOWN (SELL)'}
            </span>
            <span className="text-xs text-slate-400">
              {current.cheatSheetGroup} Pattern
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {current.difficulty} Tier
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            {current.name}
          </h3>
        </div>
      </div>

      {/* Mental Analogy */}
      <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14] p-3.5 rounded-xl border border-slate-800">
        {current.explanation}
      </p>

      {/* Strategy Rules Triad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono font-bold uppercase">
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>Entry</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            {current.entryRule}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono font-bold uppercase">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Stop Loss</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            {current.stopLossRule}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-mono font-bold uppercase">
            <Target className="w-3.5 h-3.5" />
            <span>Target</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            {current.targetRule}
          </p>
        </div>
      </div>

      {/* Key Observation */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-400" />
          What to Look For On The Chart:
        </h4>
        <p className="text-xs text-slate-300 pl-5">
          {current.keyObservation}
        </p>
      </div>

      {/* Pro Tip */}
      <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl text-xs space-y-1">
        <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
          Pro Execution Strategy:
        </h4>
        <p className="text-indigo-200/90 pl-5">{current.proTip}</p>
      </div>
    </div>
  );
};
