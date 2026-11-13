import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { navigate } from '../../lib/navigation';
import {
  ChevronDown,
  LogOut,
  ShieldCheck,
  Wallet,
  Radar,
  ChartCandlestick,
  BookOpen,
} from 'lucide-react';

export const UserProfileMenu: React.FC = () => {
  const {
    user,
    balance,
    openAuthModal,
    logOutUser,
    setIsWalletModalOpen,
    setShowLandingPage,
  } = useTrading();
  const [isOpen, setIsOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="px-3 py-1.5 text-xs font-bold text-[#3A5247] dark:text-[#9AB0A5] hover:text-[#15241D] dark:hover:text-white rounded-full hover:bg-emerald-900/5 dark:hover:bg-[#16241E] transition-colors cursor-pointer"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => openAuthModal('signup')}
          className="px-3.5 py-1.5 h-9 text-xs font-extrabold text-white dark:text-[#04261C] bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00E6A8] rounded-full transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
        >
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-emerald-900/15 dark:border-[#1E352B] bg-[#EEF5F1] dark:bg-[#111F19] hover:border-[#00B386] dark:hover:border-[#00D09C]/60 transition-all cursor-pointer"
        title="Account & Profile"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00B386] to-[#00D09C] text-[#04261C] flex items-center justify-center font-extrabold text-xs shadow-xs">
          {initials}
        </div>
        <div className="hidden lg:flex flex-col items-start leading-tight text-left">
          <span className="text-xs font-bold text-[#15241D] dark:text-white max-w-[110px] truncate">
            {user.name}
          </span>
          <span className="text-[10px] font-mono font-bold text-[#00B386] dark:text-[#00D09C]">
            ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#5B7066] dark:text-[#9AB0A5]" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111C17] rounded-2xl shadow-2xl border border-emerald-900/15 dark:border-[#20332A] py-2 z-50 text-left">
            <div className="px-4 py-3 border-b border-emerald-900/10 dark:border-[#20332A]">
              <div className="font-extrabold text-sm text-[#15241D] dark:text-white truncate">
                {user.name || 'NiftyLens Trader'}
              </div>
              <div className="text-xs text-[#5B7066] dark:text-[#9AB0A5] font-mono mt-0.5 truncate">
                {user.email || (user.phone ? `+91 ${user.phone}` : 'NiftyLens Account')}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#00B386] dark:text-[#00D09C] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.authProvider === 'google' ? 'Google Verified' : 'Verified Account'}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#00B386] dark:text-[#00D09C] bg-[#00D09C]/10 px-2 py-0.5 rounded-md">
                  ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsWalletModalOpen(true);
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                  <span>Paper Wallet & Add Cash</span>
                </span>
                <span className="text-[10px] font-mono text-[#5B7066] dark:text-[#9AB0A5]">Max ₹10L</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/screener');
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Radar className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Signal Screener & Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/trade');
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ChartCandlestick className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Virtual Trading Desk</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/learn');
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>Learn Chart Patterns</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowLandingPage(true);
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-[#5B7066] dark:text-[#9AB0A5] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
                <span>NiftyLens Overview Home</span>
              </button>

              <div className="my-1 border-t border-emerald-900/10 dark:border-[#20332A]" />

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logOutUser();
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch Account / Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
