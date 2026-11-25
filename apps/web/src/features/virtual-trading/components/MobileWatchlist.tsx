import { Trash2,TrendingDown,TrendingUp } from 'lucide-react';
import type { WatchlistViewModel } from '../hooks/useWatchlistView';
type Props = Pick<WatchlistViewModel, 'activeWatchlistId' | 'toggleWatchlistStock' | 'selectStockBySymbol' | 'openOrderModal' | 'watchlistStocks'>;

export function MobileWatchlist({ activeWatchlistId, toggleWatchlistStock, selectStockBySymbol, openOrderModal, watchlistStocks }: Props) {
 return <>
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


 </>;
}
