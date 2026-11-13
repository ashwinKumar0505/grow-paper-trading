import React, { useState, useEffect } from 'react';
import { Menu, WifiOff } from 'lucide-react';
import { usePathname } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import Sidebar from './components/Sidebar';
import SwingScannerPage from './pages/SwingScannerPage';
import IntradayScannerPage from './pages/IntradayScannerPage';
import StockAnalysisPage from './pages/StockAnalysisPage';
import { api } from './api/client';
import './App.css';

const TITLES = {
  '/screener': 'Swing trading',
  '/screener/intraday': 'Intraday trading',
  '/screener/analysis': 'Stock analysis',
};

export default function ScreenerApp() {
  const pathname = usePathname();
  const { isDarkMode } = useTrading();
  const theme = isDarkMode ? 'dark' : 'light';
  const [marketStatus, setMarketStatus] = useState(null);
  const [offline, setOffline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = () =>
      api
        .getMarketStatus()
        .then((res) => {
          setMarketStatus(res);
          setOffline(false);
        })
        .catch(() => setOffline(true));
    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const title = TITLES[pathname] || 'Signal Screener';
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
            <StockAnalysisPage />
          ) : (
            <SwingScannerPage />
          )}
          <footer className="app-footer">
            NiftyLens Signal Screener · For learning and research only — not investment advice. Targets and dates are
            estimates based on past price behaviour.
          </footer>
        </main>
      </div>
    </div>
  );
}
