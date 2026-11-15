import type { RefObject } from 'react';
import type { ExecuteOrderParams,TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import {
Order,
Stock
} from '../../../types/market';
import {
getIndianMarketStatus
} from '../../../utils/marketHours';
import {
cancelOrder,
OrderBookState,
submitOrder
} from '../../../utils/orderEngine';
import type { TradingState } from './useTradingState';
const round2 = (n: number) => Math.round(n * 100) / 100;
type Options = Pick<TradingState, 'stocks' | 'selectedStock' | 'planConfig' | 'openUpgradeModal' | 'user' | 'setLastExecutedOrder'> & Pick<TradingContextType, 'addToast'> & { engineRef: RefObject<OrderBookState>; commitEngine: (patch: Partial<OrderBookState>) => void };

export function useOrderExecution({ stocks, selectedStock, planConfig, openUpgradeModal, engineRef, commitEngine, user, addToast, setLastExecutedOrder }: Options) {
  // Place an order:
  // - Market Open -> Execute immediately using valid market-derived quotes or place in PENDING book
  // - Market Closed -> Save as SCHEDULED (AMO) for the next eligible NSE trading session
  const executeOrder = (
    params: ExecuteOrderParams,
    opts: { silent?: boolean } = {}
  ): { success: boolean; message: string; order?: Order } => {
    const { symbol, action, product, orderType, exchange, quantity } = params;
    const stock =
      stocks.find((s) => s.symbol === symbol) || (selectedStock.symbol === symbol ? selectedStock : undefined);
    if (!stock || !Number.isFinite(stock.price) || !(stock.price > 0)) {
      return { success: false, message: 'Stock quote not available' };
    }
    if (exchange !== stock.exchange) {
      return { success: false, message: 'A quote for this exchange is not available.' };
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return { success: false, message: 'Enter a valid quantity' };
    }

    // Subscription Tier Gating for Paper Trading Products & Order Types
    if ((product === 'INTRADAY' || product === 'MTF') && !planConfig.allowIntradayTrading) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: product === 'MTF' ? 'MTF 5.00x Delivery Leverage' : '5x Intraday (MIS) Leverage Trading',
        featureDescription:
          'Free accounts support Delivery (CNC) orders only. Upgrade to Beginner or Advanced to trade 5x Intraday (MIS) and MTF 5.00x setups.',
      });
      return {
        success: false,
        message: '5x Intraday (MIS) & MTF 5.00x trading are locked on the Free plan. Upgrade to Beginner or Advanced Package.',
      };
    }

    if (!planConfig.allowedOrderTypes.includes(orderType)) {
      const reqTier = orderType === 'LIMIT' ? 'beginner' : 'advanced';
      openUpgradeModal({
        requiredTier: reqTier,
        featureName: `${orderType} Orders`,
        featureDescription: `${orderType} orders are available on the ${
          reqTier === 'beginner' ? 'Beginner & Advanced' : 'Advanced'
        } Package. Free accounts support Market orders.`,
      });
      return {
        success: false,
        message: `${orderType} orders require the ${reqTier === 'beginner' ? 'Beginner' : 'Advanced'} Package.`,
      };
    }

    const now = Date.now();
    const currentMarketStatus = getIndianMarketStatus(now);
    const prevClose = stock.previousClose > 0 ? stock.previousClose : stock.price;
    const stockWithBounds: Stock = {
      ...stock,
      lowerCircuit:
        stock.lowerCircuit && stock.lowerCircuit > 0
          ? stock.lowerCircuit
          : round2(prevClose * 0.8),
      upperCircuit:
        stock.upperCircuit && stock.upperCircuit > 0
          ? stock.upperCircuit
          : round2(prevClose * 1.2),
      quoteTimestamp: stock.quoteTimestamp ?? now,
      fetchedAt: stock.fetchedAt ?? now,
    };

    const result = submitOrder(
      engineRef.current,
      {
        symbol,
        stockName: stock.name,
        action,
        product,
        orderType,
        exchange,
        quantity,
        limitPrice: params.limitPrice,
        triggerPrice: params.triggerPrice,
      },
      {
        stock: stockWithBounds,
        now,
        marketStatus: currentMarketStatus,
      }
    );

    commitEngine({
      balance: result.state.balance,
      holdings: result.state.holdings,
      positions: result.state.positions,
      orders: result.state.orders,
      executedOrderKeys: result.state.executedOrderKeys || [],
    });

    // Mirror state to backend so scheduled orders process even if browser is closed
    const accountId = user?.uid || 'guest_default';
    fetch('/api/paper-trading/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        state: { ...result.state, updatedAt: now },
      }),
    }).catch(() => {});

    if (result.toast) {
      addToast(result.toast.title, result.toast.description, result.toast.type);
    }

    if (
      result.success &&
      result.order &&
      !opts.silent &&
      (result.order.status === 'EXECUTED' || result.order.status === 'SCHEDULED')
    ) {
      setLastExecutedOrder(result.order);
    }

    return {
      success: result.success,
      message: result.message,
      order: result.order,
    };
  };

  // Exit Intraday Position (1-click exit at market during market hours)
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

  // Cancel a SCHEDULED or PENDING order and release blocked funds / reserved shares
  const cancelLimitOrder = (orderId: string) => {
    const now = Date.now();
    const cancelled = cancelOrder(engineRef.current, orderId, now);
    if (!cancelled.cancelled) return;

    commitEngine({
      balance: cancelled.state.balance,
      orders: cancelled.state.orders,
    });

    const accountId = user?.uid || 'guest_default';
    fetch(`/api/paper-trading/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        state: { ...cancelled.state, updatedAt: now },
      }),
    }).catch(() => {});

    if (cancelled.toast) {
      addToast(cancelled.toast.title, cancelled.toast.description, cancelled.toast.type);
    }
  };

  return { executeOrder, exitPosition, squareOffPosition, cancelLimitOrder };
}
