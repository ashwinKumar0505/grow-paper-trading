import assert from 'node:assert/strict';
import test from 'node:test';
import {
  __resetConsentStateForTests,
  ANALYTICS_CONSENT_STORAGE_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '../lib/analytics/consent.ts';
import {
  trackChartPatternLearning,
  trackLogin,
  trackPaperTradeActivity,
  trackQuizCompletion,
  trackScreenerUsage,
  trackSignUp,
  trackSubscriptionCompleted,
} from '../lib/analytics/events.ts';
import {
  __resetAnalyticsRuntimeForTests,
  __setAnalyticsConfigForTests,
  applyAnalyticsConsent,
  resolveAnalyticsConfig,
  trackEvent,
  trackPageView,
} from '../lib/analytics/ga4.ts';
import {
  isValidMeasurementId,
  sanitizeEventParams,
  sanitizePageLocation,
  sanitizePagePath,
  sanitizeQueryString,
} from '../lib/analytics/sanitize.ts';

interface MockScriptElement {
  async: boolean;
  src: string;
  attrs: Record<string, string>;
  onerror: null | (() => void);
  setAttribute: (k: string, v: string) => void;
}

function installMockBrowser(options?: { gpc?: boolean; throwOnStorage?: boolean }) {
  const storage = new Map<string, string>();
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
    location: {
      origin: 'https://tradedia.in',
      pathname: '/',
      search: '',
    },
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
      const el: MockScriptElement = {
        async: false,
        src: '',
        attrs: {},
        onerror: null,
        setAttribute(k: string, v: string) {
          this.attrs[k] = v;
        },
      };
      return el;
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
  const prevNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  (globalThis as Record<string, unknown>).window = mockWindow;
  (globalThis as Record<string, unknown>).document = mockDocument;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { globalPrivacyControl: options?.gpc === true },
  });

  return {
    mockWindow,
    scripts,
    storage,
    restore() {
      __resetAnalyticsRuntimeForTests();
      __resetConsentStateForTests();
      if (prevWindow === undefined) delete (globalThis as Record<string, unknown>).window;
      else (globalThis as Record<string, unknown>).window = prevWindow;
      if (prevDocument === undefined) delete (globalThis as Record<string, unknown>).document;
      else (globalThis as Record<string, unknown>).document = prevDocument;
      if (prevNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', prevNavigatorDescriptor);
      } else {
        delete (globalThis as Record<string, unknown>).navigator;
      }
    },
  };
}

function getRecordedGtagCalls(mockWindow: Record<string, unknown>): unknown[][] {
  const layer = mockWindow.dataLayer;
  if (!Array.isArray(layer)) return [];
  return layer.map((entry) => Array.from(entry as ArrayLike<unknown>));
}

test('resolveAnalyticsConfig enforces production-only execution and valid GA4 Measurement ID', () => {
  assert.equal(isValidMeasurementId('G-NTTB773KTH'), true);
  assert.equal(isValidMeasurementId('  G-NTTB773KTH  '), true);
  assert.equal(isValidMeasurementId('UA-123456-1'), false);
  assert.equal(isValidMeasurementId(''), false);

  assert.deepEqual(
    resolveAnalyticsConfig({ PROD: false, VITE_GA_MEASUREMENT_ID: 'G-NTTB773KTH' }),
    { measurementId: 'G-NTTB773KTH', isProduction: false, enabled: false }
  );
  assert.deepEqual(
    resolveAnalyticsConfig({ PROD: true, VITE_GA_MEASUREMENT_ID: '' }),
    { measurementId: '', isProduction: true, enabled: false }
  );
  assert.deepEqual(
    resolveAnalyticsConfig({ PROD: true, VITE_GA_MEASUREMENT_ID: 'G-NTTB773KTH' }),
    { measurementId: 'G-NTTB773KTH', isProduction: true, enabled: true }
  );
});

