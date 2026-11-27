import { canonicalPath } from '../navigation';
import type { AnalyticsPrimitive, SanitizedPageData } from './types';

const GA4_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{6,20}$/i;
const GA4_EVENT_NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;

const ALLOWED_STATIC_ROUTES = new Set<string>([
  '/',
  '/trade',
  '/screener',
  '/screener/intraday',
  '/screener/analysis',
  '/learn',
  '/quiz',
  '/quiz/play',
  '/pricing',
  '/profile',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/disclaimer',
  '/contact',
]);

const ALLOWED_QUERY_PARAMS = new Set<string>([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Tradedia – One Place to Learn Trading',
  '/trade': 'Paper Trading Desk | Tradedia',
  '/trade/:symbol': 'Stock Paper Trading | Tradedia',
  '/screener': 'Swing Stock Screener | Tradedia',
  '/screener/intraday': 'Intraday Stock Screener | Tradedia',
  '/screener/analysis': 'Stock Analysis | Tradedia',
  '/learn': 'Learn Chart Patterns | Tradedia',
  '/quiz': 'Guess the Chart Quiz | Tradedia',
  '/quiz/play': 'Guess the Chart Arena | Tradedia',
  '/pricing': 'Pricing & Membership Packages | Tradedia',
  '/profile': 'My Profile | Tradedia',
  '/terms': 'Terms of Service | Tradedia',
  '/privacy': 'Privacy Policy | Tradedia',
  '/refund-policy': 'Cancellation & Refund Policy | Tradedia',
  '/disclaimer': 'SEBI & Market Risk Disclaimer | Tradedia',
  '/contact': 'Contact & Support | Tradedia',
  '/not-found': 'Page Not Found | Tradedia',
};

const BLOCKED_PARAM_KEY_RE =
  /(^|_)(name|full_?name|user_?name|first_?name|last_?name|display_?name|email|mail|phone|mobile|uid|user_?id|avatar|photo|token|jwt|bearer|secret|password|passwd|otp|api_?key|auth_?token|signature|razorpay|payment_?id|order_?id|subscription_?id|transaction_?id|symbol|ticker|stock_?name|qty|quantity|price|amount|balance|capital|cash|pnl|profit|loss|margin|value|cost|fee|brokerage|tax|card|cvv|upi|bank|pan|aadhaar|ssn|address|ip)($|_)/i;

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?\b/,
  /\bBearer\s+[A-Za-z0-9._-]{8,}/i,
  /\b(?:rzp_(?:test|live)_|pay_|order_|sub_)[A-Za-z0-9]{6,}/i,
  /\b(?:re_[A-Za-z0-9_]{12,}|AIza[0-9A-Za-z_-]{20,})\b/,
  /(?:\+?\d[\d\s-]{9,}\d)/,
  /^[A-Fa-f0-9]{32,}$/,
];

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

export function isValidMeasurementId(value: string | undefined | null): boolean {
  if (typeof value !== 'string') return false;
  return GA4_MEASUREMENT_ID_RE.test(value.trim());
}

export function isValidEventName(name: string): boolean {
  return GA4_EVENT_NAME_RE.test(name);
}

export function containsSensitiveValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function toAnalyticsSlug(value: string | undefined, maxLen = 64): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(CONTROL_CHARS_RE, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen);
  return cleaned || undefined;
}

export function sanitizePagePath(rawPathname: string): string {
  const safeRaw = typeof rawPathname === 'string' && rawPathname.trim() ? rawPathname : '/';
  const canonical = canonicalPath(safeRaw);
  if (canonical.startsWith('/trade/')) {
    return '/trade/:symbol';
  }
  if (ALLOWED_STATIC_ROUTES.has(canonical)) {
    return canonical;
  }
  return '/not-found';
}

export function getSanitizedPageTitle(sanitizedPath: string): string {
  return ROUTE_TITLES[sanitizedPath] || ROUTE_TITLES['/not-found'];
}

export function sanitizeQueryString(rawSearch: string | undefined): string {
  if (typeof rawSearch !== 'string' || !rawSearch) return '';
  const queryBody = rawSearch.split('#')[0].replace(/^\?/, '');
  if (!queryBody) return '';

  const incoming = new URLSearchParams(queryBody);
  const kept: Array<[string, string]> = [];

  for (const [rawKey, rawVal] of incoming.entries()) {
    const key = rawKey.trim().toLowerCase();
    if (!ALLOWED_QUERY_PARAMS.has(key)) continue;
    const cleaned = rawVal.replace(CONTROL_CHARS_RE, '').trim().slice(0, 64);
    if (!cleaned || containsSensitiveValue(cleaned)) continue;
    kept.push([key, cleaned]);
  }

  if (kept.length === 0) return '';
  kept.sort(([a], [b]) => a.localeCompare(b));
  const output = new URLSearchParams();
  for (const [k, v] of kept) {
    output.set(k, v);
  }
  const serialized = output.toString();
  return serialized ? `?${serialized}` : '';
}

function sanitizeOrigin(rawOrigin: string | undefined): string {
  if (typeof rawOrigin !== 'string' || !rawOrigin.trim()) return '';
  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

export function sanitizePageLocation(input: {
  origin?: string;
  pathname: string;
  search?: string;
}): SanitizedPageData {
  const pagePath = sanitizePagePath(input.pathname);
  const sanitizedSearch = sanitizeQueryString(input.search);
  const origin = sanitizeOrigin(input.origin);
  const pageKey = `${pagePath}${sanitizedSearch}`;
  const pageLocation = origin ? `${origin}${pageKey}` : pageKey;
  const pageTitle = getSanitizedPageTitle(pagePath);

  return {
    pagePath,
    pageLocation,
    pageTitle,
    pageKey,
  };
}

export function sanitizeEventParams(
  params?: Record<string, unknown>
): Record<string, AnalyticsPrimitive> {
  if (!params || typeof params !== 'object') return {};
  const result: Record<string, AnalyticsPrimitive> = {};

  for (const [rawKey, rawValue] of Object.entries(params)) {
    const key = rawKey.trim();
    if (!key || !GA4_EVENT_NAME_RE.test(key)) continue;
    if (BLOCKED_PARAM_KEY_RE.test(key)) continue;

    if (typeof rawValue === 'boolean') {
      result[key] = rawValue;
      continue;
    }

    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) {
        result[key] = rawValue;
      }
      continue;
    }

    if (typeof rawValue === 'string') {
      const cleaned = rawValue.replace(CONTROL_CHARS_RE, '').trim().slice(0, 100);
      if (!cleaned || containsSensitiveValue(cleaned)) continue;
      result[key] = cleaned;
    }
  }

  return result;
}
