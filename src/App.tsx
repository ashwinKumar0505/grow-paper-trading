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
import { AuthGatePlaceholder } from './components/AuthGatePlaceholder';

import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PricingPage } from './components/PricingPage';
import { UpgradeModal } from './components/UpgradeModal';
import { RazorpayCheckoutModal } from './components/RazorpayCheckoutModal';
import { LegalPage, type LegalPageKind } from './components/LegalPages';

const QuizApp = lazy(() => import('./features/quiz/QuizApp'));
const ScreenerApp = lazy(() => import('./features/screener/App'));

const MainContent: React.FC = () => {
  const { currentTab } = useTrading();

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 min-w-0">
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

  // 0. Pricing & Subscription Packages Page (/pricing) is open to everyone
  if (pathname === '/pricing') {
    return <PricingPage />;
  }

  // 0b. Legal & Compliance Pages are public
  const legalRoutes: Record<string, LegalPageKind> = {
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/refund-policy': 'refund-policy',
    '/disclaimer': 'disclaimer',
    '/contact': 'contact',
  };
  if (pathname in legalRoutes) {
    return <LegalPage kind={legalRoutes[pathname]} />;
  }

  // 1. Stock Screener modules require login
  if (pathname.startsWith('/screener')) {
    if (!user) {
      return <AuthGatePlaceholder feature="screener" />;
    }
    return (
      <Suspense
        fallback={
          <div className="p-12 text-center text-slate-500 dark:text-[#9ab0a5]" role="status">
            Loading Nifty Lens Stock Screener…
          </div>
        }
      >
        <ScreenerApp />
      </Suspense>
    );
  }

  // 2. Learn Charts (/learn, /pattern-library) is open to everyone without login;
  //    Guess the Chart Quiz (/quiz, /quiz/play) requires login.
  if (['/learn', '/pattern-library', '/quiz', '/quiz/play'].includes(pathname)) {
    const isQuizRoute = pathname === '/quiz' || pathname === '/quiz/play';
    if (isQuizRoute && !user) {
      return <AuthGatePlaceholder feature="quiz" />;
    }
    return (
      <div className="quiz-shell">
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-500 dark:text-slate-300" role="status">
              Loading chart learning studio…
            </div>
          }
        >
          <QuizApp />
        </Suspense>
      </div>
    );
  }

  // 3. Virtual Trading Desk requires login (uses the same common placeholder)
  if (pathname === '/trade' && !user) {
    return <AuthGatePlaceholder feature="trade" />;
  }

  if (pathname !== '/trade') {
    return (
      <main className="p-12 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <AppLink href="/" className="mt-6 inline-block text-[#00B386] dark:text-[#00D09C] font-semibold">
          Return to Nifty Lens
        </AppLink>
      </main>
    );
  }

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
              Nifty Lens
            </button>
            <span>·</span>
            <span>Stock Screener, Virtual Trading & Chart Pattern Lab</span>
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
};

function AppContent() {
  const pathname = usePathname();
  const { currentTab, setCurrentTab } = useTrading();
  useEffect(() => {
    if (window.location.pathname !== pathname) {
      window.history.replaceState(null, '', pathname + window.location.search + window.location.hash);
    }
    document.title = pathname.startsWith('/screener')
      ? 'Stock Screener & Quantitative Analysis | Nifty Lens'
      : pathname === '/learn' || pathname === '/pattern-library'
      ? 'Learn Chart Patterns | Nifty Lens'
      : pathname.startsWith('/quiz')
      ? 'Guess the Chart Quiz | Nifty Lens'
      : pathname === '/trade'
      ? 'Paper Trading Desk | Nifty Lens'
      : pathname === '/pricing'
      ? 'Pricing & Membership Packages | Nifty Lens'
      : pathname === '/terms'
      ? 'Terms of Service | Nifty Lens'
      : pathname === '/privacy'
      ? 'Privacy Policy | Nifty Lens'
      : pathname === '/refund-policy'
      ? 'Cancellation & Refund Policy | Nifty Lens'
      : pathname === '/disclaimer'
      ? 'SEBI & Market Risk Disclaimer | Nifty Lens'
      : pathname === '/contact'
      ? 'Contact & Support | Nifty Lens'
      : 'Nifty Lens – NSE Stock Screener, Paper Trading & Chart Learning';
  }, [pathname, setCurrentTab]);

  if (pathname === '/') {
    return (
      <>
        <LandingPage />
        <WalletModal />
        <AuthModal />
        <UpgradeModal />
        <RazorpayCheckoutModal />
        <ToastContainer />
      </>
    );
  }
  return (
    <div className="workspace-layout min-h-screen bg-[#F3F6F4] text-slate-900 dark:bg-[#0B1310] dark:text-slate-100">
      <WorkspaceHeader />
      <WorkspaceContent />
      <WalletModal />
      <AuthModal />
      <UpgradeModal />
      <RazorpayCheckoutModal />
      <ToastContainer />
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
