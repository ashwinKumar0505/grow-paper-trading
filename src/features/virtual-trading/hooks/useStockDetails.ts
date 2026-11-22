import { useEffect, useMemo } from 'react';
import { useTrading } from '../../../context/TradingContext';
import type { MarketDepthItem, StockFundamentals } from '../../../types/market';

const BRAND_COLORS: Record<string, string> = {
  'M&M': '#E31837',
  RELIANCE: '#0A5C36',
  TCS: '#1D4ED8',
  HDFCBANK: '#004C8F',
  INFY: '#007CC3',
  ICICIBANK: '#B02A30',
  TATAMOTORS: '#1E3A8A',
  SBIN: '#0284C7',
  ZOMATO: '#E23744',
  ITC: '#0369A1',
  BHARTIARTL: '#DC2626',
  ADANIENT: '#4F46E5',
  WIPRO: '#6D28D9',
  BAJFINANCE: '#005A9C',
  LT: '#0F766E',
};

const UNAVAILABLE_FUNDAMENTALS: StockFundamentals = {
  available: false,
  source: 'unavailable',
  marketCap: null,
  roe: null,
  peRatio: null,
  eps: null,
  pbRatio: null,
  divYield: null,
  industryPe: null,
  bookValue: null,
  debtToEquity: null,
};

const UNAVAILABLE_MARKET_DEPTH: MarketDepthItem = {
  available: false,
  source: 'unavailable',
  reason:
    'Authentic 5-level exchange order-book depth requires a licensed Level-2 data feed and is currently unavailable.',
  timestamp: null,
  bids: [],
  asks: [],
  totalBuyQty: 0,
  totalSellQty: 0,
};

export function useStockDetails() {
  const {
    selectedStock,
    setSelectedStock,
    setCurrentTab,
    openOrderModal,
    toggleWatchlistStock,
    isStockInWatchlist,
    holdings,
    intradayPositions,
    exitPosition,
    addToast,
    planConfig,
    marketStatus,
  } = useTrading();

  const stock = selectedStock;
  const inWatchlist = isStockInWatchlist(stock.symbol);
  const brandBg = BRAND_COLORS[stock.symbol] || '#E31837';

  // Refresh live quote on mount and every 5 seconds while market is open
  useEffect(() => {
    setSelectedStock(stock);
    if (!marketStatus.isOpen) return;

    const timer = window.setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        setSelectedStock(stock);
      }
    }, 5000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol, marketStatus.isOpen]);

  // Dynamic SEO Page Title for active stock
  useEffect(() => {
    const originalTitle = 'Tradedia – One Place to Learn Trading | Paper Trading Simulator';
    const safePrice = Number(stock.price || 0);
    document.title = `${stock.name} (${stock.symbol}) ₹${safePrice.toFixed(2)} – Tradedia`;
    return () => {
      document.title = originalTitle;
    };
  }, [stock.symbol, stock.name, stock.price]);

  const safePrice = Number(stock.price || 0);
  const safeLow = Number(stock.low ?? safePrice);
  const safeHigh = Number(stock.high ?? safePrice);
  const safeOpen = Number(stock.open ?? safePrice);
  const safePrevClose = Number(stock.previousClose ?? safePrice);
  const safeVolume = Number(stock.volume ?? 0);
  const safeWeek52Low = Number(stock.week52Low ?? safeLow);
  const safeWeek52High = Number(stock.week52High ?? safeHigh);

  const fundamentals: StockFundamentals = stock.fundamentals || UNAVAILABLE_FUNDAMENTALS;

  const aboutText =
    stock.about ||
    `${stock.name} (${stock.symbol}) is an Indian public company listed on the ${
      stock.exchange || 'NSE'
    } in the ${stock.sector || 'Equities'} sector.`;

  const marketDepth: MarketDepthItem = useMemo(() => {
    if (stock.marketDepth?.available && stock.marketDepth.bids.length > 0) {
      return stock.marketDepth;
    }
    return UNAVAILABLE_MARKET_DEPTH;
  }, [stock.marketDepth]);

  const currentHolding = holdings.find((h) => h.symbol === stock.symbol);
  const currentPositions = intradayPositions.filter((p) => p.symbol === stock.symbol);

  const todayRange = safeHigh - safeLow || 1;
  const todayPositionPercent = Math.max(0, Math.min(100, ((safePrice - safeLow) / todayRange) * 100));

  const w52Range = safeWeek52High - safeWeek52Low || 1;
  const w52PositionPercent = Math.max(0, Math.min(100, ((safePrice - safeWeek52Low) / w52Range) * 100));

  const lowerCircuit = (stock.lowerCircuit ?? safePrevClose * 0.9).toFixed(2);
  const upperCircuit = (stock.upperCircuit ?? safePrevClose * 1.1).toFixed(2);

  return {
    setCurrentTab,
    openOrderModal,
    toggleWatchlistStock,
    holdings,
    exitPosition,
    addToast,
    planConfig,
    marketStatus,
    stock,
    inWatchlist,
    brandBg,
    safeLow,
    safeHigh,
    safeOpen,
    safePrevClose,
    safeVolume,
    safeWeek52Low,
    safeWeek52High,
    fundamentals,
    aboutText,
    marketDepth,
    currentHolding,
    currentPositions,
    todayPositionPercent,
    w52PositionPercent,
    lowerCircuit,
    upperCircuit,
  };
}
export type StockDetailsModel = ReturnType<typeof useStockDetails>;
