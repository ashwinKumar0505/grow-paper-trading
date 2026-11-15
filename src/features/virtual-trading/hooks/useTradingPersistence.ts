import { useEffect } from 'react';
import {
migrateLegacyPaperState
} from '../../../utils/orderEngine';
import { LOCAL_STORAGE_KEY,USAGE_QUOTA_KEY } from '../utils/storageKeys';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'usageQuota' | 'setBalance' | 'setInitialBalance' | 'setHoldings' | 'setIntradayPositions' | 'setOrders' | 'setExecutedOrderKeys' | 'setWatchlists' | 'balance' | 'initialBalance' | 'holdings' | 'intradayPositions' | 'orders' | 'executedOrderKeys' | 'watchlists' | 'isDarkMode' | 'user' | 'walletTransactions'>;

export function useTradingPersistence({ usageQuota, setBalance, setInitialBalance, setHoldings, setIntradayPositions, setOrders, setExecutedOrderKeys, setWatchlists, balance, initialBalance, holdings, intradayPositions, orders, executedOrderKeys, watchlists, isDarkMode, user, walletTransactions }: Options) {
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

}
