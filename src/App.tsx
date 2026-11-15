import { useEffect } from 'react';
import { GlobalOverlays } from './app/GlobalOverlays';
import { WorkspaceContent } from './app/WorkspaceContent';
import { LandingPage } from './components/LandingPage';
import { WorkspaceHeader } from './components/navigation/WorkspaceHeader';
import { TradingProvider } from './context/TradingContext';
import { usePathname } from './lib/navigation';

function AppContent() {
  const pathname = usePathname();
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
