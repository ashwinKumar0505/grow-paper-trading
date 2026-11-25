import type { StockFundamentals } from '../../types/market';
import { NSE_SYMBOL_CATALOG, resolveCanonicalSymbol } from './symbolCatalog';
import type { UpstoxHttpClient } from './upstoxHttpClient';

export const FUNDAMENTALS_TTL_MS = 6 * 3600_000;

export interface CachedFundamentalsEntry {
  fundamentals: StockFundamentals;
  about?: string;
  cachedAt: number;
}

interface RawRatioItem {
  name?: string;
  company_value?: string | number;
  value?: string | number;
  sector_value?: string | number;
}

interface RawCorporateAction {
  name?: string;
  expiry_date?: string;
  amount?: number | string;
}

interface RawMarketCapField {
  value?: number | string;
  unit?: string;
  formatted?: string;
}

interface RawCompanyProfile {
  company_profile?: string;
  market_cap_inr?: RawMarketCapField | number | string;
  sector_market_cap_inr?: RawMarketCapField | number | string;
  market_cap?: number | string;
}

function parseCleanNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[,%₹$\s]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '--' || cleaned.toLowerCase() === 'na') return null;
  const val = Number(cleaned);
  return Number.isFinite(val) ? val : null;
}

function parseMarketCapCrore(field: RawMarketCapField | number | string | undefined): number | null {
  if (field === undefined || field === null) return null;
  if (typeof field === 'object') {
    const val = parseCleanNumber(field.value);
    if (val === null || val <= 0) return null;
    const unit = String(field.unit || 'crore').toLowerCase();
    if (unit.includes('lakh')) return val / 100;
    if (unit.includes('million')) return val / 10;
    if (unit.includes('billion')) return val * 100;
    return val;
  }
  const num = parseCleanNumber(field);
  return num !== null && num > 0 ? num : null;
}

function formatCroreAmount(croreVal: number): string {
  return `₹${Math.round(croreVal).toLocaleString('en-IN')} Cr`;
}

export function resolveCatalogIsin(rawSymbol: string): string | null {
  const upper = rawSymbol.trim().toUpperCase();
  const entry = NSE_SYMBOL_CATALOG[upper] || NSE_SYMBOL_CATALOG[resolveCanonicalSymbol(upper)];
  return entry?.isin || null;
}

export function extractIsinFromInstrumentKey(instrumentKey: string | null): string | null {
  if (!instrumentKey) return null;
  const parts = instrumentKey.split('|');
  const candidate = (parts[1] || '').trim().toUpperCase();
  return /^INE[A-Z0-9]{9}$/.test(candidate) ? candidate : null;
}

