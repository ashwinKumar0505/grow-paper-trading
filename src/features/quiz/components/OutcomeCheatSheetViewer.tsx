import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { ChartScenario } from '../types/trading';

const CHEAT_SHEET_IMAGE_PATH =
  '/assets/quiz/here-are-some-chart-patterns-to-keep-in-the-back-of-your-v0-u7pxhg28lszy_e5c9d091.webp';

interface OutcomeCheatSheetViewerProps {
  scenario: ChartScenario;
  onClose: () => void;
}

export const OutcomeCheatSheetViewer: React.FC<OutcomeCheatSheetViewerProps> = ({
  scenario,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121824] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0B0E14]">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                15 Popular Chart Patterns Cheat Sheet
              </h3>
              <p className="text-[11px] text-slate-400">
                Current Question: <strong className="text-amber-300">{scenario.patternName}</strong> ({scenario.cheatSheetGroup ?? 'General'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#0B0E14]/60 flex items-center justify-center">
          <img
            src={CHEAT_SHEET_IMAGE_PATH}
            alt="15 Popular Chart Patterns Cheat Sheet"
            className="max-h-[75vh] w-auto object-contain rounded-xl border border-slate-800 shadow-xl"
          />
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-[#0B0E14] flex items-center justify-between text-xs text-slate-400">
          <span>Includes 6 Reversals, 6 Continuations, and 3 Bilaterals.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    </div>
  );
};
