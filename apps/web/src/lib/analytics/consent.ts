import { useSyncExternalStore } from 'react';
import type { AnalyticsConsentRecord, AnalyticsConsentStatus } from './types';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'tradedia_analytics_consent_v1';

const consentListeners = new Set<() => void>();
const preferencesListeners = new Set<() => void>();

let cachedConsent: AnalyticsConsentStatus | null = null;
let preferencesOpen = false;

function hasGlobalPrivacyControl(): boolean {
  try {
    return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  } catch {
    return false;
  }
}

function readConsentFromStorage(): AnalyticsConsentStatus {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return hasGlobalPrivacyControl() ? 'denied' : 'unset';
    }
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) {
      return hasGlobalPrivacyControl() ? 'denied' : 'unset';
    }
    const parsed = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
    if (parsed.status === 'granted' || parsed.status === 'denied') {
      return parsed.status;
    }
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
  return hasGlobalPrivacyControl() ? 'denied' : 'unset';
}

export function getAnalyticsConsent(): AnalyticsConsentStatus {
  if (cachedConsent === null) {
    cachedConsent = readConsentFromStorage();
  }
  return cachedConsent;
}

export function setAnalyticsConsent(status: 'granted' | 'denied'): void {
  cachedConsent = status;
  preferencesOpen = false;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const record: AnalyticsConsentRecord = {
        status,
        updatedAt: Date.now(),
        version: 1,
      };
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Ignore storage persistence failures; in-memory consent still applies for this session.
  }

  consentListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Never allow listener errors to disrupt app state.
    }
  });
  preferencesListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Never allow listener errors to disrupt app state.
    }
  });
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

export function useAnalyticsConsent(): AnalyticsConsentStatus {
  return useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent, () => 'unset');
}

export function isAnalyticsPreferencesOpen(): boolean {
  return preferencesOpen;
}

export function openAnalyticsPreferences(): void {
  if (preferencesOpen) return;
  preferencesOpen = true;
  preferencesListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors.
    }
  });
}

export function closeAnalyticsPreferences(): void {
  if (!preferencesOpen) return;
  preferencesOpen = false;
  preferencesListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors.
    }
  });
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
  cachedConsent = null;
  preferencesOpen = false;
  consentListeners.clear();
  preferencesListeners.clear();
}
