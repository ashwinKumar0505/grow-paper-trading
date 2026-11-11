import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Bookmark, Plus, Trash2, TrendingUp, TrendingDown, Search, X } from 'lucide-react';
import { Stock } from '../types/market';

export const WatchlistView: React.FC = () => {
  const {
    stocks,
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    toggleWatchlistStock,
    createWatchlist,
    selectStockBySymbol,
    openOrderModal,
    setCurrentTab,
  } = useTrading();

  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  const watchlistStocks = activeWatchlist
    ? activeWatchlist.symbols
        .map((sym) => stocks.find((s) => s.symbol === sym))
        .filter((s): s is Stock => s !== undefined)
    : [];

  const searchResults = searchQuery.trim() === ''
    ? []
    : stocks.filter(
        (s) =>
          !activeWatchlist?.symbols.includes(s.symbol) &&
          (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const handleCreateWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchlistName.trim()) {
      createWatchlist(newWatchlistName.trim());
      setNewWatchlistName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header with Watchlist Tabs */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Watchlists
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Keep track of stocks you want to buy or monitor live
            </p>
          </div>

          {/* Create new watchlist button / form */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Watchlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateWatchlist} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Watchlist Name..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                autoFocus
                className="px-3 py-1.5 bg-gray-50 dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00D09C]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#00D09C] text-white text-xs font-bold rounded-lg hover:bg-[#00c090]"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Watchlist Tabs List */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-2 border-t border-gray-100 dark:border-[#282C37] no-scrollbar">
          {watchlists.map((wl) => {
            const isActive = wl.id === activeWatchlistId;
            return (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#00D09C] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#20242F] text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-[#282D3B]'
                }`}
              >
                {wl.name} ({wl.symbols.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Add Stock to this Watchlist Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search and add stocks to "${activeWatchlist?.name || 'Watchlist'}"...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Add Dropdown Results */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xl p-2 z-20 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-[#282C37]">
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-[#20242F] rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-xs text-gray-900 dark:text-white">{stock.symbol}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">{stock.name}</span>
                </div>
                <button
                  onClick={() => {
                    toggleWatchlistStock(activeWatchlistId, stock.symbol);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[#00D09C] text-xs font-bold rounded-lg hover:bg-emerald-100"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist Table */}
      {watchlistStocks.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center text-gray-400">
            <Bookmark className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              Watchlist is empty
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Add your favorite stocks to track their real-time price movements and trade anytime.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('explore')}
            className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            Explore Market Stocks
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Watchlist Cards View (< md) */}
          <div className="block md:hidden space-y-3">
            {watchlistStocks.map((stock) => {
              const isPositive = stock.change >= 0;

              return (
                <div
                  key={stock.symbol}
                  className="p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs space-y-3"
                >
                  {/* Top Bar: Company info & Live Price */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => selectStockBySymbol(stock.symbol)}
                      className="cursor-pointer min-w-0 flex-1 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center font-bold text-xs text-gray-800 dark:text-gray-200 shrink-0">
                        {stock.symbol.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{stock.symbol}</span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 font-semibold uppercase">
                            {stock.exchange}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[170px] mt-0.5">
                          {stock.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono tabular-nums font-extrabold text-base ${
                          stock.tickDirection === 'up'
                            ? 'text-[#00D09C]'
                            : stock.tickDirection === 'down'
                            ? 'text-[#EB5B5B]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        ₹{stock.price.toFixed(2)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-xs font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                          isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>
                          {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#282C37]">
                    <span className="text-[11px] text-gray-400">{stock.sector}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openOrderModal(stock, 'BUY')}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => openOrderModal(stock, 'SELL')}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#EB5B5B] hover:bg-[#d94f4f] rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => toggleWatchlistStock(activeWatchlistId, stock.symbol)}
                        className="p-1.5 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Remove from Watchlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Watchlist Table View (>= md) */}
          <div className="hidden md:block bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#282C37] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-[#16181F]">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4 text-right">LTP (Live Price)</th>
                    <th className="py-3 px-4 text-right">1D Change</th>
                    <th className="py-3 px-4 text-center hidden sm:table-cell">Intraday Trend</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
                  {watchlistStocks.map((stock) => {
                    const isPositive = stock.change >= 0;

                    // Mini SVG Sparkline
                    const minP = Math.min(...stock.sparkline);
                    const maxP = Math.max(...stock.sparkline);
                    const range = maxP - minP || 1;
                    const sparkWidth = 90;
                    const sparkHeight = 26;
                    const points = stock.sparkline
                      .map((val, idx) => {
                        const x = (idx / (stock.sparkline.length - 1)) * sparkWidth;
                        const y = sparkHeight - ((val - minP) / range) * (sparkHeight - 4) - 2;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(' ');

                    return (
                      <tr
                        key={stock.symbol}
                        className="hover:bg-gray-50/70 dark:hover:bg-[#20242F] transition-colors"
                      >
                        {/* Company Name */}
                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => selectStockBySymbol(stock.symbol)}
                            className="cursor-pointer group flex items-center gap-3"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center font-bold text-xs text-gray-800 dark:text-gray-200 shrink-0">
                              {stock.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-[#00D09C] transition-colors flex items-center gap-1.5">
                                <span>{stock.symbol}</span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 font-semibold uppercase">
                                  {stock.exchange}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                {stock.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Live LTP */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          <div
                            className={`font-extrabold text-sm inline-block px-1.5 py-0.5 rounded ${
                              stock.tickDirection === 'up'
                                ? 'tick-up text-[#00D09C]'
                                : stock.tickDirection === 'down'
                                ? 'tick-down text-[#EB5B5B]'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            ₹{stock.price.toFixed(2)}
                          </div>
                        </td>

                        {/* 1D Change */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          <div
                            className={`font-bold text-xs flex items-center justify-end gap-1 ${
                              isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                            }`}
                          >
                            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>
                              {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                            </span>
                          </div>
                        </td>

                        {/* Mini Sparkline Chart */}
                        <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                          <svg
                            width={sparkWidth}
                            height={sparkHeight}
                            className="inline-block overflow-visible"
                          >
                            <polyline
                              fill="none"
                              stroke={isPositive ? '#00D09C' : '#EB5B5B'}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points}
                            />
                          </svg>
                        </td>

                        {/* Actions: Buy / Sell / Remove */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openOrderModal(stock, 'BUY')}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => openOrderModal(stock, 'SELL')}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#EB5B5B] hover:bg-[#d94f4f] rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              Sell
                            </button>
                            <button
                              onClick={() => toggleWatchlistStock(activeWatchlistId, stock.symbol)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Remove from Watchlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
