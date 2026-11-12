import React, { lazy, Suspense, useEffect } from 'react';
import { AppLink, usePathname } from './lib/navigation';
import { WorkspaceHeader } from './components/navigation/WorkspaceHeader';
import { TradingProvider, useTrading } from './context/TradingContext';
import { TradingToolbar } from './components/TradingToolbar';
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

const QuizApp = lazy(() => import('./features/quiz/QuizApp'));

function PaperTradingWelcome() {
  const { openAuthModal } = useTrading();
  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height))] bg-[#F8F9FA] text-slate-900 dark:bg-[#121212] dark:text-white">
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-semibold text-emerald-400">PUT YOUR LEARNING INTO PRACTICE</p>
        <h1 className="text-4xl font-bold">Your paper trading desk</h1>
        <p className="mt-5 leading-relaxed text-slate-400">
          Create a paper account to practice with virtual funds, explore stocks, and track your portfolio.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => openAuthModal('signup')} className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950">
            Create paper account
          </button>
          <button onClick={() => openAuthModal('signin')} className="rounded-xl border border-slate-700 px-6 py-3 font-semibold">
            Sign in
          </button>
        </div>
        <AppLink href="/quiz" className="mt-8 block text-sm text-emerald-400">Keep learning with the chart quiz →</AppLink>
      </main>
      <AuthModal />
      <ToastContainer />
    </div>
  );
}

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

const WorkspaceContent: React.FC = () => {
  const { user, setShowLandingPage, setCurrentTab } = useTrading();
  const pathname = usePathname();

  if (['/quiz', '/quiz/play', '/pattern-library'].includes(pathname)) {
    return (
      <div className="quiz-shell">
        <Suspense fallback={<div className="p-12 text-center text-slate-300" role="status">Loading chart practice…</div>}>
          <QuizApp />
        </Suspense>
      </div>
    );
  }

  if ((pathname === '/trade') && !user) {
    return <PaperTradingWelcome />;
  }

  if (pathname !== '/trade') {
    return (
      <main className="p-12 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <AppLink href="/" className="mt-6 inline-block text-emerald-600">Return to TradePlaybook</AppLink>
      </main>
    );
  }


  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height))] w-full max-w-full overflow-x-hidden bg-[#F8F9FA] dark:bg-[#121212] text-[#1E2229] dark:text-[#E2E8F0] transition-colors flex flex-col font-sans">
      {/* Trading-specific tools sit below the shared workspace header. */}
      <TradingToolbar />

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
              TradePlaybook
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

function AppContent() {
  const pathname = usePathname();
  const { currentTab, setCurrentTab } = useTrading();
  useEffect(() => {
    if (window.location.pathname !== pathname) {
      window.history.replaceState(null, '', pathname + window.location.search + window.location.hash);
    }
    document.title = pathname === '/pattern-library' ? 'Pattern Library | TradePlaybook'
      : pathname.startsWith('/quiz') ? 'Chart Quiz | TradePlaybook'
      : 'TradePlaybook – Learn Charts & Practice Paper Trading';
  }, [pathname, setCurrentTab]);

  if (pathname === '/') {
    return <><LandingPage /><AuthModal /><ToastContainer /></>;
  }
  return (
    <div className="workspace-layout min-h-screen bg-[#F8F9FA] text-slate-900 dark:bg-[#121212] dark:text-slate-100">
      <WorkspaceHeader />
      <WorkspaceContent />
    </div>
  );
}

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
