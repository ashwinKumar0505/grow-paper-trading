import React from 'react';
import { RotateCcw, Sliders, Home, Flame, Trophy, ShieldAlert, Award } from 'lucide-react';
import { DifficultyLevel, SurvivalState } from '../types/trading';

interface SurvivalGameOverModalProps {
  survivalState: SurvivalState;
  difficulty: DifficultyLevel;
  onRetry: () => void;
  onChangeMode: () => void;
  onGoHome: () => void;
}

export const SurvivalGameOverModal: React.FC<SurvivalGameOverModalProps> = ({
  survivalState,
  difficulty,
  onRetry,
  onChangeMode,
  onGoHome,
}) => {
  const isNewBest =
    survivalState.streak > 0 && survivalState.streak >= survivalState.bestStreak;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-rose-900/60 rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col">
        {/* Top Glow & Header */}
        <div className="relative p-6 text-center bg-gradient-to-b from-rose-950/40 to-transparent border-b border-rose-900/40">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse">
            💔
          </div>

          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
            OUT OF HEARTS
          </span>

          <h2 className="text-2xl font-black text-white font-sans tracking-tight">
            Survival Run Ended
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            {survivalState.roundsSurvived >= 5
              ? 'Incredible reflexes! You navigated deep into the market setups.'
              : 'The market can be tricky! Every loss is a lesson to sharpen your eye.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-5 space-y-3 font-mono">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/80 flex flex-col">
              <span className="text-[11px] text-slate-500 font-sans">Rounds Survived</span>
              <span className="text-xl font-bold text-slate-100 tabular-nums mt-0.5">
                {survivalState.roundsSurvived}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">Level: {difficulty}</span>
            </div>

            <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/80 flex flex-col">
              <span className="text-[11px] text-slate-500 font-sans">Final Streak</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xl font-bold text-amber-400 tabular-nums">
                  {survivalState.streak}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans">
                All-time best: {survivalState.bestStreak}
              </span>
            </div>
          </div>

          {/* New Best Streak Badge */}
          {isNewBest && (
            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-amber-300 text-xs font-sans font-semibold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>New Personal Best Streak Achieved! 🎉</span>
            </div>
          )}

          {/* Total Points */}
          <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 font-sans">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Run Score</span>
            </div>
            <span className="text-base font-bold text-emerald-400 tabular-nums">
              {survivalState.score.toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#0B0E14] border-t border-slate-800/80 flex flex-col gap-2 font-sans">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again (❤️ 3 Lives)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onChangeMode}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#121824] hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Change Mode / Level</span>
            </button>

            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-1.5 bg-[#121824] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs py-2.5 px-3.5 rounded-xl transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
