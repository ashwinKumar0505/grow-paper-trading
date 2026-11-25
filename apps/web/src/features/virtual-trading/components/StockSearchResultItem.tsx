import React from 'react';
import type { Stock } from '../../../types/market';

interface StockSearchResultItemProps {
  stock: Stock;
  isSelected: boolean;
  onSelect: (stock: Stock) => void;
  onMouseEnter: () => void;
  onBuy: (e: React.MouseEvent, stock: Stock) => void;
}

export const StockSearchResultItem: React.FC<StockSearchResultItemProps> = ({
  stock,
  isSelected,
  onSelect,
  onMouseEnter,
  onBuy,
}) => {
  const isPositive = stock.change >= 0;

  return (
    <div
      onClick={() => onSelect(stock)}
      onMouseEnter={onMouseEnter}
      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
        isSelected
          ? 'bg-gray-100/80 dark:bg-[#232732]'
          : 'hover:bg-gray-50 dark:hover:bg-[#1F232D]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center font-bold text-xs text-gray-800 dark:text-gray-200 shrink-0">
          {stock.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
              {stock.name}
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#282D3B] shrink-0">
              {stock.exchange}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              {stock.symbol}
            </span>
            <span>·</span>
            <span className="truncate">{stock.sector}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-right">
        <div>
          <div className="font-mono tabular-nums font-bold text-sm text-gray-900 dark:text-white">
            ₹{stock.price.toFixed(2)}
          </div>
          <div
            className={`font-mono tabular-nums text-xs font-semibold flex items-center justify-end gap-0.5 ${
              isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
            }`}
          >
            {isPositive ? '+' : ''}
            {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
            {stock.changePercent.toFixed(2)}%)
          </div>
        </div>

        <button
          onClick={(e) => onBuy(e, stock)}
          className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs"
        >
          Buy
        </button>
      </div>
    </div>
  );
};
