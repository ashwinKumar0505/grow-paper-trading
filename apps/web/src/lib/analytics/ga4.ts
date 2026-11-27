import { getAnalyticsConsent } from './consent';
import {
  isValidEventName,
  isValidMeasurementId,
  sanitizeEventParams,
  sanitizePageLocation,
} from './sanitize';
import type {
  AnalyticsConfig,
  AnalyticsConsentStatus,
  AnalyticsEventParams,
  GtagFunction,
} from './types';

const GTAG_SCRIPT_ATTR = 'data-tradedia-ga4';

let configOverride: AnalyticsConfig | null = null;
let initializedMeasurementId: string | null = null;
let scriptInjectedForId: string | null = null;
let scriptLoadFailed = false;
let lastTrackedPageKey: string | null = null;

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

function ensureGtagFunction(): GtagFunction | null {
  if (typeof window === 'undefined') return null;
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  if (typeof window.gtag !== 'function') {
    const queuedGtag: GtagFunction = function gtag() {
      window.dataLayer?.push(arguments);
    };
    window.gtag = queuedGtag;
  }
  return window.gtag;
}

function injectGtagScript(measurementId: string): void {
  if (typeof document === 'undefined' || scriptInjectedForId === measurementId) return;
  const existing = document.querySelector(`script[${GTAG_SCRIPT_ATTR}="${measurementId}"]`);
  if (existing) {
    scriptInjectedForId = measurementId;
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.setAttribute(GTAG_SCRIPT_ATTR, measurementId);
  script.onerror = () => {
    scriptLoadFailed = true;
  };
  (document.head || document.documentElement).appendChild(script);
  scriptInjectedForId = measurementId;
}

function ensureInitialized(measurementId: string): boolean {
  if (scriptLoadFailed || typeof window === 'undefined') return false;
  const gtag = ensureGtagFunction();
  if (!gtag) return false;

  const disableKey = `ga-disable-${measurementId}` as const;
  window[disableKey] = false;

  if (initializedMeasurementId !== measurementId) {
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    injectGtagScript(measurementId);
    gtag('js', new Date());
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      anonymize_ip: true,
    });
    initializedMeasurementId = measurementId;
  } else {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  return true;
}

export function applyAnalyticsConsent(status: AnalyticsConsentStatus): void {
  try {
    const config = getAnalyticsConfig();
    if (!config.enabled || typeof window === 'undefined') return;

    const disableKey = `ga-disable-${config.measurementId}` as const;

    if (status === 'granted') {
      ensureInitialized(config.measurementId);
      return;
    }

    lastTrackedPageKey = null;

    if (status === 'denied') {
      window[disableKey] = true;
      if (initializedMeasurementId === config.measurementId && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
    }
  } catch {
    // Analytics consent updates must never impact application execution.
  }
}

function canSendAnalytics(): boolean {
  const config = getAnalyticsConfig();
  if (!config.enabled || scriptLoadFailed || typeof window === 'undefined') return false;
  if (getAnalyticsConsent() !== 'granted') return false;
  return ensureInitialized(config.measurementId);
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
  initializedMeasurementId = null;
  scriptInjectedForId = null;
  scriptLoadFailed = false;
  lastTrackedPageKey = null;
}
