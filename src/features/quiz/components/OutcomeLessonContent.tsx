import React from 'react';
import {
  BookOpen,
  Flag,
  Image as ImageIcon,
  Lightbulb,
  ShieldAlert,
  Target,
} from 'lucide-react';
import type { ChartScenario } from '../types/trading';

const QUIZ_SUCCESS_MASCOT = '/images/landing/quiz-success.png';
const QUIZ_FAILURE_MASCOT = '/images/landing/quiz-failure.png';

interface OutcomeLessonContentProps {
  scenario: ChartScenario;
  isWin: boolean;
  onShowCheatSheet: () => void;
  onOpenGuide?: () => void;
}

export const OutcomeLessonContent: React.FC<OutcomeLessonContentProps> = ({
  scenario,
  isWin,
  onShowCheatSheet,
  onOpenGuide,
}) => {
  return (
    <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col md:flex-row items-stretch md:items-start gap-5 lg:gap-6">
        {/* Left Column (approx 58% on desktop): Pattern Breakdown & Educational Explanation */}
        <div className="w-full md:w-[58%] space-y-3.5 sm:space-y-4">
          {/* Pattern Identifier & Classification Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-100 font-sans">
                  {scenario.patternName}
                </span>
                {scenario.cheatSheetGroup && scenario.cheatSheetGroup !== 'Special' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    15-Pattern Cheat Sheet • {scenario.cheatSheetGroup}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5 text-slate-400">
                <span className={scenario.expectedDirection === 'BUY' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {scenario.expectedDirection === 'BUY' ? '▲ Bullish Bias (Goes UP)' : '▼ Bearish Bias (Goes DOWN)'}
                </span>
                <span className="text-slate-600">·</span>
                <span>{scenario.difficulty} Level</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{scenario.patternCategory}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onShowCheatSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>View Cheat Sheet</span>
              </button>
              {onOpenGuide && (
                <button
                  onClick={onOpenGuide}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 transition-colors cursor-pointer"
                  title="Open full guide"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                </button>
              )}
            </div>
          </div>

          {/* Strategy Execution Blueprint from Cheat Sheet */}
          {(scenario.entryRule || scenario.stopLossRule || scenario.targetRule) && (
            <div className="bg-[#0B0E14] rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>⚡ Standard Trade Execution Rules</span>
                <span className="text-[10px] text-amber-400 font-normal">From 15 Popular Patterns</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {scenario.entryRule && (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1 text-[11px]">
                      <Target className="w-3.5 h-3.5" />
                      <span>Entry Trigger</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {scenario.entryRule}
                    </p>
                  </div>
                )}
                {scenario.stopLossRule && (
                  <div className="bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Stop Loss</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {scenario.stopLossRule}
                    </p>
                  </div>
                )}
                {scenario.targetRule && (
                  <div className="bg-blue-950/20 border border-blue-900/30 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1 text-[11px]">
                      <Flag className="w-3.5 h-3.5" />
                      <span>Measured Target</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {scenario.targetRule}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* The Why Explanation */}
          <div className="bg-[#0B0E14] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
            <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              📖 The Story of This Move
            </h4>
            <p>{scenario.explanation}</p>
          </div>

          {/* Key Observation */}
          <div className="bg-blue-950/20 border border-blue-900/40 p-3.5 rounded-xl text-xs text-blue-200/90 leading-relaxed font-sans">
            <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
              💡 The Visual Clue to Spot
            </h4>
            <p>{scenario.keyObservation}</p>
          </div>

          {/* Pro Tip */}
          <div className="bg-amber-950/20 border border-amber-900/40 p-3.5 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5 font-sans">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 mb-0.5">Simple Rule of Thumb</h4>
              <p>{scenario.proTip}</p>
            </div>
          </div>
        </div>

        {/* Right Column (approx 42% on desktop): Bull or Bear Mascot Illustration */}
        <div className="w-full md:w-[42%] flex flex-col items-center justify-center md:sticky md:top-0 self-center">
          <div className="relative w-full max-w-[230px] sm:max-w-[270px] md:max-w-[330px] aspect-square flex items-center justify-center">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-4 rounded-full blur-2xl opacity-80 ${
                isWin
                  ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.28)_0%,transparent_72%)]'
                  : 'bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.25)_0%,transparent_72%)]'
              }`}
            />
            <img
              src={isWin ? QUIZ_SUCCESS_MASCOT : QUIZ_FAILURE_MASCOT}
              alt={
                isWin
                  ? 'Happy bull mascot celebrating a correct chart prediction'
                  : 'Disappointed bear mascot encouraging you to review the chart pattern'
              }
              width={1254}
              height={1254}
              loading="eager"
              decoding="async"
              className="relative z-10 w-full h-auto max-h-full object-contain select-none animate-float-3d drop-shadow-[0_16px_32px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
