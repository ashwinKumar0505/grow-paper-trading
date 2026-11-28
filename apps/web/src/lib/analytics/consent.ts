import { useSyncExternalStore } from 'react';
import type {
  AnalyticsConsentRecord,
  AnalyticsConsentStatus,
  ConsentPreferences,
} from './types';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'tradedia_analytics_consent_v1';

const UNSET_PREFERENCES: ConsentPreferences = Object.freeze({
  analytics: 'unset',
  adMeasurement: 'unset',
});

const DENIED_PREFERENCES: ConsentPreferences = Object.freeze({
  analytics: 'denied',
  adMeasurement: 'denied',
});

const consentListeners = new Set<() => void>();
const preferencesListeners = new Set<() => void>();

let cachedPreferences: ConsentPreferences | null = null;
let preferencesOpen = false;

function hasGlobalPrivacyControl(): boolean {
  try {
    return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  } catch {
    return false;
  }
}

function isDecidedStatus(value: unknown): value is 'granted' | 'denied' {
  return value === 'granted' || value === 'denied';
}

function readConsentPreferencesFromStorage(): ConsentPreferences {
  const defaultPrefs = hasGlobalPrivacyControl() ? DENIED_PREFERENCES : UNSET_PREFERENCES;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultPrefs;
    }
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) {
      return defaultPrefs;
    }
    const parsed = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
    if (isDecidedStatus(parsed.analytics) || isDecidedStatus(parsed.adMeasurement)) {
      return Object.freeze({
        analytics: isDecidedStatus(parsed.analytics) ? parsed.analytics : 'denied',
        // Existing or partial records never auto-opt users into advertising measurement.
        adMeasurement: isDecidedStatus(parsed.adMeasurement) ? parsed.adMeasurement : 'denied',
      });
    }
    if (isDecidedStatus(parsed.status)) {
      return Object.freeze({
        analytics: parsed.status,
        adMeasurement: 'denied',
      });
    }
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
  return defaultPrefs;
}

function notifyListeners(listeners: Set<() => void>): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Never allow listener errors to disrupt app state.
    }
  });
}

export function getConsentPreferences(): ConsentPreferences {
  if (cachedPreferences === null) {
    cachedPreferences = readConsentPreferencesFromStorage();
  }
  return cachedPreferences;
}

export function getAnalyticsConsent(): AnalyticsConsentStatus {
  return getConsentPreferences().analytics;
}

export function getAdMeasurementConsent(): AnalyticsConsentStatus {
  return getConsentPreferences().adMeasurement;
}

export function isConsentUnset(preferences: ConsentPreferences = getConsentPreferences()): boolean {
  return preferences.analytics === 'unset' && preferences.adMeasurement === 'unset';
}

export function setConsentPreferences(next: {
  analytics: 'granted' | 'denied';
  adMeasurement: 'granted' | 'denied';
}): void {
  cachedPreferences = Object.freeze({
    analytics: next.analytics,
    adMeasurement: next.adMeasurement,
  });
  preferencesOpen = false;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const record: AnalyticsConsentRecord = {
        status: next.analytics,
        analytics: next.analytics,
        adMeasurement: next.adMeasurement,
        updatedAt: Date.now(),
        version: 2,
      };
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Ignore storage persistence failures; in-memory consent still applies for this session.
  }

  notifyListeners(consentListeners);
  notifyListeners(preferencesListeners);
}

export function setAnalyticsConsent(status: 'granted' | 'denied'): void {
  const current = getConsentPreferences();
  // Accepting analytics never enables advertising measurement automatically.
  const nextAdMeasurement: 'granted' | 'denied' =
    current.adMeasurement === 'granted' ? 'granted' : 'denied';
  setConsentPreferences({ analytics: status, adMeasurement: nextAdMeasurement });
}

export function setAdMeasurementConsent(status: 'granted' | 'denied'): void {
  const current = getConsentPreferences();
  const nextAnalytics: 'granted' | 'denied' =
    current.analytics === 'granted' ? 'granted' : 'denied';
  setConsentPreferences({ analytics: nextAnalytics, adMeasurement: status });
}

export function acceptAllConsent(): void {
  setConsentPreferences({ analytics: 'granted', adMeasurement: 'granted' });
}

export function rejectAllConsent(): void {
  setConsentPreferences({ analytics: 'denied', adMeasurement: 'denied' });
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

export function useConsentPreferences(): ConsentPreferences {
  return useSyncExternalStore(
    subscribeAnalyticsConsent,
    getConsentPreferences,
    () => UNSET_PREFERENCES
  );
}

export function useAnalyticsConsent(): AnalyticsConsentStatus {
  return useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent, () => 'unset');
}

export function useAdMeasurementConsent(): AnalyticsConsentStatus {
  return useSyncExternalStore(subscribeAnalyticsConsent, getAdMeasurementConsent, () => 'unset');
}

export function isAnalyticsPreferencesOpen(): boolean {
  return preferencesOpen;
}

export function openAnalyticsPreferences(): void {
  if (preferencesOpen) return;
  preferencesOpen = true;
  notifyListeners(preferencesListeners);
}

export function closeAnalyticsPreferences(): void {
  if (!preferencesOpen) return;
  preferencesOpen = false;
  notifyListeners(preferencesListeners);
}

export function subscribeAnalyticsPreferences(listener: () => void): () => void {
  preferencesListeners.add(listener);
  return () => {
    preferencesListeners.delete(listener);
  };
}

export function useAnalyticsPreferencesOpen(): boolean {
  return useSyncExternalStore(
    subscribeAnalyticsPreferences,
    isAnalyticsPreferencesOpen,
    () => false
  );
}

export function __resetConsentStateForTests(): void {
  cachedPreferences = null;
  preferencesOpen = false;
  consentListeners.clear();
  preferencesListeners.clear();
}
