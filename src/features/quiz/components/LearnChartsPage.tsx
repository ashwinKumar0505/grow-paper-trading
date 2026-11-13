import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  GraduationCap,
  Lightbulb,
  Menu,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { DifficultyLevel, GameMode, ChartType, IndicatorSettings } from '../types/trading';
import { ASSETS, PATTERN_TEMPLATES, generatePatternExample } from '../utils/dataGenerator';
import { TradingCanvas } from './TradingCanvas';
import { ChartControls } from './ChartControls';
import { navigate } from '../../../lib/navigation';

interface Props {
  onBackToHome: () => void;
  onStartQuiz: (mode: GameMode, difficulty: DifficultyLevel) => void;
}

const shortName = (name: string) => name.replace(/\s*\([^)]*\)/g, '');

const CATEGORIES = [
  { id: 'All patterns', label: 'All Patterns' },
  { id: 'Reversal', label: 'Reversal' },
  { id: 'Continuation', label: 'Continuation' },
  { id: 'Bilateral', label: 'Bilateral' },
  { id: 'Special', label: 'Candlestick & Special' },
];

export function LearnChartsPage({ onStartQuiz }: Props) {
  const [patternName, setPatternName] = useState(PATTERN_TEMPLATES[0].name);
  const [symbol, setSymbol] = useState(ASSETS[0].symbol);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All patterns');
  const [variation, setVariation] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    showEma20: true,
    showSma50: false,
    showLevels: true,
    showVolume: true,
    showRsi: false,
  });

  const pattern = PATTERN_TEMPLATES.find((item) => item.name === patternName) || PATTERN_TEMPLATES[0];

  const filtered = useMemo(
    () =>
      PATTERN_TEMPLATES.filter(
        (item) =>
          (category === 'All patterns' || item.cheatSheetGroup === category) &&
          `${item.name} ${item.simpleName} ${item.category}`.toLowerCase().includes(query.toLowerCase())
      ),
    [category, query]
  );

  const example = useMemo(
    () => generatePatternExample(pattern.name, symbol),
    [pattern.name, symbol, variation]
  );

  const choosePattern = (name: string) => {
    setPatternName(name);
    setShowOutcome(false);
    setSidebarOpen(false);
  };

  const isBullish = pattern.expectedDirection === 'BUY';

  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] flex bg-[#f3f6f4] dark:bg-[#0b1310] text-[#15241d] dark:text-[#e9f2ee] font-sans">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Pattern Library Sidebar (Enlarged for easy browsing) */}
      <aside
        aria-label="Chart pattern catalog"
        className={`fixed lg:sticky top-[var(--workspace-header-height,65px)] left-0 z-40 h-[calc(100dvh-var(--workspace-header-height,65px))] w-[330px] sm:w-[350px] xl:w-[380px] shrink-0 bg-[#0c1d16] border-r border-[#1d3a2d] text-[#d6e6de] flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1d3a2d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d09c] text-[#04261c] grid place-items-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="font-extrabold text-base text-white leading-tight">Pattern Library</div>
              <div className="text-xs text-[#7f9c8e] font-medium mt-0.5">
                {PATTERN_TEMPLATES.length} interactive chart setups
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#7f9c8e] hover:text-white hover:bg-white/5"
            aria-label="Close pattern menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 space-y-3 border-b border-[#1d3a2d]">
          <label className="relative block">
            <span className="sr-only">Search chart patterns</span>
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#7f9c8e]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pattern or meaning…"
              className="w-full rounded-xl bg-[#12281f] border border-[#1d3a2d] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-[#7f9c8e] focus:outline-none focus:border-[#00d09c]"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#00d09c] text-[#04261c] font-bold shadow-xs'
                      : 'bg-[#12281f] text-[#9ab0a5] hover:text-white border border-[#1d3a2d]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Pattern List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5" aria-label="Chart patterns">
          {filtered.map((item) => {
            const isSelected = pattern.name === item.name;
            const itemBullish = item.expectedDirection === 'BUY';
            return (
              <button
                key={item.name}
                type="button"
                aria-pressed={isSelected}
                onClick={() => choosePattern(item.name)}
                className={`w-full rounded-xl px-4 py-3.5 text-left transition-all flex items-start justify-between gap-3 border ${
                  isSelected
                    ? 'bg-[#12281f] border-[#00d09c]/60 text-white shadow-sm'
                    : 'border-transparent text-[#d6e6de] hover:bg-white/[0.05]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#00d09c] shrink-0" />}
                    <span className="block text-sm font-bold truncate">{shortName(item.name)}</span>
                  </div>
                  <span className="mt-1 block text-xs text-[#8fa99c] truncate">
                    {item.simpleName} · {item.difficulty}
                  </span>
                </div>
                <span
                  className={`shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                    itemBullish
                      ? 'bg-[#00d09c]/15 text-[#00d09c]'
                      : 'bg-[#f0614a]/15 text-[#f0614a]'
                  }`}
                >
                  {itemBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {itemBullish ? 'Bullish' : 'Bearish'}
                </span>
              </button>
            );
          })}
          {!filtered.length && (
            <p className="px-3 py-6 text-center text-xs text-[#7f9c8e]">
              No matching patterns. Try another search or category.
            </p>
          )}
        </div>

        {/* Bottom Sidebar CTA to Guess the Chart Quiz */}
        <div className="p-4 border-t border-[#1d3a2d] bg-[#12281f]/60">
          <button
            type="button"
            onClick={() => navigate('/quiz')}
            className="w-full rounded-xl bg-[#00d09c] hover:bg-[#00b386] text-[#04261c] font-extrabold text-sm py-3 px-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Guess the Chart Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Subheader with Mobile Sidebar Trigger & Right-Corner "Guess the Chart" CTA */}
        <div className="sticky top-[var(--workspace-header-height,65px)] z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#e2eae6] dark:border-[#20332a] bg-[#f3f6f4]/90 dark:bg-[#0b1310]/90 backdrop-blur-md px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-white dark:bg-[#111c17] px-3 py-1.5 text-xs font-bold"
            >
              <Menu className="w-4 h-4 text-[#00b386] dark:text-[#00d09c]" />
              <span>Patterns ({PATTERN_TEMPLATES.length})</span>
            </button>
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
            <button
              type="button"
              onClick={() => onStartQuiz('quiz', pattern.difficulty)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#00b386]/40 dark:border-[#00d09c]/40 bg-[#00b386]/10 dark:bg-[#00d09c]/10 px-3.5 py-2 text-xs font-bold text-[#008f6b] dark:text-[#00d09c] hover:bg-[#00b386]/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice {pattern.difficulty}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/quiz')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00b386] hover:bg-[#009a73] dark:bg-[#00d09c] dark:hover:bg-[#00b386] px-4 py-2 text-xs sm:text-sm font-extrabold text-white dark:text-[#04261c] shadow-sm transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Guess the Chart</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ordered Lesson Content: 1. Title -> 2. Description -> 3. Why the Chart -> 4. Interactive Chart */}
        <main className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-8 lg:px-10 sm:py-8 space-y-6">
          {/* 1. TITLE SECTION */}
          <section className="rounded-2xl border border-[#1d3a2d] bg-gradient-to-br from-[#0f2a1f] via-[#133628] to-[#0d241b] p-6 sm:p-7 text-white shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00d09c]/15 border border-[#00d09c]/30 px-3 py-1 text-xs font-bold text-[#00d09c]">
                    {pattern.cheatSheetGroup === 'Special' ? 'Candlestick & Special' : pattern.cheatSheetGroup} Pattern
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d6e6de]">
                    {pattern.difficulty} Level
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                      isBullish
                        ? 'bg-[#00d09c]/20 text-[#00d09c] border border-[#00d09c]/30'
                        : 'bg-[#f0614a]/20 text-[#ff8a75] border border-[#f0614a]/30'
                    }`}
                  >
                    {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isBullish ? 'Bullish Bias (Upward)' : 'Bearish Bias (Downward)'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  { pattern.name }
                </h1>
                <p className="text-sm text-[#9ab0a5]">
                  Plain-English meaning: <strong className="text-white">{pattern.simpleName}</strong> · Category:{' '}
                  <strong className="text-white">{pattern.category}</strong>
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-[#00d09c]" />
                  <span>Test in Guess the Chart →</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. DESCRIPTION SECTION */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#00b386] dark:text-[#00d09c]">
              <BookOpen className="w-4 h-4" />
              <span>Pattern Description</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-7 text-[#15241d] dark:text-[#e9f2ee]">
              {pattern.explanation}
            </p>
            {pattern.proTip && (
              <div className="flex items-start gap-3 rounded-xl border border-[#00b386]/25 dark:border-[#00d09c]/25 bg-[#00b386]/[0.07] dark:bg-[#00d09c]/[0.07] p-4 text-xs sm:text-sm leading-6">
                <Lightbulb className="w-4 h-4 text-[#00b386] dark:text-[#00d09c] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#008f6b] dark:text-[#00d09c]">Pro Tip: </span>
                  <span className="text-[#15241d] dark:text-[#d6e6de]">{pattern.proTip}</span>
                </div>
              </div>
            )}
          </section>

          {/* 3. WHY THIS CHART WORKS & TRADE PLAN */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#00b386] dark:text-[#00d09c]">
                <Eye className="w-4 h-4" />
                <span>Why This Chart Pattern Works</span>
              </div>
              <p className="mt-2.5 text-sm sm:text-[15px] leading-7 text-[#15241d] dark:text-[#e9f2ee]">
                {pattern.keyObservation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00b386] dark:text-[#00d09c]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Entry Trigger</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.entryRule}
                </p>
              </div>

              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#e0452b] dark:text-[#f0614a]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Stop-Loss / Invalidation</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.stopLossRule}
                </p>
              </div>

              <div className="rounded-xl border border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1a7fd1] dark:text-[#5cb8ff]">
                  <Target className="w-4 h-4 shrink-0" />
                  <span>Profit Target</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#5b7066] dark:text-[#9ab0a5]">
                  {pattern.targetRule}
                </p>
              </div>
            </div>
          </section>

          {/* 4. INTERACTIVE CHART SECTION */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] overflow-hidden shadow-sm">
            {/* Chart Top Control Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2eae6] dark:border-[#20332a] px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-[#15241d] dark:text-white">
                    Interactive Chart Demonstration
                  </span>
                  <span className="rounded-md bg-[#00b386]/10 dark:bg-[#00d09c]/15 px-2 py-0.5 text-[11px] font-bold text-[#008f6b] dark:text-[#00d09c]">
                    NSE: {symbol}
                  </span>
                </div>
                <p className="text-xs text-[#5b7066] dark:text-[#9ab0a5] mt-0.5">
                  Inspect the setup candles before the dashed vertical line, then click &ldquo;Reveal Next Candles&rdquo; to see how the move unfolds.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5b7066] dark:text-[#9ab0a5]">
                  <span>Stock:</span>
                  <select
                    aria-label="Example stock"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value);
                      setShowOutcome(false);
                    }}
                    className="rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-[#f6f9f7] dark:bg-[#16241e] px-3 py-1.5 text-xs font-bold text-[#15241d] dark:text-white focus:outline-none focus:border-[#00b386]"
                  >
                    {ASSETS.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} · {asset.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setVariation((n) => n + 1);
                    setShowOutcome(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-[#f6f9f7] dark:bg-[#16241e] hover:border-[#00b386] px-3 py-1.5 text-xs font-bold text-[#15241d] dark:text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#00b386] dark:text-[#00d09c]" />
                  <span>New Example</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOutcome((value) => !value)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00b386] hover:bg-[#009a73] dark:bg-[#00d09c] dark:hover:bg-[#00b386] px-3.5 py-1.5 text-xs font-extrabold text-white dark:text-[#04261c] transition-colors shadow-xs"
                >
                  <span>{showOutcome ? 'Hide Next Candles' : 'Reveal Next Candles'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chart Type & Overlays Bar */}
            <ChartControls
              chartType={chartType}
              onChartType={setChartType}
              indicators={indicators}
              onIndicator={(key) => setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))}
            />

            {/* Explicit Height Canvas Wrapper so TradingCanvas never collapses */}
            <div className="learning-chart relative h-[440px] sm:h-[480px] w-full bg-[#0a0e17]">
              <TradingCanvas
                candles={example.candles}
                setupCount={example.setupCount}
                revealedOutcomeCount={showOutcome ? example.outcomeCount : 0}
                indicatorSettings={indicators}
                chartType={chartType}
                hideChartTypeToggle
                supportLevel={example.supportLevel}
                resistanceLevel={example.resistanceLevel}
              />
            </div>

            {/* Bottom Chart Status Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] px-5 py-3.5 sm:px-6">
              <p className="text-xs text-[#5b7066] dark:text-[#9ab0a5]">
                Simulated NSE chart for pattern education · Prices in ₹ · Hover or drag across candles to inspect OHLC values.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#008f6b] dark:text-[#00d09c] hover:underline"
                >
                  <span>Ready to test your eye? Open Guess the Chart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
