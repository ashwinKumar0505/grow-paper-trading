import { useEffect } from 'react';
import { GlobalOverlays } from './app/GlobalOverlays';
import { WorkspaceContent } from './app/WorkspaceContent';
import { LandingPage } from './components/LandingPage';
import { WorkspaceHeader } from './components/navigation/WorkspaceHeader';
import { TradingProvider } from './context/TradingContext';
import { useAnalyticsTracking } from './lib/analytics';
import { usePathname } from './lib/navigation';
import { useRouteSeo } from './lib/seo/useRouteSeo';

function AppContent() {
  const pathname = usePathname();
  useAnalyticsTracking();
  useRouteSeo(pathname);
  useEffect(() => {
    if (window.location.pathname !== pathname) {
      window.history.replaceState(null, '', pathname + window.location.search + window.location.hash);
    }
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
