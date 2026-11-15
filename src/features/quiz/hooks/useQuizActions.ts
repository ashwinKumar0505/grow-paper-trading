import { useCallback,type RefObject } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { INITIAL_SURVIVAL,INITIAL_TOURNAMENT } from '../quizDefaults';
import type { DifficultyLevel,GameMode } from '../types/trading';
import { triggerTournamentConfetti } from '../utils/celebration';
import { generateScenario } from '../utils/dataGenerator';
import { sound } from '../utils/sound';
import type { QuizState } from './useQuizState';

type Options = Pick<QuizState, 'difficulty' | 'setDifficulty' | 'gameMode' | 'setGameMode' | 'survivalState' | 'setSurvivalState' | 'setScenario' | 'setTradeNumber' | 'setRevealedOutcomeCount' | 'setUserTrade' | 'setChosenDirection' | 'setEntryPrice' | 'tournamentState' | 'setTournamentState'> & {
  tradeInFlight: RefObject<boolean>;
  setCurrentView: (view: 'quiz' | 'learn-charts' | 'mode-select') => void;
};

export function useQuizActions(options: Options) {
  const { difficulty, setDifficulty, gameMode, setGameMode, survivalState, setSurvivalState, setScenario, setTradeNumber, setRevealedOutcomeCount, setUserTrade, setChosenDirection, setEntryPrice, tournamentState, setTournamentState, tradeInFlight, setCurrentView } = options;
  const { planConfig, openUpgradeModal } = useTrading();
  // Advance to Next Chart Scenario or show tournament / survival results
  const handleNextScenario = useCallback(() => {
    sound.playClick();

    if (gameMode === 'survival') {
      if (survivalState.lives <= 0) {
        // Player is out of lives! Close round modal and show SurvivalGameOverModal
        tradeInFlight.current = false;
        setUserTrade(null);
        setSurvivalState((prev) => ({ ...prev, isGameOver: true }));
        return;
      }
    }

    if (gameMode === 'tournament') {
      if (tournamentState.currentRound >= tournamentState.totalRounds) {
        // Tournament finished! Close the per-round modal so TournamentResultModal shows
        tradeInFlight.current = false;
        setUserTrade(null);
        triggerTournamentConfetti();
        return;
      }
      setTournamentState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
      }));
    }

    const next = generateScenario(difficulty);
    setScenario(next);
    setTradeNumber((n) => n + 1);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [gameMode, survivalState.lives, tournamentState.currentRound, tournamentState.totalRounds, difficulty, triggerTournamentConfetti]);

  // Restart 10-Round Tournament
  const handleRestartTournament = useCallback(() => {
    sound.playClick();
    setTournamentState(INITIAL_TOURNAMENT);
    const next = generateScenario(difficulty);
    setScenario(next);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [difficulty]);

  // Retry Survival Challenge (Resets to 3 Lives)
  const handleRetrySurvival = useCallback(() => {
    sound.playClick();
    setSurvivalState((prev) => ({
      ...INITIAL_SURVIVAL,
      bestStreak: prev.bestStreak,
    }));
    const next = generateScenario(difficulty);
    setScenario(next);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [difficulty]);

  // Launch Quiz from Mode & Difficulty Setup Page
  const handleLaunchQuiz = useCallback((selectedMode: GameMode, selectedDifficulty: DifficultyLevel = difficulty) => {
    if (!planConfig.quizAllowedModes.includes(selectedMode)) {
      openUpgradeModal({
        requiredTier: selectedMode === 'survival' ? 'beginner' : 'advanced',
        featureName: `Guess the Chart — ${selectedMode === 'survival' ? 'Survival' : 'Cash Challenge'} Mode`,
        featureDescription:
          selectedMode === 'survival'
            ? '3-Lives Survival Mode is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.'
            : '10-Round Cash Challenge Tournament is exclusive to the Advanced Package (₹699/mo).',
      });
      return;
    }
    if (!planConfig.quizAllowedDifficulties.includes(selectedDifficulty)) {
      openUpgradeModal({
        requiredTier: selectedDifficulty === 'Intermediate' ? 'beginner' : 'advanced',
        featureName: `${selectedDifficulty} Chart Difficulty`,
        featureDescription:
          selectedDifficulty === 'Intermediate'
            ? 'Intermediate chart setups require the Beginner (₹299/mo) or Advanced (₹699/mo) package.'
            : 'Advanced & Mixed chart setups require the Advanced Package (₹699/mo).',
      });
      return;
    }
    sound.playClick();
    setGameMode(selectedMode);
    setDifficulty(selectedDifficulty);

    if (selectedMode === 'survival') {
      setSurvivalState((prev) => ({
        ...INITIAL_SURVIVAL,
        bestStreak: prev.bestStreak,
      }));
    } else if (selectedMode === 'tournament') {
      setTournamentState(INITIAL_TOURNAMENT);
    }

    const next = generateScenario(selectedDifficulty);
    setScenario(next);
    setTradeNumber(1);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
    setCurrentView('quiz');
  }, [difficulty]);

  return { handleNextScenario, handleRestartTournament, handleRetrySurvival, handleLaunchQuiz };
}
