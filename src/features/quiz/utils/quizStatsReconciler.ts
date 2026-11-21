import { INITIAL_QUIZ_STATS, INITIAL_STATS } from '../quizDefaults';
import type { QuizStats, TradeRecord, UserStats } from '../types/trading';

/**
 * Ensures mathematical consistency across recorded trades, wins/losses, winRate, netProfit, and balance.
 */
export function reconcileUserStats(raw?: Partial<UserStats> | null): UserStats {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_STATS, tradeHistory: [] };
  }

  const startingBalance =
    typeof raw.startingBalance === 'number' && Number.isFinite(raw.startingBalance) && raw.startingBalance > 0
      ? raw.startingBalance
      : INITIAL_STATS.startingBalance;

  const tradeHistory: TradeRecord[] = Array.isArray(raw.tradeHistory) ? raw.tradeHistory : [];

  let wins = typeof raw.wins === 'number' && raw.wins >= 0 ? Math.floor(raw.wins) : 0;
  let losses = typeof raw.losses === 'number' && raw.losses >= 0 ? Math.floor(raw.losses) : 0;
  let netProfit = typeof raw.netProfit === 'number' && Number.isFinite(raw.netProfit) ? raw.netProfit : 0;

  if (tradeHistory.length > 0) {
    const historyWins = tradeHistory.filter((t) => Boolean(t?.isWin)).length;
    const historyLosses = tradeHistory.length - historyWins;
    const historyNetPnl = tradeHistory.reduce(
      (sum, t) => sum + (typeof t?.pnl === 'number' && Number.isFinite(t.pnl) ? t.pnl : 0),
      0
    );
    // When full history is present (not truncated), derive exact totals from tradeHistory
    if (wins + losses <= tradeHistory.length) {
      wins = historyWins;
      losses = historyLosses;
      netProfit = historyNetPnl;
    }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
  const roundedNetProfit = Number(netProfit.toFixed(2));
  const consistentBalance = Math.max(0, Number((startingBalance + roundedNetProfit).toFixed(2)));

  return {
    balance: consistentBalance,
    startingBalance,
    totalTrades,
    wins,
    losses,
    winRate,
    currentStreak:
      typeof raw.currentStreak === 'number' && raw.currentStreak >= 0
        ? Math.floor(raw.currentStreak)
        : 0,
    bestStreak:
      typeof raw.bestStreak === 'number' && raw.bestStreak >= 0 ? Math.floor(raw.bestStreak) : 0,
    netProfit: roundedNetProfit,
    tradeHistory,
  };
}

export function reconcileQuizStats(raw?: Partial<QuizStats> | null): QuizStats {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_QUIZ_STATS, recentResults: [] };
  }
  const totalQuestions =
    typeof raw.totalQuestions === 'number' && raw.totalQuestions >= 0
      ? Math.floor(raw.totalQuestions)
      : 0;
  const correctAnswers = Math.min(
    totalQuestions,
    typeof raw.correctAnswers === 'number' && raw.correctAnswers >= 0
      ? Math.floor(raw.correctAnswers)
      : 0
  );
  const currentStreak =
    typeof raw.currentStreak === 'number' && raw.currentStreak >= 0
      ? Math.floor(raw.currentStreak)
      : 0;
  const bestStreak = Math.max(
    currentStreak,
    typeof raw.bestStreak === 'number' && raw.bestStreak >= 0 ? Math.floor(raw.bestStreak) : 0
  );
  const recentResults = Array.isArray(raw.recentResults)
    ? raw.recentResults.slice(-10).map(Boolean)
    : [];

  return {
    totalQuestions,
    correctAnswers,
    currentStreak,
    bestStreak,
    recentResults,
  };
}
