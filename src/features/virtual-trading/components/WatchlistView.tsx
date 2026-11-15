import { Bookmark } from 'lucide-react';
import React from 'react';
import { useWatchlistView } from '../hooks/useWatchlistView';
import { DesktopWatchlist } from './DesktopWatchlist';
import { MobileWatchlist } from './MobileWatchlist';
import { WatchlistControls } from './WatchlistControls';

export const WatchlistView: React.FC = () => {
 const model = useWatchlistView();
 const { stocks, setCurrentTab, watchlistStocks } = model;
 
 return (
    <div className="space-y-6 animate-fade-in pb-16">
<WatchlistControls {...model} />
      {/* Watchlist Table */}
      {watchlistStocks.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center text-gray-400">
            <Bookmark className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              Watchlist is empty
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Add your favorite stocks to track their real-time price movements and trade anytime.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('explore')}
            className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            Explore Market Stocks
          </button>
        </div>
      ) : (
        <div className="space-y-3">
<MobileWatchlist {...model} />
<DesktopWatchlist {...model} />
        </div>
      )}
    </div>
  );

};
