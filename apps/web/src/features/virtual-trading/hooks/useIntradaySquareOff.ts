import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { Stock } from '../../../types/market';
import { AUTO_SQUARE_OFF_CHARGE } from '../../../utils/charges';
import {
  classifyQuoteFreshness,
  getIndianMarketStatus,
  getISTParts,
  isPastIntradayCutoff,
} from '../../../utils/marketHours';
import {
  applyFill,
  EngineState,
  OrderBookState,
  processOrderQueue,
} from '../../../utils/orderEngine';

type Options = Pick<TradingContextType, 'addToast' | 'marketStatus'> & {
  engineRef: RefObject<OrderBookState>;
  stocksRef: RefObject<Stock[]>;
  commitEngine: (patch: Partial<OrderBookState>) => void;
};

export function useIntradaySquareOff({
  engineRef,
  stocksRef,
  commitEngine,
  addToast,
  marketStatus,
}: Options) {
  // Risk management (RMS): expire day orders at close and auto square-off
  // intraday positions at 3:20 PM IST with the ₹59 (₹50 + GST) penalty.
  // Never fabricates an execution price or falls back to entryPrice when authentic market data is unavailable!
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
        const stock = stocksRef.current.find(
          (s) => s.symbol === pos.symbol && s.exchange === pos.exchange
        );

        // Require an authentic provider-backed quote; never use entryPrice on data outage
        if (
          !stock ||
          stock.providerAvailable === false ||
          stock.freshness === 'UNAVAILABLE' ||
          !Number.isFinite(stock.price) ||
          stock.price <= 0
        ) {
          continue;
        }

        const sameDay = getISTParts(pos.timestamp).dateKey === today;
        const price =
          !sameDay && currentMarketStatus.isOpen
            ? stock.previousClose > 0
              ? stock.previousClose
              : stock.price
            : stock.price;

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
  }, [marketStatus.isOpen, commitEngine, addToast, engineRef, stocksRef]);
}
