import React, { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import {
  closeAnalyticsPreferences,
  isAnalyticsEligible,
  setAnalyticsConsent,
  useAnalyticsConsent,
  useAnalyticsPreferencesOpen,
} from '../../lib/analytics';
import { AppLink } from '../../lib/navigation';

export const AnalyticsConsentBanner: React.FC = () => {
  const consent = useAnalyticsConsent();
  const isPreferencesOpen = useAnalyticsPreferencesOpen();
  const eligible = isAnalyticsEligible();
  const visible = eligible && (consent === 'unset' || isPreferencesOpen);

  useEffect(() => {
    if (!visible || !isPreferencesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAnalyticsPreferences();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, isPreferencesOpen]);

  if (!visible) return null;

  return (
    <aside
      role="region"
      aria-label="Analytics consent"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-40 rounded-2xl border border-emerald-900/15 dark:border-[#243B30] bg-white/95 dark:bg-[#111C17]/95 backdrop-blur-md shadow-xl p-4 sm:p-5 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#00B386]/10 dark:bg-[#00D09C]/15 border border-[#00B386]/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-[#15241D] dark:text-white">
              Privacy-first analytics
            </h2>
            {isPreferencesOpen && consent !== 'unset' && (
              <button
                type="button"
                onClick={closeAnalyticsPreferences}
                aria-label="Close analytics preferences"
                className="p-1 -mr-1 -mt-1 rounded-lg text-[#5B7066] dark:text-[#9AB0A5] hover:bg-emerald-900/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-[#465C52] dark:text-[#A9BEB4]">
            We use Google Analytics 4 only with your permission to understand feature usage and improve Tradedia. We never collect personal details, auth tokens, payment IDs, or individual trades.{' '}
            <AppLink
              href="/privacy"
              onClick={closeAnalyticsPreferences}
              className="font-semibold text-[#008F6B] dark:text-[#00D09C] hover:underline"
            >
              Privacy Policy
            </AppLink>
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAnalyticsConsent('denied')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B386] text-white dark:text-[#04261C] transition-colors cursor-pointer"
            >
              Accept Analytics
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
