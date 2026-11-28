import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  acceptAllConsent,
  isTrackingEligible,
  rejectAllConsent,
  setAdMeasurementConsent,
  setAnalyticsConsent,
  useConsentPreferences,
  type AnalyticsConsentStatus,
} from '../../lib/analytics';

function formatConsentStatus(eligible: boolean, status: AnalyticsConsentStatus): string {
  if (!eligible) return 'Disabled in this environment';
  if (status === 'granted') return 'Enabled (consented)';
  if (status === 'denied') return 'Declined';
  return 'Not yet selected (denied by default)';
}

export const AnalyticsPreferenceControl: React.FC = () => {
  const preferences = useConsentPreferences();
  const eligible = isTrackingEligible();

  return (
    <div className="mt-3 p-4 rounded-xl bg-[#F8FAF9] dark:bg-[#0E1713] border border-emerald-900/10 dark:border-[#20332A] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-[#15241D] dark:text-white">
              Cookie &amp; Privacy Preferences
            </div>
            <p className="text-[#5B7066] dark:text-[#9AB0A5]">
              Update or withdraw your analytics and advertising measurement choices anytime. Personalized ads are always off.
            </p>
          </div>
        </div>
        {eligible && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={rejectAllConsent}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-900/15 dark:border-[#243B30] text-[#33463D] dark:text-[#C5D4CC] hover:bg-emerald-900/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={acceptAllConsent}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00B386] dark:bg-[#00D09C] text-white dark:text-[#04261C] hover:bg-[#009A73] dark:hover:bg-[#00B386] transition-colors cursor-pointer"
            >
              Accept All
            </button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[#111C17] border border-emerald-900/10 dark:border-[#20332A]">
          <div className="min-w-0 space-y-0.5">
            <div className="font-bold text-[#15241D] dark:text-white">Analytics</div>
            <div className="text-[11px] text-[#008F6B] dark:text-[#00D09C]">
              {formatConsentStatus(eligible, preferences.analytics)}
            </div>
            <div className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5]">
              Usage &amp; feature insights (Google Analytics)
            </div>
          </div>
          {eligible && (
            <button
              type="button"
              role="switch"
              aria-label="Toggle Analytics consent"
              aria-checked={preferences.analytics === 'granted'}
              onClick={() =>
                setAnalyticsConsent(preferences.analytics === 'granted' ? 'denied' : 'granted')
              }
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                preferences.analytics === 'granted'
                  ? 'bg-[#00B386] dark:bg-[#00D09C]'
                  : 'bg-gray-300 dark:bg-[#2A3D34]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0B1310] transition-transform ${
                  preferences.analytics === 'granted' ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[#111C17] border border-emerald-900/10 dark:border-[#20332A]">
          <div className="min-w-0 space-y-0.5">
            <div className="font-bold text-[#15241D] dark:text-white">Advertising Measurement</div>
            <div className="text-[11px] text-[#008F6B] dark:text-[#00D09C]">
              {formatConsentStatus(eligible, preferences.adMeasurement)}
            </div>
            <div className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5]">
              Signup attribution (Google Ads, hashed email)
            </div>
          </div>
          {eligible && (
            <button
              type="button"
              role="switch"
              aria-label="Toggle Advertising Measurement consent"
              aria-checked={preferences.adMeasurement === 'granted'}
              onClick={() =>
                setAdMeasurementConsent(
                  preferences.adMeasurement === 'granted' ? 'denied' : 'granted'
                )
              }
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                preferences.adMeasurement === 'granted'
                  ? 'bg-[#00B386] dark:bg-[#00D09C]'
                  : 'bg-gray-300 dark:bg-[#2A3D34]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0B1310] transition-transform ${
                  preferences.adMeasurement === 'granted' ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[#5B7066] dark:text-[#9AB0A5]">
        <strong>Personalized Ads:</strong> Permanently disabled.
      </p>
    </div>
  );
};
