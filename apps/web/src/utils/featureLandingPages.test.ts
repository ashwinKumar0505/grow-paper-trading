import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuessChartLandingPage } from '../features/feature-landing/pages/GuessChartLandingPage';
import { PaperTradingLandingPage } from '../features/feature-landing/pages/PaperTradingLandingPage';
import { ScreenerLandingPage } from '../features/feature-landing/pages/ScreenerLandingPage';
import {
  __resetLandingOriginForTests,
  recordLandingOrigin,
} from '../lib/analytics/attribution';
import { __resetConsentStateForTests, setAnalyticsConsent } from '../lib/analytics/consent';
import {
  trackFeatureCtaClick,
  trackProductNavigation,
  trackSignUp,
} from '../lib/analytics/events';
import {
  __resetAnalyticsRuntimeForTests,
  __setAnalyticsConfigForTests,
  applyAnalyticsConsent,
  trackPageView,
} from '../lib/analytics/ga4';
import { sanitizePageLocation, sanitizePagePath } from '../lib/analytics/sanitize';

test('all three public feature landing pages render without auth, with proper CTAs, disclaimers, and Tradedia casing', () => {
  const paperHtml = renderToStaticMarkup(React.createElement(PaperTradingLandingPage));
  assert.match(paperHtml, /<h1[^>]*>.*Paper Trading in India\./);
  assert.match(paperHtml, /href="\/trade"/);
  assert.match(paperHtml, /Start Paper Trading/);
  assert.match(paperHtml, /\/images\/landing\/virtual-trading\.webp/);
  assert.match(paperHtml, /href="\/ai-stock-screener"/);
  assert.match(paperHtml, /href="\/guess-the-chart"/);
  assert.match(paperHtml, /href="\/learn"/);
  assert.match(paperHtml, /not registered with SEBI/i);
  assert.doesNotMatch(paperHtml, /TradeDia/);

  const screenerHtml = renderToStaticMarkup(React.createElement(ScreenerLandingPage));
  assert.match(screenerHtml, /<h1[^>]*>.*AI-Powered Stock Screener/);
  assert.match(screenerHtml, /href="\/screener"/);
  assert.match(screenerHtml, /Explore Stock Screener/);
  assert.match(screenerHtml, /\/images\/landing\/stock-screener\.webp/);
  assert.match(screenerHtml, /EMA 20 \/ 50 \/ 200/);
  assert.match(screenerHtml, /href="\/paper-trading-india"/);
  assert.match(screenerHtml, /SEBI &amp; Research Disclaimer/);
  assert.doesNotMatch(screenerHtml, /TradeDia/);

  const quizHtml = renderToStaticMarkup(React.createElement(GuessChartLandingPage));
  assert.match(quizHtml, /<h1[^>]*>.*Guess the Chart\./);
  assert.match(quizHtml, /href="\/quiz"/);
  assert.match(quizHtml, /Play Guess the Chart/);
  assert.match(quizHtml, /\/images\/landing\/interactive-learning\.webp/);
  assert.match(quizHtml, /3-Life Survival Mode/);
  assert.match(quizHtml, /10-Round Cash Challenge/);
  assert.match(quizHtml, /synthetic educational chart/i);
  assert.doesNotMatch(quizHtml, /TradeDia/);
});