test('URL and query sanitization redacts stock tickers, tokens, PII, and unknown routes while keeping safe UTMs', () => {
  assert.equal(sanitizePagePath('/trade/RELIANCE'), '/trade/:symbol');
  assert.equal(sanitizePagePath('/stocks/TCS'), '/trade/:symbol');
  assert.equal(sanitizePagePath('/markets'), '/trade');
  assert.equal(sanitizePagePath('/pattern-library'), '/learn');
  assert.equal(sanitizePagePath('/screener/stock-analysis'), '/screener/analysis');
  assert.equal(sanitizePagePath('/reset/alice@example.com'), '/not-found');
  assert.equal(sanitizePagePath('/callback/eyJhbGciOiJIUzI1NiJ9.payload.sig'), '/not-found');

  assert.equal(
    sanitizeQueryString('?symbol=RELIANCE&token=secret&email=a@b.com&utm_medium=cpc&utm_source=google#access_token=abc'),
    '?utm_medium=cpc&utm_source=google'
  );
  assert.equal(
    sanitizeQueryString('?utm_source=alice@example.com&utm_campaign=pay_1234567890&utm_medium=organic'),
    '?utm_medium=organic'
  );

  const sanitized = sanitizePageLocation({
    origin: 'https://tradedia.in',
    pathname: '/trade/HDFCBANK',
    search: '?symbol=HDFCBANK&oobCode=xyz&utm_campaign=launch',
  });
  assert.equal(sanitized.pagePath, '/trade/:symbol');
  assert.equal(sanitized.pageLocation, 'https://tradedia.in/trade/:symbol?utm_campaign=launch');
  assert.equal(sanitized.pageTitle, 'Stock Paper Trading | Tradedia');
});

test('sanitizeEventParams strips PII, auth tokens, payment IDs, balances, and trading details', () => {
  const cleaned = sanitizeEventParams({
    method: 'google',
    plan_tier: 'beginner',
    billing_cycle: 'yearly',
    email: 'trader@example.com',
    full_name: 'Ashwin Kumar',
    uid: 'user_123',
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig',
    symbol: 'RELIANCE',
    quantity: 50,
    price: 2950,
    balance: 100000,
    pnl: 4500,
    razorpay_payment_id: 'pay_R123456789',
    order_id: 'order_99999999',
    sneaky_email_value: 'contact alice@example.com',
    sneaky_jwt_value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
    sneaky_razorpay: 'rzp_live_ABCDEF123456',
    is_correct: true,
    rounds_completed: 10,
  });

  assert.deepEqual(cleaned, {
    method: 'google',
    plan_tier: 'beginner',
    billing_cycle: 'yearly',
    is_correct: true,
    rounds_completed: 10,
  });
});

