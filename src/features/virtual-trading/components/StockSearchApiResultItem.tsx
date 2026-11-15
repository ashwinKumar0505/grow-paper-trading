import React from 'react';

interface StockSearchApiResultItemProps {
  item: {
    symbol: string;
    name: string;
    exchange: string;
  };
  onSelect: (item: any) => void;
}

export const StockSearchApiResultItem: React.FC<StockSearchApiResultItemProps> = ({
  item,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(item)}
      className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#1F232D]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#00D09C] flex items-center justify-center font-bold text-xs shrink-0">
          {item.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
              {item.name}
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-400 px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B]">
              {item.exchange}
            </span>
          </div>
          <div className="text-xs text-gray-400 truncate">
            {item.symbol} · Real-time Quote
          </div>
        </div>
      </div>
      <span className="text-xs font-bold text-[#00D09C] hover:underline">
        View & Trade &rarr;
      </span>
    </div>
  );
};
