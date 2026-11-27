import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPatternCatalogEntries,
  getPublicPatternEntries,
  resolvePatternBySlug,
} from '../features/quiz/utils/patternCatalog';
import { sanitizePagePath } from '../lib/analytics/sanitize';
import { CANONICAL_ORIGIN, LEGAL_LAST_UPDATED_ISO } from '../lib/seo/constants';
import { resolveRouteSeo } from '../lib/seo/routeMetadata';
import {
  getSitemapEntries,
  renderRobotsTxt,
  renderSitemapXml,
} from '../server/seo/sitemapAndRobots';

test('pattern catalog generates 21 unique slugs and exposes exactly 8 public free beginner patterns', () => {
  const all = getPatternCatalogEntries();
  const publicFree = getPublicPatternEntries();
  assert.equal(all.length, 21);
  assert.equal(publicFree.length, 8);
  assert.equal(new Set(all.map((p) => p.slug)).size, 21);
  for (const entry of all) {
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(resolvePatternBySlug(entry.slug)?.template.name, entry.template.name);
    assert.equal(resolvePatternBySlug(entry.slug.toUpperCase())?.slug, entry.slug);
  }
  assert.equal(resolvePatternBySlug('non-existent-pattern'), null);
  assert.equal(sanitizePagePath('/learn/double-top'), '/learn/double-top');
  assert.equal(sanitizePagePath('/learn/not-a-pattern'), '/not-found');
});

test('dynamic sitemap includes only valid public canonical URLs and accurate lastmod values', () => {
  const entries = getSitemapEntries();
  const locs = entries.map((e) => e.loc);
  assert.equal(entries.length, 19);
  assert.equal(new Set(locs).size, 19);
  assert.ok(locs.includes(`${CANONICAL_ORIGIN}/paper-trading-india`));
  assert.ok(locs.includes(`${CANONICAL_ORIGIN}/ai-stock-screener`));
  assert.ok(locs.includes(`${CANONICAL_ORIGIN}/guess-the-chart`));

  for (const loc of locs) {
    assert.ok(loc.startsWith(`${CANONICAL_ORIGIN}/`), `Expected canonical origin: ${loc}`);
    assert.ok(!loc.includes('?'), `Query URL must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/api/'), `API route must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/trade'), `Auth-gated /trade must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/screener'), `Auth-gated /screener must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/quiz'), `Auth-gated /quiz must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/profile'), `Private /profile must not be in sitemap: ${loc}`);
    assert.ok(!loc.includes('/learn/head-and-shoulders'), `Locked pattern must not be in sitemap`);
  }

  const legalEntry = entries.find((e) => e.loc === `${CANONICAL_ORIGIN}/disclaimer`);
  assert.equal(legalEntry?.lastmod, LEGAL_LAST_UPDATED_ISO);
  const homeEntry = entries.find((e) => e.loc === `${CANONICAL_ORIGIN}/`);
  assert.equal(homeEntry?.lastmod, undefined);

  const withDynamic = getSitemapEntries({
    dynamicEntries: [
      { loc: `${CANONICAL_ORIGIN}/learn/double-top`, lastmod: '2026-11-27' },
      { loc: 'https://evil.example/spam', lastmod: '2026-11-27' },
      { loc: `${CANONICAL_ORIGIN}/search?q=reliance` },
      { loc: `${CANONICAL_ORIGIN}/learn/custom-guide`, lastmod: '2026-11-27' },
    ],
  });
  assert.equal(withDynamic.length, 20);
  assert.ok(withDynamic.some((e) => e.loc === `${CANONICAL_ORIGIN}/learn/custom-guide` && e.lastmod === '2026-11-27'));

  const xml = renderSitemapXml(entries);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert.equal((xml.match(/<url>/g) || []).length, 19);
  assert.ok(!xml.includes('TradeDia'));
});

function isAllowedByRobots(robotsTxt: string, path: string): boolean {
  const rules: Array<{ type: 'allow' | 'disallow'; pattern: string }> = [];
  for (const rawLine of robotsTxt.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('Allow:')) rules.push({ type: 'allow', pattern: line.slice(6).trim() });
    if (line.startsWith('Disallow:')) rules.push({ type: 'disallow', pattern: line.slice(9).trim() });
  }
  let winner: { type: 'allow' | 'disallow'; len: number } | null = null;
  for (const rule of rules) {
    if (!rule.pattern) continue;
    const escaped = rule.pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\$$/, '$');
    const re = new RegExp(`^${escaped}`);
    if (re.test(path)) {
      const len = rule.pattern.length;
      if (!winner || len > winner.len || (len === winner.len && rule.type === 'allow')) {
        winner = { type: rule.type, len };
      }
    }
  }
  return !winner || winner.type === 'allow';
}

