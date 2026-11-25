import { Plus, Search, Wallet } from 'lucide-react';
import React, { useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { getTradeStockSymbolFromPath, usePathname } from '../../../lib/navigation';
import { StockSearchModal } from './StockSearchModal';
import { TradingNavTabs } from './TradingNavTabs';

export const TradingToolbar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    balance,
    holdings,
    intradayPositions,
    setIsWalletModalOpen,
  } = useTrading();
  const pathname = usePathname();
  const routeSymbol = getTradeStockSymbolFromPath(pathname);
  const navTab = routeSymbol
    ? 'stock-detail'
    : currentTab === 'stock-detail'
    ? 'explore'
    : currentTab;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const totalPositionsCount = holdings.length + intradayPositions.length;

  return (
    <>
      <div className="relative z-30 bg-white dark:bg-[#111C17] border-b border-gray-200 dark:border-[#20332A] transition-colors">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 min-h-14 sm:h-14 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
          {/* Desktop Navigation Links */}
          <TradingNavTabs
            currentTab={navTab}
            setCurrentTab={setCurrentTab}
            totalPositionsCount={totalPositionsCount}
          />

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
                title="Tradedia Virtual Wallet Balance (Click to manage)"
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
        <TradingNavTabs
          currentTab={navTab}
          setCurrentTab={setCurrentTab}
          totalPositionsCount={totalPositionsCount}
          mobile
        />
      </div>

      {/* Global Search Modal */}
      <StockSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
