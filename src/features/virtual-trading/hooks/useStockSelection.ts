import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { IndexData, Stock, StockFundamentals } from '../../../types/market';
import type { TradingState } from './useTradingState';

type Options = Pick<
  TradingState,
  'setSelectedStockState' | 'setStocks' | 'stocks' | 'indices' | 'setCurrentTab'
> &
  Pick<TradingContextType, 'addToast'>;

const EMPTY_FUNDAMENTALS: StockFundamentals = {
  available: false,
  source: 'unavailable',
  marketCap: null,
  peRatio: null,
  pbRatio: null,
  industryPe: null,
  debtToEquity: null,
  roe: null,
  divYield: null,
  eps: null,
  bookValue: null,
};

function buildIndexStock(idx: IndexData): Stock {
  const previousClose = Number((idx.value - idx.change).toFixed(2));
  const exchange = idx.symbol.toUpperCase() === 'SENSEX' ? 'BSE' : 'NSE';
  return {
    symbol: idx.symbol,
    name: idx.name,
    sector: 'Index',
    exchange,
    price: idx.value,
    previousClose,
    change: idx.change,
    changePercent: idx.changePercent,
    open: previousClose,
    high: Math.max(idx.value, previousClose),
    low: Math.min(idx.value, previousClose),
    close: idx.value,
    volume: 0,
    week52High: Number((idx.value * 1.15).toFixed(2)),
    week52Low: Number((idx.value * 0.85).toFixed(2)),
    fundamentals: EMPTY_FUNDAMENTALS,
    sparkline: idx.sparkline?.length ? idx.sparkline : [previousClose, idx.value],
    about: `${idx.name} is a benchmark market index tracked on ${exchange}.`,
    freshness: idx.freshness,
    quoteTimestamp: idx.quoteTimestamp,
    isStale: idx.isStale,
    providerAvailable: idx.providerAvailable,
    dataStatus: idx.dataStatus,
  };
}

export function useStockSelection({
  setSelectedStockState,
  setStocks,
  stocks,
  indices,
  setCurrentTab,
  addToast,
}: Options) {
  const setSelectedStock = (stock: Stock) => {
    setSelectedStockState((prev) => (prev.symbol === stock.symbol ? prev : stock));
    fetch(`/api/stocks/${encodeURIComponent(stock.symbol)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stock && data.stock.price > 0) {
          setSelectedStockState((prev) =>
            prev.symbol === stock.symbol
              ? {
                  ...prev,
                  ...data.stock,
                  fundamentals: data.stock.fundamentals || prev.fundamentals || EMPTY_FUNDAMENTALS,
                  about: data.stock.about || prev.about,
                }
              : prev
          );
          if (stock.sector !== 'Index') {
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
        }
      })
      .catch(() => {});
  };

  const selectStockBySymbol = async (symbol: string) => {
    const sym = symbol.toUpperCase();
    const matchedIndex = indices.find((i) => i.symbol.toUpperCase() === sym);
    const existing = matchedIndex
      ? buildIndexStock(matchedIndex)
      : stocks.find((s) => s.symbol.toUpperCase() === sym);

    if (existing) {
      setSelectedStockState(existing);
      setCurrentTab('stock-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stock && data.stock.price > 0) {
          const freshStock = data.stock as Stock;
          setSelectedStockState((prev) => {
            const base = existing || (prev.symbol.toUpperCase() === sym ? prev : undefined);
            return {
              ...(base || {}),
              ...freshStock,
              fundamentals: freshStock.fundamentals || base?.fundamentals || EMPTY_FUNDAMENTALS,
              about:
                freshStock.about ||
                base?.about ||
                `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
            } as Stock;
          });
          if (!matchedIndex && freshStock.sector !== 'Index') {
            setStocks((prev) => {
              const idx = prev.findIndex((s) => s.symbol.toUpperCase() === sym);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = {
                  ...updated[idx],
                  ...freshStock,
                  fundamentals: freshStock.fundamentals || updated[idx].fundamentals || EMPTY_FUNDAMENTALS,
                  about: freshStock.about || updated[idx].about,
                };
                return updated;
              }
              return [
                {
                  ...freshStock,
                  fundamentals: freshStock.fundamentals || EMPTY_FUNDAMENTALS,
                  about:
                    freshStock.about ||
                    `${freshStock.name || sym} is listed on the National Stock Exchange of India (NSE).`,
                },
                ...prev,
              ];
            });
          }
          setCurrentTab('stock-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (!existing) {
        addToast(
          'Quote Unavailable',
          `Authentic market quote for ${sym} is currently unavailable.`,
          'error'
        );
      }
    } catch (e) {
      console.warn('Failed to fetch stock quote:', e);
      if (!existing) {
        addToast(
          'Server Unavailable',
          'Unable to reach the market data server. Please try again in some time.',
          'error'
        );
      }
    }
  };

  return { setSelectedStock, selectStockBySymbol };
}
