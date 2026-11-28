import { isValidGoogleAdsId, isValidGoogleAdsLabel } from './sanitize';
import type { GoogleAdsConfig } from './types';

let adsConfigOverride: GoogleAdsConfig | null = null;

function readGoogleAdsRuntimeEnv(): Record<string, unknown> {
  try {
    return {
      PROD: import.meta.env ? import.meta.env.PROD : false,
      VITE_GOOGLE_ADS_ID: import.meta.env ? import.meta.env.VITE_GOOGLE_ADS_ID : '',
      VITE_GOOGLE_ADS_SIGNUP_LABEL: import.meta.env
        ? import.meta.env.VITE_GOOGLE_ADS_SIGNUP_LABEL
        : '',
    };
  } catch {
    return {};
  }
}

export function resolveGoogleAdsConfig(
  env: Record<string, unknown> = readGoogleAdsRuntimeEnv()
): GoogleAdsConfig {
  const isProduction = env.PROD === true;
  const rawId = typeof env.VITE_GOOGLE_ADS_ID === 'string' ? env.VITE_GOOGLE_ADS_ID.trim() : '';
  const rawLabel =
    typeof env.VITE_GOOGLE_ADS_SIGNUP_LABEL === 'string'
      ? env.VITE_GOOGLE_ADS_SIGNUP_LABEL.trim()
      : '';
  const validId = isValidGoogleAdsId(rawId);
  const validLabel = isValidGoogleAdsLabel(rawLabel);

  return {
    conversionId: validId ? rawId.toUpperCase() : '',
    signupLabel: validLabel ? rawLabel : '',
    isProduction,
    tagEnabled: isProduction && validId,
    signupEnabled: isProduction && validId && validLabel,
  };
}

export function getGoogleAdsConfig(): GoogleAdsConfig {
  return adsConfigOverride ?? resolveGoogleAdsConfig();
}

export function isGoogleAdsEligible(): boolean {
  return getGoogleAdsConfig().tagEnabled;
}

export function isGoogleAdsSignupEnabled(): boolean {
  return getGoogleAdsConfig().signupEnabled;
}

export function __setGoogleAdsConfigForTests(config: GoogleAdsConfig | null): void {
  adsConfigOverride = config;
}

export function __resetGoogleAdsConfigForTests(): void {
  adsConfigOverride = null;
}
