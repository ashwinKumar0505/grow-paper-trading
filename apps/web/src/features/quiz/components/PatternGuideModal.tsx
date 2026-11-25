import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Image as ImageIcon,
} from 'lucide-react';
import { PATTERN_TEMPLATES } from '../utils/dataGenerator';
import { PatternGuideDetails } from './PatternGuideDetails';

interface PatternGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatternGuideModal: React.FC<PatternGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'guide' | 'image'>('guide');

  if (!isOpen) return null;

  const filteredPatterns = PATTERN_TEMPLATES.filter((p) => {
    if (categoryFilter === 'ALL') return true;
    return p.cheatSheetGroup === categoryFilter;
  });

  const current = filteredPatterns[selectedIdx] || filteredPatterns[0] || PATTERN_TEMPLATES[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-describedby={undefined} onPointerDownOutside={(event) => event.preventDefault()} overlayClassName="bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#121824] border border-slate-700/80 rounded-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2.5rem)] max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0B0E14]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Technical Chart Patterns Reference</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  15 Core Cheat Sheet Patterns
                </span>
              </DialogTitle>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Playbook</span>
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'image'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Visual Cheat Sheet</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close pattern reference"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Interactive Playbook */}
        {activeTab === 'guide' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Pattern List Sidebar */}
            <div className="w-full md:w-72 border-r border-slate-800 bg-[#0B0E14]/70 flex flex-col overflow-hidden">
              {/* Category Quick Filter */}
              <div className="p-2 border-b border-slate-800/80 flex items-center gap-1 text-[10px] font-semibold overflow-x-auto no-scrollbar">
                {['ALL', 'Reversal', 'Continuation', 'Bilateral'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoryFilter(cat);
                      setSelectedIdx(0);
                    }}
                    className={`px-2 py-1 rounded transition-all whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredPatterns.map((pat, i) => {
                  const isBull = pat.expectedDirection === 'BUY';
                  const isSelected = selectedIdx === i;

                  return (
                    <button
                      key={pat.name}
                      onClick={() => setSelectedIdx(i)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="block truncate font-semibold text-slate-200">
                          {pat.simpleName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">
                          {pat.cheatSheetGroup} • {pat.difficulty}
                        </span>
                      </div>
                      {isBull ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details Pane */}
            <PatternGuideDetails current={current} />
          </div>
        ) : (
          /* Tab 2: Visual Cheat Sheet Image View */
          <div className="flex-1 overflow-y-auto p-4 bg-[#090D14] flex flex-col items-center justify-center space-y-3">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-xl max-w-full">
              <img
                src="/assets/quiz/here-are-some-chart-patterns-to-keep-in-the-back-of-your-v0-u7pxhg28lszy_e5c9d091.webp"
                alt="15 Classic Chart Patterns Cheat Sheet"
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-slate-400 text-center">
              Reversal, Continuation, and Bilateral pattern structures with Entry, Stop Loss, and Measured Targets.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#0B0E14] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Master these 15 patterns to boost your Win Rate across crypto, equities, and indices.
          </span>
          <button
            onClick={onClose}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
