import {
Bookmark,
Flame
} from 'lucide-react';
import type { StockExplorerModel } from '../hooks/useStockExplorer';
type Props = Pick<StockExplorerModel, 'marketStatus' | 'toggleWatchlistStock' | 'isStockInWatchlist' | 'popularStocks' | 'handleStockClick'>;

export function TrendingStocks({ marketStatus, toggleWatchlistStock, isStockInWatchlist, popularStocks, handleStockClick }: Props) {
 return <>
      {/* 1. Most Bought on MyPaperTrade / Trending Strip */}
      <section className="w-full min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
              Most Bought on Tradedia
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


 </>;
}
