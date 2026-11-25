import crypto from 'crypto';
import type { SubscriptionTier } from '../../lib/subscription';
import type { PlaceOrderInput, Stock, WalletTransaction } from '../../types/market';
import { getIndianMarketStatus, type MarketCalendarConfig } from '../../utils/marketHours';
import { cancelOrder, migrateLegacyPaperState, submitOrder, type OrderBookState } from '../../utils/orderEngine';
import { resolveAuthoritativeUserTier, validateTradingOrderEntitlement } from '../entitlements/entitlementService';
import type { DurableStore, DurableTradingLedger } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { getOrCreateTradingLedger } from './ledgerCapital';

const r2 = (n: number) => Math.round(n * 100) / 100;

export function migrateClientPortfolioOnce(params: {
  userId: string;
  clientState: Record<string, unknown> | null | undefined;
  store?: DurableStore;
  now?: number;
}): { migrated: boolean; ledger: DurableTradingLedger } {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const state = store.getState();

  if (state.tradingLedgers[params.userId]) {
    return { migrated: false, ledger: getOrCreateTradingLedger(params.userId, store, now) };
  }

  const ledger = getOrCreateTradingLedger(params.userId, store, now);
  if (!params.clientState || typeof params.clientState !== 'object') {
    return { migrated: false, ledger };
  }

  const user = state.users[params.userId];
  const { plan } = resolveAuthoritativeUserTier(user, now);
  const normalized = migrateLegacyPaperState(params.clientState, now);

  const rawTxs = Array.isArray(params.clientState.walletTransactions)
    ? (params.clientState.walletTransactions as WalletTransaction[])
    : [];
  const verifiedTopUpTxs = rawTxs.filter(
    (tx) => tx && tx.type === 'DEPOSIT' && typeof tx.description === 'string' && tx.description.includes('Top-Up') && !tx.description.includes('pay_demo_')
  );
  const inferredTopUpCredit = verifiedTopUpTxs.reduce(
    (sum, tx) => sum + (typeof tx.amount === 'number' && tx.amount > 0 ? tx.amount : 0),
    0
  );
  const effectiveTopUpCredit = Math.max(ledger.paidTopUpCredit, inferredTopUpCredit);
  const maxAllowedCash = plan.maxWalletLimit + effectiveTopUpCredit;

  if (typeof normalized.balance === 'number' && Number.isFinite(normalized.balance) && normalized.balance >= 0) {
    ledger.balance = r2(Math.min(maxAllowedCash, normalized.balance));
  }
  if (typeof params.clientState.initialBalance === 'number' && Number.isFinite(params.clientState.initialBalance) && params.clientState.initialBalance > 0) {
    ledger.initialBalance = r2(Math.min(maxAllowedCash, params.clientState.initialBalance));
  }
  ledger.paidTopUpCredit = effectiveTopUpCredit;
  if (user) user.paidTopUpCredit = Math.max(user.paidTopUpCredit || 0, effectiveTopUpCredit);
  if (Array.isArray(normalized.holdings)) ledger.holdings = normalized.holdings;
  if (Array.isArray(normalized.positions)) ledger.positions = normalized.positions;
  if (Array.isArray(normalized.orders)) ledger.orders = normalized.orders.slice(0, 200);
  if (Array.isArray(normalized.executedOrderKeys)) ledger.executedOrderKeys = normalized.executedOrderKeys.slice(-300);
  if (rawTxs.length > 0) ledger.walletTransactions = rawTxs.slice(0, 200);
  ledger.version += 1;
  ledger.updatedAt = now;

  store.appendAudit({
    userId: params.userId,
    category: 'TRADING_LEDGER',
    action: 'LEGACY_PORTFOLIO_MIGRATED_ONCE',
    details: { balance: ledger.balance, paidTopUpCredit: ledger.paidTopUpCredit },
    timestamp: now,
  });
  store.persist();
  return { migrated: true, ledger };
}

