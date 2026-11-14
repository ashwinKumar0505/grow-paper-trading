import { navigate, usePathname } from '../lib/navigation';
import { portfolioQuoteSymbols, mergePortfolioQuote } from '../utils/portfolioQuotes';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Exchange,
  Holding,
  IndexData,
  IntradayPosition,
  Order,
  OrderAction,
  OrderProduct,
  OrderStatus,
  OrderType,
  PortfolioSummary,
  QuoteFreshness,
  Stock,
  UserProfile,
  WalletTransaction,
  Watchlist,
} from '../types/market';
import { INITIAL_INDICES, INITIAL_STOCKS } from '../data/mockStocks';
import {
  classifyQuoteFreshness,
  getIndianMarketStatus,
  MarketStatus,
  getISTParts,
  isPastIntradayCutoff,
} from '../utils/marketHours';
import {
  applyFill,
  cancelOrder,
  EngineState,
  migrateLegacyPaperState,
  OrderBookState,
  processOrderQueue,
  roundToTick,
  submitOrder,
} from '../utils/orderEngine';
import { AUTO_SQUARE_OFF_CHARGE } from '../utils/charges';

const round2 = (n: number) => Math.round(n * 100) / 100;
import { auth, db, doc, setDoc, getDoc, onSnapshot, onAuthStateChanged, firebaseSignOut } from '../lib/firebase';
import {
  BillingCycle,
  getCurrentMonthKey,
  getTodayKey,
  normalizeUsageQuota,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanConfig,
  SubscriptionTier,
  UserUsageQuota,
} from '../lib/subscription';

export const MAX_WALLET_LIMIT = 5000000; // ₹50,00,000 (50 Lakhs max wallet limit for Advanced)

interface ExecuteOrderParams {
  symbol: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  limitPrice?: number;
  triggerPrice?: number;
}

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

interface TradingContextType {
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
  }) => void;
  signInUser: (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }) => boolean;
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
  fetchRealChart: (symbol: string, timeframe: any) => Promise<any>;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'groww_paper_trading_data_v1';
