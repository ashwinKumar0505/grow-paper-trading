import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { resolveRazorpayCredentials } from './razorpayConfig';

export interface CancelSubscriptionResult {
  status: number;
  success: boolean;
  cancelled: boolean;
  mode?: 'razorpay_api' | 'local';
  subscriptionId?: string;
  subscriptionStatus?: string;
  currentEndMs?: number;
  endedAtMs?: number;
  code?: string;
  message?: string;
}

function isAlreadyCancelledError(status: number, bodyText: string): boolean {
  if (status !== 400) return false;
  return /already\s+cancel/i.test(bodyText);
}

/**
 * Cancels a user's active subscription fail-closed: for real Razorpay subscriptions (`sub_*`),
 * the upstream Razorpay API must succeed (or confirm the subscription is already cancelled)
 * before local state is marked cancelled.
 */
export async function cancelUserSubscription(params: {
  userId: string;
  requestedSubscriptionId?: string;
  store?: DurableStore;
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  now?: number;
}): Promise<CancelSubscriptionResult> {
  const store = params.store ?? defaultStore;
  const env = params.env ?? process.env;
  const fetchFn = params.fetchFn ?? fetch;
  const now = params.now ?? Date.now();
  const user = store.getState().users[params.userId];

  const requested = (params.requestedSubscriptionId || '').trim();
  const subscriptionId = requested || user?.razorpaySubscriptionId || '';

  if (user?.razorpaySubscriptionId && subscriptionId && subscriptionId !== user.razorpaySubscriptionId) {
    return {
      status: 403,
      success: false,
      cancelled: false,
      code: 'SUBSCRIPTION_OWNERSHIP_MISMATCH',
      message: 'Cannot cancel a subscription belonging to another user.',
    };
  }

  let currentEndMs: number | undefined = user?.subscriptionExpiresAt ?? undefined;
  let endedAtMs: number | undefined;
  let mode: 'razorpay_api' | 'local' = 'local';

  if (subscriptionId.startsWith('sub_')) {
    const credsRes = resolveRazorpayCredentials(env);
    if (!credsRes.ok) {
      return {
        status: credsRes.status,
        success: false,
        cancelled: false,
        code: credsRes.code,
        message: credsRes.message,
      };
    }

    const authHeader = Buffer.from(`${credsRes.creds.keyId}:${credsRes.creds.keySecret}`).toString('base64');
    let rzpRes: Response;
    try {
      rzpRes = await fetchFn(
        `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authHeader}` },
          body: JSON.stringify({ cancel_at_cycle_end: 1 }),
        }
      );
    } catch {
      return {
        status: 502,
        success: false,
        cancelled: false,
        code: 'RAZORPAY_CANCEL_UNREACHABLE',
        message:
          'Unable to reach Razorpay to cancel your subscription. Your billing mandate was not changed; please try again.',
      };
    }

    if (rzpRes.ok) {
      const subData = (await rzpRes.json()) as Record<string, unknown>;
      mode = 'razorpay_api';
      if (typeof subData.current_end === 'number') currentEndMs = subData.current_end * 1000;
      if (typeof subData.ended_at === 'number') endedAtMs = subData.ended_at * 1000;
    } else {
      const errText = await rzpRes.text().catch(() => '');
      if (!isAlreadyCancelledError(rzpRes.status, errText)) {
        return {
          status: 502,
          success: false,
          cancelled: false,
          code: 'RAZORPAY_CANCEL_FAILED',
          message:
            'Razorpay could not cancel your subscription right now. Your billing mandate is unchanged; please try again or contact support.',
        };
      }
      mode = 'razorpay_api';
    }
  }

  return store.withLock(`user:${params.userId}`, () => {
    const lockedUser = store.getState().users[params.userId];
    if (lockedUser) {
      lockedUser.subscriptionStatus = 'cancelled';
      lockedUser.subscriptionAutoPay = false;
      if (currentEndMs) lockedUser.subscriptionExpiresAt = currentEndMs;
      lockedUser.subscriptionUpdatedAt = now;
      lockedUser.updatedAt = now;
      store.appendAudit({
        userId: lockedUser.uid,
        category: 'SUBSCRIPTION',
        action: 'SUBSCRIPTION_CANCELLED_BY_USER',
        details: { subscriptionId, currentEndMs, mode },
        timestamp: now,
      });
    }

    return {
      status: 200,
      success: true,
      cancelled: true,
      mode,
      subscriptionId,
      subscriptionStatus: 'cancelled',
      currentEndMs,
      endedAtMs,
    };
  });
}
