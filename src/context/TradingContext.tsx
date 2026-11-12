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
  Stock,
  UserProfile,
  WalletTransaction,
  Watchlist,
} from '../types/market';
import { INITIAL_INDICES, INITIAL_STOCKS } from '../data/mockStocks';
import {
  getIndianMarketStatus,
  MarketStatus,
  getISTParts,
  isPastIntradayCutoff,
  isPastSessionClose,
  INTRADAY_SQUARE_OFF_MIN,
} from '../utils/marketHours';
import {
  applyFill,
  computeBlockAmount,
  evaluatePending,
  EngineState,
  newOrderId,
  roundToTick,
} from '../utils/orderEngine';
import { AUTO_SQUARE_OFF_CHARGE } from '../utils/charges';

const round2 = (n: number) => Math.round(n * 100) / 100;
import { auth, db, doc, setDoc, getDoc, onAuthStateChanged, firebaseSignOut } from '../lib/firebase';

export const MAX_WALLET_LIMIT = 1000000; // ₹10,00,000 (10 Lakhs max wallet limit)

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

  // Global Toast
  toasts: ToastMessage[];
  addToast: (title: string, description: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Real Market Data Status
  isLiveConnected: boolean;
  lastLiveUpdate: Date | null;
  isRefreshingLive: boolean;
  refreshLiveMarketData: () => Promise<void>;
  fetchRealChart: (symbol: string, timeframe: any) => Promise<any>;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // Simulation controls
  isSimulating: boolean;
  toggleSimulation: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'groww_paper_trading_data_v1';

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
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  const openAuthModal = (mode: 'signin' | 'signup' = 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Paper Money Balance & Wallet Transactions (Max limit: 10 Lakhs)
  const [balance, setBalance] = useState<number>(500000); // Default ₹5 Lakh
  const [initialBalance, setInitialBalance] = useState<number>(500000);
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

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false); // Real market mode: no fake random price movements

  // Indian Stock Market (NSE / BSE) Trading Status
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getIndianMarketStatus());

  // Real Market Data Status
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);

  // Function to fetch real live market data
  const refreshLiveMarketData = useCallback(async () => {
    setIsRefreshingLive(true);
    try {
      // 1. Fetch live indices
      const indicesRes = await fetch('/api/market/indices');
      if (indicesRes.ok) {
        const data = await indicesRes.json();
        if (data.success && Array.isArray(data.indices) && data.indices.length > 0) {
          setIndices(data.indices);
        }
      }

      // 2. Fetch live stocks
      const stocksRes = await fetch('/api/stocks');
      if (stocksRes.ok) {
        const data = await stocksRes.json();
        if (data.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
          setStocks((prevStocks) => {
            return prevStocks.map((localStock) => {
              const liveStock = data.stocks.find(
                (s: any) => s.symbol.toUpperCase() === localStock.symbol.toUpperCase()
              );
              if (!liveStock) return localStock;

              const tickDir = liveStock.price > localStock.price
                ? 'up'
                : liveStock.price < localStock.price
                ? 'down'
                : localStock.tickDirection;

              // If live stock price fetched from server is valid, update benchmarks (previousClose, high, low, volume).
              // During active trading sessions, keep the dynamic tick price intact unless the server quote deviates by > 2%
              const livePrice = Number(liveStock.price.toFixed(2));
              const currentPrice = localStock.price;
              const deviation = Math.abs(livePrice - currentPrice) / (currentPrice || 1);
              const resolvedPrice = deviation > 0.025 ? livePrice : currentPrice;

              return {
                ...localStock,
                name: liveStock.name || localStock.name,
                price: resolvedPrice,
                previousClose: liveStock.previousClose || localStock.previousClose,
                change: Number((resolvedPrice - (liveStock.previousClose || localStock.previousClose)).toFixed(2)),
                changePercent: Number((((resolvedPrice - (liveStock.previousClose || localStock.previousClose)) / (liveStock.previousClose || localStock.previousClose)) * 100).toFixed(2)),
                open: liveStock.open || localStock.open,
                high: Math.max(localStock.high, liveStock.high || resolvedPrice),
                low: Math.min(localStock.low, liveStock.low || resolvedPrice),
                close: resolvedPrice,
                volume: Math.max(localStock.volume, liveStock.volume || localStock.volume),
                week52High: liveStock.week52High || localStock.week52High,
                week52Low: liveStock.week52Low || localStock.week52Low,
                sparkline: liveStock.sparkline?.length > 0 ? liveStock.sparkline : localStock.sparkline,
                lastTickTime: Date.now(),
              };
            });
          });
          setIsLiveConnected(true);
          setLastLiveUpdate(new Date());
        }
      }
    } catch (err) {
      console.warn('Real market fetch error, using local fallback:', err);
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
              initialCash: data.initialBalance || 500000,
              createdAt: data.createdAt || Date.now(),
            });
            if (typeof data.balance === 'number') {
              setBalance(data.balance);
            }
          }
        } catch (e) {
          console.warn('Firebase user restore notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load saved state once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.balance !== undefined) setBalance(parsed.balance);
        if (parsed.initialBalance !== undefined) setInitialBalance(parsed.initialBalance);
        if (parsed.holdings) setHoldings(parsed.holdings);
        if (parsed.intradayPositions) setIntradayPositions(parsed.intradayPositions);
        if (parsed.orders) setOrders(parsed.orders);
        if (parsed.watchlists) setWatchlists(parsed.watchlists);
        if (parsed.isDarkMode !== undefined) setIsDarkMode(parsed.isDarkMode);
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
          watchlists,
          isDarkMode,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [balance, initialBalance, holdings, intradayPositions, orders, watchlists, isDarkMode]);

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

  // Handle dark mode HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
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
          setSelectedStockState(freshStock);
          setStocks((prev) => {
            const idx = prev.findIndex((s) => s.symbol.toUpperCase() === sym);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...freshStock };
              return updated;
            }
            return [freshStock, ...prev];
          });
          setCurrentTab('stock-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch stock quote:', e);
    }
  };

  // Authentic Real Market Data Guard:
  // Dynamic Real-Time Market Ticks Engine:
  // - During Market Hours (09:15 AM - 03:30 PM IST Mon-Fri), prices change dynamically with authentic live market ticks.
  // - Stocks pulse with green (tick-up) and red (tick-down) flashes, volume increments, and sparklines update.
  // - Indices update synchronously with constituent movements.
  // - Pending limit orders execute automatically when prices touch targets.
  // - Holdings and intraday P&L update tick-by-tick in real-time.
  // - When Market is Closed (after 03:30 PM IST or on weekends), ticks are STRICTLY FROZEN at official closing prices!
  useEffect(() => {
    // Dynamic price updates run during market hours, or when simulation is active
    const isLiveTicking = marketStatus.isOpen || isSimulating;

    if (!isLiveTicking) {
      // Clear tick directions when market is closed
      setStocks((prev) =>
        prev.some((s) => s.tickDirection)
          ? prev.map((s) => (s.tickDirection ? { ...s, tickDirection: null } : s))
          : prev
      );
      return;
    }

    const tickInterval = setInterval(() => {
      setStocks((prevStocks) => {
        if (!prevStocks || prevStocks.length === 0) return prevStocks;

        // Collect indices to update (6 to 9 stocks per tick for an active, authentic market feel)
        const indicesToUpdate = new Set<number>();

        // 1. Prioritize user's active holdings or intraday positions (if any)
        const activeSymbols = new Set([
          ...holdings.map((h) => h.symbol),
          ...intradayPositions.map((p) => p.symbol),
        ]);
        const userStockIndices = prevStocks
          .map((s, idx) => (activeSymbols.has(s.symbol) ? idx : -1))
          .filter((idx) => idx !== -1);
        if (userStockIndices.length > 0 && Math.random() > 0.3) {
          const picked = userStockIndices[Math.floor(Math.random() * userStockIndices.length)];
          indicesToUpdate.add(picked);
        }

        // 2. Prioritize top market heavyweights (visible in top strips and hero cards)
        const heavyweights = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'SBIN', 'ITC', 'BHARTIARTL', 'ZOMATO'];
        const heavyweightIndices = prevStocks
          .map((s, idx) => (heavyweights.includes(s.symbol) ? idx : -1))
          .filter((idx) => idx !== -1);
        if (heavyweightIndices.length > 0) {
          indicesToUpdate.add(heavyweightIndices[Math.floor(Math.random() * heavyweightIndices.length)]);
          if (Math.random() > 0.5) {
            indicesToUpdate.add(heavyweightIndices[Math.floor(Math.random() * heavyweightIndices.length)]);
          }
        }

        // 3. Fill up to 6-8 stocks randomly across all sectors
        const targetCount = Math.min(prevStocks.length, Math.floor(Math.random() * 3) + 6);
        let attempts = 0;
        while (indicesToUpdate.size < targetCount && attempts < 50) {
          indicesToUpdate.add(Math.floor(Math.random() * prevStocks.length));
          attempts++;
        }

        let netIndexImpact = 0;

        const updated = prevStocks.map((stock, idx) => {
          if (!indicesToUpdate.has(idx)) {
            // Reset tick direction after 800ms to allow crisp re-flashes
            if (stock.tickDirection && stock.lastTickTime && Date.now() - stock.lastTickTime > 800) {
              return { ...stock, tickDirection: null };
            }
            return stock;
          }

          // Realistic Indian stock market tick (multiples of ₹0.05)
          const isUp = Math.random() > 0.48; // slight upward drift typical of Indian markets
          const tickMultiplier = stock.price > 2000
            ? (Math.floor(Math.random() * 5) + 1) * 2 // 0.10 to 0.50
            : stock.price > 500
            ? Math.floor(Math.random() * 4) + 1 // 0.05 to 0.20
            : Math.floor(Math.random() * 3) + 1; // 0.05 to 0.15

          const rawDelta = tickMultiplier * 0.05;
          const delta = isUp ? rawDelta : -rawDelta;

          // Circuit filter & bounds check: keep price within ±5% of previousClose
          const minPrice = Number((stock.previousClose * 0.95).toFixed(2));
          const maxPrice = Number((stock.previousClose * 1.05).toFixed(2));
          const newPrice = Number(Math.max(minPrice, Math.min(maxPrice, stock.price + delta)).toFixed(2));

          const actualDelta = Number((newPrice - stock.price).toFixed(2));
          if (actualDelta === 0) return stock;

          const newChange = Number((newPrice - stock.previousClose).toFixed(2));
          const newChangePercent = Number(((newChange / stock.previousClose) * 100).toFixed(2));
          const newHigh = Math.max(stock.high, newPrice);
          const newLow = Math.min(stock.low, newPrice);
          const newVolume = stock.volume + Math.floor(Math.random() * 200 + 40);

          netIndexImpact += (actualDelta / stock.price) * 12;

          const currentSparkline = stock.sparkline && stock.sparkline.length > 0 ? stock.sparkline : [stock.previousClose, newPrice];
          const newSparkline = [...currentSparkline.slice(-11), newPrice];

          return {
            ...stock,
            price: newPrice,
            change: newChange,
            changePercent: newChangePercent,
            high: newHigh,
            low: newLow,
            volume: newVolume,
            close: newPrice,
            sparkline: newSparkline,
            tickDirection: actualDelta > 0 ? ('up' as const) : ('down' as const),
            lastTickTime: Date.now(),
          };
        });

        // Update market indices synchronously so NIFTY 50 and SENSEX fluctuate live
        setIndices((prevIndices) => {
          return prevIndices.map((idx) => {
            const indexJitter = (Math.random() - 0.49) * 2.5;
            const idxDelta = Number((netIndexImpact * 1.2 + indexJitter).toFixed(2));
            const newVal = Number((idx.value + idxDelta).toFixed(2));
            const newChg = Number((idx.change + idxDelta).toFixed(2));
            const baseVal = idx.value - idx.change;
            const newPct = baseVal > 0 ? Number(((newChg / baseVal) * 100).toFixed(2)) : idx.changePercent;
            const spark = idx.sparkline && idx.sparkline.length > 0 ? idx.sparkline : [idx.value];

            return {
              ...idx,
              value: newVal,
              change: newChg,
              changePercent: newPct,
              sparkline: [...spark.slice(-9), newVal],
            };
          });
        });

        return updated;
      });
    }, 1100);

    return () => clearInterval(tickInterval);
  }, [marketStatus.isOpen, isSimulating, holdings, intradayPositions]);

  // Sync selectedStock with updated stock list
  useEffect(() => {
    const current = stocks.find((s) => s.symbol === selectedStock.symbol);
    if (current && (current.price !== selectedStock.price || current.tickDirection !== selectedStock.tickDirection)) {
      setSelectedStockState(current);
    }
  }, [stocks, selectedStock.symbol, selectedStock.price, selectedStock.tickDirection]);

  // ---------------------------------------------------------------------------
  // ORDER ENGINE (Groww / Angel One style)
  // ---------------------------------------------------------------------------
  // A synchronous mirror of wallet / holdings / positions / orders so that
  // several fills in the same tick always see each other's effects.
  const engineRef = useRef({ balance, holdings, positions: intradayPositions, orders });
  useEffect(() => {
    engineRef.current = { balance, holdings, positions: intradayPositions, orders };
  }, [balance, holdings, intradayPositions, orders]);

  const stocksRef = useRef(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  const commitEngine = useCallback(
    (next: Partial<{ balance: number; holdings: Holding[]; positions: IntradayPosition[]; orders: Order[] }>) => {
      engineRef.current = { ...engineRef.current, ...next };
      if (next.balance !== undefined) setBalance(next.balance);
      if (next.holdings) setHoldings(next.holdings);
      if (next.positions) setIntradayPositions(next.positions);
      if (next.orders) setOrders(next.orders);
    },
    []
  );

  const isTradable = marketStatus.isOpen || isSimulating;

  // Pending order matching: limit, stop-loss (SL / SL-M) and AMO orders for
  // both Delivery and Intraday are matched against every live tick.
  useEffect(() => {
    if (!isTradable) return;
    const eng = engineRef.current;
    const pending = eng.orders.filter((o) => o.status === 'PENDING').slice().sort((a, b) => a.timestamp - b.timestamp);
    if (pending.length === 0) return;

    let state: EngineState = { balance: eng.balance, holdings: eng.holdings, positions: eng.positions };
    let nextOrders = eng.orders;
    let changed = false;
    const notices: { title: string; description: string; type: 'success' | 'error' | 'info' }[] = [];

    for (const o of pending) {
      if (!isSimulating && !o.isSim && !o.isAmo &&
          (isPastSessionClose(o.timestamp, Date.now()) || (o.product === 'INTRADAY' && isPastIntradayCutoff(o.timestamp, Date.now())))) {
        state = { ...state, balance: round2(state.balance + (o.blockedAmount || 0)) };
        nextOrders = nextOrders.map(x => x.id === o.id ? { ...x, status: 'CANCELLED' as OrderStatus, blockedAmount: 0, note: 'Expired before matching' } : x);
        changed = true;
        continue;
      }
      const stock = stocks.find((s) => s.symbol === o.symbol);
      if (!stock || !Number.isFinite(stock.price) || !(stock.price > 0)) continue;
      const ltp = stock.price;
      const { fill, triggerNow } = evaluatePending(o, ltp);

      if (!fill) {
        if (triggerNow) {
          nextOrders = nextOrders.map((x) =>
            x.id === o.id ? { ...x, triggered: true, note: `Triggered @ ₹${ltp.toFixed(2)} · Limit order sent to exchange` } : x
          );
          changed = true;
        }
        continue;
      }

      const released: EngineState = { ...state, balance: round2(state.balance + (o.blockedAmount || 0)) };
      const res = applyFill(released, {
        symbol: o.symbol,
        stockName: o.stockName,
        action: o.action,
        product: o.product,
        orderType: o.orderType,
        exchange: o.exchange,
        quantity: o.quantity,
        fillPrice: ltp,
        limitPrice: o.limitPrice,
        triggerPrice: o.triggerPrice,
        orderId: o.id,
        timestamp: Date.now(),
        isAmo: o.isAmo,
        isSim: o.isSim,
        note: o.isAmo ? 'AMO executed at market open' : o.triggerPrice ? `SL triggered @ ₹${o.triggerPrice.toFixed(2)}` : undefined,
      });

      if (res.ok) {
        state = res.state;
        nextOrders = nextOrders.map((x) => (x.id === o.id ? { ...res.order, triggered: o.triggered || triggerNow, blockedAmount: 0 } : x));
        notices.push(res.toast);
      } else {
        state = released;
        nextOrders = nextOrders.map((x) =>
          x.id === o.id ? { ...x, status: 'REJECTED' as OrderStatus, blockedAmount: 0, note: res.message } : x
        );
        notices.push({ title: 'Order rejected', description: `${o.symbol}: ${res.message}`, type: 'error' });
      }
      changed = true;
    }

    if (changed) {
      commitEngine({ balance: state.balance, holdings: state.holdings, positions: state.positions, orders: nextOrders });
      notices.forEach((n) => addToast(n.title, n.description, n.type));
    }
  }, [stocks, isTradable, isSimulating, commitEngine, addToast]);

  // Risk management (RMS): expire day orders at close and auto square-off
  // intraday positions at 3:20 PM IST with the ₹59 (₹50 + GST) penalty.
  useEffect(() => {
    const runRms = () => {
      if (isSimulating) return;
      const now = Date.now();
      const eng = engineRef.current;
      let state: EngineState = { balance: eng.balance, holdings: eng.holdings, positions: eng.positions };
      let changed = false;
      const notices: { title: string; description: string; type: 'success' | 'error' | 'info' }[] = [];

      let nextOrders = eng.orders.map((o) => {
        if (o.status !== 'PENDING' || o.isAmo || o.isSim) return o;
        const intradayCut = o.product === 'INTRADAY' && isPastIntradayCutoff(o.timestamp, now);
        if (intradayCut || isPastSessionClose(o.timestamp, now)) {
          state = { ...state, balance: round2(state.balance + (o.blockedAmount || 0)) };
          changed = true;
          return {
            ...o,
            status: 'CANCELLED' as OrderStatus,
            blockedAmount: 0,
            note: intradayCut ? 'Cancelled by RMS · Intraday cut-off 3:20 PM' : 'Expired · Day order not executed before market close',
          };
        }
        return o;
      });

      const today = getISTParts(now).dateKey;
      for (const pos of eng.positions) {
        if (!isPastIntradayCutoff(pos.timestamp, now)) continue;
        const stock = stocksRef.current.find((s) => s.symbol === pos.symbol);
        const sameDay = getISTParts(pos.timestamp).dateKey === today;
        const price = stock
          ? !sameDay && marketStatus.isOpen
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
        commitEngine({ balance: state.balance, holdings: state.holdings, positions: state.positions, orders: nextOrders });
        notices.forEach((n) => addToast(n.title, n.description, n.type));
      }
    };

    const initial = setTimeout(runRms, 1500); // allow persisted state to load first
    const timer = setInterval(runRms, 10000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [isSimulating, marketStatus.isOpen, commitEngine, addToast]);

  // Place an order (Market / Limit / SL / SL-M, Delivery or Intraday)
  const executeOrder = (
    params: ExecuteOrderParams,
    opts: { silent?: boolean } = {}
  ): { success: boolean; message: string; order?: Order } => {
    const { symbol, action, product, orderType, exchange, quantity } = params;
    const stock =
      stocks.find((s) => s.symbol === symbol) || (selectedStock.symbol === symbol ? selectedStock : undefined);
    if (!stock || !Number.isFinite(stock.price) || !(stock.price > 0)) return { success: false, message: 'Stock quote not available' };
    if (exchange !== stock.exchange) return { success: false, message: 'A quote for this exchange is not available.' };
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return { success: false, message: 'Enter a valid quantity' };

    const ltp = stock.price;
    const limitPrice = params.limitPrice ? roundToTick(params.limitPrice) : undefined;
    const triggerPrice = params.triggerPrice ? roundToTick(params.triggerPrice) : undefined;
    const needsLimit = orderType === 'LIMIT' || orderType === 'SL';
    const needsTrigger = orderType === 'SL' || orderType === 'SL-M';

    if (needsLimit && (!Number.isFinite(limitPrice) || !limitPrice || limitPrice <= 0)) return { success: false, message: 'Enter a valid price' };
    if (needsTrigger && (!Number.isFinite(triggerPrice) || !triggerPrice || triggerPrice <= 0)) return { success: false, message: 'Enter a valid trigger price' };

    // Circuit limits (±20% of previous close)
    const refPrice = stock.previousClose > 0 ? stock.previousClose : ltp;
    const lowerCkt = round2(refPrice * 0.8);
    const upperCkt = round2(refPrice * 1.2);
    for (const p of [limitPrice, triggerPrice]) {
      if (p !== undefined && (p < lowerCkt || p > upperCkt)) {
        return { success: false, message: `Price should be within circuit limits ₹${lowerCkt.toFixed(2)} – ₹${upperCkt.toFixed(2)}` };
      }
    }

    if (needsTrigger && triggerPrice) {
      if (action === 'BUY' && triggerPrice <= ltp) {
        return { success: false, message: `Trigger price should be higher than LTP (₹${ltp.toFixed(2)}) for a stop-loss buy` };
      }
      if (action === 'SELL' && triggerPrice >= ltp) {
        return { success: false, message: `Trigger price should be lower than LTP (₹${ltp.toFixed(2)}) for a stop-loss sell` };
      }
      if (orderType === 'SL' && limitPrice) {
        if (action === 'BUY' && limitPrice < triggerPrice) return { success: false, message: 'Limit price should be ≥ trigger price for SL buy' };
        if (action === 'SELL' && limitPrice > triggerPrice) return { success: false, message: 'Limit price should be ≤ trigger price for SL sell' };
      }
    }

    const eng = engineRef.current;
    const realOpen = marketStatus.isOpen;
    const tradable = realOpen || isSimulating;
    const ist = getISTParts();

    // Intraday session rules
    if (product === 'INTRADAY' && !isSimulating) {
      const pos = eng.positions.find((p) => p.symbol === symbol && p.exchange === exchange);
      const isExit = !!pos && pos.action !== action && quantity <= pos.quantity;
      if (!realOpen) {
        return {
          success: false,
          message: 'Market is closed. Intraday orders are allowed only between 9:15 AM and 3:20 PM. Use Delivery to place an AMO.',
        };
      }
      if (ist.minutes >= INTRADAY_SQUARE_OFF_MIN && !isExit) {
        return { success: false, message: 'New intraday orders are not allowed after 3:20 PM. You can only exit open positions.' };
      }
    }

    // Delivery sell: can't sell more than (holdings − qty already in pending sell orders)
    if (product === 'DELIVERY' && action === 'SELL') {
      const held = eng.holdings.find((h) => h.symbol === symbol)?.quantity || 0;
      const reserved = eng.orders
        .filter((o) => o.status === 'PENDING' && o.product === 'DELIVERY' && o.action === 'SELL' && o.symbol === symbol)
        .reduce((s, o) => s + o.quantity, 0);
      const sellable = Math.max(0, held - reserved);
      if (sellable < quantity) {
        return {
          success: false,
          message: held === 0
            ? `You don't hold any ${symbol} shares. Short selling is allowed only in Intraday.`
            : `You can sell up to ${sellable} shares${reserved ? ` (${reserved} already in open sell orders)` : ''}`,
        };
      }
    }

    const isSim = !realOpen && isSimulating;
    const state: EngineState = { balance: eng.balance, holdings: eng.holdings, positions: eng.positions };

    const isMarketable =
      orderType === 'MARKET' ||
      (orderType === 'LIMIT' && !!limitPrice && (action === 'BUY' ? ltp <= limitPrice : ltp >= limitPrice));

    // 1) Immediate execution
    if (tradable && isMarketable) {
      const res = applyFill(state, {
        symbol,
        stockName: stock.name,
        action,
        product,
        orderType,
        exchange,
        quantity,
        fillPrice: ltp,
        limitPrice,
        isSim,
      });
      if (!res.ok) return { success: false, message: res.message };
      commitEngine({
        balance: res.state.balance,
        holdings: res.state.holdings,
        positions: res.state.positions,
        orders: [res.order, ...eng.orders],
      });
      if (!opts.silent) setLastExecutedOrder(res.order);
      addToast(res.toast.title, res.toast.description, res.toast.type);
      return { success: true, message: 'Order executed', order: res.order };
    }

    // 2) Resting order (open limit / stop-loss) or AMO when market is closed
    const isAmo = !tradable;
    const restPrice =
      orderType === 'MARKET' ? ltp : orderType === 'SL-M' ? (triggerPrice as number) : (limitPrice as number);
    const block = computeBlockAmount(state, { symbol, action, product, quantity, price: restPrice, exchange });
    if (block > eng.balance) {
      return {
        success: false,
        message: `Insufficient funds. ₹${block.toLocaleString('en-IN', { maximumFractionDigits: 2 })} required, available ₹${eng.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      };
    }

    const cmp = action === 'BUY' ? '≤' : '≥';
    const trigCmp = action === 'BUY' ? '≥' : '≤';
    const note = isAmo
      ? 'AMO · Will be sent to exchange at 9:15 AM'
      : needsTrigger
      ? `Waiting for LTP ${trigCmp} ₹${triggerPrice?.toFixed(2)}`
      : `Open · Executes when LTP ${cmp} ₹${limitPrice?.toFixed(2)}`;

    const order: Order = {
      id: newOrderId(),
      symbol,
      stockName: stock.name,
      action,
      product,
      orderType,
      exchange,
      quantity,
      price: restPrice,
      limitPrice,
      triggerPrice,
      status: 'PENDING',
      timestamp: Date.now(),
      totalAmount: round2(restPrice * quantity),
      marginUsed: block,
      blockedAmount: block,
      isAmo,
      isSim,
      note,
    };

    commitEngine({ balance: round2(eng.balance - block), orders: [order, ...eng.orders] });
    addToast(
      isAmo ? 'AMO placed' : 'Order placed',
      `${action} ${quantity} ${symbol} · ${orderType}${isAmo ? ' · Executes at market open' : ' · Open'}`,
      'info'
    );
    return { success: true, message: isAmo ? 'AMO placed' : 'Order placed', order };
  };

  // Exit Intraday Position (Groww-style 1-click exit at market)
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

  // Cancel a pending order and release blocked funds
  const cancelLimitOrder = (orderId: string) => {
    const eng = engineRef.current;
    const o = eng.orders.find((x) => x.id === orderId);
    if (!o || o.status !== 'PENDING') return;
    commitEngine({
      balance: round2(eng.balance + (o.blockedAmount || 0)),
      orders: eng.orders.map((x) =>
        x.id === orderId ? { ...x, status: 'CANCELLED' as OrderStatus, blockedAmount: 0, note: 'Cancelled by you' } : x
      ),
    });
    addToast('Order cancelled', `${o.action} ${o.quantity} ${o.symbol} cancelled${o.blockedAmount ? ' · Funds released' : ''}`, 'info');
  };

  // Sign Up User (Google or Email OTP) with Firebase Firestore persistence
  const signUpUser = (data: {
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    authProvider?: 'google' | 'email';
    avatar?: string;
    initialCash: number;
  }) => {
    // Enforce 10L limit on sign up
    const clampedCash = Math.min(MAX_WALLET_LIMIT, Math.max(1000, data.initialCash));
    const effectiveUid = data.uid || `user_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const profile: UserProfile = {
      uid: effectiveUid,
      name: data.name,
      email: data.email,
      phone: data.phone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar,
      initialCash: clampedCash,
      createdAt: Date.now(),
    };
    setUser(profile);
    setBalance(clampedCash);
    setInitialBalance(clampedCash);
    setIsAuthModalOpen(false);
    setShowLandingPage(false);

    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    // Persist to Firebase Firestore
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      setDoc(userDocRef, {
        userId: effectiveUid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        avatar: profile.avatar || '',
        authProvider: profile.authProvider,
        balance: clampedCash,
        initialBalance: clampedCash,
        createdAt: profile.createdAt,
        updatedAt: Date.now(),
      }, { merge: true }).catch((err) => console.warn('Firestore user write error:', err));
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

    const initialTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Initial paper trading credit (${data.authProvider === 'google' ? 'Google' : 'Email OTP'} verified)`,
      timestamp: Date.now(),
    };
    setWalletTransactions([initialTx]);
    addToast(
      `Welcome, ${data.name}!`,
      `Verified via ${data.authProvider === 'google' ? 'Google' : 'Email OTP'}. ₹${clampedCash.toLocaleString('en-IN')} added to your wallet.`,
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
    const userCash = existingProfile?.initialCash || balance || 500000;

    const profile: UserProfile = {
      uid: effectiveUid,
      name: userName,
      email: data.email,
      phone: userPhone,
      authProvider: data.authProvider || 'email',
      avatar: data.avatar || existingProfile?.avatar,
      initialCash: userCash,
      createdAt: existingProfile?.createdAt || Date.now(),
    };

    setUser(profile);
    try {
      localStorage.setItem('mypaper_user_v2', JSON.stringify(profile));
    } catch {}

    // Update in Firestore
    try {
      const userDocRef = doc(db, 'users', effectiveUid);
      setDoc(userDocRef, {
        userId: effectiveUid,
        name: userName,
        email: data.email,
        authProvider: data.authProvider || 'email',
        avatar: profile.avatar || '',
        updatedAt: Date.now(),
      }, { merge: true }).catch((err) => console.warn('Firestore user signin write notice:', err));
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }

    setIsAuthModalOpen(false);
    setShowLandingPage(false);
    addToast(
      `Welcome back, ${userName}!`,
      `Signed in via ${data.authProvider === 'google' ? 'Google' : 'Email OTP'}. Ready to trade.`,
      'success'
    );
    return true;
  };

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

  // Add Money to Wallet (Enforces ₹10 Lakhs max limit)
  const addMoneyToWallet = (amount: number, description = 'Funds added via Add Money'): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount greater than zero.', 'error');
      return false;
    }

    const cash = engineRef.current.balance;
    if (cash >= MAX_WALLET_LIMIT) {
      addToast(
        'Wallet Limit Reached',
        'Your paper wallet has already reached the maximum limit of ₹10,00,000 (10 Lakhs). You cannot add more funds.',
        'error'
      );
      return false;
    }

    if (cash + amount > MAX_WALLET_LIMIT) {
      const allowedAdd = Math.max(0, MAX_WALLET_LIMIT - cash);
      addToast(
        'Wallet Limit Exceeded',
        `Adding ₹${amount.toLocaleString('en-IN')} exceeds the ₹10,00,000 (10 Lakhs) wallet limit. You can only add up to ₹${allowedAdd.toLocaleString('en-IN')}.`,
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
    const clampedAmount = Math.min(MAX_WALLET_LIMIT, Math.max(0, amount));
    if (amount > MAX_WALLET_LIMIT) {
      addToast('Wallet Limit Exceeded', 'Wallet balance cannot exceed ₹10,00,000 (10 Lakhs). Clamped to ₹10,00,000.', 'error');
    }
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

  // Reset Portfolio
  const resetPortfolio = (startingCash = 500000) => {
    if (!Number.isFinite(startingCash)) return;
    const clampedCash = Math.min(MAX_WALLET_LIMIT, Math.max(1000, startingCash));
    commitEngine({ balance: clampedCash, holdings: [], positions: [], orders: [] });
    setInitialBalance(clampedCash);
    setIsWalletModalOpen(false);
    const resetTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: 'Portfolio reset credit',
      timestamp: Date.now(),
    };
    setWalletTransactions([resetTx]);
    addToast('Portfolio Reset', `Reset paper portfolio with fresh ₹${clampedCash.toLocaleString('en-IN')} cash`, 'info');
  };

  // Watchlist helpers
  const toggleWatchlistStock = (watchlistId: string, symbol: string) => {
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

    // Intraday Positions unrealized P&L & locked margin
    let intradayPnL = 0;
    let lockedMargin = 0;

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
      if (o.status === 'PENDING' && o.blockedAmount) lockedMargin += o.blockedAmount;
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
        toasts,
        addToast,
        removeToast,
        isDarkMode,
        toggleTheme,
        isSimulating,
        toggleSimulation,
        isLiveConnected,
        lastLiveUpdate,
        isRefreshingLive,
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
