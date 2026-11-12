import { navigate } from '../lib/navigation';
import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Stock } from '../types/market';
import {
  TrendingUp,
  TrendingDown,
  Bookmark,
  ArrowRight,
  Flame,
  Award,
  Zap,
} from 'lucide-react';

export const ExploreView: React.FC = () => {
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
    navigate('/trade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Most Bought on MyPaperTrade / Trending Strip */}
      <section className="w-full min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
              Most Bought on TradePlaybook
            </h2>
          </div>
          <span className="text-xs font-semibold flex items-center gap-1.5" title={marketStatus.subText}>
            <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-[#00D09C] animate-pulse' : 'bg-amber-400'}`} />
            <span className={marketStatus.isOpen ? 'text-[#00D09C]' : 'text-amber-600 dark:text-amber-400'}>
              {marketStatus.isOpen ? 'Live Market' : 'Market Closed (LTP)'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {popularStocks.map((stock) => {
            const isPositive = stock.change >= 0;
            const inWatchlist = isStockInWatchlist(stock.symbol);

            return (
              <div
                key={stock.symbol}
                onClick={() => handleStockClick(stock)}
                className={`group p-3 sm:p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] hover:border-[#00D09C] dark:hover:border-[#00D09C] transition-all hover:shadow-md cursor-pointer flex flex-col justify-between min-w-0 ${
                  stock.tickDirection === 'up' ? 'tick-up' : stock.tickDirection === 'down' ? 'tick-down' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center font-bold text-[11px] text-gray-700 dark:text-gray-200">
                      {stock.symbol.slice(0, 3)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlistStock('default', stock.symbol);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        inWatchlist
                          ? 'text-[#00D09C]'
                          : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                      }`}
                      title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {stock.symbol}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {stock.name}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-gray-100 dark:border-[#282C37]">
                  <div className="font-mono tabular-nums font-bold text-sm text-gray-900 dark:text-white">
                    ₹{stock.price.toFixed(2)}
                  </div>
                  <div
                    className={`font-mono tabular-nums text-xs font-semibold flex items-center gap-0.5 ${
                      isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                    }`}
                  >
                    {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Top Gainers & Losers Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Gainers */}
        <div className="p-5 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#282C37]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-[#132A22] flex items-center justify-center text-[#00D09C]">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Top Gainers Today
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">NSE Stocks</span>
          </div>

          <div className="space-y-3">
            {topGainers.map((stk) => (
              <div
                key={stk.symbol}
                onClick={() => handleStockClick(stk)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#20242F] cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{stk.symbol}</span>
                    <span className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">{stk.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">{stk.sector}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono tabular-nums font-bold text-xs text-gray-900 dark:text-white">
                    ₹{stk.price.toFixed(2)}
                  </div>
                  <div className="font-mono tabular-nums text-xs font-semibold text-[#00D09C]">
                    +{stk.change.toFixed(2)} (+{stk.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="p-5 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#282C37]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-[#EB5B5B]">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Top Losers Today
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">NSE Stocks</span>
          </div>

          <div className="space-y-3">
            {topLosers.map((stk) => (
              <div
                key={stk.symbol}
                onClick={() => handleStockClick(stk)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#20242F] cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{stk.symbol}</span>
                    <span className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">{stk.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">{stk.sector}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono tabular-nums font-bold text-xs text-gray-900 dark:text-white">
                    ₹{stk.price.toFixed(2)}
                  </div>
                  <div className="font-mono tabular-nums text-xs font-semibold text-[#EB5B5B]">
                    {stk.change.toFixed(2)} ({stk.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Stocks Explorer Table with NIFTY 50, Top Gainers, Top Losers (20 Each) */}
      <section className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>
                {marketTab === 'nifty'
                  ? 'NIFTY 50 Top Stocks'
                  : marketTab === 'gainers'
                  ? 'Top Gainers'
                  : 'Top Losers'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#20242F] text-gray-600 dark:text-gray-300 font-mono font-semibold">
                {displayStocks.length} Stocks
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Live market quotes, market cap, and instant 1-click paper trading
            </p>
          </div>

          {/* Market Tab filter: NIFTY 50 (20), Top Gainers (20), Top Losers (20) */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#20242F] rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setMarketTab('nifty')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                marketTab === 'nifty'
                  ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              NIFTY 50 (20)
            </button>
            <button
              onClick={() => setMarketTab('gainers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                marketTab === 'gainers'
                  ? 'bg-white dark:bg-[#1A1D24] text-[#00D09C] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Top Gainers (20)
            </button>
            <button
              onClick={() => setMarketTab('losers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                marketTab === 'losers'
                  ? 'bg-white dark:bg-[#1A1D24] text-[#EB5B5B] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Top Losers (20)
            </button>
          </div>
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-gray-100 dark:border-[#282C37] mb-4">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSectorFilter(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                sectorFilter === sec
                  ? 'bg-[#00D09C] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#20242F] text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-[#282D3B]'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Stocks Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#282C37] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3 text-right">Market Price (LTP)</th>
                <th className="py-3 px-3 text-right">1D Change</th>
                <th className="py-3 px-3 text-right hidden sm:table-cell">52W High / Low</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Market Cap</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
              {displayStocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="font-semibold text-sm">No stocks found for "{sectorFilter}" in this section.</p>
                    <button
                      onClick={() => setSectorFilter('All')}
                      className="mt-2 text-xs font-bold text-[#00D09C] hover:underline cursor-pointer"
                    >
                      Show All Sectors
                    </button>
                  </td>
                </tr>
              )}
              {displayStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                const inWatchlist = isStockInWatchlist(stock.symbol);

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => handleStockClick(stock)}
                    className="hover:bg-gray-50/80 dark:hover:bg-[#20242F] cursor-pointer transition-colors group"
                  >
                    {/* Company */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center font-bold text-xs text-gray-800 dark:text-gray-200 shrink-0">
                          {stock.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 dark:text-white">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400 px-1 py-0.2 bg-gray-100 dark:bg-[#282D3B] rounded">
                              {stock.exchange}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] sm:max-w-[260px]">
                            {stock.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price with live tick animation */}
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={`inline-block font-extrabold text-sm text-gray-900 dark:text-white px-1.5 py-0.5 rounded ${
                          stock.tickDirection === 'up'
                            ? 'tick-up text-[#00D09C]'
                            : stock.tickDirection === 'down'
                            ? 'tick-down text-[#EB5B5B]'
                            : ''
                        }`}
                      >
                        ₹{stock.price.toFixed(2)}
                      </span>
                    </td>

                    {/* 1D Change */}
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span
                        className={`inline-flex items-center font-bold text-xs ${
                          isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                        }`}
                      >
                        {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                      </span>
                    </td>

                    {/* 52W High / Low */}
                    <td className="py-3.5 px-3 text-right hidden sm:table-cell font-mono tabular-nums text-xs text-gray-500 dark:text-gray-400">
                      <div>₹{stock.week52High.toFixed(0)}</div>
                      <div className="text-[11px] text-gray-400">₹{stock.week52Low.toFixed(0)}</div>
                    </td>

                    {/* Market Cap */}
                    <td className="py-3.5 px-3 text-right hidden md:table-cell text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {stock.fundamentals.marketCap}
                    </td>

                    {/* Quick Trade / Action */}
                    <td className="py-3.5 px-3 text-right shrink-0">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlistStock('default', stock.symbol);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            inWatchlist
                              ? 'border-[#00D09C] text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/30'
                              : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600'
                          }`}
                          title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderModal(stock, 'BUY');
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs"
                        >
                          Buy
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
