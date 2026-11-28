import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Express } from 'express';
import {
  dispatchVerifiedSignupConversion,
  exchangeFirebaseServerSessionDetails,
} from '../components/auth/authModalService';
import { AnalyticsConsentBanner } from '../components/common/AnalyticsConsentBanner';
import { AnalyticsPreferenceControl } from '../components/common/AnalyticsPreferenceControl';
import { LegalPageContent } from '../components/legal/LegalPageContent';
import {
  __resetConsentStateForTests,
  acceptAllConsent,
  ANALYTICS_CONSENT_STORAGE_KEY,
  getAdMeasurementConsent,
  getAnalyticsConsent,
  getConsentPreferences,
  isConsentUnset,
  rejectAllConsent,
  setAdMeasurementConsent,
  setAnalyticsConsent,
} from '../lib/analytics/consent';
import {
  __resetAnalyticsRuntimeForTests,
  __setAnalyticsConfigForTests,
  applyConsentPreferences,
  trackEvent,
  trackPageView,
} from '../lib/analytics/ga4';
import {
  __resetGoogleAdsRuntimeForTests,
  __setGoogleAdsConfigForTests,
  canRequestSignupConversionClaim,
  GOOGLE_ADS_CONVERSIONS_STORAGE_KEY,
  recordVerifiedSignupConversion,
  resolveGoogleAdsConfig,
  trackGoogleAdsConversion,
  trackGoogleAdsSignupConversion,
} from '../lib/analytics/googleAds';
import {
  hashEmailForEnhancedConversion,
  isValidSha256Hex,
  normalizeEmailForEnhancedConversion,
} from '../lib/analytics/enhancedConversions';
import { createExpressApp } from '../server/app';
import {
  claimNewAccountSignupConversion,
  generateOpaqueSignupConversionId,
  getPendingSignupConversion,
  resolveOrCreateCanonicalUser,
} from '../server/auth/authService';
import { DurableStore } from '../server/storage/durableStore';
import {
  FirestoreRestClient,
  resolveFirestoreConfig,
} from '../server/storage/firestoreRestClient';
import { FirestoreStoreAdapter } from '../server/storage/firestoreStoreAdapter';
import type { FirestoreDocument } from '../server/storage/firestoreValueCodec';

interface MockScriptElement {
  async: boolean;
  src: string;
  attrs: Record<string, string>;
  onerror: null | (() => void);
  setAttribute: (k: string, v: string) => void;
}

function installMockBrowser(options?: {
  gpc?: boolean;
  throwOnStorage?: boolean;
  initialStorage?: Record<string, string>;
}) {
  const storage = new Map<string, string>(Object.entries(options?.initialStorage || {}));
  const scripts: MockScriptElement[] = [];

  const mockLocalStorage = {
    getItem(key: string) {
      if (options?.throwOnStorage) throw new Error('storage blocked');
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      if (options?.throwOnStorage) throw new Error('storage blocked');
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };

  const mockWindow: Record<string, unknown> = {
    localStorage: mockLocalStorage,
    location: { origin: 'https://www.tradedia.in', pathname: '/', search: '?gclid=test_click_123' },
    dataLayer: undefined,
    gtag: undefined,
  };

  const mockDocument = {
    head: {
      appendChild(el: MockScriptElement) {
        scripts.push(el);
        return el;
      },
    },
    createElement() {
      return {
        async: false,
        src: '',
        attrs: {} as Record<string, string>,
        onerror: null as null | (() => void),
        setAttribute(k: string, v: string) {
          this.attrs[k] = v;
        },
      };
    },
    querySelector(selector: string) {
      const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
      if (!match) return null;
      const [, attr, val] = match;
      return scripts.find((s) => s.attrs[attr] === val) || null;
    },
  };

  const prevWindow = (globalThis as Record<string, unknown>).window;
  const prevDocument = (globalThis as Record<string, unknown>).document;
  const prevLocalStorage = (globalThis as Record<string, unknown>).localStorage;
  const prevNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  (globalThis as Record<string, unknown>).window = mockWindow;
  (globalThis as Record<string, unknown>).document = mockDocument;
  (globalThis as Record<string, unknown>).localStorage = mockLocalStorage;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { globalPrivacyControl: options?.gpc === true },
  });

  return {
    mockWindow,
    scripts,
    storage,
    restore() {
      __resetGoogleAdsRuntimeForTests();
      __resetAnalyticsRuntimeForTests();
      __resetConsentStateForTests();
      if (prevWindow === undefined) delete (globalThis as Record<string, unknown>).window;
      else (globalThis as Record<string, unknown>).window = prevWindow;
      if (prevDocument === undefined) delete (globalThis as Record<string, unknown>).document;
      else (globalThis as Record<string, unknown>).document = prevDocument;
      if (prevLocalStorage === undefined) delete (globalThis as Record<string, unknown>).localStorage;
      else (globalThis as Record<string, unknown>).localStorage = prevLocalStorage;
      if (prevNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', prevNavigatorDescriptor);
      } else {
        delete (globalThis as Record<string, unknown>).navigator;
      }
    },
  };
}

function getGtagCalls(mockWindow: Record<string, unknown>): unknown[][] {
  const layer = mockWindow.dataLayer;
  if (!Array.isArray(layer)) return [];
  return layer.map((entry) => Array.from(entry as ArrayLike<unknown>));
}

