import { useEffect } from 'react';
import { GlobalOverlays } from './app/GlobalOverlays';
import { WorkspaceContent } from './app/WorkspaceContent';
import { LandingPage } from './components/LandingPage';
import { WorkspaceHeader } from './components/navigation/WorkspaceHeader';
import { TradingProvider } from './context/TradingContext';
import { useAnalyticsTracking } from './lib/analytics';
import { usePathname } from './lib/navigation';

function AppContent() {
  const pathname = usePathname();
  useAnalyticsTracking();
  useEffect(() => {
    if (window.location.pathname !== pathname) {
      window.history.replaceState(null, '', pathname + window.location.search + window.location.hash);
    }
    document.title = pathname.startsWith('/screener')
      ? 'Stock Screener & Quantitative Analysis | Tradedia'
      : pathname === '/learn' || pathname === '/pattern-library'
      ? 'Learn Chart Patterns | Tradedia'
      : pathname.startsWith('/quiz')
      ? 'Guess the Chart Quiz | Tradedia'
      : pathname === '/trade' || pathname.startsWith('/trade/')
      ? 'Paper Trading Desk | Tradedia'
      : pathname === '/pricing'
      ? 'Pricing & Membership Packages | Tradedia'
      : pathname === '/profile'
      ? 'My Profile | Tradedia'
      : pathname === '/terms'
      ? 'Terms of Service | Tradedia'
      : pathname === '/privacy'
      ? 'Privacy Policy | Tradedia'
      : pathname === '/refund-policy'
      ? 'Cancellation & Refund Policy | Tradedia'
      : pathname === '/disclaimer'
      ? 'SEBI & Market Risk Disclaimer | Tradedia'
      : pathname === '/contact'
      ? 'Contact & Support | Tradedia'
      : 'Tradedia – One Place to Learn Trading | Paper Trading, Screener & Chart Patterns';
  }, [pathname]);

  if (pathname === '/') {
    return (
      <>
        <LandingPage />
        <GlobalOverlays />
      </>
    );
  }
  return (
    <div className="workspace-layout min-h-screen bg-[#F3F6F4] text-slate-900 dark:bg-[#0B1310] dark:text-slate-100">
      <WorkspaceHeader />
      <WorkspaceContent />
      <GlobalOverlays />
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
