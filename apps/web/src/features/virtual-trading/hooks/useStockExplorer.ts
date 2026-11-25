import { useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { buildTradeStockPath, navigate } from '../../../lib/navigation';
import { Stock } from '../../../types/market';

export function useStockExplorer() {
  const {
    stocks,
    marketStatus,
    setSelectedStock,
    setCurrentTab,
    openOrderModal,
    toggleWatchlistStock,
    isStockInWatchlist,
  } = useTrading();

  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [marketTab, setMarketTab] = useState<'nifty' | 'gainers' | 'losers'>('nifty');

  // Sectors list
  const sectors = [
    'All',
    'Banking & Financials',
    'Information Technology',
    'Automobile',
    'Energy & Conglomerate',
    'FMCG & Consumer Goods',
    'Metals & Mining',
    'Pharmaceuticals & Healthcare',
    'Infrastructure & Logistics',
  ];

  // Top gainers & losers for preview cards
  const sortedStocks = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
  const topGainers = sortedStocks.slice(0, 4);
  const topLosers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);

  // Most bought on MyPaperTrade (popular heavyweights)
  const popularStocks = stocks.filter((s) =>
    ['RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'ZOMATO', 'INFY', 'SBIN'].includes(s.symbol)
  );

  // Filtered by sector and section: exactly 20 stocks for NIFTY 50, Top Gainers, and Top Losers
  const computeSectionStocks = () => {
    let pool = [...stocks];
    if (sectorFilter !== 'All') {
      pool = pool.filter((s) => s.sector.toLowerCase().includes(sectorFilter.toLowerCase()));
    }

    if (marketTab === 'gainers') {
      return [...pool].sort((a, b) => b.changePercent - a.changePercent).slice(0, 20);
    }
    if (marketTab === 'losers') {
      return [...pool].sort((a, b) => a.changePercent - b.changePercent).slice(0, 20);
    }
    // 'nifty' default: top 20 NIFTY 50 bluechip heavyweights
    return pool.slice(0, 20);
  };

  const displayStocks = computeSectionStocks();

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    setCurrentTab('stock-detail');
    navigate(buildTradeStockPath(stock.symbol));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  
 return { stocks, marketStatus, openOrderModal, toggleWatchlistStock, isStockInWatchlist, sectorFilter, setSectorFilter, marketTab, setMarketTab, sectors, topGainers, topLosers, popularStocks, displayStocks, handleStockClick };
}
export type StockExplorerModel = ReturnType<typeof useStockExplorer>;
