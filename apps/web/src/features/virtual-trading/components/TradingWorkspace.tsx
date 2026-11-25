import React, { useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { AppLink, getTradeStockSymbolFromPath, usePathname } from '../../../lib/navigation';
import { ExploreView } from './ExploreView';
import { HoldingsView } from './HoldingsView';
import { IndicesTicker } from './IndicesTicker';
import { OrderModal } from './OrderModal';
import { OrderSuccessModal } from './OrderSuccessModal';
import { OrdersView } from './OrdersView';
import { StockDetailView } from './StockDetailView';
import { TradingToolbar } from './TradingToolbar';
import { WatchlistView } from './WatchlistView';

const MainContent: React.FC = () => {
  const { currentTab, selectedStock, selectStockBySymbol } = useTrading();
  const pathname = usePathname();
  const routeSymbol = getTradeStockSymbolFromPath(pathname);
  const lastSyncedRouteSymbol = useRef<string | null>(null);

  useEffect(() => {
    if (!routeSymbol) {
      lastSyncedRouteSymbol.current = null;
      return;
    }
    if (selectedStock.symbol.toUpperCase() !== routeSymbol && lastSyncedRouteSymbol.current !== routeSymbol) {
      lastSyncedRouteSymbol.current = routeSymbol;
      void selectStockBySymbol(routeSymbol);
    }
  }, [routeSymbol, selectedStock.symbol, selectStockBySymbol]);

  const activeTab = routeSymbol
    ? 'stock-detail'
    : currentTab === 'stock-detail'
    ? 'explore'
    : currentTab;

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 min-w-0">
      {activeTab === 'explore' && <ExploreView />}
      {activeTab === 'stock-detail' && <StockDetailView />}
      {activeTab === 'holdings' && <HoldingsView />}
      {activeTab === 'watchlist' && <WatchlistView />}
      {activeTab === 'orders' && <OrdersView />}
    </main>
  );
};

export default function TradingWorkspace() {
  const { setShowLandingPage, setCurrentTab } = useTrading();
  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height))] w-full max-w-full overflow-x-hidden bg-[#F8F9FA] dark:bg-[#0B1310] text-[#1E2229] dark:text-[#E2E8F0] transition-colors flex flex-col font-sans">
      {/* Trading-specific tools sit below the shared workspace header. */}
      <TradingToolbar />

      {/* Indices Ribbon */}
      <IndicesTicker />

      {/* Content Area */}
      <div className="flex-1 w-full min-w-0 max-w-full">
        <MainContent />
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-[#20332a] bg-white dark:bg-[#111c17] py-6 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLandingPage(true);
                setCurrentTab('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#00D09C] transition-colors cursor-pointer"
            >
              Tradedia
            </button>
            <span>·</span>
            <span>One place to learn trading</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium">
            <AppLink href="/terms" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
              Terms
            </AppLink>
            <AppLink href="/privacy" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
              Privacy
            </AppLink>
            <AppLink href="/refund-policy" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
              Refund Policy
            </AppLink>
            <AppLink href="/disclaimer" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
              SEBI Disclaimer
            </AppLink>
            <AppLink href="/contact" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
              Contact
            </AppLink>
          </div>
          <div className="text-center md:text-right text-[11px] text-gray-400">
            Not SEBI registered. For educational and strategy backtesting purposes only. No real capital at risk.
          </div>
        </div>
      </footer>

      {/* Order Modals */}
      <OrderModal />
      <OrderSuccessModal />
    </div>
  );
}
