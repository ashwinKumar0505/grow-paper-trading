import type { GtagFunction } from './types';

const GTAG_SCRIPT_ATTR = 'data-tradedia-ga4';

let tagBootstrapped = false;
let scriptInjectedForId: string | null = null;
let scriptLoadFailed = false;

export function ensureGtagFunction(): GtagFunction | null {
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

function injectGtagScript(primaryTagId: string): void {
  if (typeof document === 'undefined' || scriptInjectedForId) return;
  const existing = document.querySelector(`script[${GTAG_SCRIPT_ATTR}="${primaryTagId}"]`);
  if (existing) {
    scriptInjectedForId = primaryTagId;
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryTagId)}`;
  script.setAttribute(GTAG_SCRIPT_ATTR, primaryTagId);
  script.onerror = () => {
    scriptLoadFailed = true;
  };
  (document.head || document.documentElement).appendChild(script);
  scriptInjectedForId = primaryTagId;
}

export function ensureGoogleTagBootstrapped(primaryTagId: string): GtagFunction | null {
  if (scriptLoadFailed || typeof window === 'undefined') return null;
  const gtag = ensureGtagFunction();
  if (!gtag) return null;

  if (!tagBootstrapped) {
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    injectGtagScript(primaryTagId);
    gtag('js', new Date());
    tagBootstrapped = true;
  }

  return gtag;
}

export function isGoogleTagBootstrapped(): boolean {
  return tagBootstrapped;
}

export function hasGoogleTagScriptLoadFailed(): boolean {
  return scriptLoadFailed;
}

export function __resetGoogleTagRuntimeForTests(): void {
  tagBootstrapped = false;
  scriptInjectedForId = null;
  scriptLoadFailed = false;
}
