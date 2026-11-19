import React from 'react';
import { Crown, LogOut, User, Wallet } from 'lucide-react';
import type { SubscriptionPlanConfig, SubscriptionTier } from '../../lib/subscription';
import { navigate } from '../../lib/navigation';
import type { UserProfile } from '../../types/market';

interface UserProfileDropdownProps {
  user: UserProfile;
  planConfig: SubscriptionPlanConfig;
  subscriptionTier: SubscriptionTier;
  tierBadgeClass: string;
  onClose: () => void;
  onOpenWallet: () => void;
  onLogOut: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  planConfig,
  subscriptionTier,
  tierBadgeClass,
  onClose,
  onOpenWallet,
  onLogOut,
}) => {
  const upgradeLabel =
    subscriptionTier === 'advanced'
      ? 'Manage Subscription'
      : subscriptionTier === 'beginner'
      ? 'Upgrade to Advanced'
      : 'Upgrade Plan';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#111C17] rounded-2xl shadow-2xl border border-emerald-900/15 dark:border-[#20332A] py-2 z-50 text-left">
        {/* Account Header */}
        <div className="px-4 py-3 border-b border-emerald-900/10 dark:border-[#20332A] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-[#15241D] dark:text-white truncate">
              {user.name || 'Nifty Lens Trader'}
            </span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${tierBadgeClass}`}>
              {subscriptionTier}
            </span>
          </div>
          <div className="text-xs text-[#5B7066] dark:text-[#9AB0A5] truncate">
            {user.email || (user.phone ? `+91 ${user.phone}` : 'Nifty Lens Account')}
          </div>
        </div>

        {/* Focused Actions */}
        <div className="p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            className="w-full px-3 py-2 text-sm font-medium text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <User className="w-4 h-4 text-[#10B981]" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
            className="w-full px-3 py-2 text-sm font-medium text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-[#10B981]" />
            <span>{upgradeLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallet();
            }}
            className="w-full px-3 py-2 text-sm font-medium text-[#15241D] dark:text-[#E9F2EE] hover:bg-[#EEF5F1] dark:hover:bg-[#16241E] rounded-xl transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-[#10B981]" />
              <span>Paper Wallet</span>
            </span>
            <span className="text-xs font-mono text-[#5B7066] dark:text-[#9AB0A5]">
              Max ₹{(planConfig.maxWalletLimit / 100000).toFixed(0)}L
            </span>
          </button>

          <div className="my-1 border-t border-emerald-900/10 dark:border-[#20332A]" />

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogOut();
            }}
            className="w-full px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
