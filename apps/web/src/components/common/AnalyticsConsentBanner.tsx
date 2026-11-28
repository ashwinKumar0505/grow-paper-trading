import React, { useEffect, useState } from 'react';
import { ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import {
  acceptAllConsent,
  closeAnalyticsPreferences,
  isConsentUnset,
  isTrackingEligible,
  rejectAllConsent,
  setConsentPreferences,
  useAnalyticsPreferencesOpen,
  useConsentPreferences,
} from '../../lib/analytics';
import { AppLink } from '../../lib/navigation';

interface ConsentToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

const ConsentToggleRow: React.FC<ConsentToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  onToggle,
}) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-900/10 dark:border-[#20332A] bg-[#F8FAF9] dark:bg-[#0D1612] p-3">
    <div className="space-y-0.5 min-w-0">
      <label htmlFor={id} className="block text-xs font-bold text-[#15241D] dark:text-white cursor-pointer">
        {label}
      </label>
      <p className="text-[11px] leading-relaxed text-[#465C52] dark:text-[#9AB0A5]">
        {description}
      </p>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer mt-0.5 ${
        checked ? 'bg-[#00B386] dark:bg-[#00D09C]' : 'bg-gray-300 dark:bg-[#2A3D34]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0B1310] transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export const AnalyticsConsentBanner: React.FC = () => {
  const preferences = useConsentPreferences();
  const isPreferencesOpen = useAnalyticsPreferencesOpen();
  const eligible = isTrackingEligible();
  const unset = isConsentUnset(preferences);
  const visible = eligible && (unset || isPreferencesOpen);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftAdMeasurement, setDraftAdMeasurement] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraftAnalytics(preferences.analytics === 'granted');
    setDraftAdMeasurement(preferences.adMeasurement === 'granted');
    if (isPreferencesOpen) {
      setIsCustomizing(true);
    }
  }, [visible, isPreferencesOpen, preferences.analytics, preferences.adMeasurement]);

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

  const handleSaveCustom = () => {
    setConsentPreferences({
      analytics: draftAnalytics ? 'granted' : 'denied',
      adMeasurement: draftAdMeasurement ? 'granted' : 'denied',
    });
    setIsCustomizing(false);
  };

  return (
    <aside
      role="region"
      aria-label="Privacy and cookie consent"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-40 rounded-2xl border border-emerald-900/15 dark:border-[#243B30] bg-white/95 dark:bg-[#111C17]/95 backdrop-blur-md shadow-xl p-4 sm:p-5 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#00B386]/10 dark:bg-[#00D09C]/15 border border-[#00B386]/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-[#15241D] dark:text-white">
              Cookie preferences
            </h2>
            {isPreferencesOpen && !unset && (
              <button
                type="button"
                onClick={closeAnalyticsPreferences}
                aria-label="Close privacy preferences"
                className="p-1 -mr-1 -mt-1 rounded-lg text-[#5B7066] dark:text-[#9AB0A5] hover:bg-emerald-900/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-[#465C52] dark:text-[#A9BEB4]">
            We use optional cookies to improve Tradedia and measure signups from our ads.{' '}
            <AppLink
              href="/privacy"
              onClick={closeAnalyticsPreferences}
              className="font-semibold text-[#008F6B] dark:text-[#00D09C] hover:underline"
            >
              Privacy Policy
            </AppLink>
          </p>

          {isCustomizing && (
            <div className="space-y-2 pt-1">
              <ConsentToggleRow
                id="consent-toggle-analytics"
                label="Analytics"
                description="Helps us understand how Tradedia is used so we can improve features."
                checked={draftAnalytics}
                onToggle={() => setDraftAnalytics((prev) => !prev)}
              />
              <ConsentToggleRow
                id="consent-toggle-ad-measurement"
                label="Advertising Measurement"
                description="Measures verified signups from Google Ads using hashed email data. Personalized ads stay off."
                checked={draftAdMeasurement}
                onToggle={() => setDraftAdMeasurement((prev) => !prev)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                rejectAllConsent();
                setIsCustomizing(false);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-900/15 dark:border-[#243B30] text-[#33463D] dark:text-[#C5D4CC] hover:bg-emerald-900/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Reject All
            </button>
            {isCustomizing ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#00B386]/40 text-[#008F6B] dark:text-[#00D09C] hover:bg-[#00B386]/10 transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-900/15 dark:border-[#243B30] text-[#33463D] dark:text-[#C5D4CC] hover:bg-emerald-900/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                acceptAllConsent();
                setIsCustomizing(false);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00B386] hover:bg-[#009A73] dark:bg-[#00D09C] dark:hover:bg-[#00B386] text-white dark:text-[#04261C] transition-colors cursor-pointer"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
