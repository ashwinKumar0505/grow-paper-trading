import React, { useState } from 'react';
import { TradeRecord, ChartScenario, GameMode } from '../types/trading';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Trophy,
  Target,
  ShieldAlert,
  Flag,
  Image as ImageIcon,
  X,
  BookOpen,
} from 'lucide-react';

const CHEAT_SHEET_IMAGE_PATH =
  '/assets/quiz/here-are-some-chart-patterns-to-keep-in-the-back-of-your-v0-u7pxhg28lszy_e5c9d091.webp';

const QUIZ_SUCCESS_MASCOT = '/images/landing/quiz-success.png';
const QUIZ_FAILURE_MASCOT = '/images/landing/quiz-failure.png';

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
                  {isWin ? 'WIN' : 'LOSS'}: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
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
            onClick={() => setIsMinimized(false)}
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

            {/* Performance Numbers Grid: Mode-Specific */}
            {isSurvival ? (
              // --- SURVIVAL MODE NUMBERS ---
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Lives Left</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: survivalMaxLives }).map((_, idx) => (
                      <span key={idx} className="text-sm">
                        {idx < survivalLives ? '❤️' : '🖤'}
                      </span>
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? 'Safe' : '-1 Heart'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Survival Streak</span>
                  <span className="text-amber-400 text-base font-bold tabular-nums mt-0.5">
                    {survivalStreak} 🔥
                  </span>
                  <span className="text-slate-500 text-[10px]">Multiplier active</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Price Moved</span>
                  <div className="flex items-center gap-1 text-sm font-semibold tabular-nums mt-0.5">
                    {trade.priceChangePct >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Over {scenario.outcomeCount} candles</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Surviving Sets</span>
                  <span className="text-slate-100 text-sm font-bold tabular-nums mt-0.5">
                    {survivalRoundsSurvived} Completed
                  </span>
                  <span className="text-slate-500 text-[10px]">{scenario.difficulty} Level</span>
                </div>
              </div>
            ) : isTournament ? (
              // --- TOURNAMENT MODE NUMBERS ---
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Round PnL</span>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      isWin ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isWin ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}% ROI
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Bet Size</span>
                  <span className="text-slate-200 text-sm font-semibold tabular-nums mt-0.5">
                    ${trade.positionSize.toLocaleString()}
                  </span>
                  <span className="text-slate-500 text-[10px]">Virtual cash</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Price Moved</span>
                  <div className="flex items-center gap-1 text-sm font-semibold tabular-nums mt-0.5">
                    {trade.priceChangePct >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Over {scenario.outcomeCount} candles</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">New Balance</span>
                  <span className="text-slate-100 text-sm font-bold tabular-nums mt-0.5">
                    ${(tournamentBalance ?? trade.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-500 text-[10px]">Round {tournamentRound}/{tournamentTotalRounds}</span>
                </div>
              </div>
            ) : (
              // --- LEARN QUIZ MODE NUMBERS ---
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#0B0E14] border-b border-slate-800 text-xs font-mono shrink-0">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Quiz Verdict</span>
                  <span
                    className={`text-base font-bold ${
                      isWin ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isWin ? 'CORRECT +1' : 'INCORRECT'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    {isWin ? 'Great pattern eye!' : 'Review pattern below'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Your Guess</span>
                  <span className="text-slate-200 text-sm font-bold mt-0.5">
                    {trade.direction === 'BUY' ? '▲ UP (BUY)' : '▼ DOWN (SELL)'}
                  </span>
                  <span className="text-slate-500 text-[10px] font-sans">
                    At entry ${trade.entryPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Actual Move</span>
                  <div className="flex items-center gap-1 text-sm font-bold tabular-nums mt-0.5">
                    {trade.priceChangePct >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={trade.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {trade.priceChangePct >= 0 ? '+' : ''}{trade.priceChangePct.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Next {scenario.outcomeCount} candles</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-slate-500 text-[11px] font-sans">Exit Price</span>
                  <span className="text-slate-200 text-sm font-semibold tabular-nums mt-0.5">
                    ${trade.exitPrice.toFixed(2)}
                  </span>
                  <span className="text-slate-500 text-[10px] font-sans">{scenario.difficulty} Level</span>
                </div>
              </div>
            )}

            {/* Main Two-Column Content: Left (58%) Explanation & Reasoning / Right (42%) Bull or Bear Mascot */}
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
                        onClick={() => setShowCheatSheetViewer(true)}
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

                  {/* Strategy Execution Blueprint from Cheat Sheet (Entry, Stop Loss, Target) */}
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
                onClick={() => setShowCheatSheetViewer(false)}
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
                onClick={() => setShowCheatSheetViewer(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
              >
                Back to Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
