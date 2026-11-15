import { useCallback,useEffect,useRef } from 'react';
import { useIntradaySquareOff } from '../../../features/virtual-trading/hooks/useIntradaySquareOff';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import {
Holding,
IntradayPosition,
Order,
Stock
} from '../../../types/market';
import {
classifyQuoteFreshness,
getIndianMarketStatus
} from '../../../utils/marketHours';
import {
OrderBookState,
processOrderQueue
} from '../../../utils/orderEngine';
import type { ToastMessage } from '../types/tradingContext';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'intradayPositions' | 'balance' | 'holdings' | 'orders' | 'executedOrderKeys' | 'stocks' | 'setBalance' | 'setHoldings' | 'setIntradayPositions' | 'setOrders' | 'setExecutedOrderKeys' | 'user'> & Pick<TradingContextType, 'addToast' | 'marketStatus'>;

export function useOrderEngine({ intradayPositions, balance, holdings, orders, executedOrderKeys, stocks, setBalance, setHoldings, setIntradayPositions, setOrders, setExecutedOrderKeys, user, addToast, marketStatus }: Options) {
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
              data.toasts.forEach((t: ToastMessage) => addToast(t.title, t.description, t.type));
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

  useIntradaySquareOff({ engineRef, stocksRef, commitEngine, addToast, marketStatus });

  return { engineRef, commitEngine };
}
