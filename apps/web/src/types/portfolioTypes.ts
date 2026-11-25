import type { Exchange, OrderAction, OrderProduct, OrderStatus, OrderType, QuoteFreshness } from './market';

export interface Order {
  id: string;
  symbol: string;
  stockName: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  price: number;
  limitPrice?: number;
  status: OrderStatus;
  timestamp: number;
  placedAt?: number;
  executedAt?: number;
  executionPrice?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  scheduledForSession?: string;
  idempotencyKey?: string;
  quoteFreshness?: QuoteFreshness;
  totalAmount: number;
  marginUsed: number;
  note?: string;
  rejectionReason?: string;
  triggerPrice?: number;
  triggered?: boolean;
  isAmo?: boolean;
  blockedAmount?: number;
  charges?: number;
  realizedPnl?: number;
  grossRealizedPnl?: number;
  avgPrice?: number;
}

export interface PlaceOrderInput {
  symbol: string;
  stockName: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  limitPrice?: number;
  triggerPrice?: number;
}

export interface Holding {
  symbol: string;
  stockName: string;
  quantity: number;
  averagePrice: number;
  totalInvested: number;
  exchange: Exchange;
  mtfMarginBlocked?: number;
  mtfLoanAmount?: number;
}

export interface IntradayPosition {
  id: string;
  symbol: string;
  stockName: string;
  action: OrderAction;
  quantity: number;
  entryPrice: number;
  marginBlocked: number;
  leverage: number;
  timestamp: number;
  exchange: Exchange;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export interface PortfolioSummary {
  currentValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  availableCash: number;
  lockedMargin: number;
}

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  authProvider: 'google' | 'email';
  avatar?: string;
  initialCash: number;
  paidTopUpCredit?: number;
  createdAt: number;
  subscriptionTier?: 'free' | 'beginner' | 'advanced';
  subscriptionBillingCycle?: 'free' | 'monthly' | 'yearly';
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'past_due' | 'halted';
  subscriptionUpdatedAt?: number;
  subscriptionExpiresAt?: number | null;
  subscriptionAutoPay?: boolean;
  subscriptionUpiMandateId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'BUY' | 'SELL' | 'SQUARE_OFF';
  amount: number;
  description: string;
  timestamp: number;
}
