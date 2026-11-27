import { useEffect } from 'react';
import { useLocationSearch, usePathname } from '../navigation';
import { useAnalyticsConsent } from './consent';
import { applyAnalyticsConsent, isAnalyticsEligible, trackPageView } from './ga4';

export function useAnalyticsTracking(): void {
  const pathname = usePathname();
  const search = useLocationSearch();
  const consent = useAnalyticsConsent();

  useEffect(() => {
    if (!isAnalyticsEligible()) return;
    applyAnalyticsConsent(consent);
  }, [consent]);

  useEffect(() => {
    if (!isAnalyticsEligible() || consent !== 'granted') return;
    trackPageView({
      origin: window.location.origin,
      pathname,
      search,
    });
  }, [consent, pathname, search]);
}
