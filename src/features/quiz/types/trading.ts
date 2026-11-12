export interface Candle {
  time: number; // timestamp or sequential index
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PatternCategory =
  | 'Reversal'
  | 'Continuation'
  | 'Bilateral'
  | 'Breakout'
  | 'Trend Following'
  | 'Fakeout / Liquidity'
  | 'Range & Squeeze';

export type ChartType = 'line' | 'candle';

export type PatternFocus =
  | 'all'
  | 'cheat-sheet'
  | 'reversals'
  | 'continuations'
  | 'bilaterals';

export interface ChartScenario {
  id: string;
  assetName: string;
  assetSymbol: string;
  assetType: 'Equities';
  timeframe: string;
  candles: Candle[]; // Full sequence: setup + outcome
  setupCount: number; // Number of candles visible to user
  outcomeCount: number; // Number of candles hidden
  expectedDirection: 'BUY' | 'SELL';
  patternName: string;
  patternCategory: PatternCategory;
  cheatSheetGroup?: 'Reversal' | 'Continuation' | 'Bilateral' | 'Special';
  entryRule?: string;
  stopLossRule?: string;
  targetRule?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  explanation: string;
  keyObservation: string;
  proTip: string;
  supportLevel?: number;
  resistanceLevel?: number;
}

export type TradeDirection = 'BUY' | 'SELL';

export interface TradeRecord {
  id: string;
  roundNumber?: number;
  scenarioId: string;
  assetSymbol: string;
  assetName: string;
  timeframe: string;
  patternName: string;
  patternCategory: PatternCategory;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  priceChangePct: number;
  leverage: number;
  positionSize: number;
  pnl: number;
  pnlPct: number;
  isWin: boolean;
  timestamp: number;
  explanation: string;
}

export interface UserStats {
  balance: number;
  startingBalance: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  netProfit: number;
  tradeHistory: TradeRecord[];
}

export interface IndicatorSettings {
  showEma20: boolean;
  showSma50: boolean;
  showVolume: boolean;
  showRsi: boolean;
  showLevels: boolean;
}

export type GameMode = 'survival' | 'quiz' | 'tournament';
export type DifficultyLevel = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  currentStreak: number;
  bestStreak: number;
  recentResults: boolean[];
}

export interface SurvivalState {
  lives: number; // 0 to maxLives
  maxLives: number; // default 3
  streak: number;
  bestStreak: number;
  score: number;
  isGameOver: boolean;
  roundsSurvived: number;
}

export interface TournamentState {
  currentRound: number; // 1 to totalRounds
  totalRounds: number; // 10 rounds
  startingBalance: number; // ₹10,000
  balance: number;
  trades: TradeRecord[];
  isCompleted: boolean;
}
