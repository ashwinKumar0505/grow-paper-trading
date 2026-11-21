import React from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { TradingCanvas } from '../../features/quiz/components/TradingCanvas';
import { DEFAULT_INDICATORS } from '../../features/quiz/quizDefaults';
import { LandingChallengePanel } from './LandingChallengePanel';
import { MAX_GUEST_PREVIEWS, useLandingChallenge } from './useLandingChallenge';

const DIFFICULTY_BADGE: Record<string, string> = {
  Beginner: 'border-[#00D09C]/35 bg-[#00D09C]/15 text-[#00D09C]',
  Intermediate: 'border-amber-400/35 bg-amber-400/15 text-amber-300',
  Advanced: 'border-[#F0614A]/35 bg-[#F0614A]/15 text-[#F0614A]',
};

export const LandingChallengePreview: React.FC = () => {
  const {
    user,
    scenario,
    error,
    revealedOutcomeCount,
    isRevealing,
    chosenDirection,
    evaluation,
    challengeIndex,
    showGuestGate,
    submitPrediction,
    handleNextChallenge,
    retryLoad,
    openAuthModal,
  } = useLandingChallenge();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      submitPrediction('BUY');
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      submitPrediction('SELL');
    }
  };

  const progressLabel = user
    ? `Challenge #${challengeIndex}`
    : `Challenge ${Math.min(challengeIndex, MAX_GUEST_PREVIEWS)} of ${MAX_GUEST_PREVIEWS}`;

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Guess the Chart interactive challenge preview"
      className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-white p-5 sm:p-8 shadow-xl space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-[#00D09C]/60"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#1D3A2D]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D09C]/30 bg-[#00D09C]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#00D09C]">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>INTERACTIVE CHALLENGE</span>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              Synthetic Educational Chart
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Can You Predict What Happens Next?
          </h3>
          <p className="text-xs sm:text-sm text-[#9AB0A5] leading-relaxed">
            Analyze the chart, predict the next move, and test your trading instincts.
          </p>
        </div>

        {/* Progress & Difficulty */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="rounded-xl border border-[#1D3A2D] bg-[#11241C] px-3 py-1.5 text-xs font-bold text-[#D6E6DE]">
            {progressLabel}
          </span>
          {scenario && (
            <span
              className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold ${
                DIFFICULTY_BADGE[scenario.difficulty] || DIFFICULTY_BADGE.Beginner
              }`}
            >
              Difficulty: {scenario.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Body: Error / Empty / Active Challenge */}
      {error ? (
        <div className="rounded-2xl border border-[#F0614A]/30 bg-[#11241C] p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-[#F0614A]">{error}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00D09C] px-4 py-2 text-xs font-extrabold text-[#04261C] hover:bg-[#00B386] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Challenge</span>
          </button>
        </div>
      ) : !scenario || scenario.candles.length === 0 ? (
        <div className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] p-8 text-center text-sm text-[#9AB0A5]">
          Loading synthetic educational chart setup...
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 items-stretch">
          {/* Left (60%): Interactive Candlestick Chart */}
          <div className="w-full lg:w-[60%] h-[340px] sm:h-[400px] lg:h-[430px] rounded-2xl overflow-hidden border border-[#1D3A2D] bg-[#0B0E14]">
            <TradingCanvas
              candles={scenario.candles}
              setupCount={scenario.setupCount}
              revealedOutcomeCount={revealedOutcomeCount}
              indicatorSettings={DEFAULT_INDICATORS}
              tradeDirection={chosenDirection}
              entryPrice={evaluation?.entryPrice ?? null}
              isRevealing={isRevealing}
              supportLevel={scenario.supportLevel}
              resistanceLevel={scenario.resistanceLevel}
              readOnly
              hideChartTypeToggle
            />
          </div>

          {/* Right (40%): Prediction Controls & Challenge Info */}
          <div className="w-full lg:w-[40%]">
            <LandingChallengePanel
              scenario={scenario}
              isRevealing={isRevealing}
              chosenDirection={chosenDirection}
              evaluation={evaluation}
              showGuestGate={showGuestGate}
              isAuthenticated={Boolean(user)}
              onPredict={submitPrediction}
              onNextChallenge={handleNextChallenge}
              onOpenAuth={openAuthModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};
