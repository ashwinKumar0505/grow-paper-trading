import { buildAuthenticatedHeaders, getActiveBearerToken, setStoredSessionToken } from '../../../lib/authSession';
import type { BillingCycle, SubscriptionTier } from '../../../lib/subscription';
import type {
  Holding, IntradayPosition, Order, PlaceOrderInput, WalletTransaction, Watchlist,
} from '../../../types/market';
import type { OrderBookState } from '../../../utils/orderEngine';

export interface ServerTradingLedgerState {
  balance: number;
  initialBalance?: number;
  paidTopUpCredit?: number;
  holdings: Holding[];
  positions: IntradayPosition[];
  orders: Order[];
  executedOrderKeys?: string[];
  walletTransactions?: WalletTransaction[];
  watchlists?: Watchlist[];
  updatedAt?: number;
}

export interface ServerUserAccount {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  authProvider?: 'google' | 'email';
  subscriptionTier?: SubscriptionTier;
  subscriptionBillingCycle?: BillingCycle;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'past_due' | 'halted';
  subscriptionUpdatedAt?: number;
  subscriptionExpiresAt?: number | null;
  subscriptionAutoPay?: boolean;
  subscriptionUpiMandateId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  paidTopUpCredit?: number;
  usageQuota?: unknown;
  createdAt?: number;
  updatedAt?: number;
}

export interface AuthoritativeAccountProfileResponse {
  user: ServerUserAccount;
  ledger: ServerTradingLedgerState;
}

export interface WalletMutationResult {
  ok: boolean;
  status: number;
  noAuth?: boolean;
  code?: string;
  requiredTier?: SubscriptionTier;
  message?: string;
  state?: ServerTradingLedgerState;
}

async function fetchWithAuthRetry(
  url: string,
  init: Omit<RequestInit, 'headers'>,
  explicitToken?: string
): Promise<Response | null> {
  const headers = await buildAuthenticatedHeaders({}, explicitToken);
  if (!headers.Authorization) return null;

  let res = await fetch(url, { ...init, headers });
  if (res.status === 401 && !explicitToken) {
    setStoredSessionToken(null);
    const freshToken = await getActiveBearerToken();
    if (freshToken) {
      res = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
      });
    }
  }
  return res;
}

export async function fetchAuthoritativeAccountProfile(
  explicitToken?: string
): Promise<AuthoritativeAccountProfileResponse | null> {
  try {
    const res = await fetchWithAuthRetry('/api/account/profile', { method: 'GET' }, explicitToken);
    if (!res || !res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      user?: ServerUserAccount;
      ledger?: ServerTradingLedgerState;
    };
    return data?.success && data.user && data.ledger ? { user: data.user, ledger: data.ledger } : null;
  } catch {
    return null;
  }
}

async function postWalletMutation(
  endpoint: string,
  body: Record<string, unknown>,
  fallbackError: string
): Promise<WalletMutationResult> {
  try {
    const res = await fetchWithAuthRetry(endpoint, { method: 'POST', body: JSON.stringify(body) });
    if (!res) {
      return {
        ok: false, status: 401, noAuth: true,
        message: 'Session token missing. Please sign in again to save wallet changes.',
      };
    }
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      code?: string;
      requiredTier?: SubscriptionTier;
      message?: string;
      state?: ServerTradingLedgerState;
    };
    return {
      ok: Boolean(res.ok && data.success && data.state),
      status: res.status,
      code: data.code,
      requiredTier: data.requiredTier,
      message: data.message || (!res.ok ? fallbackError : undefined),
      state: data.state,
    };
  } catch {
    return { ok: false, status: 0, message: fallbackError };
  }
}

export function postAuthoritativeWalletTopUp(params: {
  amount: number;
  description?: string;
}): Promise<WalletMutationResult> {
  return postWalletMutation(
    '/api/paper-trading/wallet/topup',
    { amount: params.amount, description: params.description },
    'Unable to reach server to top up your paper wallet. Please try again.'
  );
}

export function postAuthoritativeWalletReset(params: {
  startingCash?: number;
}): Promise<WalletMutationResult> {
  return postWalletMutation(
    '/api/paper-trading/wallet/reset',
    { startingCash: params.startingCash },
    'Unable to reach server to reset your paper portfolio. Please try again.'
  );
}

async function postOrderMutation(
  endpoint: string,
  body: Record<string, unknown>,
  commitEngine: (patch: Partial<OrderBookState>) => void
): Promise<void> {
  try {
    const res = await fetchWithAuthRetry(endpoint, { method: 'POST', body: JSON.stringify(body) });
    if (!res || !res.ok) return;
    const serverRes = (await res.json()) as { state?: ServerTradingLedgerState };
    if (serverRes?.state) {
      commitEngine({
        balance: serverRes.state.balance,
        holdings: serverRes.state.holdings,
        positions: serverRes.state.positions,
        orders: serverRes.state.orders,
        executedOrderKeys: serverRes.state.executedOrderKeys || [],
      });
    }
  } catch {
    // Ignore background order sync network error
  }
}

export function postAuthoritativeServerOrder(params: {
  order: PlaceOrderInput;
  idempotencyKey: string;
  commitEngine: (patch: Partial<OrderBookState>) => void;
}): Promise<void> {
  return postOrderMutation(
    '/api/paper-trading/orders',
    { order: params.order, idempotencyKey: params.idempotencyKey },
    params.commitEngine
  );
}

export function postAuthoritativeServerCancelOrder(params: {
  orderId: string;
  commitEngine: (patch: Partial<OrderBookState>) => void;
}): Promise<void> {
  return postOrderMutation(
    `/api/paper-trading/orders/${encodeURIComponent(params.orderId)}/cancel`,
    {},
    params.commitEngine
  );
}
