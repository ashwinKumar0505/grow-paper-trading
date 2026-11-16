import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { auth, firebaseSignOut } from '../../../lib/firebase';
import { normalizeUsageQuota } from '../../../lib/subscription';
import {
  applyPortfolioSnapshot,
  createDefaultPortfolioSnapshot,
} from '../utils/portfolioSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'setUser'
  | 'setShowLandingPage'
  | 'setBalance'
  | 'setInitialBalance'
  | 'setHoldings'
  | 'setIntradayPositions'
  | 'setOrders'
  | 'setExecutedOrderKeys'
  | 'setWatchlists'
  | 'setWalletTransactions'
  | 'setActiveWatchlistId'
  | 'setUsageQuota'
  | 'setLastExecutedOrder'
> &
  Pick<TradingContextType, 'addToast'>;

export function useSignOut({
  setUser,
  setShowLandingPage,
  setBalance,
  setInitialBalance,
  setHoldings,
  setIntradayPositions,
  setOrders,
  setExecutedOrderKeys,
  setWatchlists,
  setWalletTransactions,
  setActiveWatchlistId,
  setUsageQuota,
  setLastExecutedOrder,
  addToast,
}: Options) {
  // Sign out user (Firebase & local) and reset in-memory portfolio state
  const logOutUser = () => {
    setUser(null);
    applyPortfolioSnapshot(
      {
        setBalance,
        setInitialBalance,
        setHoldings,
        setIntradayPositions,
        setOrders,
        setExecutedOrderKeys,
        setWatchlists,
        setWalletTransactions,
      },
      createDefaultPortfolioSnapshot(100000)
    );
    setActiveWatchlistId('default');
    setUsageQuota(normalizeUsageQuota(null));
    setLastExecutedOrder(null);

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

  return { logOutUser };
}
