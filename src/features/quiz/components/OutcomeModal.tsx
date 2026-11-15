import React, { useState } from 'react';
import { TradeRecord, ChartScenario, GameMode } from '../types/trading';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Trophy,
} from 'lucide-react';
import { OutcomeNumbersGrid } from './OutcomeNumbersGrid';
import { OutcomeLessonContent } from './OutcomeLessonContent';
import { OutcomeCheatSheetViewer } from './OutcomeCheatSheetViewer';
import { OutcomeMinimizedBar } from './OutcomeMinimizedBar';

interface OutcomeModalProps {
  trade: TradeRecord;
  scenario: ChartScenario;
  mode?: GameMode;
  onNext: () => void;
  tournamentRound?: number;
  tournamentTotalRounds?: number;
  tournamentBalance?: number;
  survivalLives?: number;
  survivalMaxLives?: number;
  survivalStreak?: number;
  survivalRoundsSurvived?: number;
  onOpenGuide?: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  trade,
  scenario,
  mode = 'quiz',
  onNext,
  tournamentRound = 1,
  tournamentTotalRounds = 10,
  tournamentBalance,
  survivalLives = 3,
  survivalMaxLives = 3,
  survivalStreak = 0,
  survivalRoundsSurvived = 0,
  onOpenGuide,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showCheatSheetViewer, setShowCheatSheetViewer] = useState<boolean>(false);
  const isWin = trade.isWin;
  const isTournament = mode === 'tournament';
  const isSurvival = mode === 'survival';
  const isLastRound = isTournament && tournamentRound >= tournamentTotalRounds;

  return (
    <>
      {/* If minimized, show a sleek bottom floating bar */}
      {isMinimized ? (
        <OutcomeMinimizedBar
          isWin={isWin}
          isTournament={isTournament}
          isLastRound={isLastRound}
          trade={trade}
          onRestore={() => setIsMinimized(false)}
          onNext={onNext}
        />
      ) : (
        /* Full Modal Overlay */
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-[#121824] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Top Status Header Banner */}
            <div
              className={`relative px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b shrink-0 ${
                isWin
                  ? 'bg-emerald-950/40 border-emerald-800/40'
                  : 'bg-rose-950/40 border-rose-800/40'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-9 sm:pr-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isWin
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {isWin ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                        isWin
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                          : 'bg-rose-950 text-rose-400 border-rose-700/60'
                      }`}
                    >
                      {isWin ? 'CORRECT CALL' : 'INCORRECT CALL'}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                      Call: <strong className="text-white">{trade.direction === 'BUY' ? '▲ UP' : '▼ DOWN'}</strong>
                    </span>
                  </div>

                  <h3
                    className={`text-sm sm:text-lg font-extrabold font-sans tracking-tight leading-snug line-clamp-2 ${
                      isWin ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {isSurvival
                      ? isWin
                        ? 'Spot On! ❤️ Heart Preserved'
                        : survivalLives > 0
                        ? `Lost 1 Heart! (${survivalLives} Remaining) 💔`
                        : 'Out of Hearts! Run Over 💔'
                      : isTournament
                      ? isWin
                        ? `Round ${tournamentRound} Won! 🎉`
                        : `Round ${tournamentRound} Loss`
                      : isWin
                      ? 'Spot On! Sharp Chart Reading!'
                      : 'Review the Setup Breakdown Below 💡'}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Pattern: <span className="font-semibold text-white">{scenario.patternName}</span>
                  </p>
                </div>
              </div>

              {/* Eye button to peek at chart behind */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize to inspect chart"
                className="absolute top-3 right-3 sm:static text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-700/60 transition-colors cursor-pointer shrink-0 z-10"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inspect Chart</span>
              </button>
            </div>

            {/* Performance Numbers Grid */}
            <OutcomeNumbersGrid
              isSurvival={isSurvival}
              isTournament={isTournament}
              isWin={isWin}
              trade={trade}
              scenario={scenario}
              survivalMaxLives={survivalMaxLives}
              survivalLives={survivalLives}
              survivalStreak={survivalStreak}
              survivalRoundsSurvived={survivalRoundsSurvived}
              tournamentRound={tournamentRound}
              tournamentTotalRounds={tournamentTotalRounds}
              tournamentBalance={tournamentBalance}
            />

            {/* Main Lesson Content & Illustration */}
            <OutcomeLessonContent
              scenario={scenario}
              isWin={isWin}
              onShowCheatSheet={() => setShowCheatSheetViewer(true)}
              onOpenGuide={onOpenGuide}
            />

            {/* Modal Footer CTA */}
            <div className="px-4 sm:px-6 py-3 bg-[#0B0E14] border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline font-sans">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">Space</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">Enter</kbd> to continue
              </span>

              <button
                onClick={onNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer font-sans"
              >
                {isLastRound ? (
                  <>
                    <Trophy className="w-4 h-4 text-amber-300" />
                    <span>See Tournament Results</span>
                  </>
                ) : (
                  <>
                    <span>{isTournament ? `Next Round (${tournamentRound + 1}/${tournamentTotalRounds})` : 'Next Question'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Cheat Sheet Reference Overlay */}
      {showCheatSheetViewer && (
        <OutcomeCheatSheetViewer
          scenario={scenario}
          onClose={() => setShowCheatSheetViewer(false)}
        />
      )}
    </>
  );
};
