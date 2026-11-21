import { useEffect, useRef, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import {
  DEFAULT_INDICATORS,
  INITIAL_SURVIVAL,
  INITIAL_TOURNAMENT,
} from '../quizDefaults';
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
import { fetchRemoteQuizProgress, pushRemoteQuizProgress } from '../utils/quizRemoteSync';
import {
  loadScopedQuizProgress,
  normalizeQuizScope,
  saveScopedQuizProgress,
} from '../utils/quizStorage';

export function useQuizState() {
  const { user } = useTrading();
  const uid = user?.uid || null;
  const scope = normalizeQuizScope(uid);
  const loadedScopeRef = useRef<string>(scope);

  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    try {
      const saved =
        localStorage.getItem(`niftylens_quiz_diff_${scope}`) ||
        localStorage.getItem('tradepulse_difficulty');
      return ['All', 'Beginner', 'Intermediate', 'Advanced'].includes(saved || '')
        ? (saved as DifficultyLevel)
        : 'Beginner';
    } catch {
      return 'Beginner';
    }
  });

  const [gameMode, setGameMode] = useState<GameMode>('quiz');
  const initialProgress = loadScopedQuizProgress(uid);
  const [survivalState, setSurvivalState] = useState<SurvivalState>(initialProgress.survivalState);
  const [quizStats, setQuizStats] = useState<QuizStats>(initialProgress.quizStats);
  const [stats, setStats] = useState<UserStats>(initialProgress.stats);
  const [tournamentState, setTournamentState] = useState<TournamentState>(INITIAL_TOURNAMENT);

  const [scenario, setScenario] = useState<ChartScenario>(() => generateScenario(difficulty));
  const [tradeNumber, setTradeNumber] = useState<number>(1);
  const [revealedOutcomeCount, setRevealedOutcomeCount] = useState<number>(0);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [userTrade, setUserTrade] = useState<TradeRecord | null>(null);
  const [chosenDirection, setChosenDirection] = useState<TradeDirection | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [positionSize, setPositionSize] = useState<number>(1000);

  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    try {
      const saved = localStorage.getItem('tradepulse_indicators');
      return saved ? { ...DEFAULT_INDICATORS, ...JSON.parse(saved) } : DEFAULT_INDICATORS;
    } catch {
      return DEFAULT_INDICATORS;
    }
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [chartType, setChartType] = useState<ChartType>(() => {
    try {
      const saved = localStorage.getItem('tradepulse_chart_type');
      return (saved as ChartType) || 'candle';
    } catch {
      return 'candle';
    }
  });

  useEffect(() => {
    const local = loadScopedQuizProgress(uid);
    setQuizStats(local.quizStats);
    setStats(local.stats);
    setSurvivalState((prev) => ({
      ...INITIAL_SURVIVAL,
      lives: prev.lives,
      bestStreak: local.survivalState.bestStreak,
    }));
    loadedScopeRef.current = scope;

    if (!uid) return;
    let alive = true;

    fetchRemoteQuizProgress(uid).then((remote) => {
      if (!alive || !remote) return;
      setQuizStats(remote.quizStats);
      setStats(remote.stats);
      setSurvivalState((prev) => ({
        ...prev,
        bestStreak: Math.max(prev.bestStreak, remote.survivalBestStreak),
      }));
    });

    return () => {
      alive = false;
    };
  }, [scope, uid]);

  useEffect(() => {
    if (loadedScopeRef.current !== scope) return;
    saveScopedQuizProgress(uid, {
      quizStats,
      stats,
      survivalBestStreak: survivalState.bestStreak,
    });

    if (!uid) return;
    const timer = window.setTimeout(() => {
      pushRemoteQuizProgress(uid, {
        quizStats,
        stats,
        survivalBestStreak: survivalState.bestStreak,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [scope, uid, quizStats, stats, survivalState.bestStreak]);

  useEffect(() => {
    try {
      localStorage.setItem(`niftylens_quiz_diff_${scope}`, difficulty);
    } catch {}
  }, [scope, difficulty]);

  useEffect(() => {
    try {
      localStorage.setItem('tradepulse_indicators', JSON.stringify(indicatorSettings));
    } catch {}
  }, [indicatorSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('tradepulse_chart_type', chartType);
    } catch {}
  }, [chartType]);

  return {
    difficulty, setDifficulty, gameMode, setGameMode,
    survivalState, setSurvivalState, scenario, setScenario,
    tradeNumber, setTradeNumber, revealedOutcomeCount, setRevealedOutcomeCount,
    isRevealing, setIsRevealing, userTrade, setUserTrade,
    chosenDirection, setChosenDirection, entryPrice, setEntryPrice,
    positionSize, setPositionSize, indicatorSettings, setIndicatorSettings,
    isHistoryOpen, setIsHistoryOpen, isGuideOpen, setIsGuideOpen,
    chartType, setChartType, quizStats, setQuizStats,
    tournamentState, setTournamentState, stats, setStats,
  };
}

export type QuizState = ReturnType<typeof useQuizState>;
