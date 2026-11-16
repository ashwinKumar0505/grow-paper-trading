import { useCallback,useEffect,useState,type Dispatch,type SetStateAction } from 'react';
import type { IndexData,QuoteFreshness,Stock } from '../../../types/market';
import { getIndianMarketStatus,type MarketStatus } from '../../../utils/marketHours';
import { roundToTick } from '../../../utils/orderEngine';
import { fetchIndices,fetchStocks } from '../services/marketData';

export function useMarketQuotes(setStocks: Dispatch<SetStateAction<Stock[]>>, setIndices: Dispatch<SetStateAction<IndexData[]>>) {
  // Indian Stock Market (NSE / BSE) Trading Status
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getIndianMarketStatus());

  // Real Market Data Status
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [marketDataFreshness, setMarketDataFreshness] = useState<QuoteFreshness>(() =>
    getIndianMarketStatus().isOpen ? 'LIVE' : 'LAST_AVAILABLE'
  );

  // Function to fetch real market data from backend provider
  const refreshLiveMarketData = useCallback(async () => {
    setIsRefreshingLive(true);
    try {
      const now = Date.now();
      const currentStatus = getIndianMarketStatus(now);
      setMarketStatus(currentStatus);

      // 1. Fetch live indices
      const indicesData = await fetchIndices();
      if (indicesData) {
        const data = indicesData;
        if (data.success && Array.isArray(data.indices) && data.indices.length > 0) {
          setIndices(data.indices);
        }
      }

      // 2. Fetch live stocks (actual market-derived prices only)
      const stocksData = await fetchStocks();
      if (stocksData) {
        const data = stocksData;
        if (data.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
          const serverFreshness: QuoteFreshness =
            data.freshness || (currentStatus.isOpen ? 'LIVE' : 'LAST_AVAILABLE');
          setMarketDataFreshness(serverFreshness);

          setStocks((prevStocks) => {
            return prevStocks.map((localStock) => {
              const liveStock = data.stocks.find(
                (s) => s.symbol.toUpperCase() === localStock.symbol.toUpperCase()
              );
              if (!liveStock || !Number.isFinite(liveStock.price) || liveStock.price <= 0) {
                return localStock;
              }

              const resolvedPrice = Number(liveStock.price.toFixed(2));
              const prevClose = Number(
                (liveStock.previousClose || localStock.previousClose || resolvedPrice).toFixed(2)
              );
              const change = Number((resolvedPrice - prevClose).toFixed(2));
              const changePercent =
                prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
              const tickDir =
                resolvedPrice > localStock.price
                  ? ('up' as const)
                  : resolvedPrice < localStock.price
                    ? ('down' as const)
                    : null;

              return {
                ...localStock,
                name: liveStock.name || localStock.name,
                price: resolvedPrice,
                previousClose: prevClose,
                change,
                changePercent,
                open: liveStock.open || localStock.open,
                high: liveStock.high || Math.max(localStock.high, resolvedPrice),
                low: liveStock.low || Math.min(localStock.low, resolvedPrice),
                close: resolvedPrice,
                volume: liveStock.volume || localStock.volume,
                week52High: liveStock.week52High || localStock.week52High,
                week52Low: liveStock.week52Low || localStock.week52Low,
                lowerCircuit: liveStock.lowerCircuit ?? roundToTick(prevClose * 0.9),
                upperCircuit: liveStock.upperCircuit ?? roundToTick(prevClose * 1.1),
                sparkline:
                  liveStock.sparkline?.length > 0 ? liveStock.sparkline : localStock.sparkline,
                tickDirection: tickDir,
                lastTickTime: now,
                quoteTimestamp: liveStock.quoteTimestamp ?? now,
                fetchedAt: liveStock.fetchedAt ?? now,
                freshness: liveStock.freshness ?? serverFreshness,
                freshnessLabel: liveStock.freshnessLabel,
                isTradableQuote:
                  liveStock.isTradableQuote ?? (currentStatus.isOpen && serverFreshness !== 'STALE'),
                isStale: liveStock.isStale ?? false,
                providerAvailable: true,
              };
            });
          });
          setIsLiveConnected(true);
          setLastLiveUpdate(new Date(now));
        }
      }
    } catch (err) {
      console.warn('Market data provider fetch error, preserving last available quotes:', err);
      setIsLiveConnected(false);
    } finally {
      setIsRefreshingLive(false);
    }
  }, []);

  // Keep market status updated and fetch real market data
  useEffect(() => {
    // Initial fetch of real market quotes
    refreshLiveMarketData();

    // Check market status (open/closed) every 15 seconds
    const statusTimer = setInterval(() => {
      setMarketStatus(getIndianMarketStatus());
    }, 15000);

    // If market is currently closed, do NOT poll continuously
    if (!marketStatus.isOpen) {
      return () => clearInterval(statusTimer);
    }

    // Only when market is live (09:15 AM - 03:30 PM IST Mon-Fri), refresh real base quotes every 5 seconds
    const liveInterval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        refreshLiveMarketData();
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshLiveMarketData();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(statusTimer);
      clearInterval(liveInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [refreshLiveMarketData, marketStatus.isOpen]);

  return { marketStatus, isLiveConnected, lastLiveUpdate, isRefreshingLive, marketDataFreshness, refreshLiveMarketData };
}