test('GA4 loads only in production after explicit consent, deduplicates page views, and supports revocation', () => {
  const env = installMockBrowser();
  try {
    __setAnalyticsConfigForTests({
      measurementId: 'G-NTTB773KTH',
      isProduction: true,
      enabled: true,
    });

    // Before consent: no script loaded and no events sent
    assert.equal(getAnalyticsConsent(), 'unset');
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/trade', search: '' }), false);
    assert.equal(trackSignUp('email'), false);
    assert.equal(env.scripts.length, 0);

    // Grant consent: injects script once, applies Consent Mode v2, configures send_page_view: false
    setAnalyticsConsent('granted');
    applyAnalyticsConsent('granted');
    assert.equal(env.scripts.length, 1);
    assert.equal(env.scripts[0].async, true);
    assert.equal(env.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-NTTB773KTH');
    assert.ok(env.storage.get(ANALYTICS_CONSENT_STORAGE_KEY)?.includes('"granted"'));

    // Page views deduplicate consecutive identical sanitized routes and stripped query changes
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/markets', search: '' }), true);
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/trade', search: '' }), false);
    assert.equal(
      trackPageView({ origin: 'https://tradedia.in', pathname: '/screener/analysis', search: '?symbol=TCS' }),
      true
    );
    assert.equal(
      trackPageView({ origin: 'https://tradedia.in', pathname: '/screener/analysis', search: '?symbol=INFY' }),
      false
    );
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/trade', search: '' }), true);

    // All 7 domain event trackers emit clean sanitized payloads
    assert.equal(trackSignUp('google'), true);
    assert.equal(trackLogin('email'), true);
    assert.equal(
      trackPaperTradeActivity({
        activityType: 'order_submitted',
        productType: 'delivery',
        orderType: 'market',
        orderStatus: 'EXECUTED',
      }),
      true
    );
    assert.equal(
      trackScreenerUsage({ screenerMode: 'swing', action: 'scan_completed', trigger: 'manual' }),
      true
    );
    assert.equal(
      trackChartPatternLearning({
        action: 'pattern_selected',
        patternName: 'Bullish Engulfing',
        patternCategory: 'Reversal',
        difficulty: 'Beginner',
        isLocked: false,
      }),
      true
    );
    assert.equal(
      trackQuizCompletion({
        quizMode: 'tournament',
        completionScope: 'session',
        difficulty: 'Intermediate',
        roundsCompleted: 10,
        correctCount: 7,
      }),
      true
    );
    assert.equal(
      trackSubscriptionCompleted({
        planTier: 'beginner',
        billingCycle: 'yearly',
        paymentType: 'subscription',
        previousTier: 'free',
      }),
      true
    );

    const calls = getRecordedGtagCalls(env.mockWindow);
    const configCall = calls.find((c) => c[0] === 'config');
    assert.ok(configCall);
    assert.equal(configCall[1], 'G-NTTB773KTH');
    assert.equal((configCall[2] as Record<string, unknown>).send_page_view, false);
    assert.equal((configCall[2] as Record<string, unknown>).anonymize_ip, true);

    const pageViews = calls.filter((c) => c[0] === 'event' && c[1] === 'page_view');
    assert.equal(pageViews.length, 3);
    assert.equal((pageViews[1][2] as Record<string, unknown>).page_location, 'https://tradedia.in/screener/analysis');

    const eventNames = calls.filter((c) => c[0] === 'event').map((c) => c[1]);
    assert.ok(eventNames.includes('sign_up'));
    assert.ok(eventNames.includes('login'));
    assert.ok(eventNames.includes('paper_trade_activity'));
    assert.ok(eventNames.includes('screener_usage'));
    assert.ok(eventNames.includes('chart_pattern_learning'));
    assert.ok(eventNames.includes('quiz_completed'));
    assert.ok(eventNames.includes('subscription_completed'));

    // Revoke consent: sets ga-disable flag, sends consent denied update, blocks further tracking
    setAnalyticsConsent('denied');
    applyAnalyticsConsent('denied');
    assert.equal(env.mockWindow['ga-disable-G-NTTB773KTH'], true);
    assert.equal(trackLogin('google'), false);
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/pricing', search: '' }), false);
  } finally {
    env.restore();
  }
});

test('Respects Global Privacy Control and isolates storage, script, and gtag runtime failures', () => {
  const gpcEnv = installMockBrowser({ gpc: true, throwOnStorage: true });
  try {
    __setAnalyticsConfigForTests({
      measurementId: 'G-NTTB773KTH',
      isProduction: true,
      enabled: true,
    });
    assert.equal(getAnalyticsConsent(), 'denied');
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/', search: '' }), false);

    // Explicit opt-in still works even when storage throws
    setAnalyticsConsent('granted');
    applyAnalyticsConsent('granted');
    assert.equal(gpcEnv.scripts.length, 1);

    // Throwing gtag never propagates
    gpcEnv.mockWindow.gtag = () => {
      throw new Error('blocked by extension');
    };
    assert.equal(trackEvent('login', { method: 'email' }), false);

    // Script onerror disables future sends safely
    gpcEnv.scripts[0].onerror?.();
    assert.equal(trackPageView({ origin: 'https://tradedia.in', pathname: '/learn', search: '' }), false);
  } finally {
    gpcEnv.restore();
  }
});
