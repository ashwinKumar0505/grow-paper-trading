import {
Exchange,
Holding,
IndexData,
IntradayPosition,
Order,
OrderAction,
OrderProduct,
OrderType,
PortfolioSummary,
QuoteFreshness,
Stock,
UserProfile,
WalletTransaction,
Watchlist
} from '../../../types/market';
import {
MarketStatus
} from '../../../utils/marketHours';

import {
BillingCycle,
SubscriptionPlanConfig,
SubscriptionTier,
UserUsageQuota
} from '../../../lib/subscription';

import type { ChartPoint,Timeframe } from '../../../types/market';
export interface ExecuteOrderParams {
  symbol: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  limitPrice?: number;
  triggerPrice?: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

export interface TradingContextType {
  stocks: Stock[];
  indices: IndexData[];
  selectedStock: Stock;
  setSelectedStock: (stock: Stock) => void;
  selectStockBySymbol: (symbol: string) => void;
  currentTab: 'explore' | 'holdings' | 'watchlist' | 'orders' | 'stock-detail';
  setCurrentTab: (tab: 'explore' | 'holdings' | 'watchlist' | 'orders' | 'stock-detail') => void;
  
  // Market Hours & Status
  marketStatus: MarketStatus;

  // Landing Page Navigation
  showLandingPage: boolean;
  setShowLandingPage: (show: boolean) => void;

  // User Profile & Authentication (Google & Email OTP)
  user: UserProfile | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup';
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signUpUser: (data: {
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
    initialCash: number;
  }) => Promise<void>;
  signInUser: (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }) => Promise<boolean>;
  logOutUser: () => void;

  // Wallet / Cash & Add Money
  balance: number;
  initialBalance: number;
  addMoneyToWallet: (amount: number, description?: string) => boolean;
  walletTransactions: WalletTransaction[];
  setPaperBalance: (amount: number) => void;
  resetPortfolio: (startingCash?: number) => void;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;

  // Trading Actions
  executeOrder: (params: ExecuteOrderParams, opts?: { silent?: boolean }) => { success: boolean; message: string; order?: Order };
  cancelLimitOrder: (orderId: string) => void;
  exitPosition: (positionId: string) => void;
  squareOffPosition: (positionId: string) => void;
  
  // Portfolio
  holdings: Holding[];
  intradayPositions: IntradayPosition[];
  orders: Order[];
  portfolioSummary: PortfolioSummary;
  
  // Watchlists
  watchlists: Watchlist[];
  activeWatchlistId: string;
  setActiveWatchlistId: (id: string) => void;
  toggleWatchlistStock: (watchlistId: string, symbol: string) => void;
  createWatchlist: (name: string) => void;
  isStockInWatchlist: (symbol: string, watchlistId?: string) => boolean;
  
  // Active Modals
  orderModalState: {
    isOpen: boolean;
    stock: Stock | null;
    defaultAction: OrderAction;
    defaultProduct?: OrderProduct;
    defaultQuantity?: number;
  };
  openOrderModal: (
    stock: Stock,
    action?: OrderAction,
    product?: OrderProduct,
    quantity?: number
  ) => void;
  closeOrderModal: () => void;
  
  lastExecutedOrder: Order | null;
  setLastExecutedOrder: (order: Order | null) => void;

  // Subscription & Feature Access (Free, Beginner, Advanced)
  subscriptionTier: SubscriptionTier;
  planConfig: SubscriptionPlanConfig;
  usageQuota: UserUsageQuota;
  upgradeSubscription: (params: {
    tier: SubscriptionTier;
    billingCycle?: BillingCycle;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    amountPaid?: number;
    subscriptionAutoPay?: boolean;
    subscriptionUpiMandateId?: string;
  }) => Promise<void>;
  creditFreeWalletTopUp: (paymentId?: string, orderId?: string) => Promise<void>;
  cancelSubscription: () => Promise<{ success: boolean; expiresAt?: number; message?: string }>;
  upgradeModalState: {
    isOpen: boolean;
    requiredTier: SubscriptionTier;
    featureName?: string;
    featureDescription?: string;
  };
  openUpgradeModal: (opts?: {
    requiredTier?: SubscriptionTier;
    featureName?: string;
    featureDescription?: string;
  }) => void;
  closeUpgradeModal: () => void;
  razorpayModalState: {
    isOpen: boolean;
    tier: 'beginner' | 'advanced' | 'topup_1l';
    billingCycle: 'monthly' | 'yearly';
  };
  openRazorpayCheckout: (tier: 'beginner' | 'advanced' | 'topup_1l', billingCycle?: 'monthly' | 'yearly') => void;
  closeRazorpayCheckout: () => void;
  consumeAnalysisSearch: (symbol?: string) => boolean;
  consumeQuizQuestion: () => boolean;

  // Global Toast
  toasts: ToastMessage[];
  addToast: (title: string, description: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Real Market Data Status
  isLiveConnected: boolean;
  lastLiveUpdate: Date | null;
  isRefreshingLive: boolean;
  marketDataFreshness: QuoteFreshness;
  refreshLiveMarketData: () => Promise<void>;
  fetchRealChart: (symbol: string, timeframe: Timeframe) => Promise<ChartPoint[] | null>;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
}

