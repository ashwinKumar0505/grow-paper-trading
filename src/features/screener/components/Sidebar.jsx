import React from 'react';
import { AppLink, usePathname } from '../../../lib/navigation';
import { TrendingUp, Zap, Search, X, Clock, ChartCandlestick, BookOpen } from 'lucide-react';

const NAV = [
  { to: '/screener', label: 'Swing recommendations', icon: TrendingUp, end: true, hint: 'Backtested multi-day setups' },
  { to: '/screener/intraday', label: 'Intraday signals', icon: Zap, hint: '15-min chart setups', live: true },
  { to: '/screener/analysis', label: 'Stock analysis', icon: Search, hint: 'Chart & backtest check' },
];

const PHASE_TEXT = {
  PRE_OPEN: 'Opening soon',
  LIVE_TRADING: 'Market open',
  POST_CLOSE: 'Market closed',
  WEEKEND_CLOSED: 'Closed for weekend',
  HOLIDAY_CLOSED: 'Closed for holiday',
};

export default function Sidebar({ marketStatus, open, onClose }) {
  const pathname = usePathname();
  const isOpen = !!marketStatus?.is_market_open;
  const phase = marketStatus ? PHASE_TEXT[marketStatus.session_phase] || 'Market closed' : 'Checking market…';

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
              <path d="M8 13l2-2.5 2 1.5 2.5-3" />
            </svg>
          </div>
          <div>
            <div className="sb-title">Signal Screener</div>
            <div className="sb-tag">NiftyLens · NSE 500</div>
          </div>
          <button className="sb-close icon-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sb-section-label">Screener & Analysis</div>
        <nav className="sb-nav">
          {NAV.map(({ to, label, icon: Icon, end, hint, live }) => {
            const isActive = end ? pathname === to : pathname.startsWith(to);
            return (
              <AppLink
                key={to}
                href={to}
                onClick={onClose}
                className={`sb-link ${isActive ? 'active' : ''}`}
              >
                <span className="sb-link-icon">
                  <Icon size={18} />
                </span>
                <span className="sb-link-text">
                  <span>{label}</span>
                  <small>{hint}</small>
                </span>
                {live && <span className={`sb-dot ${isOpen ? 'on' : ''}`} title={isOpen ? 'Live' : 'Paused'} />}
              </AppLink>
            );
          })}
        </nav>

        <div className="sb-section-label" style={{ marginTop: 18 }}>Quick Jump</div>
        <nav className="sb-nav">
          <AppLink href="/trade" onClick={onClose} className="sb-link">
            <span className="sb-link-icon">
              <ChartCandlestick size={18} />
            </span>
            <span className="sb-link-text">
              <span>Virtual trading</span>
              <small>Practice with ₹10L paper cash</small>
            </span>
          </AppLink>
          <AppLink href="/learn" onClick={onClose} className="sb-link">
            <span className="sb-link-icon">
              <BookOpen size={18} />
            </span>
            <span className="sb-link-text">
              <span>Learn chart patterns</span>
              <small>Library & Guess the Chart</small>
            </span>
          </AppLink>
        </nav>

        <div className="sb-spacer" />

        <div className="sb-market" style={{ marginBottom: 0 }}>
          <div className="sb-market-row">
            <span className={`pulse-dot ${isOpen ? 'on' : ''}`} />
            <strong>{phase}</strong>
          </div>
          <p>
            {isOpen
              ? 'NSE is trading now (9:15 AM – 3:30 PM).'
              : marketStatus?.next_trading_session_open_ist
              ? `Opens next: ${marketStatus.next_trading_session_open_ist.replace(' IST', '')}`
              : 'Trading hours: 9:15 AM – 3:30 PM, Mon–Fri.'}
          </p>
          {marketStatus?.current_time_ist && (
            <div className="sb-clock">
              <Clock size={12} /> {marketStatus.current_time_ist}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
