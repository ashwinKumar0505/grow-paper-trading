import type { Watchlist } from '../../../types/market';

export const LOCAL_STORAGE_KEY = 'groww_paper_trading_data_v1';
export const USAGE_QUOTA_KEY = 'tradedia_usage_quota_v1';
export const WALLET_TXS_STORAGE_KEY = 'groww_paper_wallet_txs_v1';

export const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: 'default',
    name: 'My Watchlist',
    symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'TATAMOTORS', 'ZOMATO', 'INFY'],
  },
  {
    id: 'nifty-giants',
    name: 'NIFTY Giants',
    symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'SBIN'],
  },
  {
    id: 'high-growth',
    name: 'High Beta / Tech',
    symbols: ['ZOMATO', 'JIOFIN', 'TATAMOTORS', 'INFY', 'WIPRO', 'ADANIENT'],
  },
];

export function getTradingDataStorageKey(uid?: string | null): string {
  return `${LOCAL_STORAGE_KEY}_${uid || 'guest'}`;
}

export function getWalletTxsStorageKey(uid?: string | null): string {
  return `${WALLET_TXS_STORAGE_KEY}_${uid || 'guest'}`;
}

export function getUsageQuotaStorageKey(uid?: string | null): string {
  return `${USAGE_QUOTA_KEY}_${uid || 'guest'}`;
}
