import type { Exchange } from '../../types/market';

export interface CatalogSymbolInfo {
  symbol: string;
  canonicalSymbol: string;
  yahooSymbol: string;
  isin: string;
  upstoxInstrumentKey: string;
  name: string;
  exchange: Exchange;
  sector: string;
}

export interface IndexCatalogInfo {
  yahoo: string;
  upstoxInstrumentKey: string;
  name: string;
  exchange: Exchange;
}

export const SYMBOL_ALIASES: Record<string, string> = {
  ZOMATO: 'ETERNAL',
  TATAMOTORS: 'TMPV',
};

type RawEquityTuple = readonly [string, string, string, string, string?];

const EQUITY_TUPLES: readonly RawEquityTuple[] = [
  ['RELIANCE', 'INE002A01018', 'Reliance Industries Ltd.', 'Energy & Conglomerate'],
  ['TCS', 'INE467B01029', 'Tata Consultancy Services Ltd.', 'Information Technology'],
  ['HDFCBANK', 'INE040A01034', 'HDFC Bank Ltd.', 'Banking & Financials'],
  ['TATAMOTORS', 'INE155A01022', 'Tata Motors Passenger Vehicles Ltd.', 'Automobile', 'TMPV'],
  ['TMPV', 'INE155A01022', 'Tata Motors Passenger Vehicles Ltd.', 'Automobile'],
  ['TMCV', 'INE1TAE01010', 'Tata Motors Commercial Vehicles Ltd.', 'Automobile'],
  ['INFY', 'INE009A01021', 'Infosys Ltd.', 'Information Technology'],
  ['ICICIBANK', 'INE090A01021', 'ICICI Bank Ltd.', 'Banking & Financials'],
  ['ZOMATO', 'INE758T01015', 'Eternal Ltd. (Zomato)', 'Consumer Tech', 'ETERNAL'],
  ['ETERNAL', 'INE758T01015', 'Eternal Ltd. (Zomato)', 'Consumer Tech'],
  ['SWIGGY', 'INE00H001014', 'Swiggy Ltd.', 'Consumer Tech'],
  ['TATAPOWER', 'INE245A01021', 'Tata Power Company Ltd.', 'Power & Utilities'],
  ['ITC', 'INE154A01025', 'ITC Ltd.', 'FMCG'],
  ['SBIN', 'INE062A01020', 'State Bank of India', 'Banking & Financials'],
  ['BHARTIARTL', 'INE397D01024', 'Bharti Airtel Ltd.', 'Telecom'],
  ['BAJFINANCE', 'INE296A01032', 'Bajaj Finance Ltd.', 'Banking & Financials'],
  ['LT', 'INE018A01030', 'Larsen & Toubro Ltd.', 'Infrastructure'],
  ['MARUTI', 'INE585B01010', 'Maruti Suzuki India Ltd.', 'Automobile'],
  ['SUNPHARMA', 'INE044A01036', 'Sun Pharmaceutical Industries Ltd.', 'Pharmaceuticals'],
  ['TITAN', 'INE280A01028', 'Titan Company Ltd.', 'Consumer Discretionary'],
  ['JIOFIN', 'INE758E01017', 'Jio Financial Services Ltd.', 'Banking & Financials'],
  ['TATASTEEL', 'INE081A01020', 'Tata Steel Ltd.', 'Metals & Mining'],
  ['ADANIENT', 'INE423A01024', 'Adani Enterprises Ltd.', 'Metals & Conglomerate'],
  ['WIPRO', 'INE075A01022', 'Wipro Ltd.', 'Information Technology'],
  ['KOTAKBANK', 'INE237A01036', 'Kotak Mahindra Bank Ltd.', 'Banking & Financials'],
  ['HINDUNILVR', 'INE030A01027', 'Hindustan Unilever Ltd.', 'FMCG'],
  ['AXISBANK', 'INE238A01034', 'Axis Bank Ltd.', 'Banking & Financials'],
  ['NTPC', 'INE733E01010', 'NTPC Ltd.', 'Power & Utilities'],
  ['COALINDIA', 'INE522F01014', 'Coal India Ltd.', 'Metals & Mining'],
  ['HCLTECH', 'INE860A01027', 'HCL Technologies Ltd.', 'Information Technology'],
  ['TECHM', 'INE669C01036', 'Tech Mahindra Ltd.', 'Information Technology'],
  ['POWERGRID', 'INE752E01010', 'Power Grid Corporation of India Ltd.', 'Power & Utilities'],
  ['ONGC', 'INE213A01029', 'Oil and Natural Gas Corporation Ltd.', 'Energy'],
  ['BAJAJ-AUTO', 'INE917I01010', 'Bajaj Auto Ltd.', 'Automobile'],
  ['M&M', 'INE101A01026', 'Mahindra & Mahindra Ltd.', 'Automobile'],
  ['HEROMOTOCO', 'INE158A01026', 'Hero MotoCorp Ltd.', 'Automobile'],
  ['EICHERMOT', 'INE066A01021', 'Eicher Motors Ltd.', 'Automobile'],
  ['NESTLEIND', 'INE239A01024', 'Nestle India Ltd.', 'FMCG'],
  ['BRITANNIA', 'INE216A01030', 'Britannia Industries Ltd.', 'FMCG'],
  ['ASIANPAINT', 'INE021A01026', 'Asian Paints Ltd.', 'Consumer Discretionary'],
  ['ULTRACEMCO', 'INE481G01011', 'UltraTech Cement Ltd.', 'Infrastructure'],
  ['GRASIM', 'INE047A01021', 'Grasim Industries Ltd.', 'Infrastructure'],
  ['JSWSTEEL', 'INE019A01038', 'JSW Steel Ltd.', 'Metals & Mining'],
  ['HINDALCO', 'INE038A01020', 'Hindalco Industries Ltd.', 'Metals & Mining'],
  ['CIPLA', 'INE059A01026', 'Cipla Ltd.', 'Pharmaceuticals'],
  ['DRREDDY', 'INE089A01031', "Dr. Reddy's Laboratories Ltd.", 'Pharmaceuticals'],
  ['APOLLOHOSP', 'INE437A01024', 'Apollo Hospitals Enterprise Ltd.', 'Healthcare'],
  ['DIVISLAB', 'INE361B01024', "Divi's Laboratories Ltd.", 'Pharmaceuticals'],
  ['INDUSINDBK', 'INE095A01012', 'IndusInd Bank Ltd.', 'Banking & Financials'],
  ['SBILIFE', 'INE123W01016', 'SBI Life Insurance Company Ltd.', 'Banking & Financials'],
  ['HDFCLIFE', 'INE795G01014', 'HDFC Life Insurance Company Ltd.', 'Banking & Financials'],
  ['BAJAJFINSV', 'INE918I01026', 'Bajaj Finserv Ltd.', 'Banking & Financials'],
  ['ADANIPORTS', 'INE742F01042', 'Adani Ports and Special Economic Zone Ltd.', 'Infrastructure'],
  ['BPCL', 'INE029A01011', 'Bharat Petroleum Corporation Ltd.', 'Energy'],
  ['BEL', 'INE263A01024', 'Bharat Electronics Ltd.', 'Defence & Aerospace'],
  ['TRENT', 'INE849A01020', 'Trent Ltd.', 'Retail'],
  ['SHRIRAMFIN', 'INE721A01047', 'Shriram Finance Ltd.', 'Banking & Financials'],
  ['HAL', 'INE066F01020', 'Hindustan Aeronautics Ltd.', 'Defence & Aerospace'],
  ['VEDL', 'INE205A01025', 'Vedanta Ltd.', 'Metals & Mining'],
];