test('robots.txt allows public routes including feature landing pages and blocks private/API/preview paths', () => {
  const prod = renderRobotsTxt({ host: 'www.tradedia.in' });
  assert.ok(prod.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`));

  for (const allowedPath of [
    '/',
    '/paper-trading-india',
    '/ai-stock-screener',
    '/guess-the-chart',
    '/learn',
    '/learn/double-top',
    '/pricing',
    '/images/landing/virtual-trading.webp',
  ]) {
    assert.equal(isAllowedByRobots(prod, allowedPath), true, `Expected robots.txt to allow ${allowedPath}`);
  }

  for (const blockedPath of [
    '/api/health',
    '/profile',
    '/trade',
    '/trade/RELIANCE',
    '/paper-trading',
    '/screener',
    '/screener/analysis?symbol=TCS',
    '/quiz',
  ]) {
    assert.equal(isAllowedByRobots(prod, blockedPath), false, `Expected robots.txt to block ${blockedPath}`);
  }

  const preview = renderRobotsTxt({ host: 'tradedia-web-production.up.railway.app' });
  assert.equal(preview.trim(), 'User-agent: *\nDisallow: /');
});

test('all public sitemap URLs have unique metadata, canonical URLs, Tradedia casing, and honest structured data', () => {
  const entries = getSitemapEntries();
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const entry of entries) {
    const pathname = new URL(entry.loc).pathname;
    const seo = resolveRouteSeo(pathname);
    assert.equal(seo.statusCode, 200);
    assert.equal(seo.indexable, true);
    assert.equal(seo.robots, 'index, follow');
    assert.equal(seo.canonicalUrl, entry.loc);
    assert.equal(seo.ogImage, `${CANONICAL_ORIGIN}/images/landing/tradedia-social-share-card.png`);
    assert.ok(seo.title.includes('Tradedia'), `Missing Tradedia brand in title: ${seo.title}`);
    assert.ok(!seo.title.includes('TradeDia'), `Incorrect casing in title: ${seo.title}`);
    assert.ok(!seo.description.includes('TradeDia'), `Incorrect casing in description: ${seo.description}`);
    assert.ok(seo.description.length >= 90 && seo.description.length <= 170, `Description length ${seo.description.length} on ${pathname}`);
    titles.add(seo.title);
    descriptions.add(seo.description);

    assert.ok(seo.structuredData, `Expected JSON-LD on ${pathname}`);
    const json = JSON.stringify(seo.structuredData);
    assert.ok(!json.includes('aggregateRating'), 'Must not fabricate ratings');
    assert.ok(!json.includes('"review"'), 'Must not fabricate reviews');
    assert.ok(!json.includes('TradeDia'), 'Must use Tradedia capitalization in JSON-LD');
  }

  assert.equal(titles.size, entries.length, 'Every public URL must have a unique title');
  assert.equal(descriptions.size, entries.length, 'Every public URL must have a unique meta description');

  const homeTypes = (resolveRouteSeo('/').structuredData?.['@graph'] || []).map((n) => n['@type']);
  assert.deepEqual(homeTypes, ['Organization', 'WebSite', 'WebApplication']);

  const patternTypes = (resolveRouteSeo('/learn/double-top').structuredData?.['@graph'] || []).map(
    (n) => n['@type']
  );
  assert.deepEqual(patternTypes, ['Organization', 'BreadcrumbList', 'LearningResource']);

  for (const featurePath of ['/paper-trading-india', '/ai-stock-screener', '/guess-the-chart']) {
    const types = (resolveRouteSeo(featurePath).structuredData?.['@graph'] || []).map(
      (n) => n['@type']
    );
    assert.deepEqual(types, ['Organization', 'WebApplication', 'BreadcrumbList', 'FAQPage']);
  }
});

test('private, paywalled, and unknown routes emit accurate noindex and 404 metadata', () => {
  const locked = resolveRouteSeo('/learn/head-and-shoulders');
  assert.equal(locked.statusCode, 200);
  assert.equal(locked.indexable, false);
  assert.equal(locked.robots, 'noindex, follow');

  for (const path of ['/trade', '/trade/RELIANCE', '/screener', '/screener/intraday', '/screener/analysis', '/quiz', '/quiz/play']) {
    const seo = resolveRouteSeo(path);
    assert.equal(seo.statusCode, 200);
    assert.equal(seo.indexable, false);
    assert.equal(seo.robots, 'noindex, follow');
  }

  const profile = resolveRouteSeo('/profile');
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.robots, 'noindex, nofollow');

  const notFound = resolveRouteSeo('/this-page-does-not-exist');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.robots, 'noindex, nofollow');
  assert.equal(notFound.canonicalUrl, null);
});
