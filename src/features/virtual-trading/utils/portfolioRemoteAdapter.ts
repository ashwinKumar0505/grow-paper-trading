import type { UserUsageQuota } from '../../../lib/subscription';
import type { Holding, IntradayPosition, Order, WalletTransaction } from '../../../types/market';
import { migrateLegacyPaperState } from '../../../utils/orderEngine';
import type { PortfolioSnapshot } from './portfolioSync';
import { DEFAULT_WATCHLISTS } from './storageKeys';
import type { RemoteUserRecord } from './userProfileSync';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeCommittedCapitalAmount(params: {
  balance: number;
  holdings: Holding[];
  positions: IntradayPosition[];
  orders: Order[];
}): number {
  const holdingsNet = params.holdings.reduce(
    (s, h) => s + ((h.totalInvested || 0) - (h.mtfLoanAmount || 0)),
    0
  );
  const posMargin = params.positions.reduce((s, p) => s + (p.marginBlocked || 0), 0);
  const orderReserved = params.orders.reduce(
    (s, o) =>
      s +
      ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount
        ? o.blockedAmount
        : 0),
    0
  );
  return round2(params.balance + holdingsNet + posMargin + orderReserved);
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function computeEffectiveWalletCap(
  baseTierCap?: number,
  remote?: RemoteUserRecord | null,
  walletTransactions?: WalletTransaction[]
): number | undefined {
  if (typeof baseTierCap !== 'number') return undefined;
  const explicitCredit =
    typeof remote?.paidTopUpCredit === 'number' && remote.paidTopUpCredit > 0
      ? remote.paidTopUpCredit
      : 0;
  const txs = walletTransactions || remote?.walletTransactions || [];
  const inferredTopUp = Array.isArray(txs)
    ? txs
        .filter(
          (t) =>
            t &&
            t.type === 'DEPOSIT' &&
            typeof t.description === 'string' &&
            t.description.includes('Top-Up') &&
            !t.description.includes('pay_demo_')
        )
        .reduce((sum, t) => sum + (typeof t.amount === 'number' && t.amount > 0 ? t.amount : 0), 0)
    : 0;
  const hasTopUpId = Boolean(
    remote?.lastTopUpPaymentId && !remote.lastTopUpPaymentId.startsWith('pay_demo_')
  );
  const topUpBonus = Math.max(explicitCredit, inferredTopUp, hasTopUpId ? 100000 : 0);
  return baseTierCap + topUpBonus;
}

export function extractPortfolioFromRemote(
  remote: RemoteUserRecord | null | undefined,
  tierMaxLimit?: number
): PortfolioSnapshot | null {
  if (!remote) return null;
  const hasPortfolioFields =
    Array.isArray(remote.holdings) ||
    Array.isArray(remote.intradayPositions) ||
    Array.isArray(remote.orders) ||
    Array.isArray(remote.walletTransactions);
  if (!hasPortfolioFields) return null;

  const migrated = migrateLegacyPaperState({
    balance: remote.balance,
    holdings: remote.holdings,
    positions: remote.intradayPositions,
    orders: remote.orders,
    executedOrderKeys: remote.executedOrderKeys,
  });

  const rawBalance = typeof migrated.balance === 'number' ? migrated.balance : 100000;
  const rawInitial = typeof remote.initialBalance === 'number' ? remote.initialBalance : rawBalance;
  const effectiveCap = computeEffectiveWalletCap(tierMaxLimit, remote);

  return {
    balance: typeof effectiveCap === 'number' ? Math.min(effectiveCap, rawBalance) : rawBalance,
    initialBalance:
      typeof effectiveCap === 'number' ? Math.min(effectiveCap, rawInitial) : rawInitial,
    holdings: Array.isArray(migrated.holdings) ? migrated.holdings : [],
    intradayPositions: Array.isArray(migrated.positions) ? migrated.positions : [],
    orders: Array.isArray(migrated.orders) ? migrated.orders : [],
    executedOrderKeys: Array.isArray(migrated.executedOrderKeys)
      ? migrated.executedOrderKeys
      : [],
    watchlists:
      Array.isArray(remote.watchlists) && remote.watchlists.length > 0
        ? remote.watchlists
        : DEFAULT_WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })),
    walletTransactions: Array.isArray(remote.walletTransactions)
      ? remote.walletTransactions
      : [],
    updatedAt: remote.portfolioUpdatedAt || remote.updatedAt || Date.now(),
  };
}

export function buildRemotePortfolioPayload(
  snapshot: PortfolioSnapshot,
  usageQuota?: UserUsageQuota
): Record<string, unknown> {
  const now = Date.now();
  return stripUndefined({
    balance: snapshot.balance,
    initialBalance: snapshot.initialBalance,
    holdings: snapshot.holdings,
    intradayPositions: snapshot.intradayPositions,
    orders: snapshot.orders.slice(0, 200),
    executedOrderKeys: snapshot.executedOrderKeys.slice(-300),
    watchlists: snapshot.watchlists,
    walletTransactions: snapshot.walletTransactions.slice(0, 200),
    ...(usageQuota ? { usage: usageQuota } : {}),
    portfolioUpdatedAt: now,
    updatedAt: now,
  });
}
