import { useCallback, useEffect, useRef, useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { trackQuizCompletion } from '../../lib/analytics';
import type { ChartScenario, TradeDirection } from '../../features/quiz/types/trading';
import { triggerWinConfetti } from '../../features/quiz/utils/celebration';
import { generateScenario } from '../../features/quiz/utils/dataGenerator';
import {
  evaluateQuizPrediction,
  type PredictionEvaluation,
} from '../../features/quiz/utils/evaluatePrediction';
import { sound } from '../../features/quiz/utils/sound';

export const MAX_GUEST_PREVIEWS = 2;
const GUEST_COUNT_KEY = 'tradedia_landing_preview_count_v1';

function readGuestCount(): number {
  try {
    const raw = window.localStorage.getItem(GUEST_COUNT_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeGuestCount(count: number): void {
  try {
    window.localStorage.setItem(GUEST_COUNT_KEY, String(count));
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

export function useLandingChallenge() {
  const { user, openAuthModal } = useTrading();
  const [scenario, setScenario] = useState<ChartScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedOutcomeCount, setRevealedOutcomeCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [chosenDirection, setChosenDirection] = useState<TradeDirection | null>(null);
  const [evaluation, setEvaluation] = useState<PredictionEvaluation | null>(null);
  const [guestCompletedCount, setGuestCompletedCount] = useState<number>(() => readGuestCount());
  const [challengeIndex, setChallengeIndex] = useState<number>(() =>
    Math.min(MAX_GUEST_PREVIEWS, readGuestCount() + 1)
  );
  const [showGuestGate, setShowGuestGate] = useState<boolean>(
    () => !user && readGuestCount() >= MAX_GUEST_PREVIEWS
  );

  const revealTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const loadScenario = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    inFlightRef.current = false;
    try {
      const next = generateScenario();
      setScenario(next);
      setError(null);
      setRevealedOutcomeCount(0);
      setIsRevealing(false);
      setChosenDirection(null);
      setEvaluation(null);
    } catch {
      setError('Unable to load chart challenge right now. Please try again.');
    }
  }, []);

  useEffect(() => {
    loadScenario();
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearInterval(revealTimerRef.current);
      }
    };
  }, [loadScenario]);

  useEffect(() => {
    if (user && showGuestGate) {
      setShowGuestGate(false);
    }
  }, [user, showGuestGate]);

  const submitPrediction = useCallback(
    (direction: TradeDirection) => {
      if (!scenario || inFlightRef.current || isRevealing || evaluation) return;
      if (!user && guestCompletedCount >= MAX_GUEST_PREVIEWS) {
        setShowGuestGate(true);
        return;
      }

      inFlightRef.current = true;
      sound.playClick();
      setChosenDirection(direction);
      setIsRevealing(true);

      const totalToReveal = scenario.outcomeCount;
      let revealed = 0;

      const interval = window.setInterval(() => {
        revealed += 1;
        setRevealedOutcomeCount(revealed);
        sound.playTick();

        if (revealed >= totalToReveal) {
          window.clearInterval(interval);
          revealTimerRef.current = null;
          inFlightRef.current = false;
          setIsRevealing(false);

          const result = evaluateQuizPrediction(scenario, direction, 1000);
          setEvaluation(result);
          trackQuizCompletion({
            quizMode: 'landing_preview',
            completionScope: 'question',
            isCorrect: result.isWin,
            patternCategory: scenario.patternCategory,
          });

          if (result.isWin) {
            sound.playWin();
            triggerWinConfetti();
          } else {
            sound.playLoss();
          }

          if (!user) {
            const nextCount = guestCompletedCount + 1;
            setGuestCompletedCount(nextCount);
            writeGuestCount(nextCount);
          }
        }
      }, 75);

      revealTimerRef.current = interval;
    },
    [scenario, isRevealing, evaluation, user, guestCompletedCount]
  );

  const handleNextChallenge = useCallback(() => {
    if (isRevealing) return;
    if (!user && guestCompletedCount >= MAX_GUEST_PREVIEWS) {
      setShowGuestGate(true);
      return;
    }
    setChallengeIndex((prev) => prev + 1);
    loadScenario();
  }, [isRevealing, user, guestCompletedCount, loadScenario]);

  return {
    user,
    scenario,
    error,
    revealedOutcomeCount,
    isRevealing,
    chosenDirection,
    evaluation,
    guestCompletedCount,
    challengeIndex,
    showGuestGate,
    submitPrediction,
    handleNextChallenge,
    retryLoad: loadScenario,
    openAuthModal,
  };
}
