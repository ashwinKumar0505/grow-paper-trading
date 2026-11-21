import { useCallback, useEffect, useState } from 'react';
import { ChartPoint, Stock, Timeframe } from '../../../types/market';
import { fetchChartWithStatus } from '../services/marketData';

const SESSION_MINUTES = 375; // 09:15 AM → 03:30 PM IST
export const toMs = (ts: number) => (ts > 1e11 ? ts : ts * 1000);

export function sessionMinute(ts: number): number | null {
  if (!ts) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date(toMs(ts)));
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const mins = h * 60 + m - 555;
  return mins >= 0 && mins <= SESSION_MINUTES ? mins : null;
}

export function useStockChartData(stock: Stock, timeframe: Timeframe, marketIsOpen: boolean) {
  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [chartPrevClose, setChartPrevClose] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const is1D = timeframe === '1D';
  const hasAuthenticLiveQuote =
    Boolean(stock.quoteTimestamp) && stock.providerAvailable !== false && !stock.isStale && stock.price > 0;
  const isLive = marketIsOpen && hasAuthenticLiveQuote;
  const validPrice = stock.price > 0;

  const handleRetryChart = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setChartError(null);
    setStaleNotice(null);
    setHoverIdx(null);
    fetchChartWithStatus(stock.symbol, timeframe).then((res) => {
      if (!alive) return;
      if (res.available && res.points && res.points.length >= 2) {
        setPoints(res.points);
        setChartPrevClose(
          typeof res.previousClose === 'number' && res.previousClose > 0 ? res.previousClose : null
        );
        setStaleNotice(
          res.isStale
            ? res.staleWarning || 'Live chart feed is temporarily unreachable. Showing last authentic cached candles.'
            : null
        );
        setChartError(null);
      } else {
        setPoints(null);
        setChartPrevClose(null);
        setChartError(
          res.error || 'Historical candle data is currently unavailable from the market data provider.'
        );
      }
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [stock.symbol, timeframe, retryToken]);

  useEffect(() => {
    if (!is1D || !hasAuthenticLiveQuote) return;
    setPoints((prev) => {
      if (!prev || prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const price = stock.price;
      if (last.close > 0 && Math.abs(price - last.close) / last.close >= 0.2) {
        return prev;
      }
      const now = Date.now();
      const bucket = Math.floor(now / 120000) * 120000;
      const lastTs = toMs(last.timestamp);
      if (isLive && sessionMinute(now) !== null && bucket > lastTs && sessionMinute(lastTs) !== null) {
        return [
          ...prev,
          {
            time: new Date(bucket)
              .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
              .toUpperCase(),
            timestamp: bucket,
            open: last.close,
            high: Math.max(last.close, price),
            low: Math.min(last.close, price),
            close: price,
            price,
            volume: last.volume || Math.round((stock.volume || 0) / Math.max(1, prev.length)),
          },
        ];
      }
      if (last.close === price) return prev;
      const copy = prev.slice();
      copy[copy.length - 1] = {
        ...last,
        close: price,
        price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
      };
      return copy;
    });
  }, [stock.price, stock.volume, is1D, isLive, hasAuthenticLiveQuote]);

  const data = points || [];
  const lastCandleClose = data.length > 0 ? data[data.length - 1].close : 0;
  const quoteAlignedWithChart =
    hasAuthenticLiveQuote &&
    (lastCandleClose <= 0 || Math.abs(stock.price - lastCandleClose) / lastCandleClose < 0.2);
  const prevClose =
    chartPrevClose && chartPrevClose > 0
      ? chartPrevClose
      : quoteAlignedWithChart && stock.previousClose > 0
        ? stock.previousClose
        : data[0]?.open || 0;
  const currentPrice =
    quoteAlignedWithChart && validPrice
      ? stock.price
      : lastCandleClose > 0
        ? lastCandleClose
        : stock.price;

  return {
    data,
    is1D,
    isLive,
    validPrice,
    prevClose,
    currentPrice,
    isLoading,
    chartError,
    staleNotice,
    hoverIdx,
    setHoverIdx,
    handleRetryChart,
  };
}
