import { useEffect,useState } from 'react';
import { DEFAULT_INDICATORS,INITIAL_QUIZ_STATS,INITIAL_STATS,INITIAL_SURVIVAL,INITIAL_TOURNAMENT } from '../quizDefaults';
import {
ChartScenario,
ChartType,
DifficultyLevel,
GameMode,
IndicatorSettings,
QuizStats,
SurvivalState,
TournamentState,
TradeDirection,
TradeRecord,
UserStats,
} from '../types/trading';
import { generateScenario } from '../utils/dataGenerator';

export function useQuizState() {
  // Difficulty Level: 'All' | 'Beginner' | 'Intermediate' | 'Advanced'
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('tradepulse_difficulty');
    return ['All', 'Beginner', 'Intermediate', 'Advanced'].includes(saved || '') ? saved as DifficultyLevel : 'Beginner';
  });

  // Game Mode: 'quiz' (Casual Learn) vs 'survival' (3 Hearts) vs 'tournament' (10-Round Cash)
  const [gameMode, setGameMode] = useState<GameMode>('quiz');

  // Survival Mode State
  const [survivalState, setSurvivalState] = useState<SurvivalState>(() => {
    const savedBest = localStorage.getItem('tradepulse_survival_best_streak');
    const best = savedBest ? Number(savedBest) : 0;
    return {
      ...INITIAL_SURVIVAL,
      bestStreak: isNaN(best) ? 0 : best,
    };
  });

  // Application State
  const [scenario, setScenario] = useState<ChartScenario>(() => generateScenario(difficulty));
  const [tradeNumber, setTradeNumber] = useState<number>(1);
  const [revealedOutcomeCount, setRevealedOutcomeCount] = useState<number>(0);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [userTrade, setUserTrade] = useState<TradeRecord | null>(null);
  const [chosenDirection, setChosenDirection] = useState<TradeDirection | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);

  // Tournament Risk Controls (Virtual Cash Mode only)
  const [positionSize, setPositionSize] = useState<number>(1000);

  // Settings & Toggles
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    const saved = localStorage.getItem('tradepulse_indicators');
    try { return saved ? { ...DEFAULT_INDICATORS, ...JSON.parse(saved) } : DEFAULT_INDICATORS; } catch { return DEFAULT_INDICATORS; }
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [chartType, setChartType] = useState<ChartType>(() => {
    const saved = localStorage.getItem('tradepulse_chart_type');
    return (saved as ChartType) || 'candle';
  });

  // Quiz Stats (Pure accuracy, no money)
  const [quizStats, setQuizStats] = useState<QuizStats>(() => {
    const saved = localStorage.getItem('tradeplaybook_india_quiz_stats_v1');
    if (saved) {
      try {
        return { ...INITIAL_QUIZ_STATS, ...JSON.parse(saved) };
      } catch {
        return INITIAL_QUIZ_STATS;
      }
    }
    return INITIAL_QUIZ_STATS;
  });

  // Tournament State (10 Rounds with ₹10,000 Virtual Cash)
  const [tournamentState, setTournamentState] = useState<TournamentState>(INITIAL_TOURNAMENT);

  // Overall Historical Trades for drawer
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('tradeplaybook_india_stats_v1');
    if (saved) {
      try {
        return { ...INITIAL_STATS, ...JSON.parse(saved) };
      } catch {
        return INITIAL_STATS;
      }
    }
    return INITIAL_STATS;
  });

  useEffect(() => { localStorage.setItem('tradepulse_difficulty', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('tradepulse_survival_best_streak', String(survivalState.bestStreak)); }, [survivalState.bestStreak]);

  // Save Quiz Stats to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradeplaybook_india_quiz_stats_v1', JSON.stringify(quizStats));
  }, [quizStats]);

  // Save Overall Stats to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradeplaybook_india_stats_v1', JSON.stringify(stats));
  }, [stats]);

  // Save indicator settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradepulse_indicators', JSON.stringify(indicatorSettings));
  }, [indicatorSettings]);

  // Save chart type preference to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradepulse_chart_type', chartType);
  }, [chartType]);

  return { difficulty, setDifficulty, gameMode, setGameMode, survivalState, setSurvivalState, scenario, setScenario, tradeNumber, setTradeNumber, revealedOutcomeCount, setRevealedOutcomeCount, isRevealing, setIsRevealing, userTrade, setUserTrade, chosenDirection, setChosenDirection, entryPrice, setEntryPrice, positionSize, setPositionSize, indicatorSettings, setIndicatorSettings, isHistoryOpen, setIsHistoryOpen, isGuideOpen, setIsGuideOpen, chartType, setChartType, quizStats, setQuizStats, tournamentState, setTournamentState, stats, setStats };
}

export type QuizState = ReturnType<typeof useQuizState>;
