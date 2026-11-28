import { useEffect,type Dispatch,type SetStateAction } from 'react';
import type { Holding,IntradayPosition,Order,Stock,Watchlist } from '../../../types/market';
import { mergePortfolioQuote,portfolioQuoteSymbols } from '../../../utils/portfolioQuotes';
import { fetchPortfolioQuote } from '../services/marketData';

const PORTFOLIO_QUOTE_POLL_MS = 15_000;

export function usePortfolioQuotes(
  holdings: Holding[],
  intradayPositions: IntradayPosition[],
  orders: Order[],
  setStocks: Dispatch<SetStateAction<Stock[]>>,
  watchlists: Watchlist[] = [],
  isMarketOpen = true
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
    const loadedSymbols = new Set<string>();
    let running = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const refresh = async () => {
      if (running) return;
      const targets = isMarketOpen ? symbols : symbols.filter((s) => !loadedSymbols.has(s));
      if (targets.length === 0) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        return;
      }
      running = true;
      try {
        await Promise.allSettled(targets.map(async symbol => {
          const data = await fetchPortfolioQuote(symbol, controller.signal);
          if (!data) return;
          if (!controller.signal.aborted && data.success && data.stock) {
            loadedSymbols.add(symbol);
            const quote = data.stock;
            setStocks(previous => mergePortfolioQuote(previous, symbol, quote));
          }
        }));
        if (!isMarketOpen && loadedSymbols.size >= symbols.length && timer) {
          clearInterval(timer);
          timer = null;
        }
      } finally { running = false; }
    };
    void refresh();
    // Poll every 15s during live hours; when closed, retry only missing quotes until loaded.
    timer = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        void refresh();
      }
    }, PORTFOLIO_QUOTE_POLL_MS);
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [portfolioSymbolsKey, isMarketOpen]);

}
