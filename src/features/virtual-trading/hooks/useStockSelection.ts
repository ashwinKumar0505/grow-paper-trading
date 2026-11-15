import { INITIAL_STOCKS } from '../../../data/mockStocks';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import {
Stock
} from '../../../types/market';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setSelectedStockState' | 'setStocks' | 'stocks' | 'setCurrentTab'> & Pick<TradingContextType, 'addToast'>;

export function useStockSelection({ setSelectedStockState, setStocks, stocks, setCurrentTab, addToast }: Options) {
  const setSelectedStock = (stock: Stock) => {
    setSelectedStockState(stock);
    // Asynchronously refresh its real quote
    fetch(`/api/stocks/${stock.symbol}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stock && data.stock.price > 0) {
          setSelectedStockState((prev) => (prev.symbol === stock.symbol ? { ...prev, ...data.stock } : prev));
          setStocks((prev) => {
            const idx = prev.findIndex((s) => s.symbol === stock.symbol);
            if (idx >= 0) {
              const cp = [...prev];
              cp[idx] = { ...cp[idx], ...data.stock };
              return cp;
            }
            return [data.stock, ...prev];
          });
        }
      })
      .catch(() => {});
  };

  const selectStockBySymbol = async (symbol: string) => {
    const sym = symbol.toUpperCase();
    const existing = stocks.find((s) => s.symbol.toUpperCase() === sym);
    if (existing) {
      setSelectedStockState(existing);
      setCurrentTab('stock-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
      const res = await fetch(`/api/stocks/${sym}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stock && data.stock.price > 0) {
          const freshStock = data.stock;
          setSelectedStockState((prev) => {
            const base = existing || (prev.symbol.toUpperCase() === sym ? prev : INITIAL_STOCKS[0]);
            return {
              ...base,
              ...freshStock,
              fundamentals: freshStock.fundamentals || base?.fundamentals || INITIAL_STOCKS[0].fundamentals,
              about: freshStock.about || base?.about || `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
            };
          });
          setStocks((prev) => {
            const idx = prev.findIndex((s) => s.symbol.toUpperCase() === sym);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                ...freshStock,
                fundamentals: freshStock.fundamentals || updated[idx].fundamentals,
                about: freshStock.about || updated[idx].about,
              };
              return updated;
            }
            return [
              {
                ...INITIAL_STOCKS[0],
                ...freshStock,
                fundamentals: freshStock.fundamentals || INITIAL_STOCKS[0].fundamentals,
                about: freshStock.about || `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
              },
              ...prev,
            ];
          });
          setCurrentTab('stock-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (!existing) {
        addToast('Server Unavailable', 'Unable to reach the market data server. Please try again in some time.', 'error');
      }
    } catch (e) {
      console.warn('Failed to fetch stock quote:', e);
      if (!existing) {
        addToast('Server Unavailable', 'Unable to reach the market data server. Please try again in some time.', 'error');
      }
    }
  };

  return { setSelectedStock, selectStockBySymbol };
}
