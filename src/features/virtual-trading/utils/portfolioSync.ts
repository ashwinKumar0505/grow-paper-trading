import type { UserUsageQuota } from '../../../lib/subscription';
import type {
  Holding,
  IntradayPosition,
  Order,
  WalletTransaction,
  Watchlist,
} from '../../../types/market';
import { migrateLegacyPaperState } from '../../../utils/orderEngine';
import {
  DEFAULT_WATCHLISTS,
  getTradingDataStorageKey,
  getWalletTxsStorageKey,
  LOCAL_STORAGE_KEY,
  WALLET_TXS_STORAGE_KEY,
} from './storageKeys';
import type { RemoteUserRecord } from './userProfileSync';

export interface PortfolioSnapshot {
  balance: number;
  initialBalance: number;
  holdings: Holding[];
  intradayPositions: IntradayPosition[];
  orders: Order[];
  executedOrderKeys: string[];
  watchlists: Watchlist[];
  walletTransactions: WalletTransaction[];
  updatedAt?: number;
}

export interface PortfolioSetters {
  setBalance: (val: number) => void;
  setInitialBalance: (val: number) => void;
  setHoldings: (val: Holding[]) => void;
  setIntradayPositions: (val: IntradayPosition[]) => void;
  setOrders: (val: Order[]) => void;
  setExecutedOrderKeys: (val: string[]) => void;
  setWatchlists: (val: Watchlist[]) => void;
  setWalletTransactions: (val: WalletTransaction[]) => void;
}

export function createDefaultPortfolioSnapshot(startingCash = 100000): PortfolioSnapshot {
  return {
    balance: startingCash,
    initialBalance: startingCash,
    holdings: [],
    intradayPositions: [],
    orders: [],
    executedOrderKeys: [],
    watchlists: DEFAULT_WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })),
    walletTransactions: [],
    updatedAt: Date.now(),
  };
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseSnapshot(
  rawData: string | null,
  rawTxs: string | null
): PortfolioSnapshot | null {
  if (!rawData) return null;
  const parsed = JSON.parse(rawData) as Record<string, unknown>;
  const migrated = migrateLegacyPaperState({
    ...parsed,
    positions: parsed.intradayPositions ?? parsed.positions,
  });
  const txs = rawTxs ? (JSON.parse(rawTxs) as WalletTransaction[]) : [];
  return {
    balance: typeof migrated.balance === 'number' ? migrated.balance : 100000,
    initialBalance:
      typeof parsed.initialBalance === 'number' ? parsed.initialBalance : 100000,
    holdings: Array.isArray(migrated.holdings) ? migrated.holdings : [],
    intradayPositions: Array.isArray(migrated.positions) ? migrated.positions : [],
    orders: Array.isArray(migrated.orders) ? migrated.orders : [],
    executedOrderKeys: Array.isArray(migrated.executedOrderKeys)
      ? migrated.executedOrderKeys
      : [],
    watchlists: Array.isArray(parsed.watchlists)
      ? (parsed.watchlists as Watchlist[])
      : DEFAULT_WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })),
    walletTransactions: Array.isArray(txs) ? txs : [],
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
  };
}

