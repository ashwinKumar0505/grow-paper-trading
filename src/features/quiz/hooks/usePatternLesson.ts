import { useMemo,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
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

  const unlockedPatternNames = useMemo(
    () => new Set(PATTERN_TEMPLATES.slice(0, planConfig.patternLibraryMaxFreePatterns).map((p) => p.name)),
    [planConfig.patternLibraryMaxFreePatterns]
  );

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
    setPatternName(name);
    setShowOutcome(false);
    setSidebarOpen(false);
  };

  const isBullish = pattern.expectedDirection === 'BUY';

  return { patternName, setPatternName, symbol, setSymbol, query, setQuery, category, setCategory, variation, setVariation, showOutcome, setShowOutcome, sidebarOpen, setSidebarOpen, chartType, setChartType, indicators, setIndicators, planConfig, openUpgradeModal, unlockedPatternNames, pattern, isCurrentPatternLocked, filtered, example, choosePattern, isBullish };
}

export type PatternLesson = ReturnType<typeof usePatternLesson>;
