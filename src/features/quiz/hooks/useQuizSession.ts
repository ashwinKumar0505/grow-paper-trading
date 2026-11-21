import { useCallback, useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { navigate, usePathname } from '../../../lib/navigation';
import {
  INITIAL_QUIZ_STATS,
  INITIAL_STATS,
  INITIAL_SURVIVAL,
  INITIAL_TOURNAMENT,
} from '../quizDefaults';
import type { IndicatorSettings } from '../types/trading';
import { triggerWinConfetti } from '../utils/celebration';
import { generateScenario } from '../utils/dataGenerator';
import { clearScopedQuizProgress } from '../utils/quizStorage';
import { sound } from '../utils/sound';
import { useQuizActions } from './useQuizActions';
import { useQuizKeyboard } from './useQuizKeyboard';
import { useQuizState } from './useQuizState';
import { useQuizTrade } from './useQuizTrade';

export function useQuizSession() {
  const state = useQuizState();
  const { consumeQuizQuestion, user, planConfig, openUpgradeModal } = useTrading();
  const {
    difficulty,
    setSurvivalState,
    setScenario,
    setTradeNumber,
    setRevealedOutcomeCount,
    setIsRevealing,
    setUserTrade,
    setChosenDirection,
    setEntryPrice,
    setIndicatorSettings,
    setIsHistoryOpen,
    setIsGuideOpen,
    setQuizStats,
    setTournamentState,
    setStats,
  } = state;

  const pathname = usePathname();
  const currentView =
    pathname === '/quiz/play'
      ? 'quiz'
      : pathname === '/learn' || pathname === '/pattern-library'
        ? 'learn-charts'
        : 'mode-select';
  const setCurrentView = (view: 'quiz' | 'learn-charts' | 'mode-select') =>
    navigate(view === 'quiz' ? '/quiz/play' : view === 'learn-charts' ? '/learn' : '/quiz');

  const revealTimer = useRef<number | null>(null);
  const tradeInFlight = useRef(false);

  useEffect(() => {
    return () => {
      if (revealTimer.current !== null) window.clearInterval(revealTimer.current);
      tradeInFlight.current = false;
    };
  }, [pathname]);

  useEffect(() => {
    setIsRevealing(false);
    setIsHistoryOpen(false);
    setIsGuideOpen(false);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
    if (pathname === '/quiz/play') {
      setScenario(generateScenario(difficulty));
      setTradeNumber(1);
      setTournamentState(INITIAL_TOURNAMENT);
      setSurvivalState((prev) => ({ ...INITIAL_SURVIVAL, bestStreak: prev.bestStreak }));
    }
  }, [pathname]);

  const handleToggleIndicator = useCallback(
    (key: keyof IndicatorSettings) => {
      setIndicatorSettings((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
      sound.playClick();
    },
    [setIndicatorSettings]
  );

  const handleOpenHistory = useCallback(() => {
    if (!planConfig.quizAllowHistoryDrawer) {
      openUpgradeModal({
        requiredTier: 'advanced',
        featureName: 'Quiz Trade Journal & Category Edge Analytics',
        featureDescription:
          'Unlock the full Quiz Performance Journal, pattern-category win-rate analytics, and trade log on the Advanced Package (₹699/mo).',
      });
      return;
    }
    setIsHistoryOpen(true);
  }, [openUpgradeModal, planConfig.quizAllowHistoryDrawer, setIsHistoryOpen]);

  const handleResetStats = useCallback(() => {
    setQuizStats(INITIAL_QUIZ_STATS);
    setStats(INITIAL_STATS);
    setSurvivalState((prev) => ({ ...prev, bestStreak: 0, score: 0, streak: 0 }));
    clearScopedQuizProgress(user?.uid);
  }, [setQuizStats, setStats, setSurvivalState, user?.uid]);

  const executeTrade = useQuizTrade({
    ...state,
    tradeInFlight,
    revealTimer,
    consumeQuizQuestion,
    triggerWinConfetti,
  });
  const actions = useQuizActions({ ...state, tradeInFlight, setCurrentView });
  useQuizKeyboard({
    ...state,
    currentView,
    executeTrade,
    handleNextScenario: actions.handleNextScenario,
  });

  return {
    ...state,
    ...actions,
    currentView,
    setCurrentView,
    executeTrade,
    handleToggleIndicator,
    handleOpenHistory,
    handleResetStats,
  };
}
