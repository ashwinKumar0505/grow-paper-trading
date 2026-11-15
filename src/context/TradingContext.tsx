import React,{ createContext,useContext } from 'react';
import { useAccountSync } from '../features/virtual-trading/hooks/useAccountSync';
import { useMarketQuotes } from '../features/virtual-trading/hooks/useMarketQuotes';
import { useNotifications } from '../features/virtual-trading/hooks/useNotifications';
import { useOrderEngine } from '../features/virtual-trading/hooks/useOrderEngine';
import { useOrderExecution } from '../features/virtual-trading/hooks/useOrderExecution';
import { useOrderModalState } from '../features/virtual-trading/hooks/useOrderModalState';
import { usePortfolioQuotes } from '../features/virtual-trading/hooks/usePortfolioQuotes';
import { usePortfolioSummary } from '../features/virtual-trading/hooks/usePortfolioSummary';
import { useQuoteDisplay } from '../features/virtual-trading/hooks/useQuoteDisplay';
import { useSignIn } from '../features/virtual-trading/hooks/useSignIn';
import { useSignOut } from '../features/virtual-trading/hooks/useSignOut';
import { useSignUp } from '../features/virtual-trading/hooks/useSignUp';
import { useStockSelection } from '../features/virtual-trading/hooks/useStockSelection';
import { useSubscriptionActions } from '../features/virtual-trading/hooks/useSubscriptionActions';
import { useTheme } from '../features/virtual-trading/hooks/useTheme';
import { useTradingPersistence } from '../features/virtual-trading/hooks/useTradingPersistence';
import { useTradingState } from '../features/virtual-trading/hooks/useTradingState';
import { useUsageQuota } from '../features/virtual-trading/hooks/useUsageQuota';
import { useWalletActions } from '../features/virtual-trading/hooks/useWalletActions';
import { useWatchlistActions } from '../features/virtual-trading/hooks/useWatchlistActions';
import { fetchRealChart } from '../features/virtual-trading/services/marketData';
import type { TradingContextType } from '../features/virtual-trading/types/tradingContext';


export const MAX_WALLET_LIMIT = 5000000;
const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const state = useTradingState();
  const market = useMarketQuotes(state.setStocks, state.setIndices);
  usePortfolioQuotes(state.holdings, state.intradayPositions, state.orders, state.setStocks);
  useAccountSync(state);
  useTradingPersistence(state);
  const theme = useTheme(state);
  const notifications = useNotifications(state);
  const options = { ...state, ...market, ...notifications };
  const selection = useStockSelection(options);
  useQuoteDisplay(options);
  const engine = useOrderEngine(options);
  const actions = { ...options, ...engine };
  const execution = useOrderExecution(actions);
  const signUp = useSignUp(options);
  const signIn = useSignIn(options);
  const subscription = useSubscriptionActions(actions);
  const quota = useUsageQuota(actions);
  const signOut = useSignOut(options);
  const wallet = useWalletActions(actions);
  const watchlist = useWatchlistActions(options);
  const orderModal = useOrderModalState(state);
  const portfolioSummary = usePortfolioSummary(state.holdings, state.intradayPositions, state.orders, state.stocks, state.balance, state.initialBalance);

  return (
    <TradingContext.Provider value={{
      stocks: state.stocks,
      indices: state.indices,
      selectedStock: state.selectedStock,
      currentTab: state.currentTab,
      setCurrentTab: state.setCurrentTab,
      showLandingPage: state.showLandingPage,
      setShowLandingPage: state.setShowLandingPage,
      user: state.user,
      isAuthModalOpen: state.isAuthModalOpen,
      setIsAuthModalOpen: state.setIsAuthModalOpen,
      authModalMode: state.authModalMode,
      setAuthModalMode: state.setAuthModalMode,
      openAuthModal: state.openAuthModal,
      closeAuthModal: state.closeAuthModal,
      balance: state.balance,
      initialBalance: state.initialBalance,
      walletTransactions: state.walletTransactions,
      isWalletModalOpen: state.isWalletModalOpen,
      setIsWalletModalOpen: state.setIsWalletModalOpen,
      holdings: state.holdings,
      intradayPositions: state.intradayPositions,
      orders: state.orders,
      watchlists: state.watchlists,
      activeWatchlistId: state.activeWatchlistId,
      setActiveWatchlistId: state.setActiveWatchlistId,
      orderModalState: state.orderModalState,
      lastExecutedOrder: state.lastExecutedOrder,
      setLastExecutedOrder: state.setLastExecutedOrder,
      subscriptionTier: state.subscriptionTier,
      planConfig: state.planConfig,
      usageQuota: state.usageQuota,
      upgradeModalState: state.upgradeModalState,
      openUpgradeModal: state.openUpgradeModal,
      closeUpgradeModal: state.closeUpgradeModal,
      razorpayModalState: state.razorpayModalState,
      openRazorpayCheckout: state.openRazorpayCheckout,
      closeRazorpayCheckout: state.closeRazorpayCheckout,
      toasts: state.toasts,
      isDarkMode: state.isDarkMode,
      ...market,
      ...theme,
      ...notifications,
      ...selection,
      ...execution,
      ...signUp,
      ...signIn,
      ...subscription,
      ...quota,
      ...signOut,
      ...wallet,
      ...watchlist,
      ...orderModal,
      portfolioSummary,
      fetchRealChart,
    }}>
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
