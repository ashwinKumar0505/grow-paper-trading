import crypto from 'crypto';
import { getCurrentMonthKey, SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../lib/subscription';
import type { WalletTransaction, Watchlist } from '../../types/market';
import { DEFAULT_WATCHLISTS } from '../../features/virtual-trading/utils/storageKeys';
import { migrateLegacyPaperState } from '../../utils/orderEngine';
import { resolveAuthoritativeUserTier } from '../entitlements/entitlementService';
import type { DurableStore, DurableTradingLedger } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';

const r2 = (n: number) => Math.round(n * 100) / 100;

export function getOrCreateTradingLedger(
  userId: string,
  store: DurableStore = defaultStore,
  now = Date.now()
): DurableTradingLedger {
  const state = store.getState();
  const existing = state.tradingLedgers[userId];
  const user = state.users[userId];
  const { plan } = resolveAuthoritativeUserTier(user, now);

  if (existing) {
    applyMonthlyCapitalRefreshIfDue(existing, plan.defaultStartingCash, plan.name, store, now);
    return existing;
  }

  const startCash = plan.defaultStartingCash;
  const starterWatchlist: Watchlist = {
    ...DEFAULT_WATCHLISTS[0],
    symbols: DEFAULT_WATCHLISTS[0].symbols.slice(0, plan.maxStocksPerWatchlist),
  };
  const initTx: WalletTransaction = {
    id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    type: 'DEPOSIT',
    amount: startCash,
    description: `Initial virtual capital (${plan.name})`,
    timestamp: now,
  };

  const created: DurableTradingLedger = {
    userId,
    version: 1,
    balance: startCash,
    initialBalance: startCash,
    paidTopUpCredit: user?.paidTopUpCredit || 0,
    holdings: [],
    positions: [],
    orders: [],
    executions: [],
    executedOrderKeys: [],
    walletTransactions: [initTx],
    watchlists: [starterWatchlist],
    squareOffPendingSymbols: [],
    lastAutoResetMonth: getCurrentMonthKey(),
    updatedAt: now,
  };

  state.tradingLedgers[userId] = created;
  store.persist();
  return created;
}

export function computeCommittedCapital(
  ledger: Pick<DurableTradingLedger, 'balance' | 'holdings' | 'positions' | 'orders'>
): {
  cash: number;
  holdingsNetInvested: number;
  intradayMargin: number;
  reservedOrders: number;
  totalCommitted: number;
} {
  const cash = r2(ledger.balance);
  const holdingsNetInvested = r2(
    ledger.holdings.reduce((sum, h) => sum + ((h.totalInvested || 0) - (h.mtfLoanAmount || 0)), 0)
  );
  const intradayMargin = r2(ledger.positions.reduce((sum, p) => sum + (p.marginBlocked || 0), 0));
  const reservedOrders = r2(
    ledger.orders.reduce(
      (sum, o) => sum + ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount ? o.blockedAmount : 0),
      0
    )
  );
  return {
    cash,
    holdingsNetInvested,
    intradayMargin,
    reservedOrders,
    totalCommitted: r2(cash + holdingsNetInvested + intradayMargin + reservedOrders),
  };
}