export async function submitAuthoritativeOrder(params: {
  userId: string;
  orderInput: PlaceOrderInput;
  idempotencyKey?: string;
  quoteResolver: (symbol: string, now: number) => Promise<Stock | null>;
  store?: DurableStore;
  calendar?: MarketCalendarConfig;
  now?: number;
  paperTradingEnabled?: boolean;
}): Promise<{
  status: number;
  success: boolean;
  message: string;
  code?: string;
  requiredTier?: SubscriptionTier;
  order?: OrderBookState['orders'][number];
  ledger?: DurableTradingLedger;
  toast?: { title: string; description: string; type: 'success' | 'error' | 'info' };
}> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();

  if (params.paperTradingEnabled === false || process.env.ENABLE_LIVE_PAPER_TRADING === 'false') {
    return { status: 503, success: false, code: 'PAPER_TRADING_DISABLED', message: 'Current-market paper trading is disabled by server configuration.' };
  }

  const input = params.orderInput;
  if (!input || typeof input.symbol !== 'string' || !input.symbol.trim()) {
    return { status: 400, success: false, message: 'Valid stock symbol is required.' };
  }

  const symbol = input.symbol.trim().toUpperCase();
  const marketStatus = getIndianMarketStatus(now, params.calendar);
  const user = store.getState().users[params.userId];
  const entitlement = validateTradingOrderEntitlement({
    user,
    product: input.product,
    orderType: input.orderType,
    isMarketOpen: marketStatus.isOpen,
    now,
  });
  if (!entitlement.allowed) {
    return { status: entitlement.status, success: false, code: entitlement.code, requiredTier: entitlement.requiredTier, message: entitlement.message };
  }

  const quote = await params.quoteResolver(symbol, now);
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
    return { status: 503, success: false, code: 'QUOTE_UNAVAILABLE', message: `Authentic market quote for ${symbol} is currently unavailable. Order execution is blocked until a valid quote feed is available.` };
  }

  return store.withLock(`user:${params.userId}`, () => {
    const ledger = getOrCreateTradingLedger(params.userId, store, now);
    if (params.idempotencyKey && ledger.executedOrderKeys.includes(params.idempotencyKey)) {
      const existingOrder = ledger.orders.find((o) => o.idempotencyKey === params.idempotencyKey);
      return { status: 200, success: true, message: 'Order already processed (idempotent).', order: existingOrder, ledger };
    }

    const prevOrderCount = ledger.orders.length;
    const result = submitOrder(
      { balance: ledger.balance, holdings: ledger.holdings, positions: ledger.positions, orders: ledger.orders, executedOrderKeys: ledger.executedOrderKeys },
      { ...input, symbol, stockName: quote.name || input.stockName || symbol },
      { stock: quote, now, marketStatus, calendar: params.calendar, idempotencyKey: params.idempotencyKey }
    );

    ledger.balance = result.state.balance;
    ledger.holdings = result.state.holdings;
    ledger.positions = result.state.positions;
    ledger.orders = result.state.orders;
    ledger.executedOrderKeys = result.state.executedOrderKeys || [];
    ledger.version += 1;
    ledger.updatedAt = now;

    if (result.success && result.order && result.order.status === 'EXECUTED') {
      ledger.executions.unshift({
        executionId: `EXE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        orderId: result.order.id, userId: params.userId, symbol: result.order.symbol,
        action: result.order.action, product: result.order.product,
        quantity: result.order.filledQuantity ?? result.order.quantity,
        fillPrice: result.order.executionPrice ?? result.order.price,
        charges: result.order.charges ?? 0, realizedPnl: result.order.realizedPnl, timestamp: now,
      });
    }

    if (result.state.orders.length > prevOrderCount) {
      store.appendAudit({
        userId: params.userId,
        category: 'TRADING_LEDGER',
        action: result.success ? `ORDER_${result.order?.status || 'SUBMITTED'}` : 'ORDER_REJECTED',
        details: {
          orderId: result.order?.id, symbol, action: input.action, product: input.product,
          orderType: input.orderType, quantity: input.quantity, executionPrice: result.order?.executionPrice, balanceAfter: ledger.balance,
        },
        timestamp: now,
      });
    }

    return { status: result.success ? 200 : 400, success: result.success, message: result.message, order: result.order, ledger, toast: result.toast };
  });
}

export async function cancelAuthoritativeOrder(params: {
  userId: string;
  orderId: string;
  store?: DurableStore;
  now?: number;
}): Promise<{
  status: number;
  success: boolean;
  cancelled: boolean;
  message: string;
  order?: OrderBookState['orders'][number];
  ledger: DurableTradingLedger;
  toast?: { title: string; description: string; type: 'success' | 'error' | 'info' };
}> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();

  return store.withLock(`user:${params.userId}`, () => {
    const ledger = getOrCreateTradingLedger(params.userId, store, now);
    const res = cancelOrder(
      { balance: ledger.balance, holdings: ledger.holdings, positions: ledger.positions, orders: ledger.orders, executedOrderKeys: ledger.executedOrderKeys },
      params.orderId,
      now
    );
    if (res.cancelled) {
      ledger.balance = res.state.balance;
      ledger.orders = res.state.orders;
      ledger.version += 1;
      ledger.updatedAt = now;
      store.appendAudit({
        userId: params.userId, category: 'TRADING_LEDGER', action: 'ORDER_CANCELLED',
        details: { orderId: params.orderId, balanceAfter: ledger.balance }, timestamp: now,
      });
    }
    return {
      status: res.cancelled ? 200 : 400, success: res.cancelled, cancelled: res.cancelled,
      message: res.cancelled ? 'Order cancelled and reserved funds released.' : 'Order cannot be cancelled.',
      order: res.order, ledger, toast: res.toast,
    };
  });
}
