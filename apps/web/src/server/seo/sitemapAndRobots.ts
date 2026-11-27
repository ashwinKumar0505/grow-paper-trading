import { getPublicPatternEntries } from '../../features/quiz/utils/patternCatalog';
import {
  CANONICAL_ORIGIN,
  LEGAL_LAST_UPDATED_ISO,
  buildCanonicalUrl,
} from '../../lib/seo/constants';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeDynamicEntry(entry: SitemapEntry): SitemapEntry | null {
  try {
    const parsed = new URL(entry.loc, CANONICAL_ORIGIN);
    if (parsed.origin !== CANONICAL_ORIGIN) return null;
    if (parsed.search || parsed.hash) return null;
    const loc = buildCanonicalUrl(parsed.pathname);
    const lastmod =
      entry.lastmod && ISO_DATE_RE.test(entry.lastmod.trim()) ? entry.lastmod.trim() : undefined;
    return lastmod ? { loc, lastmod } : { loc };
  } catch {
    return null;
  }
}

export function getSitemapEntries(options?: {
  dynamicEntries?: ReadonlyArray<SitemapEntry>;
}): SitemapEntry[] {
  const staticAndEducational: SitemapEntry[] = [
    { loc: buildCanonicalUrl('/') },
    { loc: buildCanonicalUrl('/paper-trading-india') },
    { loc: buildCanonicalUrl('/ai-stock-screener') },
    { loc: buildCanonicalUrl('/guess-the-chart') },
    { loc: buildCanonicalUrl('/learn') },
    ...getPublicPatternEntries().map((pattern) => ({
      loc: buildCanonicalUrl(`/learn/${pattern.slug}`),
    })),
    { loc: buildCanonicalUrl('/pricing') },
    { loc: buildCanonicalUrl('/contact'), lastmod: LEGAL_LAST_UPDATED_ISO },
    { loc: buildCanonicalUrl('/terms'), lastmod: LEGAL_LAST_UPDATED_ISO },
    { loc: buildCanonicalUrl('/privacy'), lastmod: LEGAL_LAST_UPDATED_ISO },
    { loc: buildCanonicalUrl('/refund-policy'), lastmod: LEGAL_LAST_UPDATED_ISO },
    { loc: buildCanonicalUrl('/disclaimer'), lastmod: LEGAL_LAST_UPDATED_ISO },
  ];

  const seen = new Set<string>();
  const result: SitemapEntry[] = [];

  for (const raw of [...staticAndEducational, ...(options?.dynamicEntries || [])]) {
    const normalized = normalizeDynamicEntry(raw);
    if (!normalized || seen.has(normalized.loc)) continue;
    seen.add(normalized.loc);
    result.push(normalized);
  }

  return result;
}

export function renderSitemapXml(entries: ReadonlyArray<SitemapEntry> = getSitemapEntries()): string {
  const urlNodes = entries
    .map((entry) => {
      const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) {
        lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }
      lines.push(`  </url>`);
      return lines.join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

export function isPreviewHost(hostHeader?: string): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(':')[0].trim().toLowerCase();
  return host.endsWith('.up.railway.app') || host.endsWith('.railway.app');
}

export function renderRobotsTxt(options?: { host?: string }): string {
  if (isPreviewHost(options?.host)) {
    return ['User-agent: *', 'Disallow: /', ''].join('\n');
  }

  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /paper-trading-india',
    'Allow: /ai-stock-screener',
    'Allow: /guess-the-chart',
    'Allow: /images/',
    'Allow: /assets/',
    'Disallow: /api/',
    'Disallow: /profile',
    'Disallow: /trade',
    'Disallow: /markets',
    'Disallow: /paper-trading$',
    'Disallow: /stocks/',
    'Disallow: /screener',
    'Disallow: /quiz',
    'Disallow: /*?symbol=',
    'Disallow: /*?q=',
    'Disallow: /*?search=',
    '',
    `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
}
