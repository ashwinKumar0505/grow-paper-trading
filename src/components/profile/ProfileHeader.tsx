import React from 'react';
import { Calendar, LogOut, Mail, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../../types/market';
import { formatProfileDate } from '../../utils/profileBilling';

interface ProfileHeaderProps {
  user: UserProfile;
  onSignOut: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, onSignOut }) => {
  const initials = (user.name || 'NL')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4E655A] dark:text-[#A3B8AE] px-0.5">
        My Account
      </h2>

      <section className="rounded-2xl border border-emerald-900/15 dark:border-[#1E2F28] bg-white dark:bg-[#111C17] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#10B981] text-[#042218] font-extrabold text-lg flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[#15241D] dark:text-white truncate">
                {user.name || 'Nifty Lens Trader'}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2.5 py-0.5 text-xs font-semibold text-[#008F6B] dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user.authProvider === 'google' ? 'Google' : 'Email OTP'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4E655A] dark:text-[#A3B8AE]">
              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {user.email || (user.phone ? `+91 ${user.phone}` : 'Nifty Lens Account')}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Joined {formatProfileDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5B7066] dark:text-[#9AB0A5] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </section>
    </div>
  );
};
