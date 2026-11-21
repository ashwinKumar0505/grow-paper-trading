import { useEffect,type Dispatch,type SetStateAction } from 'react';
import type { Holding,IntradayPosition,Order,Stock,Watchlist } from '../../../types/market';
import { mergePortfolioQuote,portfolioQuoteSymbols } from '../../../utils/portfolioQuotes';
import { fetchPortfolioQuote } from '../services/marketData';

export function usePortfolioQuotes(
  holdings: Holding[],
  intradayPositions: IntradayPosition[],
  orders: Order[],
  setStocks: Dispatch<SetStateAction<Stock[]>>,
  watchlists: Watchlist[] = []
) {
  // Persisted trades and watchlists may refer to search results outside INITIAL_STOCKS.
  // Restore those quotes independently of the default market-list endpoint.
  const portfolioSymbolsKey = JSON.stringify(
    portfolioQuoteSymbols(holdings, intradayPositions, orders, watchlists)
  );
  useEffect(() => {
    const symbols: string[] = JSON.parse(portfolioSymbolsKey);
    if (symbols.length === 0) return;
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        await Promise.allSettled(symbols.map(async symbol => {
          const data = await fetchPortfolioQuote(symbol, controller.signal);
          if (!data) return;
          if (!controller.signal.aborted && data.success && data.stock) {
            const quote = data.stock;
            setStocks(previous => mergePortfolioQuote(previous, symbol, quote));
          }
        }));
      } finally { running = false; }
    };
    void refresh();
    // Retry missing quotes even outside market hours; refresh every 10s
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        void refresh();
      }
    }, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [portfolioSymbolsKey]);

}
