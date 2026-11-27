import React,{ lazy,Suspense } from 'react';
import { AuthGatePlaceholder } from '../components/AuthGatePlaceholder';
import { LoadingState } from '../components/common/LoadingState';
import { LegalPage,type LegalPageKind } from '../components/LegalPages';
import { PricingPage } from '../components/PricingPage';
import { ProfilePage } from '../components/ProfilePage';
import { useTrading } from '../context/TradingContext';
import { resolvePatternBySlug } from '../features/quiz/utils/patternCatalog';
import TradingWorkspace from '../features/virtual-trading/components/TradingWorkspace';
import { AppLink, getLearnPatternSlugFromPath, usePathname } from '../lib/navigation';

const QuizApp = lazy(() => import('../features/quiz/QuizApp'));
const ScreenerApp = lazy(() => import('../features/screener/App'));
const PaperTradingLandingPage = lazy(
  () => import('../features/feature-landing/pages/PaperTradingLandingPage')
);
const ScreenerLandingPage = lazy(
  () => import('../features/feature-landing/pages/ScreenerLandingPage')
);
const GuessChartLandingPage = lazy(
  () => import('../features/feature-landing/pages/GuessChartLandingPage')
);

export const WorkspaceContent: React.FC = () => {
  const { user } = useTrading();
  const pathname = usePathname();

  // 0. Public Feature Landing Pages & Pricing are open without login
  if (
    pathname === '/paper-trading-india' ||
    pathname === '/ai-stock-screener' ||
    pathname === '/guess-the-chart'
  ) {
    return (
      <Suspense
        fallback={
          <LoadingState className="p-12 text-center text-slate-500 dark:text-[#9ab0a5]">
            Loading Tradedia…
          </LoadingState>
        }
      >
        {pathname === '/paper-trading-india' ? (
          <PaperTradingLandingPage />
        ) : pathname === '/ai-stock-screener' ? (
          <ScreenerLandingPage />
        ) : (
          <GuessChartLandingPage />
        )}
      </Suspense>
    );
  }

  if (pathname === '/pricing') {
    return <PricingPage />;
  }

  // 0a. My Profile Page (/profile) requires login
  if (pathname === '/profile') {
    if (!user) {
      return <AuthGatePlaceholder feature="profile" />;
    }
    return <ProfilePage />;
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
            Loading Tradedia Stock Screener…
          </LoadingState>
        }
      >
        <ScreenerApp />
      </Suspense>
    );
  }

  // 2. Learn Charts (/learn, /learn/:slug, /pattern-library) is open to everyone without login;
  //    Guess the Chart Quiz (/quiz, /quiz/play) requires login.
  const isLearnRoute =
    pathname === '/learn' ||
    pathname === '/pattern-library' ||
    Boolean(resolvePatternBySlug(getLearnPatternSlugFromPath(pathname)));
  const isQuizRoute = pathname === '/quiz' || pathname === '/quiz/play';
  if (isLearnRoute || isQuizRoute) {
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

  // 3. Virtual Trading Desk & individual stock detail pages (/trade, /trade/:symbol) require login
  const isTradeRoute = pathname === '/trade' || pathname.startsWith('/trade/');
  if (isTradeRoute && !user) {
    return <AuthGatePlaceholder feature="trade" />;
  }

  if (!isTradeRoute) {
    return (
      <main className="p-12 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <AppLink href="/" className="mt-6 inline-block text-[#00B386] dark:text-[#00D09C] font-semibold">
          Return to Tradedia
        </AppLink>
      </main>
    );
  }

  return <TradingWorkspace />;
};
