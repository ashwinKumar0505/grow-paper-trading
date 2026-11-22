import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { ChevronDown, Crown } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';

export const UserProfileMenu: React.FC = () => {
  const {
    user,
    balance,
    subscriptionTier,
    planConfig,
    openAuthModal,
    openUpgradeModal,
    logOutUser,
    setIsWalletModalOpen,
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
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="px-2 sm:px-3 py-1.5 text-xs font-bold whitespace-nowrap text-[#3A5247] dark:text-[#9AB0A5] hover:text-[#15241D] dark:hover:text-white rounded-full hover:bg-emerald-900/5 dark:hover:bg-[#16241E] transition-colors cursor-pointer"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => openAuthModal('signup')}
          className="px-2.5 sm:px-3.5 py-1.5 h-8 sm:h-9 text-[11px] sm:text-xs font-extrabold text-white dark:text-[#04261C] bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00E6A8] rounded-full transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <span className="sm:hidden">Start Free</span>
          <span className="hidden sm:inline">Start Free Account</span>
        </button>
      </div>
    );
  }

  const tierBadgeClass =
    subscriptionTier === 'advanced'
      ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/40'
      : subscriptionTier === 'beginner'
      ? 'bg-[#00D09C]/20 text-[#008F6B] dark:text-[#00D09C] border-[#00D09C]/40'
      : 'bg-slate-200 dark:bg-[#1C3027] text-slate-600 dark:text-[#9AB0A5] border-transparent';

  return (
    <div className="relative shrink-0 flex items-center gap-2">
      {subscriptionTier !== 'advanced' && (
        <button
          type="button"
          onClick={() =>
            openUpgradeModal({
              requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
              featureName: 'Upgrade Your Tradedia Membership',
            })
          }
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00B386] to-[#00D09C] text-[#04261C] font-extrabold text-[11px] shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>{subscriptionTier === 'free' ? 'Upgrade' : 'Get Advanced'}</span>
        </button>
      )}

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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#15241D] dark:text-white max-w-[90px] truncate">
              {user.name}
            </span>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${tierBadgeClass}`}>
              {subscriptionTier}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00B386] dark:text-[#00D09C]">
            ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#5B7066] dark:text-[#9AB0A5]" />
      </button>

      {isOpen && (
        <UserProfileDropdown
          user={user}
          planConfig={planConfig}
          subscriptionTier={subscriptionTier}
          tierBadgeClass={tierBadgeClass}
          onClose={() => setIsOpen(false)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onLogOut={logOutUser}
        />
      )}
    </div>
  );
};
