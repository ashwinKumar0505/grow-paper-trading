import { useState } from 'react';
import { BookOpen, ChevronDown, RefreshCw } from 'lucide-react';
import type { ChartScenario } from '../../features/quiz/types/trading';
import type { PredictionEvaluation } from '../../features/quiz/utils/evaluatePrediction';
import { AppLink } from '../../lib/navigation';

interface LandingChallengeResultProps {
  scenario: ChartScenario;
  evaluation: PredictionEvaluation;
  onNextChallenge: () => void;
}

export function LandingChallengeResult({
  scenario,
  evaluation,
  onNextChallenge,
}: LandingChallengeResultProps) {
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const pctText = `${evaluation.rawPriceChangePct >= 0 ? '+' : ''}${evaluation.rawPriceChangePct.toFixed(2)}%`;
  const hasRules = Boolean(scenario.entryRule || scenario.stopLossRule || scenario.targetRule);

  return (
    <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-[#1D3A2D] bg-[#11241C] p-5 transition-all">
      <div className="space-y-3.5">
        <div className="flex items-center gap-3.5">
          <img
            src={evaluation.isWin ? '/images/landing/quiz-success.webp' : '/images/landing/quiz-failure.webp'}
            alt={evaluation.isWin ? 'Prediction correct illustration' : 'Prediction missed illustration'}
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl border border-[#1D3A2D] bg-[#0C1D16] object-cover shadow-md"
          />
          <div className="min-w-0 space-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                evaluation.isWin
                  ? 'bg-[#00D09C]/20 text-[#00D09C]'
                  : 'bg-[#F0614A]/20 text-[#F0614A]'
              }`}
            >
              {evaluation.isWin ? 'Correct Prediction!' : 'Missed This Setup'}
            </span>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-base font-extrabold text-white">
                ₹{evaluation.entryPrice.toFixed(2)} → ₹{evaluation.exitPrice.toFixed(2)}
              </span>
              <span
                className={`font-mono text-xs font-extrabold ${
                  evaluation.rawPriceChangePct >= 0 ? 'text-[#00D09C]' : 'text-[#F0614A]'
                }`}
              >
                ({pctText})
              </span>
            </div>
            <div className="text-[11px] text-[#9AB0A5]">
              Pattern: <strong className="text-white">{scenario.patternName}</strong>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#D6E6DE]">{scenario.explanation}</p>

        {hasRules && (
          <div className="rounded-xl border border-[#1D3A2D] bg-[#0C1D16]">
            <button
              type="button"
              aria-expanded={rulesExpanded}
              onClick={() => setRulesExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-[#00D09C] hover:bg-[#12281F] rounded-xl transition-colors cursor-pointer"
            >
              <span>Entry Rule, Stop-Loss &amp; Profit Target</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${rulesExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {rulesExpanded && (
              <div className="space-y-2 border-t border-[#1D3A2D] px-3.5 py-3 text-[11px] text-[#D6E6DE]">
                {scenario.entryRule && (
                  <div>
                    <span className="font-bold text-[#00D09C]">Entry Rule: </span>
                    <span>{scenario.entryRule}</span>
                  </div>
                )}
                {scenario.stopLossRule && (
                  <div>
                    <span className="font-bold text-[#F0614A]">Stop-Loss: </span>
                    <span>{scenario.stopLossRule}</span>
                  </div>
                )}
                {scenario.targetRule && (
                  <div>
                    <span className="font-bold text-[#5CB8FF]">Profit Target: </span>
                    <span>{scenario.targetRule}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={onNextChallenge}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00D09C] px-4 py-2.5 text-xs font-extrabold text-[#04261C] hover:bg-[#00B386] transition-colors cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Another Challenge</span>
        </button>
        <AppLink
          href="/learn"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1D3A2D] bg-[#0C1D16] px-3.5 py-2.5 text-xs font-bold text-[#E9F2EE] hover:border-[#00D09C] transition-colors whitespace-nowrap"
        >
          <BookOpen className="h-3.5 w-3.5 text-[#00D09C]" />
          <span>Explore Pattern Library</span>
        </AppLink>
      </div>
    </div>
  );
}
