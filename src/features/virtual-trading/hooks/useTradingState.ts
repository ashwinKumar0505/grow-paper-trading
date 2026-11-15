import { useCallback,useState } from 'react';
import { INITIAL_INDICES,INITIAL_STOCKS } from '../../../data/mockStocks';
import type { ToastMessage } from '../../../features/virtual-trading/types/tradingContext';
import { navigate,usePathname } from '../../../lib/navigation';
import {
normalizeUsageQuota,
SUBSCRIPTION_PLANS,
SubscriptionPlanConfig,
SubscriptionTier,
UserUsageQuota
} from '../../../lib/subscription';
import {
Holding,
IndexData,
IntradayPosition,
Order,
OrderAction,
OrderProduct,
Stock,
UserProfile,
WalletTransaction,
Watchlist
} from '../../../types/market';
import { USAGE_QUOTA_KEY } from '../utils/storageKeys';

export function useTradingState(){
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
  const [executedOrderKeys, setExecutedOrderKeys] = useState<string[]>([]);
  return { stocks, setStocks, indices, setIndices, selectedStock, setSelectedStockState, currentTab, setCurrentTab, pathname, showLandingPage, setShowLandingPage, user, setUser, isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, subscriptionTier, planConfig, usageQuota, setUsageQuota, upgradeModalState, setUpgradeModalState, razorpayModalState, setRazorpayModalState, openUpgradeModal, closeUpgradeModal, openRazorpayCheckout, closeRazorpayCheckout, openAuthModal, closeAuthModal, balance, setBalance, initialBalance, setInitialBalance, isWalletModalOpen, setIsWalletModalOpen, walletTransactions, setWalletTransactions, holdings, setHoldings, intradayPositions, setIntradayPositions, orders, setOrders, watchlists, setWatchlists, activeWatchlistId, setActiveWatchlistId, orderModalState, setOrderModalState, lastExecutedOrder, setLastExecutedOrder, toasts, setToasts, isDarkMode, setIsDarkMode, executedOrderKeys, setExecutedOrderKeys };
}
export type TradingState = ReturnType<typeof useTradingState>;
