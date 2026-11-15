import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'watchlists' | 'planConfig' | 'openUpgradeModal' | 'subscriptionTier' | 'setWatchlists' | 'setActiveWatchlistId' | 'activeWatchlistId'> & Pick<TradingContextType, 'addToast'>;

export function useWatchlistActions({ watchlists, planConfig, openUpgradeModal, subscriptionTier, setWatchlists, setActiveWatchlistId, addToast, activeWatchlistId }: Options) {
  // Watchlist helpers (Enforces plan's maxWatchlists & maxStocksPerWatchlist)
  const toggleWatchlistStock = (watchlistId: string, symbol: string) => {
    const targetWl = watchlists.find((w) => w.id === watchlistId);
    if (targetWl && !targetWl.symbols.includes(symbol) && targetWl.symbols.length >= planConfig.maxStocksPerWatchlist) {
      openUpgradeModal({
        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
        featureName: `Watchlist Capacity (${planConfig.maxStocksPerWatchlist} Stocks Max on ${planConfig.name})`,
        featureDescription: `Your ${planConfig.name} allows up to ${planConfig.maxStocksPerWatchlist} stocks per watchlist. Upgrade to track more stocks across custom watchlists.`,
      });
      return;
    }
    setWatchlists((prev) =>
      prev.map((wl) => {
        if (wl.id === watchlistId) {
          const exists = wl.symbols.includes(symbol);
          return {
            ...wl,
            symbols: exists ? wl.symbols.filter((s) => s !== symbol) : [...wl.symbols, symbol],
          };
        }
        return wl;
      })
    );
  };

  const createWatchlist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (watchlists.length >= planConfig.maxWatchlists) {
      openUpgradeModal({
        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
        featureName: 'Multiple Custom Watchlists',
        featureDescription: `Your ${planConfig.name} includes ${planConfig.maxWatchlists} watchlist${
          planConfig.maxWatchlists > 1 ? 's' : ''
        }. Upgrade to Beginner (up to 3 watchlists) or Advanced (Unlimited watchlists).`,
      });
      return;
    }
    const newId = 'wl-' + Math.random().toString(36).substring(2, 7);
    setWatchlists((prev) => [...prev, { id: newId, name: trimmed, symbols: [] }]);
    setActiveWatchlistId(newId);
    addToast('Watchlist Created', `Created watchlist "${trimmed}"`, 'success');
  };

  const isStockInWatchlist = (symbol: string, watchlistId?: string) => {
    const targetWl = watchlists.find((wl) => wl.id === (watchlistId || activeWatchlistId));
    return targetWl ? targetWl.symbols.includes(symbol) : false;
  };

  return { toggleWatchlistStock, createWatchlist, isStockInWatchlist };
}
