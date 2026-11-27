import { getFeatureLandingContent } from '../../features/feature-landing/data/featureContentMap';
import type { FeatureLandingRoute } from '../../features/feature-landing/types';
import { resolvePatternBySlug, type PatternCatalogEntry } from '../../features/quiz/utils/patternCatalog';
import { canonicalPath, getLearnPatternSlugFromPath } from '../navigation';
import { BRAND_NAME, DEFAULT_OG_IMAGE_ALT, DEFAULT_OG_IMAGE_URL, buildCanonicalUrl } from './constants';
import {
  AUTH_GATED_META,
  CORE_KEYWORDS,
  FEATURE_LANDING_META,
  LEGAL_META,
  PUBLIC_PAGE_COPY,
  type LegalRouteKey,
} from './staticRouteMeta';
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildJsonLdGraph,
  buildOrganizationSchema,
  buildPatternLearningResourceSchema,
  buildWebApplicationSchema,
  buildWebSiteSchema,
  type JsonLdGraph,
} from './structuredData';

export type { LegalRouteKey };

export type RouteSeoKind =
  | 'home' | 'feature-landing' | 'learn-hub' | 'learn-pattern'
  | 'pricing' | 'legal' | 'auth-gated' | 'not-found';

export interface RouteSeoMetadata {
  statusCode: 200 | 404;
  kind: RouteSeoKind;
  canonicalPath: string;
  canonicalUrl: string | null;
  title: string;
  description: string;
  keywords: string;
  robots: 'index, follow' | 'noindex, follow' | 'noindex, nofollow';
  indexable: boolean;
  ogType: 'website' | 'article';
  ogImage: string;
  ogImageAlt: string;
  structuredData: JsonLdGraph | null;
  patternEntry?: PatternCatalogEntry;
  legalKind?: LegalRouteKey;
  featureRoute?: FeatureLandingRoute;
}

function truncateSentence(text: string, maxLen = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const boundary = sliced.lastIndexOf(' ');
  return `${(boundary > 90 ? sliced.slice(0, boundary) : sliced).replace(/[,;:\-]+$/, '')}…`;
}

function makeSeo(
  overrides: Partial<RouteSeoMetadata> &
    Pick<RouteSeoMetadata, 'kind' | 'canonicalPath' | 'title' | 'description'>
): RouteSeoMetadata {
  const statusCode = overrides.statusCode ?? 200;
  const robots = overrides.robots ?? 'index, follow';
  return {
    statusCode,
    canonicalUrl: statusCode === 404 ? null : buildCanonicalUrl(overrides.canonicalPath),
    keywords: CORE_KEYWORDS,
    robots,
    indexable: robots.startsWith('index'),
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE_URL,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    structuredData: null,
    ...overrides,
  };
}

function buildPatternSeo(entry: PatternCatalogEntry): RouteSeoMetadata {
  const { template, slug, shortTitle, isPublicFree } = entry;
  const path = `/learn/${slug}`;
  const groupLabel = template.cheatSheetGroup === 'Special' ? 'Price Action' : template.cheatSheetGroup;
  const bias = template.expectedDirection === 'BUY' ? 'bullish' : 'bearish';
  const description = isPublicFree
    ? truncateSentence(`Learn the ${shortTitle} ${bias} chart pattern on ${BRAND_NAME}. ${template.explanation}`)
    : truncateSentence(`${shortTitle} is a ${template.difficulty.toLowerCase()} ${bias} ${groupLabel.toLowerCase()} chart pattern in the ${BRAND_NAME} interactive library.`);
  return makeSeo({
    kind: 'learn-pattern',
    canonicalPath: path,
    title: `${shortTitle} Chart Pattern – ${groupLabel} Guide | ${BRAND_NAME}`,
    description,
    keywords: `${shortTitle} chart pattern, ${shortTitle.toLowerCase()} trading rules, learn chart patterns, ${groupLabel.toLowerCase()} candlestick pattern, ${BRAND_NAME}`,
    robots: isPublicFree ? 'index, follow' : 'noindex, follow',
    ogType: 'article',
    ogImageAlt: `${shortTitle} chart pattern lesson on ${BRAND_NAME}`,
    structuredData: isPublicFree
      ? buildJsonLdGraph([
          buildOrganizationSchema(),
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Learn Chart Patterns', path: '/learn' },
            { name: shortTitle, path },
          ]),
          buildPatternLearningResourceSchema(entry),
        ])
      : null,
    patternEntry: entry,
  });
}

