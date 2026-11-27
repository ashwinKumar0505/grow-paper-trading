import { useMemo,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { trackChartPatternLearning } from '../../../lib/analytics';
import type { ChartType,IndicatorSettings } from '../types/trading';
import { ASSETS,PATTERN_TEMPLATES,generatePatternExample } from '../utils/dataGenerator';

export function usePatternLesson() {
  const { planConfig, openUpgradeModal } = useTrading();
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

  const unlockedPatternNames = useMemo(() => {
    if (planConfig.patternLibraryMaxFreePatterns >= PATTERN_TEMPLATES.length) {
      return new Set(PATTERN_TEMPLATES.map((p) => p.name));
    }
    const beginnerPatterns = PATTERN_TEMPLATES.filter((p) => p.difficulty === 'Beginner').slice(
      0,
      planConfig.patternLibraryMaxFreePatterns
    );
    return new Set(beginnerPatterns.map((p) => p.name));
  }, [planConfig.patternLibraryMaxFreePatterns]);

  const pattern = PATTERN_TEMPLATES.find((item) => item.name === patternName) || PATTERN_TEMPLATES[0];
  const isCurrentPatternLocked = !unlockedPatternNames.has(pattern.name);

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
    const selected = PATTERN_TEMPLATES.find((item) => item.name === name);
    setPatternName(name);
    setShowOutcome(false);
    setSidebarOpen(false);
    trackChartPatternLearning({
      action: 'pattern_selected',
      patternName: selected?.name || name,
      patternCategory: selected?.cheatSheetGroup,
      difficulty: selected?.difficulty,
      isLocked: selected ? !unlockedPatternNames.has(selected.name) : undefined,
    });
  };

  const isBullish = pattern.expectedDirection === 'BUY';

  return { patternName, setPatternName, symbol, setSymbol, query, setQuery, category, setCategory, variation, setVariation, showOutcome, setShowOutcome, sidebarOpen, setSidebarOpen, chartType, setChartType, indicators, setIndicators, planConfig, openUpgradeModal, unlockedPatternNames, pattern, isCurrentPatternLocked, filtered, example, choosePattern, isBullish };
}

export type PatternLesson = ReturnType<typeof usePatternLesson>;
