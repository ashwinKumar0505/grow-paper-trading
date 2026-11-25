import { useCallback,type RefObject } from 'react';
import type { TradeDirection,TradeRecord } from '../types/trading';
import { evaluateQuizPrediction } from '../utils/evaluatePrediction';
import { sound } from '../utils/sound';
import type { QuizState } from './useQuizState';

type Options = Pick<QuizState, 'gameMode' | 'setSurvivalState' | 'scenario' | 'setRevealedOutcomeCount' | 'isRevealing' | 'setIsRevealing' | 'userTrade' | 'setUserTrade' | 'setChosenDirection' | 'entryPrice' | 'setEntryPrice' | 'positionSize' | 'setQuizStats' | 'tournamentState' | 'setTournamentState' | 'stats' | 'setStats'> & {
  tradeInFlight: RefObject<boolean>;
  revealTimer: RefObject<number | null>;
  consumeQuizQuestion: () => boolean;
  triggerWinConfetti: () => void;
};

export function useQuizTrade(options: Options) {
  const { gameMode, setSurvivalState, scenario, setRevealedOutcomeCount, isRevealing, setIsRevealing, userTrade, setUserTrade, setChosenDirection, entryPrice, setEntryPrice, positionSize, setQuizStats, tournamentState, setTournamentState, stats, setStats, tradeInFlight, revealTimer, consumeQuizQuestion, triggerWinConfetti } = options;
  // Execute Trade Decision
  const executeTrade = useCallback(
    (direction: TradeDirection, size: number = 1000) => {
      if (tradeInFlight.current || isRevealing || userTrade) return;
      if (!consumeQuizQuestion()) {
        return;
      }
      tradeInFlight.current = true;
      size = gameMode === 'tournament' ? Math.min(Math.max(0, size), tournamentState.balance) : size;

      sound.playClick();
      setChosenDirection(direction);
      setIsRevealing(true);

      const currentEntryPrice = scenario.candles[scenario.setupCount - 1].close;
      setEntryPrice(currentEntryPrice);

      const totalToReveal = scenario.outcomeCount;
      let revealed = 0;

      // Animate future candles one-by-one into view
      const interval = window.setInterval(() => {
        revealed++;
        setRevealedOutcomeCount(revealed);
        sound.playTick();

        if (revealed >= totalToReveal) {
          clearInterval(interval);
          revealTimer.current = null;
          setIsRevealing(false);

          const {
            exitPrice: finalExitPrice,
            rawPriceChangePct,
            tradePnlPct,
            tradePnl,
            isWin,
          } = evaluateQuizPrediction(scenario, direction, size);

          // Sound & Confetti
          if (isWin) {
            sound.playWin();
            triggerWinConfetti();
          } else {
            sound.playLoss();
          }

          const record: TradeRecord = {
            id: `trade_${Date.now()}`,
            roundNumber: tournamentState.currentRound,
            scenarioId: scenario.id,
            assetSymbol: scenario.assetSymbol,
            assetName: scenario.assetName,
            timeframe: scenario.timeframe,
            patternName: scenario.patternName,
            patternCategory: scenario.patternCategory,
            direction,
            entryPrice: currentEntryPrice,
            exitPrice: finalExitPrice,
            priceChangePct: rawPriceChangePct,
            leverage: 1,
            positionSize: size,
            pnl: tradePnl,
            pnlPct: tradePnlPct,
            isWin,
            timestamp: Date.now(),
            explanation: scenario.explanation,
          };

          setUserTrade(record);

          // Update Survival Mode State
          if (gameMode === 'survival') {
            setSurvivalState((prev) => {
              const newLives = isWin ? prev.lives : Math.max(0, prev.lives - 1);
              const newStreak = isWin ? prev.streak + 1 : 0;
              const multiplier = Math.max(1, Math.min(5, Math.floor(newStreak / 2) + 1));
              const pts = isWin ? 100 * multiplier : 0;
              return {
                ...prev,
                lives: newLives,
                streak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                score: prev.score + pts,
                roundsSurvived: isWin ? prev.roundsSurvived + 1 : prev.roundsSurvived,
              };
            });
          }

          // Update Learn Quiz stats
          if (gameMode === 'quiz') {
            setQuizStats((prev) => {
              const newStreak = isWin ? prev.currentStreak + 1 : 0;
              return {
                totalQuestions: prev.totalQuestions + 1,
                correctAnswers: isWin ? prev.correctAnswers + 1 : prev.correctAnswers,
                currentStreak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                recentResults: [...prev.recentResults.slice(-9), isWin],
              };
            });
          }

          // Update 10-Round Tournament state
          if (gameMode === 'tournament') {
            setTournamentState((prev) => {
              const newBalance = Math.max(0, prev.balance + tradePnl);
              const isLast = prev.currentRound >= prev.totalRounds;
              return {
                ...prev,
                balance: newBalance,
                trades: [...prev.trades, record],
                isCompleted: isLast,
              };
            });
          }

          // Also record to overall history with mathematically consistent balance
          setStats((prev) => {
            const newWins = isWin ? prev.wins + 1 : prev.wins;
            const newLosses = !isWin ? prev.losses + 1 : prev.losses;
            const newTotal = prev.totalTrades + 1;
            const newNetProfit = Number((prev.netProfit + tradePnl).toFixed(2));
            const newBalance = Math.max(
              0,
              Number((prev.startingBalance + newNetProfit).toFixed(2))
            );
            return {
              ...prev,
              balance: newBalance,
              totalTrades: newTotal,
              wins: newWins,
              losses: newLosses,
              winRate: (newWins / newTotal) * 100,
              currentStreak: isWin ? prev.currentStreak + 1 : 0,
              bestStreak: Math.max(prev.bestStreak, isWin ? prev.currentStreak + 1 : 0),
              netProfit: newNetProfit,
              tradeHistory: [record, ...prev.tradeHistory],
            };
          });
        }
      }, 75);
      revealTimer.current = interval;
    },
    [isRevealing, userTrade, scenario, gameMode, tournamentState.currentRound, tournamentState.balance, triggerWinConfetti]
  );

  return executeTrade;
}
