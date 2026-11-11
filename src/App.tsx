import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Navbar } from './components/Navbar';
import { IndicesTicker } from './components/IndicesTicker';
import { ExploreView } from './components/ExploreView';
import { StockDetailView } from './components/StockDetailView';
import { HoldingsView } from './components/HoldingsView';
import { WatchlistView } from './components/WatchlistView';
import { OrdersView } from './components/OrdersView';
import { OrderModal } from './components/OrderModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { WalletModal } from './components/WalletModal';
import { ToastContainer } from './components/ToastContainer';

import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';

const MainContent: React.FC = () => {
  const { currentTab } = useTrading();

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 w-full min-w-0 max-w-full">
      {currentTab === 'explore' && <ExploreView />}
      {currentTab === 'stock-detail' && <StockDetailView />}
      {currentTab === 'holdings' && <HoldingsView />}
      {currentTab === 'watchlist' && <WatchlistView />}
      {currentTab === 'orders' && <OrdersView />}
    </main>
  );
};

const AppContent: React.FC = () => {
  const { user, showLandingPage, setShowLandingPage, setCurrentTab } = useTrading();

  if (!user || showLandingPage) {
    return (
      <>
        <LandingPage />
        <AuthModal />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F9FA] dark:bg-[#121212] text-[#1E2229] dark:text-[#E2E8F0] transition-colors flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Indices Ribbon */}
      <IndicesTicker />

      {/* Content Area */}
      <div className="flex-1 w-full min-w-0 max-w-full">
        <MainContent />
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-[#282C37] bg-white dark:bg-[#15171E] py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLandingPage(true);
                setCurrentTab('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#00D09C] transition-colors cursor-pointer"
            >
              My Paper Trade
            </button>
            <span>·</span>
            <span>Simulated Real-Time NSE/BSE Equity Sandbox</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-gray-400">
            For educational and strategy backtesting purposes only. No real capital at risk.
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <OrderModal />
      <OrderSuccessModal />
      <WalletModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
