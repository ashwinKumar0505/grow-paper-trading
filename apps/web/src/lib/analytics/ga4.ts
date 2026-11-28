import { getAdMeasurementConsent, getAnalyticsConsent, getConsentPreferences } from './consent';
import { getGoogleAdsConfig } from './googleAdsConfig';
import {
  __resetGoogleTagRuntimeForTests, ensureGoogleTagBootstrapped,
  hasGoogleTagScriptLoadFailed, isGoogleTagBootstrapped,
} from './googleTagRuntime';
import {
  isValidEventName, isValidMeasurementId, sanitizeEventParams, sanitizePageLocation,
} from './sanitize';
import type {
  AnalyticsConfig, AnalyticsConsentStatus, AnalyticsEventParams, ConsentPreferences,
} from './types';

let configOverride: AnalyticsConfig | null = null;
let configuredGa4Id: string | null = null;
let configuredAdsId: string | null = null;
let lastTrackedPageKey: string | null = null;
let lastAppliedConsentKey: string | null = null;

function readRuntimeEnv(): Record<string, unknown> {
  try {
    return {
      PROD: import.meta.env ? import.meta.env.PROD : false,
      VITE_GA_MEASUREMENT_ID: import.meta.env ? import.meta.env.VITE_GA_MEASUREMENT_ID : '',
    };
  } catch {
    return {};
  }
}

export function resolveAnalyticsConfig(
  env: Record<string, unknown> = readRuntimeEnv()
): AnalyticsConfig {
  const isProduction = env.PROD === true;
  const rawId = typeof env.VITE_GA_MEASUREMENT_ID === 'string' ? env.VITE_GA_MEASUREMENT_ID.trim() : '';
  const valid = isValidMeasurementId(rawId);
  return {
    measurementId: valid ? rawId : '',
    isProduction,
    enabled: isProduction && valid,
  };
}

export function getAnalyticsConfig(): AnalyticsConfig {
  return configOverride ?? resolveAnalyticsConfig();
}

export function isAnalyticsEligible(): boolean {
  return getAnalyticsConfig().enabled;
}

export function isTrackingEligible(): boolean {
  return getAnalyticsConfig().enabled || getGoogleAdsConfig().tagEnabled;
}

export function applyConsentPreferences(preferences: ConsentPreferences): void {
  try {
    if (typeof window === 'undefined') return;
    const gaConfig = getAnalyticsConfig();
    const adsConfig = getGoogleAdsConfig();
    if (!gaConfig.enabled && !adsConfig.tagEnabled) return;

    const allowAnalytics = gaConfig.enabled && preferences.analytics === 'granted';
    const allowAds = adsConfig.tagEnabled && preferences.adMeasurement === 'granted';
    const bootstrapped = isGoogleTagBootstrapped();

    if (gaConfig.enabled) {
      const disableKey = `ga-disable-${gaConfig.measurementId}` as const;
      if (allowAnalytics) window[disableKey] = false;
      else if (preferences.analytics === 'denied' || allowAds || bootstrapped) window[disableKey] = true;
    }

    if (adsConfig.tagEnabled) {
      const adsDisableKey = `ga-disable-${adsConfig.conversionId}` as const;
      if (allowAds) window[adsDisableKey] = false;
      else if (preferences.adMeasurement === 'denied' || allowAnalytics || bootstrapped) window[adsDisableKey] = true;
    }

    if (!allowAnalytics) lastTrackedPageKey = null;

    const consentKey = `${allowAnalytics ? 1 : 0}:${allowAds ? 1 : 0}`;
    if (!allowAds && bootstrapped && typeof window.gtag === 'function') {
      window.gtag('set', 'user_data', null);
    }

    if (!allowAnalytics && !allowAds) {
      if (bootstrapped && typeof window.gtag === 'function' && lastAppliedConsentKey !== consentKey) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
        lastAppliedConsentKey = consentKey;
      }
      return;
    }

    // Reuse the existing GA4 global Google tag whenever configured; never load a second gtag.js.
    const primaryTagId = gaConfig.enabled ? gaConfig.measurementId : adsConfig.conversionId;
    const gtag = ensureGoogleTagBootstrapped(primaryTagId);
    if (!gtag) return;

    if (lastAppliedConsentKey !== consentKey) {
      gtag('consent', 'update', {
        analytics_storage: allowAnalytics ? 'granted' : 'denied',
        ad_storage: allowAds ? 'granted' : 'denied',
        ad_user_data: allowAds ? 'granted' : 'denied',
        ad_personalization: 'denied',
      });
      lastAppliedConsentKey = consentKey;
    }

    if (allowAnalytics && configuredGa4Id !== gaConfig.measurementId) {
      gtag('config', gaConfig.measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        anonymize_ip: true,
      });
      configuredGa4Id = gaConfig.measurementId;
    }

    if (allowAds && configuredAdsId !== adsConfig.conversionId) {
      gtag('config', adsConfig.conversionId, {
        allow_enhanced_conversions: true,
        allow_ad_personalization_signals: false,
      });
      configuredAdsId = adsConfig.conversionId;
    }
  } catch {
    // Consent updates must never impact application execution.
  }
}

