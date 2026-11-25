import { useEffect, useRef } from 'react';
import { normalizeUsageQuota } from '../../../lib/subscription';
import {
  applyPortfolioSnapshot,
  buildRemotePortfolioPayload,
  createDefaultPortfolioSnapshot,
  loadScopedPortfolioFromStorage,
  saveScopedPortfolioToStorage,
} from '../utils/portfolioSync';
import { getUsageQuotaStorageKey } from '../utils/storageKeys';
import { persistUserProfileToFirestore } from '../utils/userProfileSync';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'usageQuota'
  | 'setUsageQuota'
  | 'setBalance'
  | 'setInitialBalance'
  | 'setHoldings'
  | 'setIntradayPositions'
  | 'setOrders'
  | 'setExecutedOrderKeys'
  | 'setWatchlists'
  | 'setWalletTransactions'
  | 'balance'
  | 'initialBalance'
  | 'holdings'
  | 'intradayPositions'
  | 'orders'
  | 'executedOrderKeys'
  | 'watchlists'
  | 'isDarkMode'
  | 'user'
  | 'walletTransactions'
>;

export function useTradingPersistence({
  usageQuota,
  setUsageQuota,
  setBalance,
  setInitialBalance,
  setHoldings,
  setIntradayPositions,
  setOrders,
  setExecutedOrderKeys,
  setWatchlists,
  setWalletTransactions,
  balance,
  initialBalance,
  holdings,
  intradayPositions,
  orders,
  executedOrderKeys,
  watchlists,
  isDarkMode,
  user,
  walletTransactions,
}: Options) {
  const scope = user?.uid || 'guest';
  const loadedScopeRef = useRef<string | null>(null);

  // Load scoped state whenever active account scope changes
  useEffect(() => {
    try {
      const savedQuota = localStorage.getItem(getUsageQuotaStorageKey(user?.uid));
      setUsageQuota(normalizeUsageQuota(savedQuota ? JSON.parse(savedQuota) : null));
    } catch {
      setUsageQuota(normalizeUsageQuota(null));
    }

    const scopedSnapshot = loadScopedPortfolioFromStorage(user?.uid);
    if (scopedSnapshot) {
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
        scopedSnapshot
      );
    } else if (!user?.uid) {
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
    }

    loadedScopeRef.current = scope;
  }, [scope]);

  // Save usageQuota to scoped localStorage
  useEffect(() => {
    if (loadedScopeRef.current !== scope) return;
    try {
      localStorage.setItem(getUsageQuotaStorageKey(user?.uid), JSON.stringify(usageQuota));
    } catch {}
  }, [scope, usageQuota]);

  // Save trading portfolio to scoped localStorage
  useEffect(() => {
    if (loadedScopeRef.current !== scope) return;
    saveScopedPortfolioToStorage(
      user?.uid,
      {
        balance,
        initialBalance,
        holdings,
        intradayPositions,
        orders,
        executedOrderKeys,
        watchlists,
        walletTransactions,
      },
      isDarkMode
    );
  }, [
    scope,
    balance,
    initialBalance,
    holdings,
    intradayPositions,
    orders,
    executedOrderKeys,
    watchlists,
    walletTransactions,
    isDarkMode,
  ]);

  // Save user profile to legacy keys for auth session restore
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('groww_paper_user_v1', JSON.stringify(user));
      } else {
        localStorage.removeItem('groww_paper_user_v1');
      }
    } catch {}
  }, [user]);

  // Debounced sync of holdings, positions, orders, watchlists & wallet to Firebase Firestore
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || loadedScopeRef.current !== uid) return;
    const email = user?.email;
    const timer = window.setTimeout(() => {
      const payload = buildRemotePortfolioPayload(
        {
          balance,
          initialBalance,
          holdings,
          intradayPositions,
          orders,
          executedOrderKeys,
          watchlists,
          walletTransactions,
        },
        usageQuota
      );
      persistUserProfileToFirestore(uid, email, payload).catch((err) =>
        console.warn('Firestore portfolio sync warning:', err)
      );
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    user?.uid,
    user?.email,
    balance,
    initialBalance,
    holdings,
    intradayPositions,
    orders,
    executedOrderKeys,
    watchlists,
    walletTransactions,
    usageQuota,
  ]);
}
