import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { DifficultyLevel, GameMode, ChartType, IndicatorSettings } from '../types/trading';
import { ASSETS, PATTERN_TEMPLATES, generatePatternExample } from '../utils/dataGenerator';
import { TradingCanvas } from './TradingCanvas';
import { ChartControls } from './ChartControls';

interface Props {
  onBackToHome: () => void;
  onStartQuiz: (mode: GameMode, difficulty: DifficultyLevel) => void;
}
const shortName = (name: string) => name.replace(/\s*\([^)]*\)/g, '');

export function LearnChartsPage({ onStartQuiz }: Props) {
  const [patternName, setPatternName] = useState(PATTERN_TEMPLATES[0].name);
  const [symbol, setSymbol] = useState(ASSETS[0].symbol);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All patterns');
  const [variation, setVariation] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<IndicatorSettings>({ showEma20: false, showSma50: false, showLevels: false, showVolume: false, showRsi: false });
  const pattern = PATTERN_TEMPLATES.find(item => item.name === patternName)!;
  const filtered = PATTERN_TEMPLATES.filter(item => (category === 'All patterns' || item.cheatSheetGroup === category) && `${item.name} ${item.simpleName}`.toLowerCase().includes(query.toLowerCase()));
  const example = useMemo(() => generatePatternExample(patternName, symbol), [patternName, symbol, variation]);
  const choosePattern = (name: string) => { setPatternName(name); setShowOutcome(false); };
  const picker = <>
    <label className="relative block"><span className="sr-only">Search patterns</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patterns" className="learning-input w-full pl-9" /></label>
    <label className="mt-3 block"><span className="sr-only">Pattern category</span><select className="learning-select w-full" value={category} onChange={e => setCategory(e.target.value)}>{['All patterns', 'Reversal', 'Continuation', 'Bilateral', 'Special'].map(item => <option key={item}>{item}</option>)}</select></label>
    <div className="mt-4 max-h-96 space-y-1 overflow-y-auto lg:max-h-[540px]" aria-label="Chart patterns">
      {filtered.map(item => <button key={item.name} aria-pressed={patternName === item.name} onClick={() => choosePattern(item.name)} className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${patternName === item.name ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'hover:bg-[var(--quiz-subtle)]/40'}`}>
        <span className="block text-sm font-semibold">{shortName(item.name)}</span><span className="mt-1 block text-xs text-[var(--quiz-muted)]">{item.difficulty} · {item.cheatSheetGroup === 'Special' ? 'Other patterns' : item.cheatSheetGroup}</span>
      </button>)}
      {!filtered.length && <p className="px-3 py-5 text-sm text-[var(--quiz-muted)]">No matching patterns. Try another search or category.</p>}
    </div>
  </>;
  return <main className="learning-page">
    <div className="mb-8"><p className="learning-eyebrow">LEARN THE SHAPE, UNDERSTAND THE MOVE</p><h1 className="learning-title">Pattern library</h1><p className="learning-description">Explore one pattern at a time with simulated Indian stock charts.</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <aside className="learning-card hidden p-4 lg:block" aria-label="Pattern picker">{picker}</aside>
      <details className="learning-card p-4 lg:hidden"><summary className="cursor-pointer text-sm font-semibold">Choose a pattern <span className="mt-1 block font-normal text-[var(--quiz-muted)]">{shortName(patternName)}</span></summary><div className="mt-4">{picker}</div></details>
      <section className="min-w-0 space-y-5" aria-label="Pattern lesson">
        <div className="learning-card overflow-hidden">
          <div className="space-y-5 p-5 sm:p-6">
            <div><p className="mb-2 text-xs text-[var(--quiz-muted)]">{pattern.cheatSheetGroup === 'Special' ? 'Other patterns' : pattern.cheatSheetGroup} · {pattern.difficulty}</p><h2 className="text-xl font-bold sm:text-2xl">{shortName(patternName)}</h2></div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-0 text-xs font-medium text-[var(--quiz-muted)]">Example stock <select aria-label="Example stock" value={symbol} onChange={e => { setSymbol(e.target.value); setShowOutcome(false); }} className="learning-select mt-1.5 block max-w-full">{ASSETS.map(asset => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} · {asset.name}</option>)}</select></label>
              <button onClick={() => { setVariation(n => n + 1); setShowOutcome(false); }} className="learning-button-secondary"><RefreshCw className="h-4 w-4" />New example</button>
            </div>
          </div>
          <div className="learning-chart">
            <TradingCanvas candles={example.candles} setupCount={example.setupCount} revealedOutcomeCount={showOutcome ? example.outcomeCount : 0} indicatorSettings={indicators} chartType={chartType} hideChartTypeToggle supportLevel={example.supportLevel} resistanceLevel={example.resistanceLevel} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--quiz-border)] px-5 py-4 sm:px-6">
            <p className="text-xs text-[var(--quiz-muted)]">NSE · Simulated example · Prices in ₹</p>
            <button onClick={() => setShowOutcome(value => !value)} className="learning-button-secondary">{showOutcome ? 'Hide next candles' : 'Reveal next candles'}<ArrowRight className="h-4 w-4" /></button>
          </div>
          <ChartControls chartType={chartType} onChartType={setChartType} indicators={indicators} onIndicator={key => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))} />
        </div>
        <div className="learning-card p-5 sm:p-6">
          <h3 className="text-base font-bold">What to look for</h3><p className="mt-3 text-sm leading-7 text-[var(--quiz-muted)]">{pattern.explanation}</p>
          <p className="mt-4 rounded-xl bg-emerald-500/8 px-4 py-3 text-sm leading-6"><span className="font-semibold">Look closely: </span>{pattern.keyObservation}</p>
          <details className="mt-5 border-t border-[var(--quiz-border)] pt-4"><summary className="cursor-pointer text-sm font-semibold">How traders might plan around this pattern</summary><dl className="mt-4 space-y-4 text-sm leading-6">{[['Possible entry', pattern.entryRule], ['Invalidation', pattern.stopLossRule], ['Example target', pattern.targetRule]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 text-[var(--quiz-muted)]">{value}</dd></div>)}</dl><p className="mt-4 text-xs text-[var(--quiz-muted)]">An illustration for learning. Patterns do not guarantee future returns.</p></details>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-1 pb-4"><p className="text-sm text-[var(--quiz-muted)]">Ready to test your eye?</p><button onClick={() => onStartQuiz('quiz', pattern.difficulty)} className="learning-button-primary">Try a {pattern.difficulty.toLowerCase()} quiz<ArrowRight className="h-4 w-4" /></button></div>
      </section>
    </div>
  </main>;
}
