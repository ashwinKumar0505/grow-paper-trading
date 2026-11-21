import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Lock,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ChartScenario, TradeDirection } from '../../features/quiz/types/trading';
import type { PredictionEvaluation } from '../../features/quiz/utils/evaluatePrediction';
import { AppLink } from '../../lib/navigation';
import { LandingChallengeResult } from './LandingChallengeResult';
import { MAX_GUEST_PREVIEWS } from './useLandingChallenge';

interface LandingChallengePanelProps {
  scenario: ChartScenario;
  isRevealing: boolean;
  chosenDirection: TradeDirection | null;
  evaluation: PredictionEvaluation | null;
  showGuestGate: boolean;
  isAuthenticated: boolean;
  onPredict: (direction: TradeDirection) => void;
  onNextChallenge: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingChallengePanel({
  scenario,
  isRevealing,
  chosenDirection,
  evaluation,
  showGuestGate,
  isAuthenticated,
  onPredict,
  onNextChallenge,
  onOpenAuth,
}: LandingChallengePanelProps) {
  if (showGuestGate && !isAuthenticated) {
    return (
      <div className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-[#00D09C]/30 bg-[#11241C] p-5">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00D09C]/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#00D09C]">
            <Lock className="h-3.5 w-3.5" />
            <span>Preview Limit Reached ({MAX_GUEST_PREVIEWS}/{MAX_GUEST_PREVIEWS})</span>
          </div>
          <h4 className="text-xl font-extrabold text-white">
            Unlock Full Guess the Chart Access
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed text-[#9AB0A5]">
            Create a free Nifty Lens account to continue practicing with daily chart challenges, 3-Life Survival mode, and the 10-Round Cash Challenge.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => onOpenAuth('signup')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D09C] px-5 py-3 text-sm font-extrabold text-[#04261C] hover:bg-[#00B386] transition-colors cursor-pointer"
          >
            <span>Start Free Account</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-between gap-2 text-xs text-[#9AB0A5] pt-1">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="font-bold text-[#00D09C] hover:underline cursor-pointer"
            >
              Already have an account? Sign In
            </button>
            <AppLink href="/learn" className="font-semibold hover:text-white inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-[#00D09C]" />
              <span>Pattern Library</span>
            </AppLink>
          </div>
        </div>
      </div>
    );
  }

  if (evaluation) {
    return (
      <LandingChallengeResult
        scenario={scenario}
        evaluation={evaluation}
        onNextChallenge={onNextChallenge}
      />
    );
  }

  return (
    <div className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-[#1D3A2D] bg-[#11241C] p-5">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00D09C]/30 bg-[#00D09C]/10 px-3 py-1 text-[11px] font-bold text-[#00D09C]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{isRevealing ? 'Revealing Next Candles...' : 'What Happens Next?'}</span>
        </div>
        <h4 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
          Study the price action, volume &amp; key levels before the cutoff line.
        </h4>
        <p className="text-xs sm:text-sm leading-relaxed text-[#9AB0A5]">
          Will this synthetic educational scenario (<strong className="text-white">{scenario.assetSymbol}</strong> template · {scenario.timeframe}) break higher or drop lower after the entry point?
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isRevealing}
            onClick={() => onPredict('BUY')}
            aria-label="Predict Buy / Bullish"
            className={`group flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-extrabold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              chosenDirection === 'BUY'
                ? 'bg-[#00D09C] text-[#04261C] ring-2 ring-[#00D09C]/50'
                : 'bg-[#00B386] hover:bg-[#00D09C] text-[#04261C] shadow-md hover:-translate-y-0.5'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Buy / Bullish</span>
            <ArrowUpRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          <button
            type="button"
            disabled={isRevealing}
            onClick={() => onPredict('SELL')}
            aria-label="Predict Sell / Bearish"
            className={`group flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-extrabold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              chosenDirection === 'SELL'
                ? 'bg-[#F0614A] text-white ring-2 ring-[#F0614A]/50'
                : 'bg-[#E0452B] hover:bg-[#F0614A] text-white shadow-md hover:-translate-y-0.5'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            <span>Sell / Bearish</span>
            <ArrowDownRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#7F9C8E] pt-1">
          <span>Shortcut: Press B (Buy) or S (Sell)</span>
          <AppLink href="/quiz" className="font-bold text-[#00D09C] hover:underline">
            Full Quiz →
          </AppLink>
        </div>
      </div>
    </div>
  );
}
