import { getAdMeasurementConsent } from './consent';
import { isValidSha256Hex } from './enhancedConversions';
import { ensureGoogleAdsReady } from './ga4';
import {
  __resetGoogleAdsConfigForTests,
  __setGoogleAdsConfigForTests,
  getGoogleAdsConfig,
  isGoogleAdsEligible,
  isGoogleAdsSignupEnabled,
  resolveGoogleAdsConfig,
} from './googleAdsConfig';
import { hasGoogleTagScriptLoadFailed } from './googleTagRuntime';
import {
  isValidConversionTransactionId,
  isValidGoogleAdsLabel,
} from './sanitize';
import type { GoogleAdsConversionInput, SignupConversionPayload } from './types';

export const GOOGLE_ADS_CONVERSIONS_STORAGE_KEY = 'tradedia_ads_conversions_v1';
export const SIGNUP_CONVERSION_VALUE = 1.0;
export const SIGNUP_CONVERSION_CURRENCY = 'INR';

const MAX_STORED_CONVERSION_KEYS = 50;
const ISO_CURRENCY_RE = /^[A-Z]{3}$/;

const dispatchedConversionKeys = new Set<string>();

function readStoredConversionKeys(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(GOOGLE_ADS_CONVERSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

function hasDispatchedConversion(dedupKey: string): boolean {
  if (dispatchedConversionKeys.has(dedupKey)) return true;
  const stored = readStoredConversionKeys();
  if (stored.includes(dedupKey)) {
    dispatchedConversionKeys.add(dedupKey);
    return true;
  }
  return false;
}

function markConversionDispatched(dedupKey: string): void {
  dispatchedConversionKeys.add(dedupKey);
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const stored = readStoredConversionKeys().filter((key) => key !== dedupKey);
    stored.push(dedupKey);
    const bounded = stored.slice(-MAX_STORED_CONVERSION_KEYS);
    window.localStorage.setItem(GOOGLE_ADS_CONVERSIONS_STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // Storage failures must never block or disrupt conversion handling or auth.
  }
}

export function trackGoogleAdsConversion(input: GoogleAdsConversionInput): boolean {
  try {
    const config = getGoogleAdsConfig();
    if (!config.isProduction || !config.tagEnabled) return false;
    if (getAdMeasurementConsent() !== 'granted') return false;

    const label = typeof input.conversionLabel === 'string' ? input.conversionLabel.trim() : '';
    const transactionId = typeof input.transactionId === 'string' ? input.transactionId.trim() : '';
    if (!isValidGoogleAdsLabel(label) || !isValidConversionTransactionId(transactionId)) {
      return false;
    }

    const sendTo = `${config.conversionId}/${label}`;
    const dedupKey = `${sendTo}:${transactionId}`;
    if (hasDispatchedConversion(dedupKey)) {
      return false;
    }

    if (!ensureGoogleAdsReady()) {
      return false;
    }

    const payload: Record<string, string | number> = {
      send_to: sendTo,
      transaction_id: transactionId,
    };

    if (typeof input.value === 'number' && Number.isFinite(input.value) && input.value >= 0) {
      payload.value = input.value;
    }
    if (typeof input.currency === 'string') {
      const normalizedCurrency = input.currency.trim().toUpperCase();
      if (ISO_CURRENCY_RE.test(normalizedCurrency)) {
        payload.currency = normalizedCurrency;
      }
    }

    const sha256Email =
      typeof input.sha256Email === 'string' && isValidSha256Hex(input.sha256Email)
        ? input.sha256Email.trim()
        : null;

    if (sha256Email) {
      window.gtag?.('set', 'user_data', {
        sha256_email_address: sha256Email,
      });
    }
    try {
      window.gtag?.('event', 'conversion', payload);
    } finally {
      if (sha256Email) {
        try {
          window.gtag?.('set', 'user_data', null);
        } catch {
          // Ignore user_data reset errors so ad blockers never disrupt app execution.
        }
      }
    }
    markConversionDispatched(dedupKey);
    return true;
  } catch {
    return false;
  }
}

export function trackGoogleAdsSignupConversion(params: {
  conversionId?: string | null;
  isNewAccount?: boolean;
  sha256Email?: string | null;
}): boolean {
  try {
    if (params.isNewAccount !== true || !params.conversionId) return false;
    const config = getGoogleAdsConfig();
    if (!config.signupEnabled) return false;

    return trackGoogleAdsConversion({
      conversionLabel: config.signupLabel,
      transactionId: params.conversionId,
      value: SIGNUP_CONVERSION_VALUE,
      currency: SIGNUP_CONVERSION_CURRENCY,
      sha256Email: params.sha256Email,
    });
  } catch {
    return false;
  }
}

export function canRequestSignupConversionClaim(): boolean {
  try {
    const config = getGoogleAdsConfig();
    if (!config.signupEnabled) return false;
    if (getAdMeasurementConsent() !== 'granted') return false;
    if (hasGoogleTagScriptLoadFailed()) return false;
    return true;
  } catch {
    return false;
  }
}

export function hasDispatchedSignupConversion(conversionId?: string | null): boolean {
  try {
    if (!conversionId) return false;
    const config = getGoogleAdsConfig();
    if (!config.signupEnabled) return false;
    const tx = conversionId.trim();
    if (!isValidConversionTransactionId(tx)) return false;
    return hasDispatchedConversion(`${config.conversionId}/${config.signupLabel}:${tx}`);
  } catch {
    return false;
  }
}

export function recordVerifiedSignupConversion(
  signupConversion: SignupConversionPayload | null | undefined,
  options?: { sha256Email?: string | null }
): boolean {
  try {
    if (!signupConversion?.eligible || !signupConversion.conversionId) {
      return false;
    }
    return trackGoogleAdsSignupConversion({
      conversionId: signupConversion.conversionId,
      isNewAccount: true,
      sha256Email: options?.sha256Email,
    });
  } catch {
    return false;
  }
}

export {
  __resetGoogleAdsConfigForTests,
  __setGoogleAdsConfigForTests,
  getGoogleAdsConfig,
  isGoogleAdsEligible,
  isGoogleAdsSignupEnabled,
  resolveGoogleAdsConfig,
};

export function __resetGoogleAdsRuntimeForTests(): void {
  dispatchedConversionKeys.clear();
  __resetGoogleAdsConfigForTests();
}
