import {
  Bell,
  Bookmark,
  ChevronsUpDown,
  LineChart,
  Link2,
} from 'lucide-react';
import { navigate } from '../../../lib/navigation';
import type { StockDetailsModel } from '../hooks/useStockDetails';
import { StockChart } from './StockChart';
type Props = Pick<StockDetailsModel, 'toggleWatchlistStock' | 'addToast' | 'stock' | 'inWatchlist' | 'brandBg'>;

export function StockQuoteCard({ toggleWatchlistStock, addToast, stock, inWatchlist, brandBg }: Props) {
  const isIndex = stock.sector === 'Index';

  return <>
          {/* 1. Unified Stock Header + Chart Section (Matches Groww reference layout) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-5 sm:p-6 shadow-xs">
            {/* Top row: Brand Logo on left, Action buttons on right */}
            <div className="flex items-start justify-between gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-xs select-none"
                style={{ backgroundColor: brandBg }}
              >
                {stock.symbol.slice(0, 3)}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {!isIndex && (
                  <button
                    type="button"
                    onClick={() => navigate(`/screener/analysis?symbol=${encodeURIComponent(stock.symbol)}`)}
                    className="h-9 px-3.5 rounded-full border border-[#00B386]/40 bg-[#00B386]/10 hover:bg-[#00B386] text-[#008F6B] dark:text-[#00D09C] hover:text-white dark:hover:text-[#04261C] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Open ${stock.symbol} in Stock Screener Analysis`}
                  >
                    <LineChart className="w-3.5 h-3.5 shrink-0" />
                    <span>Analyse this stock</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    addToast('Link Copied', `${stock.name} quote link copied to clipboard`, 'info');
                  }}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732] transition-colors cursor-pointer"
                  title="Copy stock link"
                >
                  <Link2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addToast(
                      'Price Alert Set',
                      `We'll notify you on significant price movement in ${stock.symbol}`,
                      'info'
                    )
                  }
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732] transition-colors cursor-pointer"
                  title="Set price alert"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleWatchlistStock('default', stock.symbol)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                    inWatchlist
                      ? 'border-[#00B386] text-[#00B386] bg-[#00B386]/10'
                      : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732]'
                  }`}
                  title={inWatchlist ? 'Remove from Watchlist' : 'Save to Watchlist'}
                >
                  <Bookmark className={`w-4 h-4 ${inWatchlist ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Symbol · Exchange pill & Stock Name */}
            <div className="mt-3 mb-2">
              <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                <span>{stock.symbol}</span>
                <span>·</span>
                <span>{stock.exchange}</span>
                <ChevronsUpDown className="w-3 h-3" />
              </div>
              <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
                {stock.name}
              </h1>
            </div>

            {/* Interactive Groww Chart (Includes Price Readout, X-Axis Times/Dates, Timeframe Pills & Terminal Mode) */}
            <StockChart stock={stock} />
          </div>


 </>;
}