function enableProdTrackingForTests() {
  __setAnalyticsConfigForTests({
    measurementId: 'G-NTTB773KTH',
    isProduction: true,
    enabled: true,
  });
  __setGoogleAdsConfigForTests({
    conversionId: 'AW-18600529507',
    signupLabel: 'ZG6OCMS0hMEdEOOctqVF',
    isProduction: true,
    tagEnabled: true,
    signupEnabled: true,
  });
}

function makeEmulatorFirebaseJwt(params: {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
  provider: 'google.com' | 'password';
  nowMs?: number;
}): string {
  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: params.sub,
      email: params.email,
      name: params.name,
      email_verified: params.emailVerified,
      aud: 'test-tradedia-project',
      iss: 'https://securetoken.google.com/test-tradedia-project',
      exp: nowSec + 3600,
      firebase: { sign_in_provider: params.provider },
    })
  ).toString('base64url');
  return `${header}.${payload}.`;
}

function invokeJsonRequest(
  app: Express,
  method: 'GET' | 'POST',
  urlPath: string,
  options?: { headers?: Record<string, string>; body?: Record<string, unknown> }
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    const req = new IncomingMessage(socket);
    const bodyText = options?.body ? JSON.stringify(options.body) : '';
    const bodyBuf = Buffer.from(bodyText, 'utf8');
    req.url = urlPath;
    req.method = method;
    req.headers = {
      ...Object.fromEntries(
        Object.entries(options?.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
      ),
      ...(bodyBuf.length > 0
        ? { 'content-type': 'application/json', 'content-length': String(bodyBuf.length) }
        : {}),
    };

    const res = new ServerResponse(req);
    res.assignSocket(socket);
    res.write = ((chunk: unknown) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    }) as typeof res.write;
    res.end = ((chunk?: unknown) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve({
        status: res.statusCode,
        json: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
      });
      return res;
    }) as typeof res.end;

    const handler = app as unknown as (
      request: IncomingMessage,
      response: ServerResponse,
      next: (err?: unknown) => void
    ) => void;
    handler(req, res, (err?: unknown) => {
      if (err) reject(err);
    });

    if (bodyBuf.length > 0) req.push(bodyBuf);
    req.push(null);
  });
}

