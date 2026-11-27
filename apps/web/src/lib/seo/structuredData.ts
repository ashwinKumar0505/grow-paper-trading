import type { PatternCatalogEntry } from '../../features/quiz/utils/patternCatalog';
import { SUBSCRIPTION_PLANS } from '../subscription';
import {
  BRAND_NAME,
  CANONICAL_ORIGIN,
  ORG_LOGO_HEIGHT,
  ORG_LOGO_URL,
  ORG_LOGO_WIDTH,
  SITE_TAGLINE,
  SUPPORT_EMAIL,
  buildCanonicalUrl,
} from './constants';

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdObject
  | ReadonlyArray<JsonLdValue>;

export interface JsonLdObject {
  readonly [key: string]: JsonLdValue | undefined;
}

export interface JsonLdGraph {
  readonly '@context': 'https://schema.org';
  readonly '@graph': ReadonlyArray<JsonLdObject>;
}

const ORG_ID = `${CANONICAL_ORIGIN}/#organization`;
const WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`;
const WEBAPP_ID = `${CANONICAL_ORIGIN}/#webapp`;

export function buildOrganizationSchema(): JsonLdObject {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: ORG_LOGO_URL,
      width: ORG_LOGO_WIDTH,
      height: ORG_LOGO_HEIGHT,
    },
    email: SUPPORT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SUPPORT_EMAIL,
        areaServed: 'IN',
        availableLanguage: ['en'],
      },
    ],
  };
}

export function buildWebSiteSchema(): JsonLdObject {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${CANONICAL_ORIGIN}/`,
    name: BRAND_NAME,
    alternateName: `${BRAND_NAME} – ${SITE_TAGLINE}`,
    description:
      'Educational stock market platform for paper trading in India, AI-powered Nifty 500 stock screening, and interactive chart pattern learning.',
    inLanguage: 'en-IN',
    publisher: { '@id': ORG_ID },
  };
}

export function buildWebApplicationSchema(): JsonLdObject {
  const { free, beginner, advanced } = SUBSCRIPTION_PLANS;
  const pricingUrl = buildCanonicalUrl('/pricing');
  return {
    '@type': 'WebApplication',
    '@id': WEBAPP_ID,
    name: BRAND_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'Paper Trading Simulator & Stock Market Education',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    inLanguage: 'en-IN',
    description:
      'Practice risk-free virtual paper trading in India, scan Nifty 500 stocks with an AI-powered stock screener, and learn 21 candlestick and chart patterns interactively.',
    featureList: [
      'Risk-free NSE paper trading with virtual capital (Delivery CNC and 5x Intraday MIS)',
      'AI-powered Nifty 500 swing and intraday stock screener with historical backtests',
      'Interactive 21-pattern chart library and Guess the Chart practice quiz',
    ],
    provider: { '@id': ORG_ID },
    offers: [
      {
        '@type': 'Offer',
        name: free.name,
        price: String(free.monthlyPrice),
        priceCurrency: 'INR',
        url: pricingUrl,
      },
      {
        '@type': 'Offer',
        name: `${beginner.name} (Monthly)`,
        price: String(beginner.monthlyPrice),
        priceCurrency: 'INR',
        url: pricingUrl,
      },
      {
        '@type': 'Offer',
        name: `${advanced.name} (Monthly)`,
        price: String(advanced.monthlyPrice),
        priceCurrency: 'INR',
        url: pricingUrl,
      },
    ],
  };
}

export function buildBreadcrumbSchema(
  items: ReadonlyArray<{ name: string; path: string }>
): JsonLdObject {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path),
    })),
  };
}

export function buildPatternLearningResourceSchema(entry: PatternCatalogEntry): JsonLdObject {
  const { template, slug, shortTitle } = entry;
  const url = buildCanonicalUrl(`/learn/${slug}`);
  const groupLabel =
    template.cheatSheetGroup === 'Special'
      ? 'Candlestick & Price Action'
      : `${template.cheatSheetGroup} Chart Pattern`;
  return {
    '@type': 'LearningResource',
    '@id': `${url}#resource`,
    name: `${shortTitle} Chart Pattern`,
    url,
    description: template.explanation,
    inLanguage: 'en-IN',
    educationalLevel: template.difficulty,
    learningResourceType: 'Chart Pattern Lesson',
    about: `${groupLabel} (${template.expectedDirection === 'BUY' ? 'Bullish' : 'Bearish'})`,
    isAccessibleForFree: entry.isPublicFree,
    isPartOf: {
      '@type': 'WebPage',
      url: buildCanonicalUrl('/learn'),
      name: `Learn Chart Patterns | ${BRAND_NAME}`,
    },
    provider: { '@id': ORG_ID },
  };
}

export function buildFaqPageSchema(
  faqs: ReadonlyArray<{ q: string; a: string }>
): JsonLdObject {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

export function buildJsonLdGraph(nodes: ReadonlyArray<JsonLdObject>): JsonLdGraph {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  };
}