export function applyAnalyticsConsent(status: AnalyticsConsentStatus): void {
  applyConsentPreferences({
    analytics: status,
    adMeasurement: getAdMeasurementConsent(),
  });
}

export function ensureGoogleAdsReady(): boolean {
  try {
    const adsConfig = getGoogleAdsConfig();
    if (!adsConfig.tagEnabled || hasGoogleTagScriptLoadFailed() || typeof window === 'undefined') return false;
    if (getAdMeasurementConsent() !== 'granted') return false;
    applyConsentPreferences(getConsentPreferences());
    return (
      isGoogleTagBootstrapped() &&
      configuredAdsId === adsConfig.conversionId &&
      !hasGoogleTagScriptLoadFailed() &&
      typeof window.gtag === 'function'
    );
  } catch {
    return false;
  }
}

function canSendAnalytics(): boolean {
  const config = getAnalyticsConfig();
  if (!config.enabled || hasGoogleTagScriptLoadFailed() || typeof window === 'undefined') return false;
  if (getAnalyticsConsent() !== 'granted') return false;
  applyConsentPreferences(getConsentPreferences());
  return (
    isGoogleTagBootstrapped() &&
    configuredGa4Id === config.measurementId &&
    !hasGoogleTagScriptLoadFailed() &&
    typeof window.gtag === 'function'
  );
}

export function trackPageView(input?: {
  origin?: string;
  pathname?: string;
  search?: string;
}): boolean {
  try {
    if (!canSendAnalytics()) return false;
    const origin = input?.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const pathname = input?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const search = input?.search ?? (typeof window !== 'undefined' ? window.location.search : '');

    const sanitized = sanitizePageLocation({ origin, pathname, search });
    if (lastTrackedPageKey === sanitized.pageKey) {
      return false;
    }

    window.gtag?.('event', 'page_view', {
      page_path: sanitized.pagePath,
      page_location: sanitized.pageLocation,
      page_title: sanitized.pageTitle,
    });
    lastTrackedPageKey = sanitized.pageKey;
    return true;
  } catch {
    return false;
  }
}

export function trackEvent(eventName: string, params?: AnalyticsEventParams): boolean {
  try {
    if (!isValidEventName(eventName) || !canSendAnalytics()) return false;
    const sanitizedParams = sanitizeEventParams(params);
    window.gtag?.('event', eventName, sanitizedParams);
    return true;
  } catch {
    return false;
  }
}

export function __setAnalyticsConfigForTests(config: AnalyticsConfig | null): void {
  configOverride = config;
}

export function __resetAnalyticsRuntimeForTests(): void {
  configOverride = null;
  configuredGa4Id = null;
  configuredAdsId = null;
  lastTrackedPageKey = null;
  lastAppliedConsentKey = null;
  __resetGoogleTagRuntimeForTests();
}
