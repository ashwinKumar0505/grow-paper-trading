import { Trash2,TrendingDown,TrendingUp } from 'lucide-react';
import type { WatchlistViewModel } from '../hooks/useWatchlistView';
type Props = Pick<WatchlistViewModel, 'activeWatchlistId' | 'toggleWatchlistStock' | 'selectStockBySymbol' | 'openOrderModal' | 'watchlistStocks'>;

export function DesktopWatchlist({ activeWatchlistId, toggleWatchlistStock, selectStockBySymbol, openOrderModal, watchlistStocks }: Props) {
 return <>
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

 </>;
}
