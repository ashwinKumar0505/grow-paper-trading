import React,{ lazy,Suspense } from 'react';
import { AuthGatePlaceholder } from '../components/AuthGatePlaceholder';
import { LoadingState } from '../components/common/LoadingState';
import { LegalPage,type LegalPageKind } from '../components/LegalPages';
import { PricingPage } from '../components/PricingPage';
import { useTrading } from '../context/TradingContext';
import TradingWorkspace from '../features/virtual-trading/components/TradingWorkspace';
import { AppLink,usePathname } from '../lib/navigation';

const QuizApp = lazy(() => import('../features/quiz/QuizApp'));
const ScreenerApp = lazy(() => import('../features/screener/App'));

export const WorkspaceContent: React.FC = () => {
  const { user } = useTrading();
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
          <LoadingState className="p-12 text-center text-slate-500 dark:text-[#9ab0a5]">
            Loading Nifty Lens Stock Screener…
          </LoadingState>
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
            <LoadingState className="p-12 text-center text-slate-500 dark:text-slate-300">
              Loading chart learning studio…
            </LoadingState>
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

  return <TradingWorkspace />;
};