export function applyMonthlyCapitalRefreshIfDue(
  ledger: DurableTradingLedger,
  planStartingCash: number,
  planName: string,
  store: DurableStore = defaultStore,
  now = Date.now()
): boolean {
  const currentMonth = getCurrentMonthKey();
  if (!ledger.lastAutoResetMonth || ledger.lastAutoResetMonth === currentMonth) {
    ledger.lastAutoResetMonth = currentMonth;
    return false;
  }

  const targetFloor = r2(planStartingCash + (ledger.paidTopUpCredit || 0));
  const { totalCommitted } = computeCommittedCapital(ledger);
  ledger.lastAutoResetMonth = currentMonth;

  if (totalCommitted < targetFloor) {
    const shortfall = r2(targetFloor - totalCommitted);
    ledger.balance = r2(ledger.balance + shortfall);
    ledger.initialBalance = r2(targetFloor);
    ledger.version += 1;
    ledger.updatedAt = now;
    ledger.walletTransactions.unshift({
      id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      type: 'DEPOSIT',
      amount: shortfall,
      description: `Monthly Virtual Capital Refresh to ₹${targetFloor.toLocaleString('en-IN')} (${planName})`,
      timestamp: now,
    });
    store.appendAudit({
      userId: ledger.userId,
      category: 'WALLET',
      action: 'MONTHLY_CAPITAL_REFRESH',
      details: { shortfallCredited: shortfall, newBalance: ledger.balance, month: currentMonth },
      timestamp: now,
    });
    return true;
  }
  return false;
}

export function creditLedgerOnTopUp(
  userId: string,
  amountINR: number,
  paymentId: string,
  store: DurableStore = defaultStore,
  now = Date.now()
): DurableTradingLedger {
  const ledger = getOrCreateTradingLedger(userId, store, now);
  ledger.paidTopUpCredit = r2((ledger.paidTopUpCredit || 0) + amountINR);
  ledger.balance = r2(ledger.balance + amountINR);
  ledger.initialBalance = r2(ledger.initialBalance + amountINR);
  ledger.version += 1;
  ledger.updatedAt = now;
  ledger.walletTransactions.unshift({
    id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    type: 'DEPOSIT',
    amount: amountINR,
    description: `+₹${amountINR.toLocaleString('en-IN')} Paid Wallet Top-Up (Ref ${paymentId})`,
    timestamp: now,
  });
  store.appendAudit({
    userId,
    category: 'WALLET',
    action: 'PAID_TOPUP_CREDITED',
    details: { amountINR, paymentId, newBalance: ledger.balance, paidTopUpCredit: ledger.paidTopUpCredit },
    timestamp: now,
  });
  return ledger;
}

export function revokeLedgerTopUp(
  userId: string,
  amountINR: number,
  paymentId: string,
  store: DurableStore = defaultStore,
  now = Date.now()
): DurableTradingLedger {
  const ledger = getOrCreateTradingLedger(userId, store, now);
  ledger.paidTopUpCredit = Math.max(0, r2((ledger.paidTopUpCredit || 0) - amountINR));
  ledger.balance = Math.max(0, r2(ledger.balance - amountINR));
  ledger.initialBalance = Math.max(100000, r2(ledger.initialBalance - amountINR));
  ledger.version += 1;
  ledger.updatedAt = now;
  store.appendAudit({
    userId,
    category: 'WALLET',
    action: 'PAID_TOPUP_REFUND_REVOKED',
    details: { amountINR, paymentId, newBalance: ledger.balance },
    timestamp: now,
  });
  return ledger;
}

export function creditLedgerOnPlanUpgrade(
  userId: string,
  newTier: SubscriptionTier,
  store: DurableStore = defaultStore,
  now = Date.now()
): DurableTradingLedger {
  const ledger = getOrCreateTradingLedger(userId, store, now);
  const targetPlan = SUBSCRIPTION_PLANS[newTier];
  const { totalCommitted } = computeCommittedCapital(ledger);
  if (newTier !== 'free' && totalCommitted < targetPlan.defaultStartingCash) {
    const boost = r2(targetPlan.defaultStartingCash - totalCommitted);
    ledger.balance = r2(ledger.balance + boost);
    ledger.initialBalance = Math.max(ledger.initialBalance, targetPlan.defaultStartingCash);
    ledger.version += 1;
    ledger.updatedAt = now;
    ledger.walletTransactions.unshift({
      id: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      type: 'DEPOSIT',
      amount: boost,
      description: `${targetPlan.name} upgrade virtual capital boost (+₹${boost.toLocaleString('en-IN')})`,
      timestamp: now,
    });
  }
  return ledger;
}
