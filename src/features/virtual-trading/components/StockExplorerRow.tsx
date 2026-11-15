import React from 'react';
import { Bookmark } from 'lucide-react';
import type { Stock } from '../../../types/market';

interface StockExplorerRowProps {
  stock: Stock;
  inWatchlist: boolean;
  onStockClick: (stock: Stock) => void;
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
  onOpenOrderModal: (e: React.MouseEvent, stock: Stock) => void;
}

export const StockExplorerRow: React.FC<StockExplorerRowProps> = ({
  stock,
  inWatchlist,
  onStockClick,
  onToggleWatchlist,
  onOpenOrderModal,
}) => {
  const isPositive = stock.change >= 0;

  return (
    <tr
      onClick={() => onStockClick(stock)}
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
            onClick={(e) => onToggleWatchlist(e, stock.symbol)}
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
            onClick={(e) => onOpenOrderModal(e, stock)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs"
          >
            Buy
          </button>
        </div>
      </td>
    </tr>
  );
};
