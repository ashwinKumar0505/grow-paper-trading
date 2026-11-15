import { useEffect } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setStocks' | 'stocks' | 'selectedStock' | 'setSelectedStockState'> & Pick<TradingContextType, 'marketStatus'>;

export function useQuoteDisplay({ marketStatus, setStocks, stocks, selectedStock, setSelectedStockState }: Options) {
  // Clear tick flash animations after 800ms or when market is closed (no artificial price generation)
  useEffect(() => {
    if (!marketStatus.isOpen) {
      setStocks((prev) =>
        prev.some((s) => s.tickDirection)
          ? prev.map((s) => (s.tickDirection ? { ...s, tickDirection: null } : s))
          : prev
      );
      return;
    }

    const flashClearTimer = setTimeout(() => {
      setStocks((prev) =>
        prev.some((s) => s.tickDirection && s.lastTickTime && Date.now() - s.lastTickTime > 800)
          ? prev.map((s) =>
              s.tickDirection && s.lastTickTime && Date.now() - s.lastTickTime > 800
                ? { ...s, tickDirection: null }
                : s
            )
          : prev
      );
    }, 850);

    return () => clearTimeout(flashClearTimer);
  }, [stocks, marketStatus.isOpen]);

  // Sync selectedStock with updated stock list
  useEffect(() => {
    const current = stocks.find((s) => s.symbol === selectedStock.symbol);
    if (current && (current.price !== selectedStock.price || current.tickDirection !== selectedStock.tickDirection || current.freshness !== selectedStock.freshness)) {
      setSelectedStockState(current);
    }
  }, [stocks, selectedStock.symbol, selectedStock.price, selectedStock.tickDirection, selectedStock.freshness]);

}