test('GA4 tracks feature landing views with UTMs, CTA clicks, navigation, and single attributed sign_up', () => {
  const localMap = new Map<string, string>();
  const sessionMap = new Map<string, string>();
  const dataLayer: Array<unknown[]> = [];

  const mockWindow: Record<string, unknown> = {
    localStorage: {
      getItem: (k: string) => (localMap.has(k) ? localMap.get(k)! : null),
      setItem: (k: string, v: string) => localMap.set(k, v),
      removeItem: (k: string) => localMap.delete(k),
    },
    sessionStorage: {
      getItem: (k: string) => (sessionMap.has(k) ? sessionMap.get(k)! : null),
      setItem: (k: string, v: string) => sessionMap.set(k, v),
      removeItem: (k: string) => sessionMap.delete(k),
    },
    location: { origin: 'https://www.tradedia.in', pathname: '/paper-trading-india', search: '' },
    dataLayer,
    gtag: (...args: unknown[]) => dataLayer.push(args),
  };
  const mockDoc = {
    head: { appendChild: () => ({}) },
    createElement: () => ({ async: false, src: '', setAttribute: () => {}, onerror: null }),
    querySelector: () => null,
  };

  const prevWindow = (globalThis as Record<string, unknown>).window;
  const prevDoc = (globalThis as Record<string, unknown>).document;
  (globalThis as Record<string, unknown>).window = mockWindow;
  (globalThis as Record<string, unknown>).document = mockDoc;

  try {
    __setAnalyticsConfigForTests({ measurementId: 'G-NTTB773KTH', isProduction: true, enabled: true });
    setAnalyticsConsent('granted');
    applyAnalyticsConsent('granted');

    assert.equal(sanitizePagePath('/paper-trading-india'), '/paper-trading-india');
    assert.equal(sanitizePagePath('/ai-stock-screener'), '/ai-stock-screener');
    assert.equal(sanitizePagePath('/guess-the-chart'), '/guess-the-chart');

    const loc = sanitizePageLocation({
      origin: 'https://www.tradedia.in',
      pathname: '/paper-trading-india',
      search: '?utm_source=google&utm_medium=organic&email=leak@example.com',
    });
    assert.equal(
      loc.pageLocation,
      'https://www.tradedia.in/paper-trading-india?utm_medium=organic&utm_source=google'
    );

    assert.equal(
      trackPageView({
        origin: 'https://www.tradedia.in',
        pathname: '/paper-trading-india',
        search: '?utm_source=google',
      }),
      true
    );
    assert.equal(
      trackPageView({
        origin: 'https://www.tradedia.in',
        pathname: '/paper-trading-india',
        search: '?utm_source=google',
      }),
      false
    );

    recordLandingOrigin('/paper-trading-india');
    assert.equal(
      trackFeatureCtaClick({
        sourcePage: '/paper-trading-india',
        ctaId: 'start_paper_trading',
        destinationPath: '/trade',
        placement: 'hero',
      }),
      true
    );
    assert.equal(
      trackProductNavigation({
        sourcePage: '/',
        targetPage: '/ai-stock-screener',
        navLocation: 'homepage_section',
      }),
      true
    );
    assert.equal(trackSignUp('google'), true);
    assert.equal(trackSignUp('email'), true);

    const events = dataLayer.filter((call) => call[0] === 'event');
    const ctaEvent = events.find((call) => call[1] === 'feature_cta_click');
    assert.deepEqual(ctaEvent?.[2], {
      source_page: '/paper-trading-india',
      cta_id: 'start_paper_trading',
      destination_path: '/trade',
      placement: 'hero',
    });

    const navEvent = events.find((call) => call[1] === 'product_navigation');
    assert.deepEqual(navEvent?.[2], {
      source_page: '/',
      target_page: '/ai-stock-screener',
      nav_location: 'homepage_section',
    });

    const signUps = events.filter((call) => call[1] === 'sign_up');
    assert.equal(signUps.length, 2);
    assert.deepEqual(signUps[0]?.[2], { method: 'google', landing_page: 'paper_trading_india' });
    assert.deepEqual(signUps[1]?.[2], { method: 'email' });
  } finally {
    __resetLandingOriginForTests();
    __resetAnalyticsRuntimeForTests();
    __resetConsentStateForTests();
    if (prevWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else (globalThis as Record<string, unknown>).window = prevWindow;
    if (prevDoc === undefined) delete (globalThis as Record<string, unknown>).document;
    else (globalThis as Record<string, unknown>).document = prevDoc;
  }
});
