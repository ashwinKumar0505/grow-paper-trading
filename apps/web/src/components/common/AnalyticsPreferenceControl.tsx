import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  isAnalyticsEligible,
  setAnalyticsConsent,
  useAnalyticsConsent,
} from '../../lib/analytics';

export const AnalyticsPreferenceControl: React.FC = () => {
  const consent = useAnalyticsConsent();
  const eligible = isAnalyticsEligible();

  const statusLabel = !eligible
    ? 'Disabled in this environment'
    : consent === 'granted'
      ? 'Enabled (consented)'
      : consent === 'denied'
        ? 'Declined'
        : 'Not yet selected';

  return (
    <div className="mt-3 p-4 rounded-xl bg-[#F8FAF9] dark:bg-[#0E1713] border border-emerald-900/10 dark:border-[#20332A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C] shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-[#15241D] dark:text-white">
            Analytics Preference: <span className="text-[#008F6B] dark:text-[#00D09C]">{statusLabel}</span>
          </div>
          <p className="text-[#5B7066] dark:text-[#9AB0A5]">
            You can update or withdraw your consent for Google Analytics 4 at any time.
          </p>
        </div>
      </div>
      {eligible && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAnalyticsConsent('denied')}
            aria-pressed={consent === 'denied'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              consent === 'denied'
                ? 'border-[#00B386] text-[#008F6B] dark:text-[#00D09C] bg-[#00B386]/10'
                : 'border-emerald-900/15 dark:border-[#243B30] text-[#33463D] dark:text-[#C5D4CC] hover:bg-emerald-900/5 dark:hover:bg-white/5'
            }`}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsConsent('granted')}
            aria-pressed={consent === 'granted'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              consent === 'granted'
                ? 'bg-[#00B386] dark:bg-[#00D09C] text-white dark:text-[#04261C]'
                : 'border border-[#00B386]/40 text-[#008F6B] dark:text-[#00D09C] hover:bg-[#00B386]/10'
            }`}
          >
            Accept Analytics
          </button>
        </div>
      )}
    </div>
  );
};
