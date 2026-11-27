import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_IMAGE_WIDTH,
  TWITTER_CARD_TYPE,
} from '../../lib/seo/constants';
import type { RouteSeoMetadata } from '../../lib/seo/routeMetadata';
import { buildCrawlerRootMarkup, escapeHtml } from './crawlerMarkup';

const SEO_BLOCK_RE = /<!--\s*SEO_META_START\s*-->[\s\S]*?<!--\s*SEO_META_END\s*-->/;
const ROOT_DIV_RE = /<div\s+id=["']root["']\s*><\/div>/;

function safeJsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildSeoHeadTags(seo: RouteSeoMetadata): string {
  const lines: string[] = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
  ];

  if (seo.canonicalUrl) {
    lines.push(`<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`);
  }

  lines.push(
    `<meta property="og:type" content="${escapeHtml(seo.ogType)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(BRAND_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`
  );

  if (seo.canonicalUrl) {
    lines.push(`<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`);
  }

  lines.push(
    `<meta property="og:image" content="${escapeHtml(seo.ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(seo.ogImageAlt)}" />`,
    `<meta property="og:image:width" content="${DEFAULT_OG_IMAGE_WIDTH}" />`,
    `<meta property="og:image:height" content="${DEFAULT_OG_IMAGE_HEIGHT}" />`,
    `<meta property="og:image:type" content="${DEFAULT_OG_IMAGE_TYPE}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="${TWITTER_CARD_TYPE}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(seo.ogImageAlt)}" />`
  );

  if (seo.structuredData) {
    lines.push(
      `<script id="tradedia-seo-jsonld" type="application/ld+json">${safeJsonLdString(seo.structuredData)}</script>`
    );
  }

  return lines.map((line) => `    ${line}`).join('\n');
}

export function renderSeoHtml(templateHtml: string, seo: RouteSeoMetadata): string {
  const seoHeadBlock = `<!-- SEO_META_START -->\n${buildSeoHeadTags(seo)}\n    <!-- SEO_META_END -->`;
  let html = SEO_BLOCK_RE.test(templateHtml)
    ? templateHtml.replace(SEO_BLOCK_RE, seoHeadBlock)
    : templateHtml.replace('</head>', `${seoHeadBlock}\n  </head>`);

  const crawlerMarkup = buildCrawlerRootMarkup(seo);
  if (crawlerMarkup && ROOT_DIV_RE.test(html)) {
    html = html.replace(ROOT_DIV_RE, `<div id="root">${crawlerMarkup}</div>`);
  }

  return html;
}
