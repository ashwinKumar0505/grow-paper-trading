import {
IndicatorSettings,
QuizStats,
SurvivalState,
TournamentState,
UserStats
} from './types/trading';
export const DEFAULT_INDICATORS: IndicatorSettings = {
  showEma20: true,
  showSma50: false,
  showVolume: true,
  showRsi: false,
  showLevels: true,
};

export const INITIAL_QUIZ_STATS: QuizStats = {
  totalQuestions: 0,
  correctAnswers: 0,
  currentStreak: 0,
  bestStreak: 0,
  recentResults: [],
};

export const INITIAL_SURVIVAL: SurvivalState = {
  lives: 3,
  maxLives: 3,
  streak: 0,
  bestStreak: 0,
  score: 0,
  isGameOver: false,
  roundsSurvived: 0,
};

export const INITIAL_TOURNAMENT: TournamentState = {
  currentRound: 1,
  totalRounds: 10,
  startingBalance: 10000,
  balance: 10000,
  trades: [],
  isCompleted: false,
};

export const INITIAL_STATS: UserStats = {
  balance: 10000,
  startingBalance: 10000,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  currentStreak: 0,
  bestStreak: 0,
  netProfit: 0,
  tradeHistory: [],
};

