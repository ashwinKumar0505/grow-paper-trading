import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { GrowwLogo } from './GrowwLogo';
import { StockSearchModal } from './StockSearchModal';
import {
  Search,
  Wallet,
  Sun,
  Moon,
  Plus,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    balance,
    holdings,
    intradayPositions,
    isDarkMode,
    toggleTheme,
    setIsWalletModalOpen,
    user,
    logOutUser,
    setShowLandingPage,
    openAuthModal,
  } = useTrading();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const totalPositionsCount = holdings.length + intradayPositions.length;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-[#282C37] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Brand Zone - Clicking logo redirects to Homepage */}
          <div
            onClick={() => {
              setShowLandingPage(true);
              setCurrentTab('explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer shrink-0"
            title="Go to My Paper Trade Homepage"
          >
            <GrowwLogo />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
            <button
              onClick={() => setCurrentTab('explore')}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Explore
              {currentTab === 'explore' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('holdings')}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'holdings'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Holdings</span>
              {totalPositionsCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#00D09C]">
                  {totalPositionsCount}
                </span>
              )}
              {currentTab === 'holdings' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('watchlist')}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'watchlist'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Watchlist
              {currentTab === 'watchlist' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('orders')}
              className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                currentTab === 'orders'
                  ? 'text-[#00D09C]'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Orders
              {currentTab === 'orders' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </button>
          </nav>

          {/* Right Actions: Search, Wallet Pill with + Add Money, User Profile, Theme */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Quick Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1E222D] hover:bg-gray-200/80 dark:hover:bg-[#282D3B] rounded-xl transition-all border border-transparent dark:border-[#2D3240] w-44 md:w-52 justify-between shrink-0 cursor-pointer"
              title="Search stocks"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">Search stocks...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-white dark:bg-[#16181F] rounded border border-gray-200 dark:border-gray-700">
                /
              </kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1E222D] hover:bg-gray-200/80 dark:hover:bg-[#282D3B] transition-colors shrink-0 cursor-pointer"
              title="Search stocks"
              aria-label="Search stocks"
            >
              <Search className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Wallet Cash Pill */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 dark:bg-[#132722] border border-[#00D09C]/30 rounded-xl p-0.5 sm:p-1 shrink-0">
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 text-left cursor-pointer group"
                title="My Paper Trade Wallet Balance (Click to manage)"
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D09C] shrink-0" />
                <div>
                  <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-none">Wallet</div>
                  <div className="font-mono tabular-nums font-bold text-xs sm:text-sm text-[#00D09C]">
                    ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </button>

              {/* Add Money button */}
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Add Money to Wallet"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Add Money</span>
              </button>
            </div>

            {/* User Profile Menu or Sign In */}
            {!user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E222D] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1E222D] transition-colors cursor-pointer"
                  title="User Profile & Settings"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#00D09C] to-emerald-400 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {initials}
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:inline" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2B303C] py-2 z-40 animate-fade-in text-left">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#282C37]">
                        <div className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                          {user?.name || 'My Paper Trade User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">
                          {user?.email || (user?.phone ? `+91 ${user.phone}` : 'Demo Paper Account')}
                        </div>
                        <div className="mt-2 text-[10px] text-emerald-600 dark:text-[#00D09C] font-semibold flex items-center gap-1.5">
                          {user?.authProvider === 'google' ? (
                            <>
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                              <span>Google Verified</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified Email OTP</span>
                            </>
                          )}
                        </div>
                      </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsWalletModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20242F] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-4 h-4 text-[#00D09C]" />
                        <span>Add Money to Wallet</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowLandingPage(true);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20242F] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Platform Landing Page</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logOutUser();
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Switch Account / Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1E222D] transition-colors shrink-0 cursor-pointer"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Sub Navigation bar - Clean 4-tab grid fitting any mobile width */}
        <div className="md:hidden border-t border-gray-100 dark:border-[#282C37] bg-white dark:bg-[#121212] px-2 py-1.5 w-full">
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-center">
            <button
              onClick={() => setCurrentTab('explore')}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setCurrentTab('holdings')}
              className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                currentTab === 'holdings'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <span>Holdings</span>
              {totalPositionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#00D09C] text-white font-bold leading-none">
                  {totalPositionsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('watchlist')}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'watchlist'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => setCurrentTab('orders')}
              className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'orders'
                  ? 'text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Orders
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <StockSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