export function resolveRouteSeo(rawPathname: string): RouteSeoMetadata {
  const path = canonicalPath(rawPathname || '/');
  const homeCrumb = { name: 'Home', path: '/' };

  if (path === '/') {
    return makeSeo({
      kind: 'home',
      canonicalPath: '/',
      ...PUBLIC_PAGE_COPY.home,
      structuredData: buildJsonLdGraph([buildOrganizationSchema(), buildWebSiteSchema(), buildWebApplicationSchema()]),
    });
  }

  const featureContent = getFeatureLandingContent(path);
  if (featureContent) {
    const meta = FEATURE_LANDING_META[featureContent.route];
    return makeSeo({
      kind: 'feature-landing',
      canonicalPath: featureContent.route,
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      ogImageAlt: meta.ogImageAlt,
      structuredData: buildJsonLdGraph([
        buildOrganizationSchema(),
        buildWebApplicationSchema(),
        buildBreadcrumbSchema([homeCrumb, { name: meta.label, path: featureContent.route }]),
        buildFaqPageSchema(featureContent.faqs),
      ]),
      featureRoute: featureContent.route,
    });
  }

  if (path === '/learn') {
    return makeSeo({
      kind: 'learn-hub',
      canonicalPath: '/learn',
      ...PUBLIC_PAGE_COPY.learnHub,
      structuredData: buildJsonLdGraph([buildOrganizationSchema(), buildBreadcrumbSchema([homeCrumb, { name: 'Learn Chart Patterns', path: '/learn' }])]),
    });
  }

  if (path.startsWith('/learn/')) {
    const matched = resolvePatternBySlug(getLearnPatternSlugFromPath(path));
    if (matched) return buildPatternSeo(matched);
  }

  if (path === '/pricing') {
    return makeSeo({
      kind: 'pricing',
      canonicalPath: '/pricing',
      ...PUBLIC_PAGE_COPY.pricing,
      structuredData: buildJsonLdGraph([buildOrganizationSchema(), buildWebApplicationSchema(), buildBreadcrumbSchema([homeCrumb, { name: 'Pricing & Plans', path: '/pricing' }])]),
    });
  }

  const legalKey = path.slice(1) as LegalRouteKey;
  if (legalKey in LEGAL_META && path === `/${legalKey}`) {
    const meta = LEGAL_META[legalKey];
    return makeSeo({
      kind: 'legal',
      canonicalPath: path,
      title: meta.title,
      description: meta.description,
      keywords: `${meta.label}, ${BRAND_NAME}, paper trading India, educational platform`,
      ogImageAlt: `${meta.label} – ${BRAND_NAME}`,
      structuredData: buildJsonLdGraph([buildOrganizationSchema(), buildBreadcrumbSchema([homeCrumb, { name: meta.label, path }])]),
      legalKind: legalKey,
    });
  }

  const authMeta = path.startsWith('/trade/') ? AUTH_GATED_META['/trade'] : AUTH_GATED_META[path];
  if (authMeta) return makeSeo({ kind: 'auth-gated', canonicalPath: path, ...authMeta });

  return makeSeo({
    statusCode: 404,
    kind: 'not-found',
    canonicalPath: path,
    title: `Page Not Found | ${BRAND_NAME}`,
    description: `The page you requested could not be found on ${BRAND_NAME}.`,
    robots: 'noindex, nofollow',
  });
}
