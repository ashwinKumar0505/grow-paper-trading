// Optional browser regression harness. Install Playwright separately, or point
// PLAYWRIGHT_MODULE at an existing installation; it is not an app dependency.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { INITIAL_STOCKS, INITIAL_INDICES } from '../src/data/mockStocks.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const current = process.env.APP_URL || 'http://127.0.0.1:4173';
const baseline = process.env.BASELINE_URL;
const output = process.env.BROWSER_ARTIFACTS || '/private/tmp/tradedia-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const fixedTime = new Date('2026-11-16T05:00:00Z');
const stocks = INITIAL_STOCKS.map(stock => ({ ...stock, quoteTimestamp: +fixedTime,
  fetchedAt: +fixedTime, freshness: 'LIVE', isStale: false, isTradableQuote: true, providerAvailable: true }));
const results = [];

async function open(base, route, viewport, theme, tier = 'advanced') {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(fixedTime);
  await page.addInitScript(({ theme, tier }) => {
    let seed = 123456;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    localStorage.setItem('tradedia_theme_v1', theme);
    if (tier) localStorage.setItem('mypaper_user_v2', JSON.stringify({ name: 'Browser Test',
      email: 'browser-test@example.invalid', initialCash: 100000, createdAt: Date.now(),
      subscriptionTier: tier, subscriptionStatus: 'active', subscriptionBillingCycle: 'yearly',
      subscriptionExpiresAt: new Date('2030-01-01').getTime() }));
  }, { theme, tier });
  // All backend requests are intercepted. External services are blocked; the
  // screener's existing offline fallback is intentionally exercised.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/stocks') return route.fulfill({ json: { success: true, stocks, freshness: 'LIVE' } });
    if (url.pathname === '/api/market/indices') return route.fulfill({ json: { success: true, indices: INITIAL_INDICES } });
    if (/^\/api\/stocks\/[^/]+$/.test(url.pathname)) return route.fulfill({ json: {
      success: true, stock: stocks.find(stock => stock.symbol === decodeURIComponent(url.pathname.split('/').at(-1))) } });
    return route.fulfill({ json: { success: false } });
  });
  await page.goto(base + route);
  await page.locator('.platform-header').waitFor();
  await page.waitForTimeout(700);
  // Exclude time-dependent marquee movement, not content, from visual comparisons.
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  return { context, page, errors };
}

async function snapshot(page) {
  return page.evaluate(() => {
    const visible = el => !!(el.getBoundingClientRect().width && el.getBoundingClientRect().height);
    return { text: document.body.innerText,
      geometry: [...document.querySelectorAll('h1,h2,h3,button,input,select,canvas,table')].filter(visible).map(el => {
        const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return { tag: el.tagName, text: el.textContent?.trim(), x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height), color: s.color, background: s.backgroundColor,
          font: s.font, radius: s.borderRadius };
      }) };
  });
}

try {
  const routes = ['/', '/learn', '/quiz', '/trade', '/pricing', '/screener', '/screener/intraday', '/screener/analysis', '/terms'];
  const sizes = { desktop: { width: 1440, height: 1000 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };
  for (const [size, viewport] of Object.entries(sizes)) for (const theme of ['light', 'dark']) for (const route of routes) {
    const label = `${size}-${theme}-${route.replaceAll('/', '_') || 'home'}`;
    const after = await open(current, route, viewport, theme);
    assert.deepEqual(after.errors, [], `${label}: runtime errors`);
    const actual = await snapshot(after.page);
    await after.page.screenshot({ path: `${output}/${label}-after.png`, fullPage: true, animations: 'disabled' });
    let matched = true;
    if (baseline) {
      const before = await open(baseline, route, viewport, theme);
      assert.deepEqual(before.errors, [], `${label}: baseline runtime errors`);
      const expected = await snapshot(before.page);
      await before.page.screenshot({ path: `${output}/${label}-before.png`, fullPage: true, animations: 'disabled' });
      matched = JSON.stringify(actual) === JSON.stringify(expected);
      if (!matched) await writeFile(`${output}/${label}-diff.json`, JSON.stringify({ expected, actual }, null, 2));
      await before.context.close();
    }
    results.push({ label, matched });
    console.log(`${matched ? 'PASS' : 'DIFF'} ${label}`);
    await after.context.close();
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
assert.ok(results.every(result => result.matched), 'Review browser comparison differences in artifacts');
