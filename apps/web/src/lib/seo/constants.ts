export const CANONICAL_HOST = 'www.tradedia.in';
export const APEX_HOST = 'tradedia.in';
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export const BRAND_NAME = 'Tradedia';
export const SITE_TAGLINE = 'One Place to Learn Trading';
export const SUPPORT_EMAIL = 'support@tradedia.in';

export const ORG_LOGO_PATH = '/images/landing/logo-512.png';
export const ORG_LOGO_URL = `${CANONICAL_ORIGIN}${ORG_LOGO_PATH}`;
export const ORG_LOGO_WIDTH = 512;
export const ORG_LOGO_HEIGHT = 512;

export const DEFAULT_OG_IMAGE_PATH = '/images/landing/tradedia-social-share-card.png';
export const DEFAULT_OG_IMAGE_URL = `${CANONICAL_ORIGIN}${DEFAULT_OG_IMAGE_PATH}`;
export const DEFAULT_OG_IMAGE_ALT =
  'Tradedia – Paper Trading, AI-Powered Stock Screener & Learn Chart Patterns';
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_TYPE = 'image/png';
export const TWITTER_CARD_TYPE = 'summary_large_image';

export const LEGAL_LAST_UPDATED_DISPLAY = 'November 14, 2026';
export const LEGAL_LAST_UPDATED_ISO = '2026-11-14';

export function buildCanonicalUrl(pathname: string): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized === '/') return `${CANONICAL_ORIGIN}/`;
  return `${CANONICAL_ORIGIN}${normalized.replace(/\/+$/, '')}`;
}