export function loadScopedPortfolioFromStorage(uid?: string | null): PortfolioSnapshot | null {
  try {
    const scopedKey = getTradingDataStorageKey(uid);
    const scopedTxsKey = getWalletTxsStorageKey(uid);
    const scopedRaw = localStorage.getItem(scopedKey);
    const scopedTxs = localStorage.getItem(scopedTxsKey);
    if (scopedRaw) {
      return parseSnapshot(scopedRaw, scopedTxs);
    }

    // One-time migration from legacy unscoped keys only when an authenticated user is active
    if (uid) {
      const legacyRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (legacyRaw) {
        const legacyTxs = localStorage.getItem(WALLET_TXS_STORAGE_KEY);
        const migrated = parseSnapshot(legacyRaw, legacyTxs);
        if (migrated) {
          saveScopedPortfolioToStorage(uid, migrated, true);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          localStorage.removeItem(WALLET_TXS_STORAGE_KEY);
          return migrated;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveScopedPortfolioToStorage(
  uid: string | null | undefined,
  snapshot: PortfolioSnapshot,
  isDarkMode: boolean
): void {
  try {
    localStorage.setItem(
      getTradingDataStorageKey(uid),
      JSON.stringify({
        balance: snapshot.balance,
        initialBalance: snapshot.initialBalance,
        holdings: snapshot.holdings,
        intradayPositions: snapshot.intradayPositions,
        orders: snapshot.orders,
        executedOrderKeys: snapshot.executedOrderKeys,
        watchlists: snapshot.watchlists,
        isDarkMode,
        updatedAt: snapshot.updatedAt ?? Date.now(),
      })
    );
    localStorage.setItem(
      getWalletTxsStorageKey(uid),
      JSON.stringify(snapshot.walletTransactions)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function extractPortfolioFromRemote(
  remote: RemoteUserRecord | null | undefined,
  tierMaxLimit?: number
): PortfolioSnapshot | null {
  if (!remote) return null;
  const hasPortfolioFields =
    Array.isArray(remote.holdings) ||
    Array.isArray(remote.intradayPositions) ||
    Array.isArray(remote.orders) ||
    Array.isArray(remote.walletTransactions);
  if (!hasPortfolioFields) return null;

  const migrated = migrateLegacyPaperState({
    balance: remote.balance,
    holdings: remote.holdings,
    positions: remote.intradayPositions,
    orders: remote.orders,
    executedOrderKeys: remote.executedOrderKeys,
  });

  const rawBalance = typeof migrated.balance === 'number' ? migrated.balance : 100000;
  const rawInitial = typeof remote.initialBalance === 'number' ? remote.initialBalance : rawBalance;

  return {
    balance: typeof tierMaxLimit === 'number' ? Math.min(tierMaxLimit, rawBalance) : rawBalance,
    initialBalance:
      typeof tierMaxLimit === 'number' ? Math.min(tierMaxLimit, rawInitial) : rawInitial,
    holdings: Array.isArray(migrated.holdings) ? migrated.holdings : [],
    intradayPositions: Array.isArray(migrated.positions) ? migrated.positions : [],
    orders: Array.isArray(migrated.orders) ? migrated.orders : [],
    executedOrderKeys: Array.isArray(migrated.executedOrderKeys)
      ? migrated.executedOrderKeys
      : [],
    watchlists:
      Array.isArray(remote.watchlists) && remote.watchlists.length > 0
        ? remote.watchlists
        : DEFAULT_WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })),
    walletTransactions: Array.isArray(remote.walletTransactions)
      ? remote.walletTransactions
      : [],
    updatedAt: remote.portfolioUpdatedAt || remote.updatedAt || Date.now(),
  };
}

export function buildRemotePortfolioPayload(
  snapshot: PortfolioSnapshot,
  usageQuota?: UserUsageQuota
): Record<string, unknown> {
  const now = Date.now();
  return stripUndefined({
    balance: snapshot.balance,
    initialBalance: snapshot.initialBalance,
    holdings: snapshot.holdings,
    intradayPositions: snapshot.intradayPositions,
    orders: snapshot.orders.slice(0, 200),
    executedOrderKeys: snapshot.executedOrderKeys.slice(-300),
    watchlists: snapshot.watchlists,
    walletTransactions: snapshot.walletTransactions.slice(0, 200),
    ...(usageQuota ? { usage: usageQuota } : {}),
    portfolioUpdatedAt: now,
    updatedAt: now,
  });
}

export function applyPortfolioSnapshot(
  setters: PortfolioSetters,
  snapshot: PortfolioSnapshot,
  uid?: string | null,
  isDarkMode = true
): void {
  setters.setBalance(snapshot.balance);
  setters.setInitialBalance(snapshot.initialBalance);
  setters.setHoldings(snapshot.holdings);
  setters.setIntradayPositions(snapshot.intradayPositions);
  setters.setOrders(snapshot.orders);
  setters.setExecutedOrderKeys(snapshot.executedOrderKeys);
  setters.setWatchlists(snapshot.watchlists);
  setters.setWalletTransactions(snapshot.walletTransactions);
  if (uid) {
    saveScopedPortfolioToStorage(uid, snapshot, isDarkMode);
  }
}