export async function fetchUpstoxFundamentals(params: {
  client: UpstoxHttpClient;
  symbol: string;
  isin: string | null;
  currentPrice: number | null;
  now: number;
  cache: Map<string, CachedFundamentalsEntry>;
}): Promise<{ fundamentals: StockFundamentals; about?: string } | null> {
  const { client, symbol, isin, currentPrice, now, cache } = params;
  const upper = symbol.trim().toUpperCase();
  const cached = cache.get(upper);
  if (cached && now - cached.cachedAt < FUNDAMENTALS_TTL_MS && cached.fundamentals.available) {
    return { fundamentals: cached.fundamentals, about: cached.about };
  }
  if (!isin || !client.hasAnalyticsToken()) {
    return cached ? { fundamentals: cached.fundamentals, about: cached.about } : null;
  }

  try {
    const [rawRatios, rawProfile, rawActions] = await Promise.all([
      client
        .getFundamentalPayload<RawRatioItem[] | { ratios?: RawRatioItem[]; key_ratios?: RawRatioItem[] }>(isin, 'key-ratios')
        .catch(() => null),
      client.getFundamentalPayload<RawCompanyProfile>(isin, 'profile').catch(() => null),
      client.getFundamentalPayload<RawCorporateAction[]>(isin, 'corporate-actions').catch(() => null),
    ]);

    const ratioList: RawRatioItem[] = Array.isArray(rawRatios)
      ? rawRatios
      : Array.isArray(rawRatios?.ratios)
        ? rawRatios.ratios
        : Array.isArray(rawRatios?.key_ratios)
          ? rawRatios.key_ratios
          : [];

    let peRatio: number | null = null;
    let pbRatio: number | null = null;
    let industryPe: number | null = null;
    let roe: number | null = null;
    let roce: number | null = null;
    let roa: number | null = null;
    let divYield: number | null = null;
    let debtToEquity: number | null = null;

    for (const item of ratioList) {
      const name = String(item?.name || '').trim().toLowerCase();
      const compVal = parseCleanNumber(item?.company_value ?? item?.value);
      const secVal = parseCleanNumber(item?.sector_value);
      if (name === 'p/e' || name === 'pe' || name.includes('(p/e)') || name === 'price to earnings') {
        if (compVal !== null && compVal > 0) peRatio = Number(compVal.toFixed(2));
        if (secVal !== null && secVal > 0) industryPe = Number(secVal.toFixed(2));
      } else if (name === 'p/b' || name === 'pb' || name.includes('(p/b)') || name === 'price to book') {
        if (compVal !== null && compVal > 0) pbRatio = Number(compVal.toFixed(2));
      } else if (name === 'roe' || name.includes('(roe)') || name === 'return on equity') {
        if (compVal !== null) roe = Number(compVal.toFixed(2));
      } else if (name === 'roce' || name.includes('(roce)') || name === 'return on capital employed') {
        if (compVal !== null) roce = Number(compVal.toFixed(2));
      } else if (name === 'roa' || name.includes('(roa)') || name === 'return on assets') {
        if (compVal !== null) roa = Number(compVal.toFixed(2));
      } else if (name.includes('dividend yield')) {
        if (compVal !== null && compVal >= 0) divYield = Number(compVal.toFixed(2));
      } else if (name.includes('debt to equity') || name === 'd/e') {
        if (compVal !== null && compVal >= 0) debtToEquity = Number(compVal.toFixed(2));
      }
    }

    const mcapCrore =
      parseMarketCapCrore(rawProfile?.market_cap_inr) ??
      parseMarketCapCrore(rawProfile?.sector_market_cap_inr) ??
      parseMarketCapCrore(rawProfile?.market_cap);
    const marketCap = mcapCrore !== null ? formatCroreAmount(mcapCrore) : null;

    const price = typeof currentPrice === 'number' && currentPrice > 0 ? currentPrice : null;
    const eps = price !== null && peRatio !== null && peRatio > 0 ? Number((price / peRatio).toFixed(2)) : null;
    const bookValue = price !== null && pbRatio !== null && pbRatio > 0 ? Number((price / pbRatio).toFixed(2)) : null;

    if (divYield === null && price !== null && Array.isArray(rawActions)) {
      const trailingStartMs = now - 365 * 86_400_000;
      let trailingDiv = 0;
      for (const act of rawActions) {
        if (String(act?.name || '').toLowerCase() !== 'dividend') continue;
        const amt = parseCleanNumber(act?.amount);
        const dt = act?.expiry_date ? Date.parse(act.expiry_date) : NaN;
        if (amt !== null && amt > 0 && Number.isFinite(dt) && dt > trailingStartMs && dt <= now) {
          trailingDiv += amt;
        }
      }
      if (trailingDiv > 0) {
        divYield = Number(((trailingDiv / price) * 100).toFixed(2));
      }
    }

    const hasAnyMetric = Boolean(
      marketCap || peRatio !== null || pbRatio !== null || roe !== null || roce !== null || roa !== null || eps !== null || bookValue !== null || debtToEquity !== null || divYield !== null
    );
    if (!hasAnyMetric) return cached ? { fundamentals: cached.fundamentals, about: cached.about } : null;

    const fundamentals: StockFundamentals = {
      available: true,
      source: 'Upstox Company Fundamentals',
      marketCap,
      peRatio,
      pbRatio,
      industryPe,
      debtToEquity,
      roe,
      roce,
      roa,
      divYield,
      eps,
      bookValue,
    };
    const about =
      typeof rawProfile?.company_profile === 'string' && rawProfile.company_profile.trim().length > 0
        ? rawProfile.company_profile.trim()
        : undefined;
    cache.set(upper, { fundamentals, about, cachedAt: now });
    return { fundamentals, about };
  } catch {
    return cached ? { fundamentals: cached.fundamentals, about: cached.about } : null;
  }
}
