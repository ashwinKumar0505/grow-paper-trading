import crypto from 'crypto';
import type { BillingCycle, SubscriptionTier } from '../../lib/subscription';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { creditLedgerOnPlanUpgrade } from '../trading/tradingLedger';
import { verifyHmacSignature } from './razorpayConfig';

export async function processRazorpayWebhook(params: {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  eventIdHeader?: string;
  payload: Record<string, unknown>;
  store?: DurableStore;
  env?: Record<string, string | undefined>;
  now?: number;
}): Promise<{ status: number; received: boolean; duplicate?: boolean; event?: string; message?: string }> {
  const now = params.now ?? Date.now();
  const store = params.store ?? defaultStore;
  const env = params.env ?? process.env;
  const webhookSecret = (env.RAZORPAY_WEBHOOK_SECRET || '').trim();

  if (!webhookSecret) {
    return { status: 503, received: false, message: 'Webhook secret is not configured; unverifiable webhooks are rejected.' };
  }
  if (!params.rawBody || !params.signature) {
    return { status: 400, received: false, message: 'Missing webhook signature or raw request body.' };
  }
  if (!verifyHmacSignature(params.rawBody, webhookSecret, params.signature)) {
    return { status: 400, received: false, message: 'Invalid Razorpay webhook signature.' };
  }

  const event = typeof params.payload?.event === 'string' ? params.payload.event : '';
  if (!event) {
    return { status: 400, received: false, message: 'Missing webhook event type.' };
  }

  const payloadObj = (params.payload.payload || {}) as Record<string, { entity?: Record<string, unknown> }>;
  const subEntity = payloadObj.subscription?.entity;
  const payEntity = payloadObj.payment?.entity;
  const refundEntity = payloadObj.refund?.entity;

  const entityId = String(subEntity?.id || refundEntity?.id || payEntity?.id || 'unknown');
  const eventCreatedAt = typeof params.payload.created_at === 'number' ? params.payload.created_at * 1000 : now;
  const dedupKey =
    (params.eventIdHeader || '').trim() ||
    `wh_${event}_${entityId}_${params.payload.created_at || crypto.createHash('sha256').update(params.rawBody).digest('hex').slice(0, 16)}`;

  const state = store.getState();
  if (state.processedWebhooks[dedupKey]) {
    return { status: 200, received: true, duplicate: true, event };
  }

  const notes = ((subEntity?.notes || payEntity?.notes || {}) as Record<string, unknown>) || {};
  const subId = String(subEntity?.id || payEntity?.subscription_id || '');
  const orderId = String(payEntity?.order_id || '');
  const paymentId = String(payEntity?.id || refundEntity?.payment_id || '');

  const intent =
    (subId && state.paymentIntents[subId]) ||
    (orderId && state.paymentIntents[orderId]) ||
    (paymentId ? Object.values(state.paymentIntents).find((i) => i.razorpayPaymentId === paymentId) : undefined);

  const userId =
    intent?.userId ||
    (typeof notes.userId === 'string' && state.users[notes.userId] ? notes.userId : '') ||
    Object.values(state.users).find(
      (u) => (subId && u.razorpaySubscriptionId === subId) || (paymentId && u.razorpayPaymentId === paymentId)
    )?.uid ||
    '';

  state.processedWebhooks[dedupKey] = { event, processedAt: now };

  if (!userId || !state.users[userId]) {
    store.appendAudit({
      userId: userId || 'unmatched',
      category: 'WEBHOOK',
      action: `WEBHOOK_UNMATCHED_${event.toUpperCase()}`,
      details: { event, entityId, subId, orderId, paymentId },
      timestamp: now,
    });
    store.persist();
    return { status: 200, received: true, event };
  }

  return store.withLock(`user:${userId}`, () => {
    const user = state.users[userId];
    const isOlderSubscriptionEvent =
      user.lastSubscriptionEventTs !== undefined &&
      eventCreatedAt < user.lastSubscriptionEventTs &&
      event.startsWith('subscription.');

    if (!isOlderSubscriptionEvent && event.startsWith('subscription.')) {
      user.lastSubscriptionEventTs = eventCreatedAt;
    }

    const currentEndMs = typeof subEntity?.current_end === 'number' ? subEntity.current_end * 1000 : null;
    const targetTier =
      intent?.tier ||
      (notes.tier === 'advanced' ? 'advanced' : notes.tier === 'beginner' ? 'beginner' : user.subscriptionTier);

    if (event === 'payment.captured') {
      if (intent && intent.status !== 'verified' && paymentId && !state.processedPayments[paymentId]) {
        intent.status = 'verified';
        intent.razorpayPaymentId = paymentId;
        intent.verifiedAt = now;
        state.processedPayments[paymentId] = { intentId: intent.intentId, userId, verifiedAt: now };
        const cycleMs = intent.billingCycle === 'yearly' ? 365 * 86400000 : 30 * 86400000;
        user.subscriptionTier = intent.tier as SubscriptionTier;
        user.subscriptionBillingCycle = intent.billingCycle as BillingCycle;
        user.subscriptionStatus = 'active';
        user.subscriptionExpiresAt = currentEndMs || now + cycleMs;
        user.subscriptionUpdatedAt = now;
        user.razorpayPaymentId = paymentId;
        creditLedgerOnPlanUpgrade(userId, intent.tier as SubscriptionTier, store, now);
      }
    } else if (event === 'payment.failed') {
      if (intent && intent.status === 'created') intent.status = 'failed';
    } else if (event === 'subscription.activated' && !isOlderSubscriptionEvent) {
      if (targetTier === 'beginner' || targetTier === 'advanced') {
        user.subscriptionTier = targetTier;
        user.subscriptionStatus = 'active';
        user.subscriptionAutoPay = true;
        if (currentEndMs) user.subscriptionExpiresAt = currentEndMs;
        user.subscriptionUpdatedAt = now;
        creditLedgerOnPlanUpgrade(userId, targetTier, store, now);
      }
    } else if ((event === 'subscription.charged' || event === 'subscription.renewed') && !isOlderSubscriptionEvent) {
      if (targetTier === 'beginner' || targetTier === 'advanced') user.subscriptionTier = targetTier;
      user.subscriptionStatus = 'active';
      const fallbackCycleMs = user.subscriptionBillingCycle === 'yearly' ? 365 * 86400000 : 30 * 86400000;
      user.subscriptionExpiresAt = currentEndMs || Math.max(now, user.subscriptionExpiresAt || now) + fallbackCycleMs;
      user.subscriptionUpdatedAt = now;
      if (paymentId) user.razorpayPaymentId = paymentId;
    } else if ((event === 'subscription.pending' || event === 'subscription.halted') && !isOlderSubscriptionEvent) {
      user.subscriptionStatus = event === 'subscription.halted' ? 'halted' : 'past_due';
      user.subscriptionAutoPay = false;
      user.subscriptionUpdatedAt = now;
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < now) user.subscriptionTier = 'free';
    } else if (event === 'subscription.cancelled' && !isOlderSubscriptionEvent) {
      user.subscriptionStatus = 'cancelled';
      user.subscriptionAutoPay = false;
      if (currentEndMs) user.subscriptionExpiresAt = currentEndMs;
      user.subscriptionUpdatedAt = now;
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt <= now) {
        user.subscriptionTier = 'free';
        user.subscriptionBillingCycle = 'free';
        user.subscriptionStatus = 'expired';
      }
    } else if ((event === 'subscription.completed' || event === 'subscription.expired') && !isOlderSubscriptionEvent) {
      if (!currentEndMs || currentEndMs <= now) {
        user.subscriptionTier = 'free';
        user.subscriptionBillingCycle = 'free';
        user.subscriptionStatus = 'expired';
        user.subscriptionAutoPay = false;
      } else {
        user.subscriptionStatus = 'cancelled';
        user.subscriptionAutoPay = false;
        user.subscriptionExpiresAt = currentEndMs;
      }
      user.subscriptionUpdatedAt = now;
    } else if (event === 'refund.processed' || event === 'payment.refunded') {
      if (intent) intent.status = 'refunded';
      user.subscriptionTier = 'free';
      user.subscriptionBillingCycle = 'free';
      user.subscriptionStatus = 'expired';
      user.subscriptionAutoPay = false;
      user.subscriptionExpiresAt = now;
      user.subscriptionUpdatedAt = now;
    }

    user.updatedAt = now;
    store.appendAudit({
      userId,
      category: 'WEBHOOK',
      action: `WEBHOOK_${event.toUpperCase()}`,
      details: { dedupKey, entityId, subId, paymentId, ignoredOutOfOrder: isOlderSubscriptionEvent },
      timestamp: now,
    });

    return { status: 200, received: true, event };
  });
}