export const NSE_SYMBOL_CATALOG: Record<string, CatalogSymbolInfo> = Object.fromEntries(
  EQUITY_TUPLES.map(([symbol, isin, name, sector, canonical]) => {
    const canonicalSymbol = canonical || symbol;
    return [
      symbol,
      {
        symbol,
        canonicalSymbol,
        yahooSymbol: `${canonicalSymbol}.NS`,
        isin,
        upstoxInstrumentKey: `NSE_EQ|${isin}`,
        name,
        exchange: 'NSE' as const,
        sector,
      },
    ];
  })
);

export const INDICES_CATALOG: Record<string, IndexCatalogInfo> = {
  'NIFTY 50': { yahoo: '%5ENSEI', upstoxInstrumentKey: 'NSE_INDEX|Nifty 50', name: 'NIFTY 50', exchange: 'NSE' },
  SENSEX: { yahoo: '%5EBSESN', upstoxInstrumentKey: 'BSE_INDEX|SENSEX', name: 'BSE SENSEX', exchange: 'BSE' },
  'BANK NIFTY': { yahoo: '%5ENSEBANK', upstoxInstrumentKey: 'NSE_INDEX|Nifty Bank', name: 'NIFTY BANK', exchange: 'NSE' },
  'NIFTY IT': { yahoo: '%5ECNXIT', upstoxInstrumentKey: 'NSE_INDEX|Nifty IT', name: 'NIFTY IT', exchange: 'NSE' },
  'NIFTY AUTO': { yahoo: '%5ECNXAUTO', upstoxInstrumentKey: 'NSE_INDEX|Nifty Auto', name: 'NIFTY AUTO', exchange: 'NSE' },
};

const VALID_EQUITY_SYMBOL_RE = /^[A-Z0-9][A-Z0-9&-]{0,24}$/;

export function resolveCanonicalSymbol(rawSymbol: string): string {
  const upper = rawSymbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  if (INDICES_CATALOG[upper]) return upper;
  return SYMBOL_ALIASES[upper] || upper;
}

export function isSupportedSymbolFormat(rawSymbol: string): boolean {
  const upper = rawSymbol.trim().toUpperCase();
  if (!upper) return false;
  if (INDICES_CATALOG[upper]) return true;
  const clean = resolveCanonicalSymbol(upper);
  return !clean.startsWith('DUMMY') && VALID_EQUITY_SYMBOL_RE.test(clean);
}

export function resolveYahooSymbol(rawSymbol: string): string {
  const sym = rawSymbol.trim().toUpperCase();
  if (NSE_SYMBOL_CATALOG[sym]) return NSE_SYMBOL_CATALOG[sym].yahooSymbol;
  if (INDICES_CATALOG[sym]) return INDICES_CATALOG[sym].yahoo;
  const canonical = resolveCanonicalSymbol(sym);
  return canonical.includes('.') ? canonical : `${canonical}.NS`;
}

export function resolveCatalogUpstoxInstrumentKey(rawSymbol: string): string | null {
  const sym = rawSymbol.trim().toUpperCase();
  if (NSE_SYMBOL_CATALOG[sym]) return NSE_SYMBOL_CATALOG[sym].upstoxInstrumentKey;
  if (INDICES_CATALOG[sym]) return INDICES_CATALOG[sym].upstoxInstrumentKey;
  const canonical = resolveCanonicalSymbol(sym);
  return NSE_SYMBOL_CATALOG[canonical]?.upstoxInstrumentKey ?? null;
}