function createAtomicMockFirestore() {
  const db = new Map<string, FirestoreDocument>();
  let signupClaimGets = 0;
  let signupClaimCreates = 0;

  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
    }
    if (url.endsWith(':commit') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body || '{}')) as {
        writes?: Array<{
          update?: FirestoreDocument;
          delete?: string;
          currentDocument?: { exists?: boolean };
        }>;
      };
      for (const w of body.writes || []) {
        if (w.update?.name) {
          if (w.update.name.includes('/documents/signup_conversions/')) {
            signupClaimCreates += 1;
          }
          if (w.currentDocument?.exists === false && db.has(w.update.name)) {
            return new Response(
              JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS' } }),
              { status: 409 }
            );
          }
        }
      }
      for (const w of body.writes || []) {
        if (w.update?.name) db.set(w.update.name, w.update);
        if (w.delete) db.delete(w.delete);
      }
      return new Response(JSON.stringify({ writeResults: [] }), { status: 200 });
    }
    if (init?.method === 'GET' && url.includes('/documents/')) {
      const docRel = url.split('/documents/')[1].split('?')[0];
      const parts = docRel.split('/');
      if (parts.length === 2) {
        if (parts[0] === 'signup_conversions') signupClaimGets += 1;
        const fullKey = [...db.keys()].find((k) => k.endsWith(`/documents/${docRel}`));
        if (!fullKey) return new Response('Not found', { status: 404 });
        return new Response(JSON.stringify(db.get(fullKey)), { status: 200 });
      }
      const documents = [...db.entries()]
        .filter(([name]) => name.includes(`/documents/${docRel}/`))
        .map(([, doc]) => doc);
      return new Response(JSON.stringify({ documents }), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  return {
    db,
    fetchFn,
    stats: () => ({ signupClaimGets, signupClaimCreates }),
  };
}

test('resolveGoogleAdsConfig enforces production-only execution and validates ID and label', () => {
  assert.deepEqual(
    resolveGoogleAdsConfig({
      PROD: false,
      VITE_GOOGLE_ADS_ID: 'AW-18600529507',
      VITE_GOOGLE_ADS_SIGNUP_LABEL: 'ZG6OCMS0hMEdEOOctqVF',
    }),
    {
      conversionId: 'AW-18600529507',
      signupLabel: 'ZG6OCMS0hMEdEOOctqVF',
      isProduction: false,
      tagEnabled: false,
      signupEnabled: false,
    }
  );
  assert.deepEqual(
    resolveGoogleAdsConfig({
      PROD: true,
      VITE_GOOGLE_ADS_ID: 'AW-18600529507',
      VITE_GOOGLE_ADS_SIGNUP_LABEL: '',
    }),
    {
      conversionId: 'AW-18600529507',
      signupLabel: '',
      isProduction: true,
      tagEnabled: true,
      signupEnabled: false,
    }
  );
  assert.deepEqual(
    resolveGoogleAdsConfig({
      PROD: true,
      VITE_GOOGLE_ADS_ID: 'G-NTTB773KTH',
      VITE_GOOGLE_ADS_SIGNUP_LABEL: 'bad/label',
    }),
    {
      conversionId: '',
      signupLabel: '',
      isProduction: true,
      tagEnabled: false,
      signupEnabled: false,
    }
  );
  assert.deepEqual(
    resolveGoogleAdsConfig({
      PROD: true,
      VITE_GOOGLE_ADS_ID: 'AW-18600529507',
      VITE_GOOGLE_ADS_SIGNUP_LABEL: 'ZG6OCMS0hMEdEOOctqVF',
    }),
    {
      conversionId: 'AW-18600529507',
      signupLabel: 'ZG6OCMS0hMEdEOOctqVF',
      isProduction: true,
      tagEnabled: true,
      signupEnabled: true,
    }
  );
});

test('Consent Mode v2 migrates legacy analytics without ad opt-in, isolates ad-only from GA4, and enforces immediate withdrawal', () => {
  // Legacy v1 granted analytics -> adMeasurement MUST remain denied
  const legacyEnv = installMockBrowser({
    initialStorage: {
      [ANALYTICS_CONSENT_STORAGE_KEY]: JSON.stringify({
        status: 'granted',
        updatedAt: 1_750_000_000_000,
        version: 1,
      }),
    },
  });

  try {
    enableProdTrackingForTests();
    assert.deepEqual(getConsentPreferences(), { analytics: 'granted', adMeasurement: 'denied' });
    assert.equal(isConsentUnset(), false);
    assert.equal(canRequestSignupConversionClaim(), false);
    applyConsentPreferences(getConsentPreferences());

    assert.equal(legacyEnv.scripts.length, 1);
    assert.equal(legacyEnv.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-NTTB773KTH');
    assert.equal(legacyEnv.mockWindow['ga-disable-G-NTTB773KTH'], false);
    assert.equal(legacyEnv.mockWindow['ga-disable-AW-18600529507'], true);
    assert.equal(trackPageView({ origin: 'https://www.tradedia.in', pathname: '/' }), true);
    assert.equal(
      trackGoogleAdsSignupConversion({
        conversionId: 'scv_0123456789abcdef0123456789abcdef',
        isNewAccount: true,
      }),
      false
    );
    const legacyConfigs = getGtagCalls(legacyEnv.mockWindow).filter((c) => c[0] === 'config');
    assert.deepEqual(
      legacyConfigs.map((c) => c[1]),
      ['G-NTTB773KTH']
    );
  } finally {
    legacyEnv.restore();
  }

  // Advertising Measurement ONLY must NOT enable GA4 tracking
  const adOnlyEnv = installMockBrowser();
  try {
    enableProdTrackingForTests();
    assert.equal(isConsentUnset(), true);
    assert.equal(canRequestSignupConversionClaim(), false);

    setAdMeasurementConsent('granted');
    assert.equal(getAnalyticsConsent(), 'denied');
    assert.equal(getAdMeasurementConsent(), 'granted');
    assert.equal(canRequestSignupConversionClaim(), true);
    applyConsentPreferences(getConsentPreferences());

    assert.equal(adOnlyEnv.scripts.length, 1);
    assert.equal(adOnlyEnv.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-NTTB773KTH');
    assert.equal(adOnlyEnv.mockWindow['ga-disable-G-NTTB773KTH'], true);
    assert.equal(adOnlyEnv.mockWindow['ga-disable-AW-18600529507'], false);

    // GA4 config/events never fire when only Advertising Measurement is granted
    const adOnlyConfigs = getGtagCalls(adOnlyEnv.mockWindow).filter((c) => c[0] === 'config');
    assert.deepEqual(
      adOnlyConfigs.map((c) => c[1]),
      ['AW-18600529507']
    );
    assert.equal(trackPageView({ origin: 'https://www.tradedia.in', pathname: '/' }), false);
    assert.equal(trackEvent('login', { method: 'google' }), false);
    assert.equal(
      trackGoogleAdsSignupConversion({
        conversionId: 'scv_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        isNewAccount: true,
      }),
      true
    );

    // Accepting Analytics afterward reuses the same single script and keeps ad_personalization denied
    setAnalyticsConsent('granted');
    applyConsentPreferences(getConsentPreferences());
    assert.equal(adOnlyEnv.scripts.length, 1);
    assert.equal(adOnlyEnv.mockWindow['ga-disable-G-NTTB773KTH'], false);
    assert.equal(trackPageView({ origin: 'https://www.tradedia.in', pathname: '/pricing' }), true);

    // Consent withdrawal immediately disables further advertising measurement (flag + consent update + API guard)
    setAdMeasurementConsent('denied');
    assert.equal(canRequestSignupConversionClaim(), false);
    assert.equal(
      trackGoogleAdsSignupConversion({
        conversionId: 'scv_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        isNewAccount: true,
      }),
      false
    );
    applyConsentPreferences(getConsentPreferences());
    assert.equal(adOnlyEnv.mockWindow['ga-disable-AW-18600529507'], true);
    assert.equal(trackEvent('login', { method: 'email' }), true);

    // Reject All disables both
    rejectAllConsent();
    applyConsentPreferences(getConsentPreferences());
    assert.equal(adOnlyEnv.mockWindow['ga-disable-G-NTTB773KTH'], true);
    assert.equal(adOnlyEnv.mockWindow['ga-disable-AW-18600529507'], true);

    const consentCalls = getGtagCalls(adOnlyEnv.mockWindow).filter((c) => c[0] === 'consent');
    assert.ok(consentCalls.length >= 4);
    for (const call of consentCalls) {
      assert.equal((call[2] as Record<string, unknown>).ad_personalization, 'denied');
    }
    assert.deepEqual(consentCalls[0][2], {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  } finally {
    adOnlyEnv.restore();
  }
});

test('Frontend checks Advertising Measurement consent before requesting claimSignupConversion and preserves unconsented or failed conversions for safe retry', async () => {
  const prevEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const prevProject = process.env.FIREBASE_PROJECT_ID;
  const prevFetch = globalThis.fetch;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIREBASE_PROJECT_ID = 'test-tradedia-project';

  const env = installMockBrowser();
  try {
    enableProdTrackingForTests();
    const store = new DurableStore({ inMemoryOnly: true });
    const app = createExpressApp(store);
    const seenSessionBodies: Array<Record<string, unknown>> = [];
    const confirmBodies: Array<Record<string, unknown>> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const parsedBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const headers = (init?.headers || {}) as Record<string, string>;
      if (url === '/api/auth/firebase-session') {
        seenSessionBodies.push(parsedBody);
        const r = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
          headers,
          body: parsedBody,
        });
        return new Response(JSON.stringify(r.json), { status: r.status });
      }
      if (url === '/api/auth/confirm-signup-conversion') {
        confirmBodies.push(parsedBody);
        const r = await invokeJsonRequest(app, 'POST', '/api/auth/confirm-signup-conversion', {
          headers,
          body: parsedBody,
        });
        return new Response(JSON.stringify(r.json), { status: r.status });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const token = makeEmulatorFirebaseJwt({
      sub: 'fb_retry_user',
      email: 'retry.user@example.com',
      name: 'Retry User',
      emailVerified: true,
      provider: 'google.com',
    });

    // 1. Without Advertising Measurement consent (only Analytics granted):
    //    frontend MUST send claimSignupConversion: false and backend MUST NOT consume conversion!
    setAnalyticsConsent('granted');
    const unconsentedSession = await exchangeFirebaseServerSessionDetails({
      idToken: token,
      fallbackUid: 'fb_retry_user',
      authProvider: 'google',
      claimSignupConversion: true,
    });
    assert.equal(seenSessionBodies[0].claimSignupConversion, false);
    assert.equal(unconsentedSession.isNewAccount, false);
    assert.equal(unconsentedSession.signupConversion, null);
    assert.equal(store.getState().users['fb_retry_user']?.signupConversionClaimedAt, undefined);

    // 2. Grant Advertising Measurement, simulate gtag throwing (blocked script / temporary error):
    //    session returns stable transaction_id, dispatch fails, backend does NOT permanently consume it!
    acceptAllConsent();
    applyConsentPreferences(getConsentPreferences());
    const realGtag = env.mockWindow.gtag;
    env.mockWindow.gtag = () => {
      throw new Error('temporarily blocked');
    };
    const blockedSession = await exchangeFirebaseServerSessionDetails({
      idToken: token,
      fallbackUid: 'fb_retry_user',
      authProvider: 'google',
      claimSignupConversion: true,
    });
    assert.equal(seenSessionBodies[1].claimSignupConversion, true);
    assert.equal(blockedSession.isNewAccount, true);
    const stableTxId = blockedSession.signupConversion?.conversionId;
    assert.match(stableTxId || '', /^scv_[a-f0-9]{32}$/);
    assert.equal(await dispatchVerifiedSignupConversion(blockedSession, { verifiedEmail: 'retry.user@example.com' }), false);
    assert.equal(confirmBodies.length, 0);
    assert.equal(store.getState().users['fb_retry_user']?.signupConversionClaimedAt, undefined);

    // 3. Interrupted callback before dispatch (e.g. tab closed before dispatchVerifiedSignupConversion):
    //    retry receives the EXACT SAME stable transaction_id!
    const retrySession = await exchangeFirebaseServerSessionDetails({
      idToken: token,
      fallbackUid: 'fb_retry_user',
      authProvider: 'google',
      claimSignupConversion: true,
    });
    assert.equal(retrySession.signupConversion?.conversionId, stableTxId);

    // 4. Once gtag is working, dispatch succeeds ONCE with SHA-256 hashed email and confirms with backend
    env.mockWindow.gtag = realGtag;
    assert.equal(
      await dispatchVerifiedSignupConversion(retrySession, { verifiedEmail: 'Retry.User@Example.com' }),
      true
    );
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(confirmBodies.length, 1);
    assert.equal(confirmBodies[0].conversionId, stableTxId);
    assert.ok(store.getState().users['fb_retry_user']?.signupConversionClaimedAt);

    // 5. Subsequent auth session after confirmation returns eligible: false
    const afterConfirmSession = await exchangeFirebaseServerSessionDetails({
      idToken: token,
      fallbackUid: 'fb_retry_user',
      authProvider: 'google',
      claimSignupConversion: true,
    });
    assert.equal(afterConfirmSession.isNewAccount, false);
    assert.equal(afterConfirmSession.signupConversion, null);
  } finally {
    globalThis.fetch = prevFetch;
    env.restore();
    if (prevEmulator === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    else process.env.FIREBASE_AUTH_EMULATOR_HOST = prevEmulator;
    if (prevProject === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = prevProject;
  }
});

test('Google Ads conversion utility deduplicates across refreshes, excludes PII, and isolates failures', () => {
  const env = installMockBrowser();
  try {
    enableProdTrackingForTests();
    acceptAllConsent();
    applyConsentPreferences(getConsentPreferences());

    assert.equal(
      trackGoogleAdsSignupConversion({ conversionId: 'scv_11111111111111111111111111111111', isNewAccount: false }),
      false
    );
    assert.equal(
      trackGoogleAdsSignupConversion({ conversionId: 'alice@example.com', isNewAccount: true }),
      false
    );

    const txId = 'scv_1234567890abcdef1234567890abcdef';
    assert.equal(trackGoogleAdsSignupConversion({ conversionId: txId, isNewAccount: true }), true);
    assert.equal(trackGoogleAdsSignupConversion({ conversionId: txId, isNewAccount: true }), false);

    const conversionEvents = getGtagCalls(env.mockWindow).filter(
      (c) => c[0] === 'event' && c[1] === 'conversion'
    );
    assert.equal(conversionEvents.length, 1);
    assert.deepEqual(conversionEvents[0][2], {
      send_to: 'AW-18600529507/ZG6OCMS0hMEdEOOctqVF',
      value: 1,
      currency: 'INR',
      transaction_id: txId,
    });
    assert.ok(env.storage.get(GOOGLE_ADS_CONVERSIONS_STORAGE_KEY)?.includes(txId));

    // Page refresh (in-memory set cleared, localStorage retained) still prevents duplicate
    __resetGoogleAdsRuntimeForTests();
    __setGoogleAdsConfigForTests({
      conversionId: 'AW-18600529507',
      signupLabel: 'ZG6OCMS0hMEdEOOctqVF',
      isProduction: true,
      tagEnabled: true,
      signupEnabled: true,
    });
    assert.equal(trackGoogleAdsSignupConversion({ conversionId: txId, isNewAccount: true }), false);

    // Script onerror prevents future claims and conversions without throwing
    env.scripts[0].onerror?.();
    assert.equal(canRequestSignupConversionClaim(), false);
    assert.equal(
      trackGoogleAdsSignupConversion({
        conversionId: 'scv_99999999999999999999999999999999',
        isNewAccount: true,
      }),
      false
    );
  } finally {
    env.restore();
  }
});

test('Backend Firebase Auth routes confirm Google OAuth and verified Email signups once and reject unverified or returning users', async () => {
  const prevEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const prevProject = process.env.FIREBASE_PROJECT_ID;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIREBASE_PROJECT_ID = 'test-tradedia-project';

  const env = installMockBrowser();
  try {
    enableProdTrackingForTests();
    acceptAllConsent();
    applyConsentPreferences(getConsentPreferences());

    const store = new DurableStore({ inMemoryOnly: true });
    const legacyUser = resolveOrCreateCanonicalUser(
      { preferredUid: 'fb_legacy_user', email: 'legacy@example.com', name: 'Legacy', authProvider: 'google' },
      store,
      Date.now() - 86_400_000
    );
    delete legacyUser.signupConversionId;

    const app = createExpressApp(store);

    // 1. Pre-existing user login never triggers signup conversion
    const legacyToken = makeEmulatorFirebaseJwt({
      sub: 'fb_legacy_user',
      email: 'legacy@example.com',
      name: 'Legacy',
      emailVerified: true,
      provider: 'google.com',
    });
    const legacyRes = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${legacyToken}` },
      body: { authProvider: 'google', claimSignupConversion: true },
    });
    assert.equal(legacyRes.status, 200);
    assert.equal(legacyRes.json.isNewAccount, false);

    // 2. Unverified Email/Password user is rejected and creates no account
    const unverifiedEmailToken = makeEmulatorFirebaseJwt({
      sub: 'fb_email_new',
      email: 'new.email@example.com',
      name: 'New Email Trader',
      emailVerified: false,
      provider: 'password',
    });
    const unverifiedRes = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${unverifiedEmailToken}` },
      body: { authProvider: 'email', claimSignupConversion: true },
    });
    assert.equal(unverifiedRes.status, 401);
    assert.equal(store.getState().emailIndex['new.email@example.com'], undefined);

    // 3. Verified Email/Password: passive restore arrives first, then interactive check + confirm
    const verifiedEmailToken = makeEmulatorFirebaseJwt({
      sub: 'fb_email_new',
      email: 'new.email@example.com',
      name: 'New Email Trader',
      emailVerified: true,
      provider: 'password',
    });
    const passiveEmailRes = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${verifiedEmailToken}` },
      body: { authProvider: 'email', claimSignupConversion: false },
    });
    assert.equal(passiveEmailRes.status, 200);
    assert.equal(passiveEmailRes.json.isNewAccount, false);

    const interactiveEmailRes = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${verifiedEmailToken}` },
      body: { authProvider: 'email', claimSignupConversion: true },
    });
    assert.equal(interactiveEmailRes.json.isNewAccount, true);
    const emailConv = interactiveEmailRes.json.signupConversion as {
      eligible: boolean;
      conversionId: string;
      method: 'email' | 'google';
    };
    assert.match(emailConv.conversionId, /^scv_[a-f0-9]{32}$/);
    assert.ok(!emailConv.conversionId.includes('new.email'));
    assert.ok(!emailConv.conversionId.includes('fb_email_new'));
    assert.equal('signupConversionId' in (interactiveEmailRes.json.user as Record<string, unknown>), false);
    assert.equal(recordVerifiedSignupConversion(emailConv), true);

    // Concurrent confirmations on the same process: exactly one confirms
    const [c1, c2, c3] = await Promise.all([
      invokeJsonRequest(app, 'POST', '/api/auth/confirm-signup-conversion', {
        headers: { Authorization: `Bearer ${verifiedEmailToken}` },
        body: { conversionId: emailConv.conversionId },
      }),
      invokeJsonRequest(app, 'POST', '/api/auth/confirm-signup-conversion', {
        headers: { Authorization: `Bearer ${verifiedEmailToken}` },
        body: { conversionId: emailConv.conversionId },
      }),
      invokeJsonRequest(app, 'POST', '/api/auth/confirm-signup-conversion', {
        headers: { Authorization: `Bearer ${verifiedEmailToken}` },
        body: { conversionId: emailConv.conversionId },
      }),
    ]);
    assert.equal([c1, c2, c3].filter((r) => r.json.confirmed === true).length, 1);

    // 4. Google OAuth new user claims once, repeat login does not re-trigger
    const googleToken = makeEmulatorFirebaseJwt({
      sub: 'fb_google_new',
      email: 'new.google@example.com',
      name: 'New Google Trader',
      emailVerified: true,
      provider: 'google.com',
    });
    const googleFirst = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${googleToken}` },
      body: { authProvider: 'google', claimSignupConversion: true },
    });
    assert.equal(googleFirst.json.isNewAccount, true);
    const googleConv = googleFirst.json.signupConversion as {
      eligible: boolean;
      conversionId: string;
      method: 'email' | 'google';
    };
    assert.equal(recordVerifiedSignupConversion(googleConv), true);
    const googleConfirm = await invokeJsonRequest(app, 'POST', '/api/auth/confirm-signup-conversion', {
      headers: { Authorization: `Bearer ${googleToken}` },
      body: { conversionId: googleConv.conversionId },
    });
    assert.equal(googleConfirm.json.confirmed, true);

    const googleRepeat = await invokeJsonRequest(app, 'POST', '/api/auth/firebase-session', {
      headers: { Authorization: `Bearer ${googleToken}` },
      body: { authProvider: 'google', claimSignupConversion: true },
    });
    assert.equal(googleRepeat.json.isNewAccount, false);
    assert.equal((googleRepeat.json.signupConversion as { eligible: boolean }).eligible, false);

    const conversionCalls = getGtagCalls(env.mockWindow).filter(
      (c) => c[0] === 'event' && c[1] === 'conversion'
    );
    assert.equal(conversionCalls.length, 2);
  } finally {
    env.restore();
    if (prevEmulator === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    else process.env.FIREBASE_AUTH_EMULATOR_HOST = prevEmulator;
    if (prevProject === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = prevProject;
  }
});

test('Multi-instance Firestore claim atomicity shares stable transaction_id, prevents cross-replica double claim, and avoids extra Firestore ops for existing users', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const cfg = resolveFirestoreConfig({
    FIREBASE_PROJECT_ID: 'tradedia-b6cb0',
    FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: 'svc@tradedia-b6cb0.iam.gserviceaccount.com',
    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
  });
  assert.ok(cfg);

  const mock = createAtomicMockFirestore();
  const now = Date.now();

  // Two independent backend instances sharing one Firestore database (rolling deploy / multi-replica)
  const replicaA = new DurableStore({
    inMemoryOnly: true,
    firestoreAdapter: new FirestoreStoreAdapter(new FirestoreRestClient(cfg, mock.fetchFn)),
  });
  const replicaB = new DurableStore({
    inMemoryOnly: true,
    firestoreAdapter: new FirestoreStoreAdapter(new FirestoreRestClient(cfg, mock.fetchFn)),
  });
  await Promise.all([replicaA.init(), replicaB.init()]);

  const userA = resolveOrCreateCanonicalUser(
    { preferredUid: 'fb_multi_1', email: 'multi@example.com', name: 'Multi', authProvider: 'google' },
    replicaA,
    now
  );
  const userB = resolveOrCreateCanonicalUser(
    { preferredUid: 'fb_multi_1', email: 'multi@example.com', name: 'Multi', authProvider: 'google' },
    replicaB,
    now
  );

  // Both replicas derive the exact same deterministic opaque transaction_id
  assert.equal(userA.signupConversionId, userB.signupConversionId);
  assert.equal(userA.signupConversionId, generateOpaqueSignupConversionId('fb_multi_1'));

  // Concurrent claims across Replica A and Replica B: Firestore exists:false guarantees exactly ONE winner
  const [claimA, claimB] = await Promise.all([
    claimNewAccountSignupConversion({
      uid: 'fb_multi_1',
      conversionId: userA.signupConversionId,
      store: replicaA,
      now: now + 500,
    }),
    claimNewAccountSignupConversion({
      uid: 'fb_multi_1',
      conversionId: userB.signupConversionId,
      store: replicaB,
      now: now + 500,
    }),
  ]);
  assert.equal([claimA, claimB].filter((c) => c.eligible).length, 1);

  // Third replica with stale in-memory user (not yet marked claimed) sees the Firestore claim doc
  const replicaC = new DurableStore({
    inMemoryOnly: true,
    firestoreAdapter: new FirestoreStoreAdapter(new FirestoreRestClient(cfg, mock.fetchFn)),
  });
  await replicaC.init();
  // Simulate stale replica that booted before userA flushed users doc
  delete replicaC.getState().users['fb_multi_1']?.signupConversionClaimedAt;
  const pendingC = await getPendingSignupConversion({ uid: 'fb_multi_1', store: replicaC, now: now + 1000 });
  assert.equal(pendingC.eligible, false);
  assert.equal(pendingC.conversionId, null);

  // Subsequent check on Replica C hits memory directly with ZERO additional Firestore reads
  const getsBeforeCached = mock.stats().signupClaimGets;
  const pendingCCached = await getPendingSignupConversion({ uid: 'fb_multi_1', store: replicaC, now: now + 2000 });
  assert.equal(pendingCCached.eligible, false);
  assert.equal(mock.stats().signupClaimGets, getsBeforeCached);

  // Client session exchange never blocks auth when backend fails
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('network blocked');
  }) as typeof fetch;
  try {
    const res = await exchangeFirebaseServerSessionDetails({
      idToken: 'fb_token_fallback',
      fallbackUid: 'fb_uid_1',
      authProvider: 'google',
      claimSignupConversion: true,
    });
    assert.equal(res.uid, 'fb_uid_1');
    assert.equal(res.isNewAccount, false);
    assert.equal(res.signupConversion, null);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('Consent banner, preference controls, and Privacy Policy disclose separate Consent Mode v2 controls', () => {
  const env = installMockBrowser();
  try {
    enableProdTrackingForTests();
    const bannerHtml = renderToStaticMarkup(React.createElement(AnalyticsConsentBanner));
    assert.match(bannerHtml, /Reject All/);
    assert.match(bannerHtml, /Customize/);
    assert.match(bannerHtml, /Accept All/);
    assert.match(bannerHtml, /Advertising Measurement/);
    assert.match(bannerHtml, /SHA-256 hashed verified email/);

    const prefsHtml = renderToStaticMarkup(React.createElement(AnalyticsPreferenceControl));
    assert.match(prefsHtml, /analytics_storage/);
    assert.match(prefsHtml, /ad_storage/);
    assert.match(prefsHtml, /ad_user_data/);
    assert.match(prefsHtml, /ad_personalization/);
    assert.match(prefsHtml, /hashed-email signup matching/);
    assert.match(prefsHtml, /Permanently disabled/);

    const privacyHtml = renderToStaticMarkup(
      React.createElement(LegalPageContent, { kind: 'privacy' })
    );
    assert.match(privacyHtml, /Google Consent Mode v2/);
    assert.match(privacyHtml, /Enhanced Conversions/);
    assert.match(privacyHtml, /sha256_email_address/);
    assert.match(privacyHtml, /_gcl_aw/);
    assert.match(privacyHtml, /tradedia_ads_conversions_v1/);
  } finally {
    env.restore();
  }
});

test('Enhanced Conversions normalizes & SHA-256 hashes verified emails, scopes user_data strictly to consented signup conversions, and never persists or leaks hashes', async () => {
  // 1. Official Google email normalization rules (strip dots on gmail/googlemail only; preserve + suffixes)
  assert.equal(
    normalizeEmailForEnhancedConversion('  Jane.Doe+Promo@Gmail.com  '),
    'janedoe+promo@gmail.com'
  );
  assert.equal(
    normalizeEmailForEnhancedConversion('A.B.C+tag@googlemail.com'),
    'abc+tag@googlemail.com'
  );
  assert.equal(
    normalizeEmailForEnhancedConversion('  Jane.Doe+Shop@Tradedia.in '),
    'jane.doe+shop@tradedia.in'
  );
  assert.equal(normalizeEmailForEnhancedConversion('not-an-email'), null);
  assert.equal(normalizeEmailForEnhancedConversion('...@gmail.com'), null);

  const expectedGmailHash = crypto
    .createHash('sha256')
    .update('janedoe+promo@gmail.com')
    .digest('hex');
  const computedGmailHash = await hashEmailForEnhancedConversion('  Jane.Doe+Promo@Gmail.com ');
  assert.equal(computedGmailHash, expectedGmailHash);
  assert.equal(isValidSha256Hex(computedGmailHash), true);
  assert.equal(isValidSha256Hex('janedoe+promo@gmail.com'), false);

  const env = installMockBrowser();
  try {
    enableProdTrackingForTests();

    // Without advertising consent: never sends user_data or conversion
    setAnalyticsConsent('granted');
    applyConsentPreferences(getConsentPreferences());
    assert.equal(
      await dispatchVerifiedSignupConversion(
        {
          signupConversion: {
            eligible: true,
            conversionId: 'scv_cccccccccccccccccccccccccccccccc',
            method: 'email',
          },
        },
        { verifiedEmail: 'Jane.Doe+Promo@Gmail.com' }
      ),
      false
    );
    const callsWithoutAdConsent = getGtagCalls(env.mockWindow);
    assert.equal(
      callsWithoutAdConsent.some((c) => c[0] === 'set' && c[1] === 'user_data' && c[2] !== null),
      false
    );

    // Grant Advertising Measurement: AW config enables allow_enhanced_conversions: true
    // while keeping allow_ad_personalization_signals: false and ad_personalization: 'denied'
    acceptAllConsent();
    applyConsentPreferences(getConsentPreferences());
    const awConfig = getGtagCalls(env.mockWindow).find(
      (c) => c[0] === 'config' && c[1] === 'AW-18600529507'
    );
    assert.ok(awConfig);
    assert.deepEqual(awConfig[2], {
      allow_enhanced_conversions: true,
      allow_ad_personalization_signals: false,
    });

    // Dispatch consented signup conversion with verified email
    const txId = 'scv_dddddddddddddddddddddddddddddddd';
    assert.equal(
      await dispatchVerifiedSignupConversion(
        {
          signupConversion: { eligible: true, conversionId: txId, method: 'google' },
        },
        { verifiedEmail: '  Jane.Doe+Promo@Gmail.com  ' }
      ),
      true
    );

    // Subsequent GA4 event and unrelated Google Ads conversion must NOT carry user_data
    assert.equal(trackPageView({ origin: 'https://www.tradedia.in', pathname: '/trade' }), true);
    assert.equal(trackEvent('login', { method: 'google' }), true);
    assert.equal(
      trackGoogleAdsConversion({
        conversionLabel: 'OtherConversionLabel',
        transactionId: 'scv_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        value: 0,
        currency: 'INR',
      }),
      true
    );

    // Raw unhashed email passed directly to trackGoogleAdsSignupConversion is ignored (never sent)
    assert.equal(
      trackGoogleAdsSignupConversion({
        conversionId: 'scv_ffffffffffffffffffffffffffffffff',
        isNewAccount: true,
        sha256Email: 'plain@example.com',
      }),
      true
    );

    const calls = getGtagCalls(env.mockWindow);
    const setUserDataIdx = calls.findIndex(
      (c) =>
        c[0] === 'set' &&
        c[1] === 'user_data' &&
        typeof c[2] === 'object' &&
        c[2] !== null &&
        (c[2] as Record<string, unknown>).sha256_email_address === expectedGmailHash
    );
    assert.ok(setUserDataIdx >= 0);

    // Immediate next call is the signup conversion event, followed immediately by user_data reset to null
    assert.equal(calls[setUserDataIdx + 1][0], 'event');
    assert.equal(calls[setUserDataIdx + 1][1], 'conversion');
    assert.deepEqual(calls[setUserDataIdx + 1][2], {
      send_to: 'AW-18600529507/ZG6OCMS0hMEdEOOctqVF',
      value: 1,
      currency: 'INR',
      transaction_id: txId,
    });
    assert.deepEqual(calls[setUserDataIdx + 2], ['set', 'user_data', null]);

    // No plain-text email ever appears anywhere in dataLayer, and no hash is persisted in localStorage
    const serializedDataLayer = JSON.stringify(calls);
    assert.equal(serializedDataLayer.includes('janedoe+promo@gmail.com'), false);
    assert.equal(serializedDataLayer.includes('plain@example.com'), false);

    const allStoredValues = [...env.storage.values()].join(' ');
    assert.equal(allStoredValues.includes(expectedGmailHash), false);
    assert.equal(allStoredValues.includes('janedoe+promo@gmail.com'), false);

    // Only one non-null user_data set happened (not for GA4 or unrelated conversion)
    const nonNullUserDataSets = calls.filter(
      (c) => c[0] === 'set' && c[1] === 'user_data' && c[2] !== null
    );
    assert.equal(nonNullUserDataSets.length, 1);

    // Consent withdrawal also clears user_data and keeps ad_personalization permanently denied
    setAdMeasurementConsent('denied');
    applyConsentPreferences(getConsentPreferences());
    const finalCalls = getGtagCalls(env.mockWindow);
    const consentUpdates = finalCalls.filter((c) => c[0] === 'consent');
    for (const c of consentUpdates) {
      assert.equal((c[2] as Record<string, unknown>).ad_personalization, 'denied');
    }
  } finally {
    env.restore();
  }
});

test('Withdrawing advertising consent while async SHA-256 hashing is in flight aborts conversion and backend confirmation', async () => {
  const env = installMockBrowser();
  const prevFetch = globalThis.fetch;
  const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  let confirmCalls = 0;
  let releaseDigest!: () => void;
  const digestGate = new Promise<void>((resolve) => {
    releaseDigest = resolve;
  });

  try {
    enableProdTrackingForTests();
    acceptAllConsent();
    applyConsentPreferences(getConsentPreferences());

    globalThis.fetch = (async () => {
      confirmCalls += 1;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch;

    globalThis.crypto.subtle.digest = (async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
      await digestGate;
      return originalDigest(algorithm, data);
    }) as typeof globalThis.crypto.subtle.digest;

    const pendingDispatch = dispatchVerifiedSignupConversion(
      {
        signupConversion: {
          eligible: true,
          conversionId: 'scv_12341234123412341234123412341234',
          method: 'email',
        },
        sessionToken: 'tok_mid_hash',
      },
      { verifiedEmail: 'trader+midhash@gmail.com' }
    );

    // Withdraw consent before async SHA-256 completes
    setAdMeasurementConsent('denied');
    releaseDigest();

    const dispatched = await pendingDispatch;
    assert.equal(dispatched, false);
    assert.equal(confirmCalls, 0);

    const calls = getGtagCalls(env.mockWindow);
    assert.equal(
      calls.some((c) => c[0] === 'set' && c[1] === 'user_data' && c[2] !== null),
      false
    );
    assert.equal(
      calls.some((c) => c[0] === 'event' && c[1] === 'conversion'),
      false
    );
  } finally {
    globalThis.crypto.subtle.digest = originalDigest;
    globalThis.fetch = prevFetch;
    env.restore();
  }
});
