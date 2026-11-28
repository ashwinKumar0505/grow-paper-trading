import type { BillingCycle, SubscriptionTier, UserUsageQuota } from '../../lib/subscription';
import type {
  Holding,
  IntradayPosition,
  Order,
  WalletTransaction,
  Watchlist,
} from '../../types/market';

export interface DurableUserAccount {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  authProvider: 'google' | 'email';
  subscriptionTier: SubscriptionTier;
  subscriptionBillingCycle: BillingCycle;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'past_due' | 'halted';
  subscriptionUpdatedAt: number;
  subscriptionExpiresAt: number | null;
  subscriptionAutoPay: boolean;
  subscriptionUpiMandateId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  lastSubscriptionEventTs?: number;
  paidTopUpCredit: number;
  usageQuota: UserUsageQuota;
  signupConversionId?: string;
  signupConversionClaimedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DurableOtpRecord {
  email: string;
  salt: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCountWindowStart: number;
  sendCountInWindow: number;
}

export interface DurablePaymentIntent {
  intentId: string;
  userId: string;
  userEmail: string;
  tier: 'beginner' | 'advanced';
  billingCycle: 'monthly' | 'yearly';
  paymentType: 'subscription' | 'order';
  expectedAmountPaise: number;
  fullPriceINR: number;
  creditAppliedINR: number;
  currency: string;
  status: 'created' | 'verified' | 'failed' | 'refunded';
  razorpayPaymentId?: string;
  previousSubscriptionId?: string;
  createdAt: number;
  verifiedAt?: number;
}

export interface DurableBillingItem {
  id: string;
  userId: string;
  paymentId: string | null;
  orderId: string | null;
  subscriptionId: string | null;
  planName: string;
  tier: string;
  billingCycle: string;
  amountINR: number;
  currency: string;
  status: string;
  createdAt: number;
  receiptUrl: string | null;
  description: string | null;
}

export interface DurableExecutionRecord {
  executionId: string;
  orderId: string;
  userId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  product: 'DELIVERY' | 'INTRADAY' | 'MTF';
  quantity: number;
  fillPrice: number;
  charges: number;
  realizedPnl?: number;
  timestamp: number;
}

export interface DurableTradingLedger {
  userId: string;
  version: number;
  balance: number;
  initialBalance: number;
  paidTopUpCredit: number;
  holdings: Holding[];
  positions: IntradayPosition[];
  orders: Order[];
  executions: DurableExecutionRecord[];
  executedOrderKeys: string[];
  walletTransactions: WalletTransaction[];
  watchlists: Watchlist[];
  squareOffPendingSymbols: string[];
  processingLockUntil?: number;
  processingInstanceId?: string;
  lastAutoResetMonth: string;
  updatedAt: number;
}

export interface DurableQuizProgress {
  userId: string;
  quizStats: {
    totalQuestions: number;
    correctAnswers: number;
    currentStreak: number;
    bestStreak: number;
    recentResults: boolean[];
  };
  survivalBestStreak: number;
  survivalBestScore: number;
  tournamentCompletedCount: number;
  tournamentBestBalance: number;
  stats: {
    balance: number;
    startingBalance: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    netProfit: number;
    tradeHistory: unknown[];
  };
  updatedAt: number;
}

export interface DurableAuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  category: 'AUTH' | 'PAYMENT' | 'WEBHOOK' | 'SUBSCRIPTION' | 'TRADING_LEDGER' | 'WALLET';
  action: string;
  details: Record<string, unknown>;
}

export interface StoreSchema {
  users: Record<string, DurableUserAccount>;
  emailIndex: Record<string, string>;
  otpRecords: Record<string, DurableOtpRecord>;
  revokedTokens: Record<string, number>;
  paymentIntents: Record<string, DurablePaymentIntent>;
  processedPayments: Record<string, { intentId: string; userId: string; verifiedAt: number }>;
  processedWebhooks: Record<string, { event: string; processedAt: number }>;
  billingHistory: Record<string, DurableBillingItem[]>;
  tradingLedgers: Record<string, DurableTradingLedger>;
  quizProgress: Record<string, DurableQuizProgress>;
  auditLog: DurableAuditEntry[];
}

export function createEmptyStore(): StoreSchema {
  return {
    users: {},
    emailIndex: {},
    otpRecords: {},
    revokedTokens: {},
    paymentIntents: {},
    processedPayments: {},
    processedWebhooks: {},
    billingHistory: {},
    tradingLedgers: {},
    quizProgress: {},
    auditLog: [],
  };
}
