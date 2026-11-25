import React from 'react';
import { navigate } from '../../../lib/navigation';

interface TradingNavTabsProps {
  currentTab: string;
  setCurrentTab: (tab: any) => void;
  totalPositionsCount: number;
  mobile?: boolean;
}

export const TradingNavTabs: React.FC<TradingNavTabsProps> = ({
  currentTab,
  setCurrentTab,
  totalPositionsCount,
  mobile = false,
}) => {
  const handleNav = (tab: string) => {
    setCurrentTab(tab);
    navigate('/trade');
  };

  if (mobile) {
    return (
      <div className="xl:hidden border-t border-gray-100 dark:border-[#20332A] bg-white dark:bg-[#111C17] px-2 py-1.5 w-full">
        <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-center">
          <button
            onClick={() => handleNav('explore')}
            className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
              currentTab === 'explore'
                ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => handleNav('holdings')}
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
            onClick={() => handleNav('watchlist')}
            className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
              currentTab === 'watchlist'
                ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => handleNav('orders')}
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
    );
  }

  return (
    <nav className="hidden xl:flex items-center gap-6 text-sm font-semibold">
      <button
        onClick={() => handleNav('explore')}
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
        onClick={() => handleNav('holdings')}
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
        onClick={() => handleNav('watchlist')}
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
        onClick={() => handleNav('orders')}
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
  );
};
