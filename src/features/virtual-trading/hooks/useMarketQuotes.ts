import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { IndexData, QuoteFreshness, Stock } from '../../../types/market';
import { getIndianMarketStatus, type MarketStatus } from '../../../utils/marketHours';
import { roundToTick } from '../../../utils/orderEngine';
import { fetchIndices, fetchStocks } from '../services/marketData';

export function useMarketQuotes(
  setStocks: Dispatch<SetStateAction<Stock[]>>,
  setIndices: Dispatch<SetStateAction<IndexData[]>>
) {
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getIndianMarketStatus());
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [marketDataFreshness, setMarketDataFreshness] = useState<QuoteFreshness>('UNAVAILABLE');

  const markQuotesUnavailableOrStale = useCallback(() => {
    setIsLiveConnected(false);
    setStocks((prev) =>
      prev.map((s) => ({
        ...s,
        providerAvailable: false,
        isStale: true,
        isTradableQuote: false,
        freshness: s.quoteTimestamp ? 'STALE' : 'UNAVAILABLE',
        freshnessLabel: s.quoteTimestamp ? 'Stale Quote' : 'Unavailable',
      }))
    );
    setMarketDataFreshness((prev) => (prev === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'STALE'));
  }, [setStocks]);

  const refreshLiveMarketData = useCallback(async () => {
    setIsRefreshingLive(true);
    try {
      const now = Date.now();
      const currentStatus = getIndianMarketStatus(now);
      setMarketStatus(currentStatus);

      const indicesData = await fetchIndices();
      if (indicesData?.success && Array.isArray(indicesData.indices) && indicesData.indices.length > 0) {
        setIndices(indicesData.indices);
      }

      const stocksData = await fetchStocks();
      if (stocksData?.success && Array.isArray(stocksData.stocks) && stocksData.stocks.length > 0) {
        const anyProviderLive = stocksData.stocks.some((s) => s.providerAvailable !== false && !s.isStale);
        const serverFreshness: QuoteFreshness =
          stocksData.freshness ||
          stocksData.stocks[0]?.freshness ||
          (anyProviderLive ? (currentStatus.isOpen ? 'LIVE' : 'LAST_AVAILABLE') : 'STALE');
        setMarketDataFreshness(serverFreshness);

        setStocks((prevStocks) =>
          prevStocks.map((localStock) => {
            const liveStock = stocksData.stocks.find(
              (s) => s.symbol.toUpperCase() === localStock.symbol.toUpperCase()
            );
            if (!liveStock || !Number.isFinite(liveStock.price) || liveStock.price <= 0) {
              return {
                ...localStock,
                providerAvailable: false,
                isStale: true,
                isTradableQuote: false,
                freshness: localStock.quoteTimestamp ? 'STALE' : 'UNAVAILABLE',
              };
            }

            const resolvedPrice = Number(liveStock.price.toFixed(2));
            const prevClose = Number(
              (liveStock.previousClose || localStock.previousClose || resolvedPrice).toFixed(2)
            );
            const change = Number((resolvedPrice - prevClose).toFixed(2));
            const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
            const tickDir =
              resolvedPrice > localStock.price
                ? ('up' as const)
                : resolvedPrice < localStock.price
                  ? ('down' as const)
                  : null;
            const providerAvailable = liveStock.providerAvailable !== false;
            const isStale = Boolean(liveStock.isStale || !providerAvailable || liveStock.freshness === 'STALE');
            const quoteFreshness = isStale
              ? 'STALE'
              : liveStock.freshness ?? serverFreshness;

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
              volume: liveStock.volume ?? localStock.volume,
              week52High: liveStock.week52High || localStock.week52High,
              week52Low: liveStock.week52Low || localStock.week52Low,
              lowerCircuit: liveStock.lowerCircuit ?? roundToTick(prevClose * 0.9),
              upperCircuit: liveStock.upperCircuit ?? roundToTick(prevClose * 1.1),
              fundamentals: liveStock.fundamentals?.available
                ? liveStock.fundamentals
                : localStock.fundamentals?.available
                  ? localStock.fundamentals
                  : liveStock.fundamentals || localStock.fundamentals,
              marketDepth: liveStock.marketDepth ?? localStock.marketDepth,
              sparkline:
                liveStock.sparkline?.length > 0 ? liveStock.sparkline : localStock.sparkline,
              tickDirection: tickDir,
              lastTickTime: now,
              quoteTimestamp: liveStock.quoteTimestamp ?? localStock.quoteTimestamp,
              fetchedAt: liveStock.fetchedAt ?? now,
              freshness: quoteFreshness,
              freshnessLabel: liveStock.freshnessLabel,
              isTradableQuote:
                !isStale &&
                providerAvailable &&
                (liveStock.isTradableQuote ?? (currentStatus.isOpen && quoteFreshness !== 'STALE')),
              isStale,
              providerAvailable,
              staleWarning: liveStock.staleWarning,
              dataStatus: liveStock.dataStatus,
            };
          })
        );
        setIsLiveConnected(anyProviderLive);
        if (anyProviderLive) {
          setLastLiveUpdate(new Date(now));
        }
      } else {
        markQuotesUnavailableOrStale();
      }
    } catch (err) {
      console.warn('Market data provider fetch error, marking quotes stale/unavailable:', err);
      markQuotesUnavailableOrStale();
    } finally {
      setIsRefreshingLive(false);
    }
  }, [markQuotesUnavailableOrStale, setIndices, setStocks]);

  useEffect(() => {
    refreshLiveMarketData();

    const statusTimer = setInterval(() => {
      setMarketStatus(getIndianMarketStatus());
    }, 15000);

    if (!marketStatus.isOpen) {
      return () => clearInterval(statusTimer);
    }

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

  return {
    marketStatus,
    isLiveConnected,
    lastLiveUpdate,
    isRefreshingLive,
    marketDataFreshness,
    refreshLiveMarketData,
  };
}
