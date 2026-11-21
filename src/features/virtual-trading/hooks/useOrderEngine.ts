import { useCallback, useEffect, useRef } from 'react';
import { useIntradaySquareOff } from '../../../features/virtual-trading/hooks/useIntradaySquareOff';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { buildAuthenticatedHeaders } from '../../../lib/authSession';
import { Holding, IntradayPosition, Order, Stock } from '../../../types/market';
import { classifyQuoteFreshness, getIndianMarketStatus } from '../../../utils/marketHours';
import { OrderBookState, processOrderQueue } from '../../../utils/orderEngine';
import type { ToastMessage } from '../types/tradingContext';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  | 'intradayPositions'
  | 'balance'
  | 'initialBalance'
  | 'holdings'
  | 'orders'
  | 'executedOrderKeys'
  | 'walletTransactions'
  | 'stocks'
  | 'setBalance'
  | 'setInitialBalance'
  | 'setHoldings'
  | 'setIntradayPositions'
  | 'setOrders'
  | 'setExecutedOrderKeys'
  | 'setWalletTransactions'
  | 'user'
> &
  Pick<TradingContextType, 'addToast' | 'marketStatus'>;

export function useOrderEngine({
  intradayPositions,
  balance,
  initialBalance,
  holdings,
  orders,
  executedOrderKeys,
  walletTransactions,
  stocks,
  setBalance,
  setInitialBalance,
  setHoldings,
  setIntradayPositions,
  setOrders,
  setExecutedOrderKeys,
  setWalletTransactions,
  user,
  addToast,
  marketStatus,
}: Options) {
  const engineRef = useRef<OrderBookState>({
    balance,
    holdings,
    positions: intradayPositions,
    orders,
    executedOrderKeys,
  });
  const walletMetaRef = useRef({ initialBalance, walletTransactions });
  useEffect(() => {
    engineRef.current = {
      balance,
      holdings,
      positions: intradayPositions,
      orders,
      executedOrderKeys,
    };
    walletMetaRef.current = { initialBalance, walletTransactions };
  }, [balance, holdings, intradayPositions, orders, executedOrderKeys, initialBalance, walletTransactions]);

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
    [setBalance, setExecutedOrderKeys, setHoldings, setIntradayPositions, setOrders]
  );

  // Reconcile paper trading state with authoritative backend ledger when user is authenticated
  useEffect(() => {
    if (!user?.uid) return;
    const syncTimer = setTimeout(async () => {
      try {
        const headers = await buildAuthenticatedHeaders();
        if (!headers.Authorization) return;
        const currentBook = engineRef.current;
        const r = await fetch('/api/paper-trading/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            migrateIfEmpty: true,
            state: {
              ...currentBook,
              ...walletMetaRef.current,
              updatedAt: Date.now(),
            },
          }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data?.success && data.state) {
          commitEngine({
            balance: data.state.balance,
            holdings: data.state.holdings,
            positions: data.state.positions,
            orders: data.state.orders,
            executedOrderKeys: data.state.executedOrderKeys || [],
          });
          if (typeof data.state.initialBalance === 'number') {
            setInitialBalance(data.state.initialBalance);
          }
          if (Array.isArray(data.state.walletTransactions)) {
            setWalletTransactions(data.state.walletTransactions);
          }
          if (Array.isArray(data.toasts)) {
            data.toasts.forEach((t: ToastMessage) => addToast(t.title, t.description, t.type));
          }
        }
      } catch {
        // Ignore network errors while offline
      }
    }, 600);

    return () => clearTimeout(syncTimer);
  }, [user?.uid, marketStatus.isOpen, commitEngine, addToast, setInitialBalance, setWalletTransactions]);

  // Process SCHEDULED (AMO) and PENDING orders against authentic tradable quotes
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

  useIntradaySquareOff({ engineRef, stocksRef, commitEngine, addToast, marketStatus });

  return { engineRef, commitEngine };
}
