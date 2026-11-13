import { navigate } from '../lib/navigation';
import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { StockSearchModal } from './StockSearchModal';
import { Search, Wallet, Plus } from 'lucide-react';

export const TradingToolbar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    balance,
    holdings,
    intradayPositions,
    setIsWalletModalOpen,
  } = useTrading();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const totalPositionsCount = holdings.length + intradayPositions.length;

  return (
    <>
      <div className="relative z-30 bg-white dark:bg-[#111C17] border-b border-gray-200 dark:border-[#20332A] transition-colors">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 min-h-14 sm:h-14 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setCurrentTab('explore');
                navigate('/trade');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-[#9AB0A5] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Explore
              {currentTab === 'explore' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                setCurrentTab('holdings');
                navigate('/trade');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'holdings'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-[#9AB0A5] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Holdings & Positions</span>
              {totalPositionsCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#00D09C]">
                  {totalPositionsCount}
                </span>
              )}
              {currentTab === 'holdings' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                setCurrentTab('watchlist');
                navigate('/trade');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'watchlist'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-[#9AB0A5] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Watchlist
              {currentTab === 'watchlist' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                setCurrentTab('orders');
                navigate('/trade');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'orders'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-[#9AB0A5] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Orders
              {currentTab === 'orders' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>
          </nav>

          {/* Right Actions: Stock Search & Wallet Pill with + Add Money */}
          <div className="flex w-full sm:w-auto items-center justify-between gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Quick Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-500 dark:text-[#9AB0A5] bg-gray-100 dark:bg-[#16241E] hover:bg-gray-200/80 dark:hover:bg-[#1C2D25] rounded-xl transition-all border border-transparent dark:border-[#20332A] w-48 xl:w-64 justify-between shrink-0 cursor-pointer"
              title="Search NSE/BSE stocks"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">Search stocks to trade…</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-white dark:bg-[#111C17] rounded border border-gray-200 dark:border-[#20332A]">
                /
              </kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#16241E] hover:bg-gray-200/80 transition-colors shrink-0 cursor-pointer"
              title="Search stocks"
              aria-label="Search stocks"
            >
              <Search className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Wallet Cash Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-[#132722] border border-[#00D09C]/30 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-2 px-2 py-0.5 text-left cursor-pointer group"
                title="NiftyLens Virtual Wallet Balance (Click to manage)"
              >
                <Wallet className="w-4 h-4 text-[#00D09C] shrink-0" />
                <div>
                  <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-gray-500 dark:text-[#9AB0A5] leading-none">
                    Available Margin
                  </div>
                  <div className="font-mono tabular-nums font-bold text-xs sm:text-sm text-[#00D09C]">
                    ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#00D09C] hover:bg-[#00c090] text-[#04261C] text-xs font-extrabold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Add Virtual Cash to Wallet"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cash</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub Navigation bar */}
        <div className="xl:hidden border-t border-gray-100 dark:border-[#20332A] bg-white dark:bg-[#111C17] px-2 py-1.5 w-full">
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-center">
            <button
              onClick={() => {
                setCurrentTab('explore');
                navigate('/trade');
              }}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => {
                setCurrentTab('holdings');
                navigate('/trade');
              }}
              className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                currentTab === 'holdings'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <span>Holdings</span>
              {totalPositionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#00D09C] text-[#04261C] font-bold leading-none">
                  {totalPositionsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setCurrentTab('watchlist');
                navigate('/trade');
              }}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'watchlist'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => {
                setCurrentTab('orders');
                navigate('/trade');
              }}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'orders'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Orders
            </button>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <StockSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
