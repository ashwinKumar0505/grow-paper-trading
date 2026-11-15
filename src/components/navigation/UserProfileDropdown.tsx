import React from 'react';
import {
  BookOpen,
  ChartCandlestick,
  Crown,
  LogOut,
  Radar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { navigate } from '../../lib/navigation';

interface UserProfileDropdownProps {
  user: any;
  planConfig: any;
  subscriptionTier: string;
  tierBadgeClass: string;
  balance: number;
  onClose: () => void;
  onOpenWallet: () => void;
  onLogOut: () => void;
  onShowLanding: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  planConfig,
  subscriptionTier,
  tierBadgeClass,
  balance,
  onClose,
  onOpenWallet,
  onLogOut,
  onShowLanding,
}) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-76 bg-white dark:bg-[#111C17] rounded-2xl shadow-2xl border border-emerald-900/15 dark:border-[#20332A] py-2 z-50 text-left">
        <div className="px-4 py-3 border-b border-emerald-900/10 dark:border-[#20332A]">
          <div className="flex items-center justify-between gap-2">
            <div className="font-extrabold text-sm text-[#15241D] dark:text-white truncate">
              {user.name || 'Nifty Lens Trader'}
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${tierBadgeClass}`}>
              {planConfig.name}
            </span>
          </div>
          <div className="text-xs text-[#5B7066] dark:text-[#9AB0A5] font-mono mt-0.5 truncate">
            {user.email || (user.phone ? `+91 ${user.phone}` : 'Nifty Lens Account')}
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
              onClose();
              navigate('/pricing');
            }}
            className="w-full px-3 py-2 text-xs font-extrabold text-[#008F6B] dark:text-[#00D09C] bg-[#00D09C]/10 hover:bg-[#00D09C]/20 rounded-xl transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
              <span>
                {subscriptionTier === 'advanced'
                  ? 'Manage Advanced Plan'
                  : subscriptionTier === 'beginner'
                  ? 'Get Advanced'
                  : 'Upgrade Plan'}
              </span>
            </span>
            <span className="text-[10px] font-mono uppercase">{subscriptionTier}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallet();
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
              <span>Paper Wallet &amp; Add Cash</span>
            </span>
            <span className="text-[10px] font-mono text-[#5B7066] dark:text-[#9AB0A5]">
              Max ₹{(planConfig.maxWalletLimit / 100000).toFixed(0)}L
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/screener');
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Radar className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
            <span>Stock Screener & Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
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
              onClose();
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
              onClose();
              onShowLanding();
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-[#5B7066] dark:text-[#9AB0A5] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
            <span>Nifty Lens Overview Home</span>
          </button>

          <div className="my-1 border-t border-emerald-900/10 dark:border-[#20332A]" />

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogOut();
            }}
            className="w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
