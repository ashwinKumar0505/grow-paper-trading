import { Plus,Search,X } from 'lucide-react';
import type { WatchlistViewModel } from '../hooks/useWatchlistView';
type Props = Pick<WatchlistViewModel, 'stocks' | 'watchlists' | 'activeWatchlistId' | 'setActiveWatchlistId' | 'toggleWatchlistStock' | 'newWatchlistName' | 'setNewWatchlistName' | 'isCreating' | 'setIsCreating' | 'searchQuery' | 'setSearchQuery' | 'activeWatchlist' | 'searchResults' | 'handleCreateWatchlist'>;

export function WatchlistControls({ stocks, watchlists, activeWatchlistId, setActiveWatchlistId, toggleWatchlistStock, newWatchlistName, setNewWatchlistName, isCreating, setIsCreating, searchQuery, setSearchQuery, activeWatchlist, searchResults, handleCreateWatchlist }: Props) {
 return <>
      {/* Top Header with Watchlist Tabs */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Watchlists
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Keep track of stocks you want to buy or monitor live
            </p>
          </div>

          {/* Create new watchlist button / form */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Watchlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateWatchlist} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Watchlist Name..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                autoFocus
                className="px-3 py-1.5 bg-gray-50 dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00D09C]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#00D09C] text-white text-xs font-bold rounded-lg hover:bg-[#00c090]"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Watchlist Tabs List */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-2 border-t border-gray-100 dark:border-[#282C37] no-scrollbar">
          {watchlists.map((wl) => {
            const isActive = wl.id === activeWatchlistId;
            return (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#00D09C] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-[#20242F] text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-[#282D3B]'
                }`}
              >
                {wl.name} ({wl.symbols.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Add Stock to this Watchlist Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search and add stocks to "${activeWatchlist?.name || 'Watchlist'}"...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Add Dropdown Results */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xl p-2 z-20 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-[#282C37]">
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-[#20242F] rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-xs text-gray-900 dark:text-white">{stock.symbol}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">{stock.name}</span>
                </div>
                <button
                  onClick={() => {
                    toggleWatchlistStock(activeWatchlistId, stock.symbol);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[#00D09C] text-xs font-bold rounded-lg hover:bg-emerald-100"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


 </>;
}
