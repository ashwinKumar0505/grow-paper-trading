import { useState } from 'react';
import { ArrowRight, BookOpen, Check, GraduationCap, Heart, Lock, Trophy } from 'lucide-react';
import { DifficultyLevel, GameMode } from '../types/trading';
import { AppLink } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';

interface ModeSelectPageProps {
  initialMode?: GameMode;
  initialDifficulty?: DifficultyLevel;
  onLaunchQuiz: (mode: GameMode, difficulty: DifficultyLevel) => void;
  onBackToHome: () => void;
  onOpenLearnCharts?: () => void;
}

const modes = [
  { id: 'quiz' as const, title: 'Practice', label: 'START HERE', icon: GraduationCap, description: 'Build your eye for patterns, one chart at a time.', features: ['Unlimited questions, no time limit', 'Track accuracy and your best streak', 'Learn from every answer'] },
  { id: 'survival' as const, title: 'Survival', label: 'TEST YOUR CONSISTENCY', icon: Heart, description: 'Three lives. How long can you keep your streak?', features: ['A wrong prediction costs one life', 'Build combos to multiply your score', 'Challenge your personal best'] },
  { id: 'tournament' as const, title: 'Cash challenge', label: '10-ROUND CHALLENGE', icon: Trophy, description: 'Make ten calls and see how your decisions add up.', features: ['$10,000 in virtual challenge cash', 'Choose your position size each round', 'Finish with a scorecard and rank'] },
];
const levels: { id: DifficultyLevel; description: string }[] = [
  { id: 'Beginner', description: 'Clear shapes and gentle trends' },
  { id: 'Intermediate', description: 'More varied price movements' },
  { id: 'Advanced', description: 'Sharp turns and tricky setups' },
  { id: 'All', description: 'A mix of every difficulty' },
];