const USAGE_QUOTA_KEY = 'niftylens_usage_quota_v1';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage if available
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [indices, setIndices] = useState<IndexData[]>(INITIAL_INDICES);
  const [selectedStock, setSelectedStockState] = useState<Stock>(INITIAL_STOCKS[0]);
  const [currentTab, setCurrentTab] = useState<'explore' | 'holdings' | 'watchlist' | 'orders' | 'stock-detail'>('explore');
  const pathname = usePathname();
  const showLandingPage = pathname === '/';
  const setShowLandingPage = (show: boolean) => navigate(show ? '/' : '/trade');

  // User Profile & Authentication
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mypaper_user_v2') || localStorage.getItem('groww_paper_user_v1');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed.subscriptionTier) parsed.subscriptionTier = 'free';
      return parsed;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // Subscription & Usage Quota State
  const subscriptionTier: SubscriptionTier = user?.subscriptionTier || 'free';
  const planConfig: SubscriptionPlanConfig = SUBSCRIPTION_PLANS[subscriptionTier] || SUBSCRIPTION_PLANS.free;

  const [usageQuota, setUsageQuota] = useState<UserUsageQuota>(() => {
    try {
      const saved = localStorage.getItem(USAGE_QUOTA_KEY);
      return normalizeUsageQuota(saved ? JSON.parse(saved) : null);
    } catch {
      return normalizeUsageQuota(null);
    }
  });

  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    requiredTier: SubscriptionTier;
    featureName?: string;
    featureDescription?: string;
  }>({
    isOpen: false,
    requiredTier: 'beginner',
  });

  const [razorpayModalState, setRazorpayModalState] = useState<{
    isOpen: boolean;
    tier: 'beginner' | 'advanced' | 'topup_1l';
    billingCycle: 'monthly' | 'yearly';
  }>({
    isOpen: false,
    tier: 'beginner',
    billingCycle: 'monthly',
  });

  const openUpgradeModal = useCallback(
    (opts?: { requiredTier?: SubscriptionTier; featureName?: string; featureDescription?: string }) => {
      setUpgradeModalState({
        isOpen: true,
        requiredTier: opts?.requiredTier || (subscriptionTier === 'free' ? 'beginner' : 'advanced'),
        featureName: opts?.featureName,
        featureDescription: opts?.featureDescription,
      });
    },
    [subscriptionTier]
  );

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openRazorpayCheckout = useCallback(
    (tier: 'beginner' | 'advanced' | 'topup_1l', billingCycle: 'monthly' | 'yearly' = 'monthly') => {
      setUpgradeModalState((prev) => ({ ...prev, isOpen: false }));
      setRazorpayModalState({
        isOpen: true,
        tier,
        billingCycle,
      });
    },
    []
  );

  const closeRazorpayCheckout = useCallback(() => {
    setRazorpayModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup' = 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Paper Money Balance & Wallet Transactions (Default ₹1 Lakh for Free tier)
  const [balance, setBalance] = useState<number>(100000);
  const [initialBalance, setInitialBalance] = useState<number>(100000);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('groww_paper_wallet_txs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Portfolio & Orders
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [intradayPositions, setIntradayPositions] = useState<IntradayPosition[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Watchlists
  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    {
      id: 'default',
      name: 'My Watchlist',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'TATAMOTORS', 'ZOMATO', 'INFY'],
    },
    {
      id: 'nifty-giants',
      name: 'NIFTY Giants',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'SBIN'],
    },
    {
      id: 'high-growth',
      name: 'High Beta / Tech',
      symbols: ['ZOMATO', 'JIOFIN', 'TATAMOTORS', 'INFY', 'WIPRO', 'ADANIENT'],
    },
  ]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('default');

  // Modals & Navigation
  const [orderModalState, setOrderModalState] = useState<{
    isOpen: boolean;
    stock: Stock | null;
    defaultAction: OrderAction;
    defaultProduct?: OrderProduct;
    defaultQuantity?: number;
  }>({
    isOpen: false,
    stock: null,
    defaultAction: 'BUY',
    defaultProduct: 'DELIVERY',
    defaultQuantity: 1,
  });
  const [lastExecutedOrder, setLastExecutedOrder] = useState<Order | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme (Default to dark mode across the application)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('niftylens_theme_v1');
      if (savedTheme === 'light') return false;
      if (savedTheme === 'dark') return true;
      return true;
    } catch {
      return true;
    }
  });
  // Indian Stock Market (NSE / BSE) Trading Status
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getIndianMarketStatus());

  // Real Market Data Status
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [marketDataFreshness, setMarketDataFreshness] = useState<QuoteFreshness>(() =>
    getIndianMarketStatus().isOpen ? 'LIVE' : 'LAST_AVAILABLE'
  );
  const [executedOrderKeys, setExecutedOrderKeys] = useState<string[]>([]);

  // Function to fetch real market data from backend provider
  const refreshLiveMarketData = useCallback(async () => {
    setIsRefreshingLive(true);
    try {
      const now = Date.now();
      const currentStatus = getIndianMarketStatus(now);
      setMarketStatus(currentStatus);

      // 1. Fetch live indices
      const indicesRes = await fetch('/api/market/indices');
      if (indicesRes.ok) {
        const data = await indicesRes.json();
        if (data.success && Array.isArray(data.indices) && data.indices.length > 0) {
          setIndices(data.indices);
        }
      }

      // 2. Fetch live stocks (actual market-derived prices only)
      const stocksRes = await fetch('/api/stocks');
      if (stocksRes.ok) {
        const data = await stocksRes.json();
        if (data.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
          const serverFreshness: QuoteFreshness =
            data.freshness || (currentStatus.isOpen ? 'LIVE' : 'LAST_AVAILABLE');
          setMarketDataFreshness(serverFreshness);

          setStocks((prevStocks) => {
            return prevStocks.map((localStock) => {
              const liveStock = data.stocks.find(
                (s: any) => s.symbol.toUpperCase() === localStock.symbol.toUpperCase()
              );
              if (!liveStock || !Number.isFinite(liveStock.price) || liveStock.price <= 0) {
                return localStock;
              }

              const resolvedPrice = Number(liveStock.price.toFixed(2));
              const prevClose = Number(
                (liveStock.previousClose || localStock.previousClose || resolvedPrice).toFixed(2)
              );
              const change = Number((resolvedPrice - prevClose).toFixed(2));
              const changePercent =
                prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
              const tickDir =
                resolvedPrice > localStock.price
                  ? ('up' as const)
                  : resolvedPrice < localStock.price
                    ? ('down' as const)
                    : null;

              return {
                ...localStock,
                name: liveStock.name || localStock.name,
                price: resolvedPrice,
                previousClose: prevClose,
                change,
                changePercent,
                open: liveStock.open || localStock.open,
                high: liveStock.high || Math.max(localStock.high, resolvedPrice),
                low: liveStock.low || Math.min(localStock.low, resolvedPrice),
                close: resolvedPrice,
                volume: liveStock.volume || localStock.volume,
                week52High: liveStock.week52High || localStock.week52High,
                week52Low: liveStock.week52Low || localStock.week52Low,
                lowerCircuit: liveStock.lowerCircuit ?? roundToTick(prevClose * 0.9),
                upperCircuit: liveStock.upperCircuit ?? roundToTick(prevClose * 1.1),
                sparkline:
                  liveStock.sparkline?.length > 0 ? liveStock.sparkline : localStock.sparkline,
                tickDirection: tickDir,
                lastTickTime: now,
                quoteTimestamp: liveStock.quoteTimestamp ?? now,
                fetchedAt: liveStock.fetchedAt ?? now,
                freshness: liveStock.freshness ?? serverFreshness,
                freshnessLabel: liveStock.freshnessLabel,
                isTradableQuote:
                  liveStock.isTradableQuote ?? (currentStatus.isOpen && serverFreshness !== 'STALE'),
                isStale: liveStock.isStale ?? false,
                providerAvailable: true,
              };
            });
          });
          setIsLiveConnected(true);
          setLastLiveUpdate(new Date(now));
        }
      }
    } catch (err) {
      console.warn('Market data provider fetch error, preserving last available quotes:', err);
      setIsLiveConnected(false);
    } finally {
      setIsRefreshingLive(false);
    }
  }, []);

  // Persisted trades may refer to search results outside INITIAL_STOCKS.
  // Restore those quotes independently of the default market-list endpoint.
  const portfolioSymbolsKey = JSON.stringify(portfolioQuoteSymbols(holdings, intradayPositions, orders));
  useEffect(() => {
    const symbols: string[] = JSON.parse(portfolioSymbolsKey);
    if (symbols.length === 0) return;
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        await Promise.allSettled(symbols.map(async symbol => {
          const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, { signal: controller.signal });
          if (!response.ok) return;
          const data = await response.json();
          if (!controller.signal.aborted && data.success && data.stock) {
            setStocks(previous => mergePortfolioQuote(previous, symbol, data.stock));
          }
        }));
      } finally { running = false; }
    };
    void refresh();
    // Retry missing quotes even outside market hours; a failed request is not
    // evidence that an owned instrument is invalid.
    const timer = setInterval(() => void refresh(), 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [portfolioSymbolsKey]);

  // Fetch real chart data for given symbol & timeframe
  const fetchRealChart = useCallback(async (symbol: string, timeframe: any) => {
    try {
      const res = await fetch(`/api/stocks/${symbol}/chart?timeframe=${timeframe}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.points) && data.points.length > 0) {
        return data.points;
      }
    } catch {
      // Fallback
    }
    return null;
  }, []);

  // Keep market status updated and fetch real market data
  useEffect(() => {
    // Initial fetch of real market quotes
    refreshLiveMarketData();

    // Check market status (open/closed) every 15 seconds
    const statusTimer = setInterval(() => {
      setMarketStatus(getIndianMarketStatus());
    }, 15000);

    // If market is currently closed, do NOT poll continuously
    if (!marketStatus.isOpen) {
      return () => clearInterval(statusTimer);
    }

    // Only when market is live (09:15 AM - 03:30 PM IST Mon-Fri), refresh real base quotes every 30 seconds
    const liveInterval = setInterval(() => {
      refreshLiveMarketData();
    }, 30000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(liveInterval);
    };
  }, [refreshLiveMarketData, marketStatus.isOpen]);

  // Listen to Firebase Auth state and sync with Firestore profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: fbUser.uid,
              name: data.name || fbUser.displayName || 'Google Trader',
              email: data.email || fbUser.email || '',
              authProvider: (data.authProvider as any) || 'google',
              avatar: data.avatar || fbUser.photoURL || undefined,
              initialCash: data.initialBalance || 100000,
              createdAt: data.createdAt || Date.now(),
              subscriptionTier: (data.subscriptionTier as SubscriptionTier) || 'free',
              subscriptionBillingCycle: (data.subscriptionBillingCycle as BillingCycle) || 'free',
              subscriptionStatus: data.subscriptionStatus || 'active',
              subscriptionUpdatedAt: data.subscriptionUpdatedAt || Date.now(),
              subscriptionExpiresAt: data.subscriptionExpiresAt || null,
              razorpayPaymentId: data.razorpayPaymentId || undefined,
              razorpayOrderId: data.razorpayOrderId || undefined,
            });
            if (typeof data.balance === 'number') {
              setBalance(data.balance);
            }
            if (data.usage) {
              setUsageQuota(normalizeUsageQuota(data.usage));
            }
          }
        } catch (e) {
          console.warn('Firebase user restore notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener on active user's document (maps user to subscription in real time)
  useEffect(() => {
    if (!user?.uid) return;
    let unsub: (() => void) | undefined;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      unsub = onSnapshot(
        userDocRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data.subscriptionTier) {
            setUser((prev) => {
              if (!prev) return prev;
              if (
                prev.subscriptionTier === data.subscriptionTier &&
                prev.subscriptionBillingCycle === data.subscriptionBillingCycle &&
                prev.razorpayPaymentId === data.razorpayPaymentId
              ) {
                return prev;
              }
              return {
                ...prev,
                subscriptionTier: data.subscriptionTier as SubscriptionTier,
                subscriptionBillingCycle: (data.subscriptionBillingCycle as BillingCycle) || prev.subscriptionBillingCycle,
                subscriptionStatus: data.subscriptionStatus || 'active',
                subscriptionUpdatedAt: data.subscriptionUpdatedAt || prev.subscriptionUpdatedAt,
                subscriptionExpiresAt: data.subscriptionExpiresAt ?? prev.subscriptionExpiresAt,
                razorpayPaymentId: data.razorpayPaymentId || prev.razorpayPaymentId,
                razorpayOrderId: data.razorpayOrderId || prev.razorpayOrderId,
              };
            });
          }
        },
        () => {}
      );
    } catch {
      // Ignore offline snapshot error
    }
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

  // Save usageQuota to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USAGE_QUOTA_KEY, JSON.stringify(usageQuota));
    } catch {}
  }, [usageQuota]);

  // Load saved state once (and migrate any legacy simulation state safely)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateLegacyPaperState({
          ...parsed,
          positions: parsed.intradayPositions ?? parsed.positions,
        });
        if (migrated.balance !== undefined) setBalance(migrated.balance);
        if (parsed.initialBalance !== undefined) setInitialBalance(parsed.initialBalance);
        if (migrated.holdings) setHoldings(migrated.holdings);
        if (migrated.positions) setIntradayPositions(migrated.positions);
        if (migrated.orders) setOrders(migrated.orders);
        if (migrated.executedOrderKeys) setExecutedOrderKeys(migrated.executedOrderKeys);
        if (parsed.watchlists) setWatchlists(parsed.watchlists);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          balance,
          initialBalance,
          holdings,
          intradayPositions,
          orders,
          executedOrderKeys,
          watchlists,
          isDarkMode,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [balance, initialBalance, holdings, intradayPositions, orders, executedOrderKeys, watchlists, isDarkMode]);

  // Save user profile & wallet transactions to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('groww_paper_user_v1', JSON.stringify(user));
      } else {
        localStorage.removeItem('groww_paper_user_v1');
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('groww_paper_wallet_txs_v1', JSON.stringify(walletTransactions));
    } catch {}
  }, [walletTransactions]);

  // Handle dark mode HTML class & persist theme preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('niftylens_theme_v1', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const addToast = useCallback((title: string, description: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setSelectedStock = (stock: Stock) => {
    setSelectedStockState(stock);
    // Asynchronously refresh its real quote
    fetch(`/api/stocks/${stock.symbol}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stock && data.stock.price > 0) {
          setSelectedStockState((prev) => (prev.symbol === stock.symbol ? { ...prev, ...data.stock } : prev));
          setStocks((prev) => {
            const idx = prev.findIndex((s) => s.symbol === stock.symbol);
            if (idx >= 0) {
              const cp = [...prev];
              cp[idx] = { ...cp[idx], ...data.stock };
              return cp;
            }
            return [data.stock, ...prev];
          });
        }
      })
      .catch(() => {});
  };

  const selectStockBySymbol = async (symbol: string) => {
    const sym = symbol.toUpperCase();
    const existing = stocks.find((s) => s.symbol.toUpperCase() === sym);
    if (existing) {
      setSelectedStockState(existing);
      setCurrentTab('stock-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
      const res = await fetch(`/api/stocks/${sym}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stock && data.stock.price > 0) {
          const freshStock = data.stock;
          setSelectedStockState((prev) => {
            const base = existing || (prev.symbol.toUpperCase() === sym ? prev : INITIAL_STOCKS[0]);
            return {
              ...base,
              ...freshStock,
              fundamentals: freshStock.fundamentals || base?.fundamentals || INITIAL_STOCKS[0].fundamentals,
              about: freshStock.about || base?.about || `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
            };
          });
          setStocks((prev) => {
            const idx = prev.findIndex((s) => s.symbol.toUpperCase() === sym);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                ...freshStock,
                fundamentals: freshStock.fundamentals || updated[idx].fundamentals,
                about: freshStock.about || updated[idx].about,
              };
              return updated;
            }
            return [
              {
                ...INITIAL_STOCKS[0],
                ...freshStock,
                fundamentals: freshStock.fundamentals || INITIAL_STOCKS[0].fundamentals,
                about: freshStock.about || `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
              },
              ...prev,
            ];
          });
          setCurrentTab('stock-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (!existing) {
        addToast('Server Unavailable', 'Unable to reach the market data server. Please try again in some time.', 'error');
      }
    } catch (e) {
      console.warn('Failed to fetch stock quote:', e);
      if (!existing) {
        addToast('Server Unavailable', 'Unable to reach the market data server. Please try again in some time.', 'error');
      }
    }
  };

  // Clear tick flash animations after 800ms or when market is closed (no artificial price generation)
  useEffect(() => {
    if (!marketStatus.isOpen) {
      setStocks((prev) =>
        prev.some((s) => s.tickDirection)
          ? prev.map((s) => (s.tickDirection ? { ...s, tickDirection: null } : s))
          : prev
      );
      return;
    }

    const flashClearTimer = setTimeout(() => {
      setStocks((prev) =>
        prev.some((s) => s.tickDirection && s.lastTickTime && Date.now() - s.lastTickTime > 800)
          ? prev.map((s) =>
              s.tickDirection && s.lastTickTime && Date.now() - s.lastTickTime > 800
                ? { ...s, tickDirection: null }
                : s
            )
          : prev
      );
    }, 850);

    return () => clearTimeout(flashClearTimer);
  }, [stocks, marketStatus.isOpen]);

  // Sync selectedStock with updated stock list
  useEffect(() => {
    const current = stocks.find((s) => s.symbol === selectedStock.symbol);
    if (current && (current.price !== selectedStock.price || current.tickDirection !== selectedStock.tickDirection || current.freshness !== selectedStock.freshness)) {
      setSelectedStockState(current);
    }
  }, [stocks, selectedStock.symbol, selectedStock.price, selectedStock.tickDirection, selectedStock.freshness]);

  // ---------------------------------------------------------------------------
  // REAL-MARKET ORDER ENGINE & SCHEDULED AMO QUEUE
  // ---------------------------------------------------------------------------
  const engineRef = useRef<OrderBookState>({
    balance,
    holdings,
    positions: intradayPositions,
    orders,
    executedOrderKeys,
  });
  useEffect(() => {
    engineRef.current = {
      balance,
      holdings,
      positions: intradayPositions,
      orders,
      executedOrderKeys,
    };
  }, [balance, holdings, intradayPositions, orders, executedOrderKeys]);

  const stocksRef = useRef(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  const commitEngine = useCallback(
    (
      next: Partial<{
        balance: number;
        holdings: Holding[];
        positions: IntradayPosition[];
        orders: Order[];
        executedOrderKeys: string[];
      }>
    ) => {
      engineRef.current = { ...engineRef.current, ...next };
      if (next.balance !== undefined) setBalance(next.balance);
      if (next.holdings) setHoldings(next.holdings);
      if (next.positions) setIntradayPositions(next.positions);
      if (next.orders) setOrders(next.orders);
      if (next.executedOrderKeys) setExecutedOrderKeys(next.executedOrderKeys);
    },
    []
  );

  // Sync paper trading book with backend so scheduled AMO orders execute even if browser is closed
  useEffect(() => {
    const accountId = user?.uid || 'guest_default';
    const syncTimer = setTimeout(() => {
      const currentBook = engineRef.current;
      fetch('/api/paper-trading/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          state: { ...currentBook, updatedAt: Date.now() },
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data.changed && data.state) {
            commitEngine({
              balance: data.state.balance,
              holdings: data.state.holdings,
              positions: data.state.positions,
              orders: data.state.orders,
              executedOrderKeys: data.state.executedOrderKeys || [],
            });
            if (Array.isArray(data.toasts)) {
              data.toasts.forEach((t: any) => addToast(t.title, t.description, t.type));
            }
          }
        })
        .catch(() => {});
    }, 600);

    return () => clearTimeout(syncTimer);
  }, [user?.uid, marketStatus.isOpen, commitEngine, addToast]);

  // Process SCHEDULED (AMO) and PENDING orders whenever real quotes or market status update
  useEffect(() => {
    const eng = engineRef.current;
    const hasActive = eng.orders.some((o) => o.status === 'SCHEDULED' || o.status === 'PENDING');
    if (!hasActive) return;

    const now = Date.now();
    const currentMarketStatus = getIndianMarketStatus(now);
    const quoteMap: Record<string, Stock> = {};
    for (const s of stocks) {
      const freshness = classifyQuoteFreshness(s, currentMarketStatus, now);
      quoteMap[s.symbol] = {
        ...s,
        freshness: freshness.freshness,
        freshnessLabel: freshness.label,
        isTradableQuote: freshness.isTradable,
      };
    }

    const result = processOrderQueue(eng, {
      quotes: quoteMap,
      now,
      marketStatus: currentMarketStatus,
    });

    if (result.changed) {
      commitEngine({
        balance: result.state.balance,
        holdings: result.state.holdings,
        positions: result.state.positions,
        orders: result.state.orders,
        executedOrderKeys: result.state.executedOrderKeys || [],
      });
      result.toasts.forEach((n) => addToast(n.title, n.description, n.type));
    }
  }, [stocks, marketStatus.isOpen, marketStatus.dateKey, commitEngine, addToast]);

  // Risk management (RMS): expire day orders at close and auto square-off
  // intraday positions at 3:20 PM IST with the ₹59 (₹50 + GST) penalty.
  useEffect(() => {
    const runRms = () => {
      const now = Date.now();
      const currentMarketStatus = getIndianMarketStatus(now);
      const eng = engineRef.current;

      const quoteMap: Record<string, Stock> = {};
      for (const s of stocksRef.current) {
        const freshness = classifyQuoteFreshness(s, currentMarketStatus, now);
        quoteMap[s.symbol] = {
          ...s,
          freshness: freshness.freshness,
          freshnessLabel: freshness.label,
          isTradableQuote: freshness.isTradable,
        };
      }

      const queueRes = processOrderQueue(eng, {
        quotes: quoteMap,
        now,
        marketStatus: currentMarketStatus,
      });

      let state: EngineState = {
        balance: queueRes.state.balance,
        holdings: queueRes.state.holdings,
        positions: queueRes.state.positions,
      };
      let nextOrders = queueRes.state.orders;
      let changed = queueRes.changed;
      const notices = [...queueRes.toasts];

      const today = getISTParts(now).dateKey;
      for (const pos of state.positions) {
        if (!isPastIntradayCutoff(pos.timestamp, now)) continue;
        const stock = stocksRef.current.find((s) => s.symbol === pos.symbol);
        const sameDay = getISTParts(pos.timestamp).dateKey === today;
        const price = stock
          ? !sameDay && currentMarketStatus.isOpen
            ? stock.previousClose || stock.price
            : stock.price
          : pos.entryPrice;
        const res = applyFill(state, {
          symbol: pos.symbol,
          stockName: pos.stockName,
          action: pos.action === 'BUY' ? 'SELL' : 'BUY',
          product: 'INTRADAY',
          orderType: 'MARKET',
          exchange: pos.exchange,
          quantity: pos.quantity,
          fillPrice: price,
          extraCharge: AUTO_SQUARE_OFF_CHARGE,
          note: 'Auto square-off by RMS at 3:20 PM · ₹59 charge applied',
        });
        if (res.ok) {
          state = res.state;
          nextOrders = [res.order, ...nextOrders];
          changed = true;
          notices.push({
            title: 'Intraday position auto squared-off',
            description: `${pos.symbol} closed @ ₹${price.toFixed(2)} at 3:20 PM. ₹59 auto square-off charge applied.`,
            type: 'info',
          });
        }
      }

      if (changed) {
        commitEngine({
          balance: state.balance,
          holdings: state.holdings,
          positions: state.positions,
          orders: nextOrders,
          executedOrderKeys: queueRes.state.executedOrderKeys || [],
        });
        notices.forEach((n) => addToast(n.title, n.description, n.type));
      }
    };

    const initial = setTimeout(runRms, 1500);
    const timer = setInterval(runRms, 10000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [marketStatus.isOpen, commitEngine, addToast]);

  // Place an order:
  // - Market Open -> Execute immediately using valid market-derived quotes or place in PENDING book
  // - Market Closed -> Save as SCHEDULED (AMO) for the next eligible NSE trading session
  const executeOrder = (
    params: ExecuteOrderParams,
    opts: { silent?: boolean } = {}
  ): { success: boolean; message: string; order?: Order } => {
    const { symbol, action, product, orderType, exchange, quantity } = params;
    const stock =
      stocks.find((s) => s.symbol === symbol) || (selectedStock.symbol === symbol ? selectedStock : undefined);
    if (!stock || !Number.isFinite(stock.price) || !(stock.price > 0)) {
      return { success: false, message: 'Stock quote not available' };
    }
    if (exchange !== stock.exchange) {
      return { success: false, message: 'A quote for this exchange is not available.' };
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return { success: false, message: 'Enter a valid quantity' };
    }

    // Subscription Tier Gating for Paper Trading Products & Order Types
    if ((product === 'INTRADAY' || product === 'MTF') && !planConfig.allowIntradayTrading) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: product === 'MTF' ? 'MTF 5.00x Delivery Leverage' : '5x Intraday (MIS) Leverage Trading',
        featureDescription:
          'Free accounts support Delivery (CNC) orders only. Upgrade to Beginner or Advanced to trade 5x Intraday (MIS) and MTF 5.00x setups.',
      });
      return {
        success: false,
        message: '5x Intraday (MIS) & MTF 5.00x trading are locked on the Free plan. Upgrade to Beginner or Advanced Package.',
      };
    }

    if (!planConfig.allowedOrderTypes.includes(orderType)) {
      const reqTier = orderType === 'LIMIT' ? 'beginner' : 'advanced';
      openUpgradeModal({
        requiredTier: reqTier,
        featureName: `${orderType} Orders`,
        featureDescription: `${orderType} orders are available on the ${
          reqTier === 'beginner' ? 'Beginner & Advanced' : 'Advanced'
        } Package. Free accounts support Market orders.`,
      });
      return {
        success: false,
        message: `${orderType} orders require the ${reqTier === 'beginner' ? 'Beginner' : 'Advanced'} Package.`,
      };
    }

    const now = Date.now();
    const currentMarketStatus = getIndianMarketStatus(now);
    const prevClose = stock.previousClose > 0 ? stock.previousClose : stock.price;
    const stockWithBounds: Stock = {
      ...stock,
      lowerCircuit:
        stock.lowerCircuit && stock.lowerCircuit > 0
          ? stock.lowerCircuit
          : round2(prevClose * 0.8),
      upperCircuit:
        stock.upperCircuit && stock.upperCircuit > 0
          ? stock.upperCircuit
          : round2(prevClose * 1.2),
      quoteTimestamp: stock.quoteTimestamp ?? now,
      fetchedAt: stock.fetchedAt ?? now,
    };

    const result = submitOrder(
      engineRef.current,
      {
        symbol,
        stockName: stock.name,
        action,
        product,
        orderType,
        exchange,
        quantity,
        limitPrice: params.limitPrice,
        triggerPrice: params.triggerPrice,
      },
      {
        stock: stockWithBounds,
        now,
        marketStatus: currentMarketStatus,
      }
    );

    commitEngine({
      balance: result.state.balance,
      holdings: result.state.holdings,
      positions: result.state.positions,
      orders: result.state.orders,
      executedOrderKeys: result.state.executedOrderKeys || [],
    });

    // Mirror state to backend so scheduled orders process even if browser is closed
    const accountId = user?.uid || 'guest_default';
    fetch('/api/paper-trading/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        state: { ...result.state, updatedAt: now },
      }),
    }).catch(() => {});

    if (result.toast) {
      addToast(result.toast.title, result.toast.description, result.toast.type);
    }

    if (
      result.success &&
      result.order &&
      !opts.silent &&
      (result.order.status === 'EXECUTED' || result.order.status === 'SCHEDULED')
    ) {
      setLastExecutedOrder(result.order);
    }

    return {
      success: result.success,
      message: result.message,
      order: result.order,
    };
  };

  // Exit Intraday Position (1-click exit at market during market hours)
  const exitPosition = (positionId: string) => {
    const pos = engineRef.current.positions.find((p) => p.id === positionId);
    if (!pos) return;
    const res = executeOrder(
      {
        symbol: pos.symbol,
        action: pos.action === 'BUY' ? 'SELL' : 'BUY',
        product: 'INTRADAY',
        orderType: 'MARKET',
        exchange: pos.exchange,
        quantity: pos.quantity,
      },
      { silent: true }
    );
    if (!res.success) addToast('Exit failed', res.message, 'error');
  };

  const squareOffPosition = exitPosition;

  // Cancel a SCHEDULED or PENDING order and release blocked funds / reserved shares
  const cancelLimitOrder = (orderId: string) => {
    const now = Date.now();
    const cancelled = cancelOrder(engineRef.current, orderId, now);
    if (!cancelled.cancelled) return;

    commitEngine({
      balance: cancelled.state.balance,
      orders: cancelled.state.orders,
    });

    const accountId = user?.uid || 'guest_default';
    fetch(`/api/paper-trading/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        state: { ...cancelled.state, updatedAt: now },
      }),
    }).catch(() => {});

    if (cancelled.toast) {
      addToast(cancelled.toast.title, cancelled.toast.description, cancelled.toast.type);
    }
  };

  // Sign Up User (Google or Email OTP) with Firebase Firestore persistence + Free Starter Subscription Mapping
  const signUpUser = (data: {
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
    initialCash: number;
  }) => {
    // New signups start on Free Starter plan (max ₹1,00,000 paper wallet until upgraded)
    const starterLimit = SUBSCRIPTION_PLANS.free.maxWalletLimit;
    const clampedCash = Math.min(starterLimit, Math.max(1000, data.initialCash || starterLimit));
    const effectiveUid = data.uid || `user_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const now = Date.now();
    const profile: UserProfile = {
      uid: effectiveUid,
      name: data.name,
      email: data.email,
      phone: data.phone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar,
      initialCash: clampedCash,
      createdAt: now,
      subscriptionTier: 'free',
      subscriptionBillingCycle: 'free',
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: null,
    };
    setUser(profile);
    setBalance(clampedCash);
    setInitialBalance(clampedCash);
    // Trim watchlists to Free limit (1 watchlist, max 10 symbols)
    setWatchlists((prev) => {
      const first = prev[0] || { id: 'default', name: 'My Watchlist', symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'] };
      return [{ ...first, symbols: first.symbols.slice(0, SUBSCRIPTION_PLANS.free.maxStocksPerWatchlist) }];
    });
    setActiveWatchlistId('default');
    setIsAuthModalOpen(false);
    setShowLandingPage(false);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    // Persist User + Subscription Mapping to Firebase Firestore
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      setDoc(
        userDocRef,
        {
          userId: effectiveUid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || '',
          avatar: profile.avatar || '',
          authProvider: profile.authProvider,
          balance: clampedCash,
          initialBalance: clampedCash,
          subscriptionTier: 'free',
          subscriptionBillingCycle: 'free',
          subscriptionStatus: 'active',
          subscriptionUpdatedAt: now,
          subscriptionExpiresAt: null,
          usage: normalizeUsageQuota(null),
          createdAt: profile.createdAt,
          updatedAt: now,
        },
        { merge: true }
      ).catch((err) => console.warn('Firestore user write error:', err));

      const subDocRef = doc(db, 'subscriptions', `sub_free_${effectiveUid}`);
      setDoc(
        subDocRef,
        {
          subscriptionId: `sub_free_${effectiveUid}`,
          userId: effectiveUid,
          userEmail: profile.email,
          userName: profile.name,
          tier: 'free',
          billingCycle: 'free',
          status: 'active',
          amountPaidINR: 0,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      ).catch(() => {});
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

    const initialTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Free Starter Account credit (${data.authProvider === 'google' ? 'Google' : 'Email OTP'} verified)`,
      timestamp: now,
    };
    setWalletTransactions([initialTx]);
    addToast(
      `Welcome, ${data.name}!`,
      `Free Starter Account activated with ₹${clampedCash.toLocaleString('en-IN')} virtual capital (1L Automatic Monthly Reset). Upgrade anytime for ₹10L–₹50L & Pro tools.`,
      'success'
    );
  };

  // Sign In Existing User with Firebase
  const signInUser = (data: {
    uid?: string;
    email: string;
    name?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
  }): boolean => {
    let existingProfile: UserProfile | null = null;
    try {
      const saved = localStorage.getItem('mypaper_user_v2') || localStorage.getItem('groww_paper_user_v1');
      if (saved) existingProfile = JSON.parse(saved);
    } catch {}

    const effectiveUid = data.uid || existingProfile?.uid || `user_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userName = data.name || existingProfile?.name || data.email.split('@')[0];
    const userPhone = existingProfile?.phone;
    const savedTier: SubscriptionTier = existingProfile?.subscriptionTier || 'free';
    const tierMaxCash = SUBSCRIPTION_PLANS[savedTier].maxWalletLimit;
    const userCash = Math.min(tierMaxCash, existingProfile?.initialCash || balance || tierMaxCash);

    const profile: UserProfile = {
      uid: effectiveUid,
      name: userName,
      email: data.email,
      phone: userPhone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar || existingProfile?.avatar,
      initialCash: userCash,
      createdAt: existingProfile?.createdAt || Date.now(),
      subscriptionTier: savedTier,
      subscriptionBillingCycle: existingProfile?.subscriptionBillingCycle || 'free',
      subscriptionStatus: existingProfile?.subscriptionStatus || 'active',
      subscriptionUpdatedAt: existingProfile?.subscriptionUpdatedAt || Date.now(),
      subscriptionExpiresAt: existingProfile?.subscriptionExpiresAt || null,
      razorpayPaymentId: existingProfile?.razorpayPaymentId,
      razorpayOrderId: existingProfile?.razorpayOrderId,
    };

    setUser(profile);
    if (balance > tierMaxCash) {
      setBalance(tierMaxCash);
    }
    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    // Fetch latest subscription mapping from Firestore if available, and update last login
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      getDoc(userDocRef)
        .then((snap) => {
          if (snap.exists()) {
            const remote = snap.data();
            const remoteTier = (remote.subscriptionTier as SubscriptionTier) || savedTier;
            const mergedProfile: UserProfile = {
              ...profile,
              subscriptionTier: remoteTier,
              subscriptionBillingCycle: (remote.subscriptionBillingCycle as BillingCycle) || profile.subscriptionBillingCycle,
              subscriptionStatus: remote.subscriptionStatus || 'active',
              subscriptionUpdatedAt: remote.subscriptionUpdatedAt || profile.subscriptionUpdatedAt,
              subscriptionExpiresAt: remote.subscriptionExpiresAt ?? profile.subscriptionExpiresAt,
              razorpayPaymentId: remote.razorpayPaymentId || profile.razorpayPaymentId,
              razorpayOrderId: remote.razorpayOrderId || profile.razorpayOrderId,
            };
            setUser(mergedProfile);
            localStorage.setItem('mypaper_user_v2', JSON.stringify(mergedProfile));
            if (typeof remote.balance === 'number') {
              setBalance(Math.min(SUBSCRIPTION_PLANS[remoteTier].maxWalletLimit, remote.balance));
            }
          } else {
            setDoc(
              userDocRef,
              {
                userId: effectiveUid,
                name: userName,
                email: data.email,
                authProvider: data.authProvider || 'email',
                avatar: profile.avatar || '',
                subscriptionTier: savedTier,
                subscriptionBillingCycle: profile.subscriptionBillingCycle || 'free',
                subscriptionStatus: 'active',
                balance: userCash,
                initialBalance: userCash,
                updatedAt: Date.now(),
              },
              { merge: true }
            ).catch(() => {});
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

    setIsAuthModalOpen(false);
    setShowLandingPage(false);
    addToast(
      `Welcome back, ${userName}!`,
      `Signed in (${SUBSCRIPTION_PLANS[savedTier].name}). Ready to trade.`,
      'success'
    );
    return true;
  };

  // Upgrade or Change Subscription Tier (Persists to Firebase Firestore `users` & `subscriptions` + LocalStorage)
  const upgradeSubscription = async ({
    tier,
    billingCycle = 'monthly',
    razorpayPaymentId,
    razorpayOrderId,
    amountPaid,
    subscriptionAutoPay,
    subscriptionUpiMandateId,
  }: {
    tier: SubscriptionTier;
    billingCycle?: BillingCycle;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    amountPaid?: number;
    subscriptionAutoPay?: boolean;
    subscriptionUpiMandateId?: string;
  }) => {
    const now = Date.now();
    const targetPlan = SUBSCRIPTION_PLANS[tier];
    const effectiveCycle: BillingCycle = tier === 'free' ? 'free' : billingCycle;
    const durationMs =
      effectiveCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : effectiveCycle === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 0;
    const expiresAt = tier === 'free' ? null : now + durationMs;
    const paymentId = razorpayPaymentId || (tier === 'free' ? undefined : `pay_demo_${now}`);
    const orderId = razorpayOrderId || (tier === 'free' ? undefined : `order_demo_${now}`);

    const currentUser = user || {
      uid: `user_demo_${now}`,
      name: 'NiftyLens Trader',
      email: 'demo@niftylens.in',
      authProvider: 'email' as const,
      initialCash: targetPlan.defaultStartingCash,
      createdAt: now,
    };

    const effectiveUid = currentUser.uid || `user_${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newBalance =
      tier === 'free'
        ? Math.min(targetPlan.maxWalletLimit, balance)
        : Math.max(balance, targetPlan.defaultStartingCash);

    const updatedProfile: UserProfile = {
      ...currentUser,
      uid: effectiveUid,
      initialCash: newBalance,
      subscriptionTier: tier,
      subscriptionBillingCycle: effectiveCycle,
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: now,
      subscriptionExpiresAt: expiresAt,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      subscriptionAutoPay: tier === 'free' ? false : (subscriptionAutoPay ?? true),
      subscriptionUpiMandateId: subscriptionUpiMandateId || undefined,
    };

    setUser(updatedProfile);
    commitEngine({ balance: newBalance });
    setInitialBalance(newBalance);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(updatedProfile));
      localStorage.setItem('groww_paper_user_v1', JSON.stringify(updatedProfile));
    } catch {}

    // Record wallet upgrade credit transaction if balance increased
    if (newBalance > balance) {
      const bonus = newBalance - balance;
      const upgradeTx: WalletTransaction = {
        id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: 'DEPOSIT',
        amount: bonus,
        description: `${targetPlan.name} upgrade wallet boost (+₹${bonus.toLocaleString('en-IN')})`,
        timestamp: now,
      };
      setWalletTransactions((prev) => [upgradeTx, ...prev]);
    }

    // Persist User + Subscription Mapping in Firebase Firestore
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      await setDoc(
        userDocRef,
        {
          userId: effectiveUid,
          name: updatedProfile.name,
          email: updatedProfile.email,
          authProvider: updatedProfile.authProvider,
          avatar: updatedProfile.avatar || '',
          balance: newBalance,
          initialBalance: newBalance,
          subscriptionTier: tier,
          subscriptionBillingCycle: effectiveCycle,
          subscriptionStatus: 'active',
          subscriptionUpdatedAt: now,
          subscriptionExpiresAt: expiresAt,
          razorpayPaymentId: paymentId || '',
          razorpayOrderId: orderId || '',
          updatedAt: now,
        },
        { merge: true }
      );

      const subId = paymentId || `sub_${tier}_${effectiveUid}_${now}`;
      const subPayload = {
        subscriptionId: subId,
        userId: effectiveUid,
        userEmail: updatedProfile.email,
        userName: updatedProfile.name,
        tier,
        planName: targetPlan.name,
        billingCycle: effectiveCycle,
        status: 'active',
        amountPaidINR:
          amountPaid ??
          (tier === 'free' ? 0 : effectiveCycle === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice),
        currency: 'INR',
        paymentGateway: 'Razorpay',
        razorpayPaymentId: paymentId || null,
        razorpayOrderId: orderId || null,
        maxWalletLimit: targetPlan.maxWalletLimit,
        activatedAt: now,
        expiresAt,
      };

      await setDoc(doc(db, 'subscriptions', subId), subPayload, { merge: true });
      await setDoc(doc(db, 'users', effectiveUid, 'subscriptions', subId), subPayload, { merge: true });
    } catch (e) {
      console.warn('Firestore subscription sync notice:', e);
    }

    addToast(
      `${targetPlan.name} Activated!`,
      tier === 'free'
        ? `Switched to Free Starter Plan (₹1,00,000 wallet limit with 1L automatic monthly reset).`
        : `Payment verified! Unlocked ${targetPlan.name} features & ₹${targetPlan.maxWalletLimit.toLocaleString('en-IN')} virtual capital capacity.`,
      'success'
    );
  };

  // Credit +₹1,00,000 Top-Up for Free Tier Users (₹50 paid top-up)
  const creditFreeWalletTopUp = async (paymentId?: string, orderId?: string) => {
    const now = Date.now();
    const topUpAmount = 100000; // ₹1,00,000 (1L)
    const currentCash = engineRef.current.balance;
    const newBalance = round2(currentCash + topUpAmount);
    commitEngine({ balance: newBalance });
    setInitialBalance((prev) => Math.max(prev, newBalance));

    const topUpTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: topUpAmount,
      description: `+₹1,00,000 Wallet Top-Up (₹50 Paid · Ref ${paymentId || 'TOPUP'})`,
      timestamp: now,
    };
    setWalletTransactions((prev) => [topUpTx, ...prev]);

    if (user?.uid) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            balance: newBalance,
            initialBalance: Math.max(initialBalance, newBalance),
            lastTopUpPaymentId: paymentId || '',
            lastTopUpOrderId: orderId || '',
            updatedAt: now,
          },
          { merge: true }
        );
      } catch {}
    }

    addToast(
      '+₹1,00,000 Top-Up Credited!',
      `₹1,00,000 has been added to your paper wallet. New available cash: ₹${newBalance.toLocaleString('en-IN')}.`,
      'success'
    );
  };

  // Automatic Monthly Reset (1L for Free, 10L for Beginner, 50L for Advanced)
  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    if (usageQuota.lastAutoResetMonth && usageQuota.lastAutoResetMonth !== currentMonth) {
      const targetResetAmount = planConfig.defaultStartingCash; // 1L Free, 10L Beginner, 50L Advanced
      commitEngine({ balance: targetResetAmount });
      setInitialBalance(targetResetAmount);

      const nextQuota: UserUsageQuota = {
        ...normalizeUsageQuota(usageQuota),
        lastAutoResetMonth: currentMonth,
        lastPortfolioResetMonth: currentMonth,
        portfolioResetsThisMonth: 0,
      };
      setUsageQuota(nextQuota);

      const autoTx: WalletTransaction = {
        id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: 'DEPOSIT',
        amount: targetResetAmount,
        description: `Automatic Monthly Reset (${planConfig.name} · ₹${targetResetAmount.toLocaleString('en-IN')})`,
        timestamp: Date.now(),
      };
      setWalletTransactions((prev) => [autoTx, ...prev]);

      if (user?.uid) {
        setDoc(
          doc(db, 'users', user.uid),
          {
            balance: targetResetAmount,
            initialBalance: targetResetAmount,
            usage: nextQuota,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, [usageQuota, planConfig.defaultStartingCash, planConfig.name, commitEngine, user?.uid]);

  // Daily Usage Quota Helpers for AI Stock Analysis & Guess the Chart Quiz
  const consumeAnalysisSearch = useCallback(
    (_symbol?: string): boolean => {
      const normalized = normalizeUsageQuota(usageQuota);
      const limit = planConfig.analysisDailyLimit;
      if (normalized.analysisSearchesCount >= limit) {
        openUpgradeModal({
          requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
          featureName: 'Daily AI Stock Analysis Limit Reached',
          featureDescription: `You have used all ${limit} AI Stock Analysis searches included in your ${planConfig.name} today. Upgrade to unlock ${
            subscriptionTier === 'free' ? '15 searches/day (Beginner) or Unlimited searches (Advanced)' : 'Unlimited daily searches & 2-Year Strategy Backtests'
          }.`,
        });
        return false;
      }
      const next: UserUsageQuota = {
        ...normalized,
        analysisSearchesCount: normalized.analysisSearchesCount + 1,
      };
      setUsageQuota(next);
      if (user?.uid) {
        setDoc(doc(db, 'users', user.uid), { usage: next, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      }
      return true;
    },
    [usageQuota, planConfig, subscriptionTier, openUpgradeModal, user?.uid]
  );

  const consumeQuizQuestion = useCallback((): boolean => {
    const normalized = normalizeUsageQuota(usageQuota);
    const limit = planConfig.quizDailyLimit;
    if (normalized.quizQuestionsCount >= limit) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Daily Quiz Limit Reached (5 Questions / Day)',
        featureDescription:
          'Free Starter accounts include 5 Guess the Chart questions per day in Practice mode. Upgrade to Beginner or Advanced for unlimited daily quiz rounds, 3-Life Survival, and the 10-Round Cash Challenge!',
      });
      return false;
    }
    const next: UserUsageQuota = {
      ...normalized,
      quizQuestionsCount: normalized.quizQuestionsCount + 1,
    };
    setUsageQuota(next);
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { usage: next, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
    return true;
  }, [usageQuota, planConfig, openUpgradeModal, user?.uid]);

  // Sign out user (Firebase & local)
  const logOutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem('mypaper_user_v2');
      localStorage.removeItem('groww_paper_user_v1');
    } catch {}
    try {
      firebaseSignOut(auth).catch(() => {});
    } catch {}
    setShowLandingPage(true);
    addToast('Signed Out', 'You have signed out of your account.', 'info');
  };

  // Add Money to Wallet:
  // - Free tier: Paid top-up of +₹1,00,000 for ₹50 (no free manual add-money)
  // - Beginner (10L) & Advanced (50L): Unlimited free top-ups ONLY until the specified tier amount (10L or 50L)
  const addMoneyToWallet = (amount: number, description = 'Funds added via Add Money'): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount greater than zero.', 'error');
      return false;
    }

    if (subscriptionTier === 'free') {
      openRazorpayCheckout('topup_1l', 'monthly');
      return false;
    }

    const planMax = planConfig.maxWalletLimit; // ₹10,00,000 for Beginner, ₹50,00,000 for Advanced
    const cash = engineRef.current.balance;
    const mtfMargin = engineRef.current.holdings.reduce((s, h) => s + (h.mtfMarginBlocked || 0), 0);
    const posMargin = engineRef.current.positions.reduce((s, p) => s + (p.marginBlocked || 0), 0);
    const orderReserved = engineRef.current.orders.reduce(
      (s, o) => s + ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount ? o.blockedAmount : 0),
      0
    );
    const committedCapital = round2(cash + mtfMargin + posMargin + orderReserved);
    const allowedAdd = Math.max(0, round2(planMax - committedCapital));

    if (allowedAdd <= 0) {
      if (subscriptionTier === 'beginner') {
        openUpgradeModal({
          requiredTier: 'advanced',
          featureName: 'Expand Virtual Capital to ₹50,00,000 (50L)',
          featureDescription:
            'Your Beginner Package allows unlimited free top-ups up to ₹10,00,000 (10L) across available cash and locked margin. Upgrade to Advanced to unlock ₹50,00,000 (50L) virtual capital.',
        });
      } else {
        addToast(
          'Maximum 50L Capital Reached',
          'Your paper wallet (available cash + locked margin) is already at the ₹50,00,000 limit for the Advanced Package.',
          'error'
        );
      }
      return false;
    }

    if (amount > allowedAdd) {
      addToast(
        'Plan Capital Limit Exceeded',
        `Including ₹${round2(mtfMargin + posMargin + orderReserved).toLocaleString('en-IN')} in locked margin, you can top up at most ₹${allowedAdd.toLocaleString('en-IN')} to stay within your ₹${planMax.toLocaleString('en-IN')} limit.`,
        'error'
      );
      return false;
    }

    const newBalance = Number((cash + amount).toFixed(2));
    commitEngine({ balance: newBalance });
    const tx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount,
      description,
      timestamp: Date.now(),
    };
    setWalletTransactions((prev) => [tx, ...prev]);
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { balance: newBalance, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
    addToast(
      'Money Added!',
      `₹${amount.toLocaleString('en-IN')} added to your paper wallet. New balance: ₹${newBalance.toLocaleString('en-IN')}.`,
      'success'
    );
    return true;
  };

  // Set Paper Balance
  const setPaperBalance = (amount: number) => {
    if (!Number.isFinite(amount)) return;
    const planMax = planConfig.maxWalletLimit;
    if (amount > planMax && subscriptionTier !== 'advanced') {
      openUpgradeModal({
        requiredTier: amount <= 1000000 ? 'beginner' : 'advanced',
        featureName: `Virtual Capital Up to ₹${amount.toLocaleString('en-IN')}`,
        featureDescription: `Your ${planConfig.name} supports up to ₹${planMax.toLocaleString('en-IN')}. Upgrade to unlock higher virtual capital.`,
      });
      return;
    }
    const clampedAmount = Math.min(planMax, Math.max(0, amount));
    commitEngine({ balance: clampedAmount });
    setInitialBalance(clampedAmount);
    const tx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedAmount,
      description: 'Direct balance adjustment',
      timestamp: Date.now(),
    };
    setWalletTransactions((prev) => [tx, ...prev]);
    addToast('Paper Cash Updated', `Paper trading balance set to ₹${clampedAmount.toLocaleString('en-IN')}`, 'success');
  };

  // Reset Portfolio:
  // - Free tier: NO manual reset option (only automatic monthly reset of 1L + ₹50 for +1L top-up)
  // - Beginner & Advanced: Unlimited manual resets up to their specified tier cap (10L for Beginner, 50L for Advanced)
  const resetPortfolio = (startingCash = planConfig.defaultStartingCash) => {
    if (!Number.isFinite(startingCash)) return;

    if (subscriptionTier === 'free' || !planConfig.allowUnlimitedWalletResets) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Unlimited Manual Portfolio Resets',
        featureDescription:
          'Free accounts include an automatic monthly reset of ₹1,00,000 and ₹50 for +₹1,00,000 top-ups, with no manual portfolio reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for unlimited manual portfolio resets.',
      });
      return;
    }

    const planMax = planConfig.maxWalletLimit;

    if (startingCash > planMax && subscriptionTier !== 'advanced') {
      openUpgradeModal({
        requiredTier: 'advanced',
        featureName: `Reset Portfolio with ₹${startingCash.toLocaleString('en-IN')}`,
        featureDescription: `${planConfig.name} supports up to ₹${planMax.toLocaleString('en-IN')} virtual capital. Upgrade to Advanced (₹50L) for larger portfolio resets.`,
      });
      return;
    }

    const clampedCash = Math.min(planMax, Math.max(1000, startingCash));
    commitEngine({ balance: clampedCash, holdings: [], positions: [], orders: [] });
    setInitialBalance(clampedCash);
    setIsWalletModalOpen(false);
    const normalized = normalizeUsageQuota(usageQuota);
    const nextQuota: UserUsageQuota = {
      ...normalized,
      lastPortfolioResetMonth: getCurrentMonthKey(),
      portfolioResetsThisMonth: normalized.portfolioResetsThisMonth + 1,
    };
    setUsageQuota(nextQuota);
    if (user?.uid) {
      setDoc(
        doc(db, 'users', user.uid),
        { balance: clampedCash, initialBalance: clampedCash, usage: nextQuota, updatedAt: Date.now() },
        { merge: true }
      ).catch(() => {});
    }
    const resetTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Portfolio reset credit (${planConfig.name})`,
      timestamp: Date.now(),
    };
    setWalletTransactions([resetTx]);
    addToast('Portfolio Reset', `Reset paper portfolio with fresh ₹${clampedCash.toLocaleString('en-IN')} cash`, 'info');
  };

  // Watchlist helpers (Enforces plan's maxWatchlists & maxStocksPerWatchlist)
  const toggleWatchlistStock = (watchlistId: string, symbol: string) => {
    const targetWl = watchlists.find((w) => w.id === watchlistId);
    if (targetWl && !targetWl.symbols.includes(symbol) && targetWl.symbols.length >= planConfig.maxStocksPerWatchlist) {
      openUpgradeModal({
        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
        featureName: `Watchlist Capacity (${planConfig.maxStocksPerWatchlist} Stocks Max on ${planConfig.name})`,
        featureDescription: `Your ${planConfig.name} allows up to ${planConfig.maxStocksPerWatchlist} stocks per watchlist. Upgrade to track more stocks across custom watchlists.`,
      });
      return;
    }
    setWatchlists((prev) =>
      prev.map((wl) => {
        if (wl.id === watchlistId) {
          const exists = wl.symbols.includes(symbol);
          return {
            ...wl,
            symbols: exists ? wl.symbols.filter((s) => s !== symbol) : [...wl.symbols, symbol],
          };
        }
        return wl;
      })
    );
  };

  const createWatchlist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (watchlists.length >= planConfig.maxWatchlists) {
      openUpgradeModal({
        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
        featureName: 'Multiple Custom Watchlists',
        featureDescription: `Your ${planConfig.name} includes ${planConfig.maxWatchlists} watchlist${
          planConfig.maxWatchlists > 1 ? 's' : ''
        }. Upgrade to Beginner (up to 3 watchlists) or Advanced (Unlimited watchlists).`,
      });
      return;
    }
    const newId = 'wl-' + Math.random().toString(36).substring(2, 7);
    setWatchlists((prev) => [...prev, { id: newId, name: trimmed, symbols: [] }]);
    setActiveWatchlistId(newId);
    addToast('Watchlist Created', `Created watchlist "${trimmed}"`, 'success');
  };

  const isStockInWatchlist = (symbol: string, watchlistId?: string) => {
    const targetWl = watchlists.find((wl) => wl.id === (watchlistId || activeWatchlistId));
    return targetWl ? targetWl.symbols.includes(symbol) : false;
  };

  // Order Modal Helpers
  const openOrderModal = (
    stock: Stock,
    action: OrderAction = 'BUY',
    product: OrderProduct = 'DELIVERY',
    quantity: number = 1
  ) => {
    setOrderModalState({
      isOpen: true,
      stock,
      defaultAction: action,
      defaultProduct: product,
      defaultQuantity: quantity,
    });
  };

  const closeOrderModal = () => {
    setOrderModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Portfolio Summary Calculation (Real-time!)
  const portfolioSummary = useMemo<PortfolioSummary>(() => {
    let currentHoldingsValue = 0;
    let totalInvested = 0;
    let dayHoldingsPnL = 0;

    // Delivery Holdings
    holdings.forEach((h) => {
      const stock = stocks.find((s) => s.symbol === h.symbol);
      const ltp = stock ? stock.price : h.averagePrice;
      const prevClose = stock ? stock.previousClose : h.averagePrice;

      const curVal = ltp * h.quantity;
      currentHoldingsValue += curVal;
      totalInvested += h.totalInvested;

      // 1D return on this holding
      const dayChg = (ltp - prevClose) * h.quantity;
      dayHoldingsPnL += dayChg;
    });

    // Intraday Positions unrealized P&L & locked margin (incl. MTF 5x delivery margin & open order reservations)
    let intradayPnL = 0;
    let lockedMargin = 0;

    holdings.forEach((h) => {
      if (h.mtfMarginBlocked && h.mtfMarginBlocked > 0) {
        lockedMargin += h.mtfMarginBlocked;
      }
    });

    intradayPositions.forEach((pos) => {
      const stock = stocks.find((s) => s.symbol === pos.symbol);
      const ltp = stock ? stock.price : pos.entryPrice;
      lockedMargin += pos.marginBlocked;

      const posPnL = pos.action === 'BUY'
        ? (ltp - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - ltp) * pos.quantity;

      intradayPnL += posPnL;
    });

    orders.forEach((o) => {
      if ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount) {
        lockedMargin += o.blockedAmount;
      }
    });

    const totalPnL = (currentHoldingsValue - totalInvested) + intradayPnL;
    const capital = totalInvested + intradayPositions.reduce((sum, p) => sum + p.marginBlocked, 0);
    const totalPnLPercent = capital > 0 ? (totalPnL / capital) * 100 : 0;
    const dayPnL = dayHoldingsPnL + intradayPnL;
    const dayPnLPercent = totalInvested > 0 ? (dayPnL / (totalInvested + lockedMargin)) * 100 : 0;

    return {
      currentValue: Number(currentHoldingsValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent: Number(totalPnLPercent.toFixed(2)),
      dayPnL: Number(dayPnL.toFixed(2)),
      dayPnLPercent: Number(dayPnLPercent.toFixed(2)),
      availableCash: Number(balance.toFixed(2)),
      lockedMargin: Number(lockedMargin.toFixed(2)),
    };
  }, [holdings, intradayPositions, stocks, balance, orders]);

  return (
    <TradingContext.Provider
      value={{
        stocks,
        indices,
        marketStatus,
        selectedStock,
        setSelectedStock,
        selectStockBySymbol,
        currentTab,
        setCurrentTab,
        showLandingPage,
        setShowLandingPage,
        user,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        closeAuthModal,
        signUpUser,
        signInUser,
        logOutUser,
        balance,
        initialBalance,
        addMoneyToWallet,
        walletTransactions,
        setPaperBalance,
        resetPortfolio,
        isWalletModalOpen,
        setIsWalletModalOpen,
        executeOrder,
        cancelLimitOrder,
        exitPosition,
        squareOffPosition,
        holdings,
        intradayPositions,
        orders,
        portfolioSummary,
        watchlists,
        activeWatchlistId,
        setActiveWatchlistId,
        toggleWatchlistStock,
        createWatchlist,
        isStockInWatchlist,
        orderModalState,
        openOrderModal,
        closeOrderModal,
        lastExecutedOrder,
        setLastExecutedOrder,
        subscriptionTier,
        planConfig,
        usageQuota,
        upgradeSubscription,
        creditFreeWalletTopUp,
        upgradeModalState,
        openUpgradeModal,
        closeUpgradeModal,
        razorpayModalState,
        openRazorpayCheckout,
        closeRazorpayCheckout,
        consumeAnalysisSearch,
        consumeQuizQuestion,
        toasts,
        addToast,
        removeToast,
        isDarkMode,
        toggleTheme,
        isLiveConnected,
        lastLiveUpdate,
        isRefreshingLive,
        marketDataFreshness,
        refreshLiveMarketData,
        fetchRealChart,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
