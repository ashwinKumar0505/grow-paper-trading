import { useEffect } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setStocks' | 'stocks' | 'indices' | 'selectedStock' | 'setSelectedStockState'> & Pick<TradingContextType, 'marketStatus'>;

export function useQuoteDisplay({ marketStatus, setStocks, stocks, indices, selectedStock, setSelectedStockState }: Options) {
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

  // Sync selectedStock with updated stock list or live indices
  useEffect(() => {
    if (selectedStock.sector === 'Index') {
      const idx = indices.find((i) => i.symbol.toUpperCase() === selectedStock.symbol.toUpperCase());
      if (idx && idx.value !== selectedStock.price) {
        setSelectedStockState((prev) => ({
          ...prev,
          price: idx.value,
          close: idx.value,
          change: idx.change,
          changePercent: idx.changePercent,
          previousClose: Number((idx.value - idx.change).toFixed(2)),
          sparkline: idx.sparkline?.length ? idx.sparkline : prev.sparkline,
        }));
      }
      return;
    }

    const current = stocks.find((s) => s.symbol === selectedStock.symbol);
    if (current && (current.price !== selectedStock.price || current.tickDirection !== selectedStock.tickDirection || current.freshness !== selectedStock.freshness)) {
      setSelectedStockState(current);
    }
  }, [stocks, indices, selectedStock.symbol, selectedStock.sector, selectedStock.price, selectedStock.tickDirection, selectedStock.freshness]);

}