export const ModeSelectPage = ({ initialMode = 'quiz', initialDifficulty = 'Beginner', onLaunchQuiz, onOpenLearnCharts }: ModeSelectPageProps) => {
  const { planConfig, usageQuota, openUpgradeModal } = useTrading();
  const [mode, setMode] = useState<GameMode>(
    planConfig.quizAllowedModes.includes(initialMode) ? initialMode : 'quiz'
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    planConfig.quizAllowedDifficulties.includes(initialDifficulty) ? initialDifficulty : 'Beginner'
  );

  const handleSelectMode = (id: GameMode, title: string) => {
    if (!planConfig.quizAllowedModes.includes(id)) {
      const reqTier = id === 'survival' ? 'beginner' : 'advanced';
      openUpgradeModal({
        requiredTier: reqTier,
        featureName: `Guess the Chart — ${title} Mode`,
        featureDescription:
          id === 'survival'
            ? '3-Lives Survival Mode (with combo multipliers & personal best streaks) is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.'
            : 'The 10-Round Cash Challenge Tournament ($10,000 challenge capital, dynamic position sizing & rank card) is exclusive to the Advanced Package (₹699/mo).',
      });
      return;
    }
    setMode(id);
  };

  const handleSelectDifficulty = (id: DifficultyLevel) => {
    if (!planConfig.quizAllowedDifficulties.includes(id)) {
      const reqTier = id === 'Intermediate' ? 'beginner' : 'advanced';
      openUpgradeModal({
        requiredTier: reqTier,
        featureName: `${id === 'All' ? 'Mixed Levels' : id} Chart Difficulty`,
        featureDescription:
          id === 'Intermediate'
            ? 'Intermediate chart setups are unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.'
            : 'Advanced and Mixed-level institutional chart setups are exclusive to the Advanced Package (₹699/mo).',
      });
      return;
    }
    setDifficulty(id);
  };

  return (
    <main className="mx-auto w-full max-w-[1840px] px-4 py-8 text-[var(--quiz-text)] sm:px-6 lg:px-10 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Guess the Chart · Interactive Practice Room</p>
            {planConfig.quizDailyLimit < 999 && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                Daily Quiz Quota: {usageQuota.quizQuestionsCount} / {planConfig.quizDailyLimit} used ({planConfig.badge})
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Read the pattern.<br /><span className="text-emerald-700 dark:text-emerald-400">Make your next call.</span></h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--quiz-muted)] sm:text-base">Study a simulated NSE stock chart, predict whether price moves up or down, then reveal the next candles and learn why.</p>
        </div>
        <button
          type="button"
          onClick={onOpenLearnCharts}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span>← Back to Chart Pattern Library</span>
        </button>
      </div>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-subtle)]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" /><div><p className="text-sm font-semibold">New to chart patterns?</p><p className="mt-1 text-xs leading-5 text-[var(--quiz-muted)]">Explore interactive examples in the pattern library before you play.</p></div></div>
        <button onClick={onOpenLearnCharts} className="flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Explore patterns <ArrowRight className="h-4 w-4" /></button>
      </div>

      <fieldset className="mt-9">
        <legend className="mb-4 text-sm font-bold"><span className="mr-2 text-emerald-700 dark:text-emerald-400">01</span> Choose your mode</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {modes.map(({ id, title, label, icon: Icon, description, features }) => {
            const isLocked = !planConfig.quizAllowedModes.includes(id);
            const reqLabel = id === 'survival' ? 'BEGINNER+' : 'ADVANCED';
            return (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => handleSelectMode(id, title)}
                className={`rounded-2xl border p-5 text-left transition-colors relative ${
                  mode === id
                    ? 'border-emerald-400 bg-emerald-500/8 ring-1 ring-emerald-400/30'
                    : 'border-[var(--quiz-border)] bg-[var(--quiz-panel)] hover:border-slate-600'
                }`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <Icon className={`h-6 w-6 ${id === 'survival' ? 'text-rose-700 dark:text-rose-400' : id === 'tournament' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`} />
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" /> {reqLabel}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold tracking-widest text-[var(--quiz-muted)]">{label}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>{title}</span>
                </h2>
                <p className="mt-2 min-h-10 text-sm leading-6 text-[var(--quiz-muted)]">{description}</p>
                <ul className="mt-5 space-y-2 border-t border-[var(--quiz-border)] pt-4">
                  {features.map(feature => (
                    <li key={feature} className="flex gap-2 text-xs leading-5 text-[var(--quiz-muted)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="mb-4 text-sm font-bold"><span className="mr-2 text-emerald-700 dark:text-emerald-400">02</span> Pick a difficulty</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {levels.map(level => {
            const isLocked = !planConfig.quizAllowedDifficulties.includes(level.id);
            const reqLabel = level.id === 'Intermediate' ? 'Beginner+' : 'Advanced';
            return (
              <button
                type="button"
                key={level.id}
                aria-pressed={difficulty === level.id}
                onClick={() => handleSelectDifficulty(level.id)}
                className={`rounded-xl border p-4 text-left ${
                  difficulty === level.id
                    ? 'border-emerald-400 bg-emerald-500/8'
                    : 'border-[var(--quiz-border)] bg-[var(--quiz-panel)] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{level.id === 'All' ? 'Mixed levels' : level.id}</span>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Lock className="h-2.5 w-2.5" /> {reqLabel}
                    </span>
                  )}
                </div>
                <span className="mt-2 block text-xs leading-5 text-[var(--quiz-muted)]">{level.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-[var(--quiz-subtle)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold">{modes.find(item => item.id === mode)?.title} <span className="mx-2 text-slate-600">/</span> {difficulty === 'All' ? 'Mixed levels' : difficulty}</p><p className="mt-1 text-xs text-[var(--quiz-muted)]">No sign-up needed. Progress is saved in this browser.</p></div>
        <button onClick={() => onLaunchQuiz(mode, difficulty)} className="flex items-center justify-center gap-3 rounded-xl bg-emerald-400 px-7 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-300">Start practice <ArrowRight className="h-4 w-4" /></button>
      </div>
      <p className="mt-6 text-center text-xs leading-6 text-[var(--quiz-muted)]">Generated examples are for learning; patterns do not guarantee market outcomes. Challenge cash is separate from your paper portfolio.</p>
      <p className="mt-3 text-center text-sm text-[var(--quiz-muted)]">Ready to apply what you learn? <AppLink href="/trade" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">Open paper trading →</AppLink></p>
    </main>
  );
};
