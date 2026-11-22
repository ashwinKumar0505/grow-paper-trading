import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { navigate } from '../../../lib/navigation';
import { Stock } from '../../../types/market';
import { StockSearchResultItem } from './StockSearchResultItem';
import { StockSearchApiResultItem } from './StockSearchApiResultItem';

interface StockSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockSearchModal: React.FC<StockSearchModalProps> = ({ isOpen, onClose }) => {
  const { stocks, setSelectedStock, selectStockBySymbol, setCurrentTab, openOrderModal } = useTrading();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [apiResults, setApiResults] = useState<Array<{ symbol: string; name: string; exchange: string; sector: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      setApiResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            const extra = data.results.filter(
              (r: { symbol: string }) => !stocks.some((s) => s.symbol.toUpperCase() === r.symbol.toUpperCase())
            );
            setApiResults(extra);
          }
        }
      } catch (err) {
        console.warn('API search failed:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, stocks]);

  const localFiltered = query.trim() === ''
    ? stocks.slice(0, 8)
    : stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.sector.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setCurrentTab('stock-detail');
    navigate('/trade');
    onClose();
  };

  const handleSelectApiResult = (item: { symbol: string }) => {
    selectStockBySymbol(item.symbol);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, localFiltered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + localFiltered.length) % Math.max(1, localFiltered.length));
    } else if (e.key === 'Enter' && localFiltered[selectedIndex]) {
      e.preventDefault();
      handleSelectStock(localFiltered[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Search Stocks"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1D24] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2B303C] overflow-hidden z-10 flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-[#2B303C]">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search stocks by name, symbol (e.g. RELIANCE, TCS, ZOMATO)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base focus:outline-hidden"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#232732] rounded border border-gray-200 dark:border-gray-700">
              ESC
            </kbd>
          )}
        </div>

        {query.trim() === '' && (
          <div className="px-5 py-2.5 bg-gray-50/60 dark:bg-[#16181F] border-b border-gray-100 dark:border-[#2B303C] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-medium shrink-0">Popular:</span>
            {['RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'ZOMATO', 'TCS', 'JIOFIN'].map((sym) => (
              <button
                key={sym}
                onClick={() => setQuery(sym)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-[#232732] border border-gray-200 dark:border-gray-700 hover:border-[#00D09C] dark:hover:border-[#00D09C] text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap cursor-pointer"
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-transparent">
          {localFiltered.length === 0 && apiResults.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">No stocks found matching "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try searching by symbol like INFY, SBIN, or ITC</p>
            </div>
          ) : (
            <>
              {localFiltered.map((stock, idx) => (
                <StockSearchResultItem
                  key={stock.symbol}
                  stock={stock}
                  isSelected={idx === selectedIndex}
                  onSelect={handleSelectStock}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onBuy={(e, st) => {
                    e.stopPropagation();
                    openOrderModal(st, 'BUY');
                    onClose();
                  }}
                />
              ))}

              {apiResults.length > 0 && (
                <div className="pt-2">
                  <div className="px-4 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    More Real Market Equities
                  </div>
                  {apiResults.map((item) => (
                    <StockSearchApiResultItem key={item.symbol} item={item} onSelect={handleSelectApiResult} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 dark:bg-[#16181F] border-t border-gray-100 dark:border-[#2B303C] flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">ENTER</kbd> to open stock</span>
          </div>
          <span className="font-semibold text-[#00D09C]">Tradedia</span>
        </div>
      </div>
    </div>
  );
};
