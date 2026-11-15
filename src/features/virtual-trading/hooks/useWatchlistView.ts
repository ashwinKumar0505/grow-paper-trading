import React,{ useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { Stock } from '../../../types/market';

export function useWatchlistView() {
  const {
    stocks,
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    toggleWatchlistStock,
    createWatchlist,
    selectStockBySymbol,
    openOrderModal,
    setCurrentTab,
  } = useTrading();

  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  const watchlistStocks = activeWatchlist
    ? activeWatchlist.symbols
        .map((sym) => stocks.find((s) => s.symbol === sym))
        .filter((s): s is Stock => s !== undefined)
    : [];

  const searchResults = searchQuery.trim() === ''
    ? []
    : stocks.filter(
        (s) =>
          !activeWatchlist?.symbols.includes(s.symbol) &&
          (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const handleCreateWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchlistName.trim()) {
      createWatchlist(newWatchlistName.trim());
      setNewWatchlistName('');
      setIsCreating(false);
    }
  };

  
 return { stocks, watchlists, activeWatchlistId, setActiveWatchlistId, toggleWatchlistStock, selectStockBySymbol, openOrderModal, setCurrentTab, newWatchlistName, setNewWatchlistName, isCreating, setIsCreating, searchQuery, setSearchQuery, activeWatchlist, watchlistStocks, searchResults, handleCreateWatchlist };
}
export type WatchlistViewModel = ReturnType<typeof useWatchlistView>;
