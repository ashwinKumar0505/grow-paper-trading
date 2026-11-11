import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { Search, X, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Stock } from '../types/market';

interface StockSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockSearchModal: React.FC<StockSearchModalProps> = ({ isOpen, onClose }) => {
  const { stocks, setSelectedStock, selectStockBySymbol, setCurrentTab, openOrderModal } = useTrading();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      setApiResults([]);
    }
  }, [isOpen]);

  // Debounced API search for stocks not in local list
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            // Filter out symbols that are already in local stocks to avoid duplicates
            const extra = data.results.filter(
              (r: any) => !stocks.some((s) => s.symbol.toUpperCase() === r.symbol.toUpperCase())
            );
            setApiResults(extra);
          }
        }
      } catch (err) {
        console.warn('API search failed:', err);
      } finally {
        setIsSearchingApi(false);
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
    onClose();
  };

  const handleSelectApiResult = async (item: any) => {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1D24] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2B303C] overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
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
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#232732] rounded border border-gray-200 dark:border-gray-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        {query.trim() === '' && (
          <div className="px-5 py-2.5 bg-gray-50/60 dark:bg-[#16181F] border-b border-gray-100 dark:border-[#2B303C] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-medium shrink-0">Popular:</span>
            {['RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'ZOMATO', 'TCS', 'JIOFIN'].map((sym) => (
              <button
                key={sym}
                onClick={() => setQuery(sym)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-[#232732] border border-gray-200 dark:border-gray-700 hover:border-[#00D09C] dark:hover:border-[#00D09C] text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap"
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-transparent">
          {localFiltered.length === 0 && apiResults.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">No stocks found matching "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try searching by symbol like INFY, SBIN, or ITC</p>
            </div>
          ) : (
            <>
              {localFiltered.map((stock, idx) => {
                const isSelected = idx === selectedIndex;
                const isPositive = stock.change >= 0;

                return (
                  <div
                    key={stock.symbol}
                    onClick={() => handleSelectStock(stock)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-gray-100/80 dark:bg-[#232732]'
                        : 'hover:bg-gray-50 dark:hover:bg-[#1F232D]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Stock Symbol Avatar Badge */}
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

                    {/* Price & Action */}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          openOrderModal(stock, 'BUY');
                          onClose();
                        }}
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Real Market Search Results from API */}
              {apiResults.length > 0 && (
                <div className="pt-2">
                  <div className="px-4 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    More Real Market Equities
                  </div>
                  {apiResults.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectApiResult(item)}
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
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-[#16181F] border-t border-gray-100 dark:border-[#2B303C] flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-[#282D3B] rounded text-gray-600 dark:text-gray-400">ENTER</kbd> to open stock</span>
          </div>
          <span className="font-semibold text-[#00D09C]">My Paper Trade</span>
        </div>
      </div>
    </div>
  );
};
