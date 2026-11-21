import type { Exchange } from '../../types/market';

export interface CatalogSymbolInfo {
  symbol: string;
  yahooSymbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
}

export const NSE_SYMBOL_CATALOG: Record<string, CatalogSymbolInfo> = {
  RELIANCE: { symbol: 'RELIANCE', yahooSymbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy & Conglomerate' },
  TCS: { symbol: 'TCS', yahooSymbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  HDFCBANK: { symbol: 'HDFCBANK', yahooSymbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  TATAMOTORS: { symbol: 'TATAMOTORS', yahooSymbol: 'TMPV.NS', name: 'Tata Motors Passenger Vehicles Ltd.', exchange: 'NSE', sector: 'Automobile' },
  TMPV: { symbol: 'TMPV', yahooSymbol: 'TMPV.NS', name: 'Tata Motors Passenger Vehicles Ltd.', exchange: 'NSE', sector: 'Automobile' },
  TMCV: { symbol: 'TMCV', yahooSymbol: 'TMCV.NS', name: 'Tata Motors Commercial Vehicles Ltd.', exchange: 'NSE', sector: 'Automobile' },
  INFY: { symbol: 'INFY', yahooSymbol: 'INFY.NS', name: 'Infosys Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  ICICIBANK: { symbol: 'ICICIBANK', yahooSymbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  ZOMATO: { symbol: 'ZOMATO', yahooSymbol: 'ETERNAL.NS', name: 'Eternal Ltd. (Zomato)', exchange: 'NSE', sector: 'Consumer Tech' },
  ETERNAL: { symbol: 'ETERNAL', yahooSymbol: 'ETERNAL.NS', name: 'Eternal Ltd. (Zomato)', exchange: 'NSE', sector: 'Consumer Tech' },
  SWIGGY: { symbol: 'SWIGGY', yahooSymbol: 'SWIGGY.NS', name: 'Swiggy Ltd.', exchange: 'NSE', sector: 'Consumer Tech' },
  TATAPOWER: { symbol: 'TATAPOWER', yahooSymbol: 'TATAPOWER.NS', name: 'Tata Power Company Ltd.', exchange: 'NSE', sector: 'Power & Utilities' },
  ITC: { symbol: 'ITC', yahooSymbol: 'ITC.NS', name: 'ITC Ltd.', exchange: 'NSE', sector: 'FMCG' },
  SBIN: { symbol: 'SBIN', yahooSymbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', sector: 'Banking & Financials' },
  BHARTIARTL: { symbol: 'BHARTIARTL', yahooSymbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.', exchange: 'NSE', sector: 'Telecom' },
  BAJFINANCE: { symbol: 'BAJFINANCE', yahooSymbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  LT: { symbol: 'LT', yahooSymbol: 'LT.NS', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  MARUTI: { symbol: 'MARUTI', yahooSymbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', sector: 'Automobile' },
  SUNPHARMA: { symbol: 'SUNPHARMA', yahooSymbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd.', exchange: 'NSE', sector: 'Pharmaceuticals' },
  TITAN: { symbol: 'TITAN', yahooSymbol: 'TITAN.NS', name: 'Titan Company Ltd.', exchange: 'NSE', sector: 'Consumer Discretionary' },
  JIOFIN: { symbol: 'JIOFIN', yahooSymbol: 'JIOFIN.NS', name: 'Jio Financial Services Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  TATASTEEL: { symbol: 'TATASTEEL', yahooSymbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', exchange: 'NSE', sector: 'Metals & Mining' },
  ADANIENT: { symbol: 'ADANIENT', yahooSymbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd.', exchange: 'NSE', sector: 'Metals & Conglomerate' },
  WIPRO: { symbol: 'WIPRO', yahooSymbol: 'WIPRO.NS', name: 'Wipro Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  KOTAKBANK: { symbol: 'KOTAKBANK', yahooSymbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  HINDUNILVR: { symbol: 'HINDUNILVR', yahooSymbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', sector: 'FMCG' },
  AXISBANK: { symbol: 'AXISBANK', yahooSymbol: 'AXISBANK.NS', name: 'Axis Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  NTPC: { symbol: 'NTPC', yahooSymbol: 'NTPC.NS', name: 'NTPC Ltd.', exchange: 'NSE', sector: 'Power & Utilities' },
  COALINDIA: { symbol: 'COALINDIA', yahooSymbol: 'COALINDIA.NS', name: 'Coal India Ltd.', exchange: 'NSE', sector: 'Metals & Mining' },
  HCLTECH: { symbol: 'HCLTECH', yahooSymbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  TECHM: { symbol: 'TECHM', yahooSymbol: 'TECHM.NS', name: 'Tech Mahindra Ltd.', exchange: 'NSE', sector: 'Information Technology' },
  POWERGRID: { symbol: 'POWERGRID', yahooSymbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Ltd.', exchange: 'NSE', sector: 'Power & Utilities' },
  ONGC: { symbol: 'ONGC', yahooSymbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation Ltd.', exchange: 'NSE', sector: 'Energy' },
  'BAJAJ-AUTO': { symbol: 'BAJAJ-AUTO', yahooSymbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd.', exchange: 'NSE', sector: 'Automobile' },
  'M&M': { symbol: 'M&M', yahooSymbol: 'M&M.NS', name: 'Mahindra & Mahindra Ltd.', exchange: 'NSE', sector: 'Automobile' },
  HEROMOTOCO: { symbol: 'HEROMOTOCO', yahooSymbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Ltd.', exchange: 'NSE', sector: 'Automobile' },
  EICHERMOT: { symbol: 'EICHERMOT', yahooSymbol: 'EICHERMOT.NS', name: 'Eicher Motors Ltd.', exchange: 'NSE', sector: 'Automobile' },
  NESTLEIND: { symbol: 'NESTLEIND', yahooSymbol: 'NESTLEIND.NS', name: 'Nestle India Ltd.', exchange: 'NSE', sector: 'FMCG' },
  BRITANNIA: { symbol: 'BRITANNIA', yahooSymbol: 'BRITANNIA.NS', name: 'Britannia Industries Ltd.', exchange: 'NSE', sector: 'FMCG' },
  ASIANPAINT: { symbol: 'ASIANPAINT', yahooSymbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.', exchange: 'NSE', sector: 'Consumer Discretionary' },
  ULTRACEMCO: { symbol: 'ULTRACEMCO', yahooSymbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  GRASIM: { symbol: 'GRASIM', yahooSymbol: 'GRASIM.NS', name: 'Grasim Industries Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  JSWSTEEL: { symbol: 'JSWSTEEL', yahooSymbol: 'JSWSTEEL.NS', name: 'JSW Steel Ltd.', exchange: 'NSE', sector: 'Metals & Mining' },
  HINDALCO: { symbol: 'HINDALCO', yahooSymbol: 'HINDALCO.NS', name: 'Hindalco Industries Ltd.', exchange: 'NSE', sector: 'Metals & Mining' },
  CIPLA: { symbol: 'CIPLA', yahooSymbol: 'CIPLA.NS', name: 'Cipla Ltd.', exchange: 'NSE', sector: 'Pharmaceuticals' },
  DRREDDY: { symbol: 'DRREDDY', yahooSymbol: 'DRREDDY.NS', name: "Dr. Reddy's Laboratories Ltd.", exchange: 'NSE', sector: 'Pharmaceuticals' },
  APOLLOHOSP: { symbol: 'APOLLOHOSP', yahooSymbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Enterprise Ltd.', exchange: 'NSE', sector: 'Healthcare' },
  DIVISLAB: { symbol: 'DIVISLAB', yahooSymbol: 'DIVISLAB.NS', name: "Divi's Laboratories Ltd.", exchange: 'NSE', sector: 'Pharmaceuticals' },
  INDUSINDBK: { symbol: 'INDUSINDBK', yahooSymbol: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  SBILIFE: { symbol: 'SBILIFE', yahooSymbol: 'SBILIFE.NS', name: 'SBI Life Insurance Company Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  HDFCLIFE: { symbol: 'HDFCLIFE', yahooSymbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance Company Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  BAJAJFINSV: { symbol: 'BAJAJFINSV', yahooSymbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  ADANIPORTS: { symbol: 'ADANIPORTS', yahooSymbol: 'ADANIPORTS.NS', name: 'Adani Ports and Special Economic Zone Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  BPCL: { symbol: 'BPCL', yahooSymbol: 'BPCL.NS', name: 'Bharat Petroleum Corporation Ltd.', exchange: 'NSE', sector: 'Energy' },
  BEL: { symbol: 'BEL', yahooSymbol: 'BEL.NS', name: 'Bharat Electronics Ltd.', exchange: 'NSE', sector: 'Defence & Aerospace' },
  TRENT: { symbol: 'TRENT', yahooSymbol: 'TRENT.NS', name: 'Trent Ltd.', exchange: 'NSE', sector: 'Retail' },
  SHRIRAMFIN: { symbol: 'SHRIRAMFIN', yahooSymbol: 'SHRIRAMFIN.NS', name: 'Shriram Finance Ltd.', exchange: 'NSE', sector: 'Banking & Financials' },
  HAL: { symbol: 'HAL', yahooSymbol: 'HAL.NS', name: 'Hindustan Aeronautics Ltd.', exchange: 'NSE', sector: 'Defence & Aerospace' },
  VEDL: { symbol: 'VEDL', yahooSymbol: 'VEDL.NS', name: 'Vedanta Ltd.', exchange: 'NSE', sector: 'Metals & Mining' },
};

export const INDICES_CATALOG: Record<string, { yahoo: string; name: string; exchange: Exchange }> = {
  'NIFTY 50': { yahoo: '%5ENSEI', name: 'NIFTY 50', exchange: 'NSE' },
  SENSEX: { yahoo: '%5EBSESN', name: 'BSE SENSEX', exchange: 'BSE' },
  'BANK NIFTY': { yahoo: '%5ENSEBANK', name: 'NIFTY BANK', exchange: 'NSE' },
  'NIFTY IT': { yahoo: '%5ECNXIT', name: 'NIFTY IT', exchange: 'NSE' },
  'NIFTY AUTO': { yahoo: '%5ECNXAUTO', name: 'NIFTY AUTO', exchange: 'NSE' },
};

export function resolveYahooSymbol(rawSymbol: string): string {
  const sym = rawSymbol.trim().toUpperCase();
  if (NSE_SYMBOL_CATALOG[sym]) return NSE_SYMBOL_CATALOG[sym].yahooSymbol;
  if (INDICES_CATALOG[sym]) return INDICES_CATALOG[sym].yahoo;
  return sym.includes('.') ? sym : `${sym}.NS`;
}
