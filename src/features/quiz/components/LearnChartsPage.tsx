import {
ArrowRight,
GraduationCap,
Menu,
Sparkles
} from 'lucide-react';
import { LockedFeatureCard } from '../../../components/LockedFeatureCard';
import { Button } from '../../../components/ui/button';
import { navigate } from '../../../lib/navigation';
import { DifficultyLevel,GameMode } from '../types/trading';
import { PATTERN_TEMPLATES } from '../utils/dataGenerator';

import { usePatternLesson } from '../hooks/usePatternLesson';
import { shortName } from '../utils/patternCatalog';
import { PatternCatalog } from './PatternCatalog';
import { PatternDemonstration } from './PatternDemonstration';
import { PatternExplanation } from './PatternExplanation';

interface Props {
  onBackToHome: () => void;
  onStartQuiz: (mode: GameMode, difficulty: DifficultyLevel) => void;
}

export function LearnChartsPage({ onStartQuiz }: Props) {
  const lesson = usePatternLesson();
  const { setSidebarOpen, pattern, isCurrentPatternLocked } = lesson;
  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] flex bg-[#f3f6f4] dark:bg-[#0b1310] text-[#15241d] dark:text-[#e9f2ee] font-sans">
      <PatternCatalog {...lesson} />
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Subheader with Mobile Sidebar Trigger & Right-Corner "Guess the Chart" CTA */}
        <div className="sticky top-[var(--workspace-header-height,65px)] z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#e2eae6] dark:border-[#20332a] bg-[#f3f6f4]/90 dark:bg-[#0b1310]/90 backdrop-blur-md px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Button variant="unstyled" size="unstyled"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-white dark:bg-[#111c17] px-3 py-1.5 text-xs font-bold"
            >
              <Menu className="w-4 h-4 text-[#00b386] dark:text-[#00d09c]" />
              <span>Patterns ({PATTERN_TEMPLATES.length})</span>
            </Button>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5b7066] dark:text-[#9ab0a5]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00b386] dark:bg-[#00d09c]" />
              <span>Chart Pattern Playbook</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-[#15241d] dark:text-[#e9f2ee] font-bold">
                {shortName(pattern.name)}
              </span>
            </div>
          </div>

          {/* Right Corner CTA: Guess the Chart Learning -> lands on /quiz */}
          <div className="flex items-center gap-2">
            <Button variant="unstyled" size="unstyled"
              type="button"
              onClick={() => onStartQuiz('quiz', pattern.difficulty)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#00b386]/40 dark:border-[#00d09c]/40 bg-[#00b386]/10 dark:bg-[#00d09c]/10 px-3.5 py-2 text-xs font-bold text-[#008f6b] dark:text-[#00d09c] hover:bg-[#00b386]/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice {pattern.difficulty}</span>
            </Button>
            <Button variant="unstyled" size="unstyled"
              type="button"
              onClick={() => navigate('/quiz')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00b386] hover:bg-[#009a73] dark:bg-[#00d09c] dark:hover:bg-[#00b386] px-4 py-2 text-xs sm:text-sm font-extrabold text-white dark:text-[#04261c] shadow-sm transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Guess the Chart</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ordered Lesson Content: 1. Title -> 2. Description -> 3. Why the Chart -> 4. Interactive Chart */}
        <main className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-8 lg:px-10 sm:py-8 space-y-6">
          {isCurrentPatternLocked ? (
            <LockedFeatureCard
              requiredTier="beginner"
              featureName={`Unlock "${shortName(pattern.name)}" & Full 28-Pattern Interactive Library`}
              description="Free Starter accounts include the 8 foundational beginner patterns. Upgrade to Beginner (₹299/mo) or Advanced (₹699/mo) to unlock all 28 Reversal, Continuation, Bilateral & Candlestick patterns with Entry, Stop-Loss, and Target rules."
              bullets={[
                'All 28 Interactive Chart Patterns (Reversal, Continuation, Bilateral & Special)',
                'Full Entry Trigger, Stop-Loss Invalidation & Profit Target Playbook Rules',
                'Unlimited New Chart Example Variations + SMA 50 & RSI Indicator Overlays',
              ]}
            />
          ) : (
          <>
      <PatternExplanation {...lesson} />
      <PatternDemonstration {...lesson} />
          </>
          )}
        </main>
      </div>
    </div>
  );
}
