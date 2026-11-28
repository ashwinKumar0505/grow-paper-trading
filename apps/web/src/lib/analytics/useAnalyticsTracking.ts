import { useEffect } from 'react';
import { useLocationSearch, usePathname } from '../navigation';
import { recordLandingOrigin } from './attribution';
import { useConsentPreferences } from './consent';
import {
  applyConsentPreferences,
  isAnalyticsEligible,
  isTrackingEligible,
  trackPageView,
} from './ga4';

export function useAnalyticsTracking(): void {
  const pathname = usePathname();
  const search = useLocationSearch();
  const preferences = useConsentPreferences();

  useEffect(() => {
    recordLandingOrigin(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isTrackingEligible()) return;
    applyConsentPreferences(preferences);
  }, [preferences.analytics, preferences.adMeasurement]);

  useEffect(() => {
    if (!isAnalyticsEligible() || preferences.analytics !== 'granted') return;
    trackPageView({
      origin: window.location.origin,
      pathname,
      search,
    });
  }, [preferences.analytics, pathname, search]);
}
