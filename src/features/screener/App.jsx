import React, { useState, useEffect, useRef } from 'react';
import { Menu, WifiOff } from 'lucide-react';
import { usePathname } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import Sidebar from './components/Sidebar';
import SwingScannerPage from './pages/SwingScannerPage';
import IntradayScannerPage from './pages/IntradayScannerPage';
import StockAnalysisPage from './pages/StockAnalysisPage';
import { api, onScreenerApiStatus } from './api/client';
import './App.css';

const TITLES = {
  '/screener': 'Swing trading',
  '/screener/intraday': 'Intraday trading',
  '/screener/analysis': 'Stock analysis',
};

export default function ScreenerApp() {
  const pathname = usePathname();
  const { isDarkMode, addToast } = useTrading();
  const theme = isDarkMode ? 'dark' : 'light';
  const [marketStatus, setMarketStatus] = useState(null);
  const [offline, setOffline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastBgToastRef = useRef(0);
  const lastActionToastRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onScreenerApiStatus(({ ok, path }) => {
      if (ok) {
        setOffline(false);
        return;
      }
      setOffline(true);
      const now = Date.now();
      const isBackground = path.startsWith('/market/status') || path.startsWith('/stocks/search');
      if (isBackground) {
        if (now - lastBgToastRef.current < 60000) return;
        lastBgToastRef.current = now;
      } else {
        if (now - lastActionToastRef.current < 3000) return;
        lastActionToastRef.current = now;
      }
      addToast(
        'Server Unavailable',
        'Screener backend is down or unreachable. Showing offline snapshot — please try again in some time.',
        'error'
      );
    });
    return unsubscribe;
  }, [addToast]);

  useEffect(() => {
    const fetchStatus = () =>
      api
        .getMarketStatus()
        .then((res) => {
          setMarketStatus(res);
        })
        .catch(() => setOffline(true));
    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const title = TITLES[pathname] || 'Stock Screener';
  useEffect(() => {
    document.title = `${title} · NiftyLens`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="screener-shell app-shell" data-theme={theme}>
      <Sidebar
        marketStatus={marketStatus}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className="topbar-title">{title}</h1>
        </header>

        <main className="content">
          {offline && (
            <div className="alert alert-error">
              <WifiOff size={16} />
              <span>
                Can’t reach the screener server. Make sure the backend is running on port 8001 — we’ll keep retrying.
              </span>
            </div>
          )}
          {pathname === '/screener/intraday' ? (
            <IntradayScannerPage marketStatus={marketStatus} />
          ) : pathname === '/screener/analysis' ? (
            <StockAnalysisPage marketStatus={marketStatus} />
          ) : (
            <SwingScannerPage marketStatus={marketStatus} />
          )}
        </main>
      </div>
    </div>
  );
}
