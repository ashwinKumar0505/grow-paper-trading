import { useEffect,useMemo } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { generateMarketDepth } from '../../../data/mockStocks';
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
    const originalTitle = 'Nifty Lens – Live NSE/BSE Stock Paper Trading Simulator';
    const safePrice = Number(stock.price || 0);
    document.title = `${stock.name} (${stock.symbol}) ₹${safePrice.toFixed(2)} – Nifty Lens`;
    return () => {
      document.title = originalTitle;
    };
  }, [stock.symbol, stock.name, stock.price]);

  const safePrice = Number(stock.price || 0);
  const safeLow = Number(stock.low ?? safePrice * 0.985);
  const safeHigh = Number(stock.high ?? safePrice * 1.015);
  const safeOpen = Number(stock.open ?? safePrice);
  const safePrevClose = Number(stock.previousClose ?? safePrice);
  const safeVolume = Number(stock.volume ?? 1250000);
  const safeWeek52Low = Number(stock.week52Low ?? safePrice * 0.78);
  const safeWeek52High = Number(stock.week52High ?? safePrice * 1.24);

  const fundamentals = stock.fundamentals || {
    marketCap: `₹${Math.max(12000, Math.round(safePrice * 42)).toLocaleString('en-IN')} Cr`,
    roe: 16.8,
    peRatio: 23.4,
    eps: Number((safePrice / 23.4).toFixed(2)),
    pbRatio: 3.8,
    divYield: 1.15,
    industryPe: 25.1,
    bookValue: Number((safePrice / 3.8).toFixed(2)),
    debtToEquity: 0.32,
  };

  const aboutText =
    stock.about ||
    `${stock.name} (${stock.symbol}) is an actively traded Indian public company listed on the ${
      stock.exchange || 'NSE'
    } in the ${stock.sector || 'Equities'} sector.`;

  const marketDepth = useMemo(() => generateMarketDepth(safePrice), [safePrice]);

  const currentHolding = holdings.find((h) => h.symbol === stock.symbol);
  const currentPositions = intradayPositions.filter((p) => p.symbol === stock.symbol);

  const todayRange = safeHigh - safeLow || 1;
  const todayPositionPercent = Math.max(0, Math.min(100, ((safePrice - safeLow) / todayRange) * 100));

  const w52Range = safeWeek52High - safeWeek52Low || 1;
  const w52PositionPercent = Math.max(0, Math.min(100, ((safePrice - safeWeek52Low) / w52Range) * 100));

  const lowerCircuit = (safePrevClose * 0.8).toFixed(2);
  const upperCircuit = (safePrevClose * 1.2).toFixed(2);

  
 return { setCurrentTab, openOrderModal, toggleWatchlistStock, holdings, exitPosition, addToast, planConfig, marketStatus, stock, inWatchlist, brandBg, safeLow, safeHigh, safeOpen, safePrevClose, safeVolume, safeWeek52Low, safeWeek52High, fundamentals, aboutText, marketDepth, currentHolding, currentPositions, todayPositionPercent, w52PositionPercent, lowerCircuit, upperCircuit };
}
export type StockDetailsModel = ReturnType<typeof useStockDetails>;
