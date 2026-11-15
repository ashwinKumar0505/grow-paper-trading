import React from 'react';
import type { StockExplorerModel } from '../hooks/useStockExplorer';
import { StockExplorerRow } from './StockExplorerRow';

type Props = Pick<
  StockExplorerModel,
  | 'stocks'
  | 'openOrderModal'
  | 'toggleWatchlistStock'
  | 'isStockInWatchlist'
  | 'sectorFilter'
  | 'setSectorFilter'
  | 'marketTab'
  | 'setMarketTab'
  | 'sectors'
  | 'displayStocks'
  | 'handleStockClick'
>;

export function StockExplorerTable({
  openOrderModal,
  toggleWatchlistStock,
  isStockInWatchlist,
  sectorFilter,
  setSectorFilter,
  marketTab,
  setMarketTab,
  sectors,
  displayStocks,
  handleStockClick,
}: Props) {
  return (
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

        {/* Market Tab filter */}
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
            {displayStocks.map((stock) => (
              <StockExplorerRow
                key={stock.symbol}
                stock={stock}
                inWatchlist={isStockInWatchlist(stock.symbol)}
                onStockClick={handleStockClick}
                onToggleWatchlist={(e, symbol) => {
                  e.stopPropagation();
                  toggleWatchlistStock('default', symbol);
                }}
                onOpenOrderModal={(e, st) => {
                  e.stopPropagation();
                  openOrderModal(st, 'BUY');
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
