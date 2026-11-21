import { SUBSCRIPTION_PLANS, type BillingCycle, type SubscriptionTier } from '../../lib/subscription';
import type { DurablePaymentIntent, DurableStore, DurableUserAccount } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { creditLedgerOnPlanUpgrade } from '../trading/tradingLedger';
import { resolveRazorpayCredentials, verifyHmacSignature } from './razorpayConfig';

function buildReplayResponse(
  intent: DurablePaymentIntent,
  userAcc: DurableUserAccount | undefined,
  intentId: string,
  subId: string,
  paymentId: string,
  isSubscription: boolean,
  now: number
) {
  return {
    status: 200,
    success: true,
    verified: true,
    idempotentReplay: true,
    subscription: {
      userId: intent.userId,
      tier: intent.tier,
      billingCycle: intent.billingCycle,
      status: userAcc?.subscriptionStatus || 'active',
      razorpayOrderId: intentId,
      razorpaySubscriptionId: isSubscription ? subId : undefined,
      razorpayPaymentId: paymentId,
      activatedAt: intent.verifiedAt || now,
      expiresAt: userAcc?.subscriptionExpiresAt ?? null,
    },
  };
}

export async function verifyAndActivatePayment(params: {
  authenticatedUserId: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  reportedAmountPaise?: number;
  reportedCurrency?: string;
  store?: DurableStore;
  env?: Record<string, string | undefined>;
  now?: number;
  cancelUpstreamSubscriptionFn?: (subId: string) => Promise<void>;
}): Promise<{
  status: number;
  success: boolean;
  verified: boolean;
  idempotentReplay?: boolean;
  message?: string;
  subscription?: Record<string, unknown>;
}> {
  const now = params.now ?? Date.now();
  const store = params.store ?? defaultStore;
  const env = params.env ?? process.env;
  const orderId = (params.razorpayOrderId || '').trim();
  const subId = (params.razorpaySubscriptionId || '').trim();
  const paymentId = (params.razorpayPaymentId || '').trim();
  const signature = (params.razorpaySignature || '').trim();

  if (
    orderId.startsWith('order_demo_') ||
    subId.startsWith('sub_demo_') ||
    paymentId.startsWith('pay_demo_') ||
    signature.startsWith('sig_pay_demo_') ||
    signature === 'demo_verified_signature'
  ) {
    return { status: 400, success: false, verified: false, message: 'Demo or synthetic payment identifiers are not accepted.' };
  }

  const credsRes = resolveRazorpayCredentials(env);
  if (!credsRes.ok) return { status: credsRes.status, success: false, verified: false, message: credsRes.message };

  const isSubscription = Boolean(subId);
  const intentId = isSubscription ? subId : orderId;
  if (!intentId || !paymentId || !signature) {
    return { status: 400, success: false, verified: false, message: 'Missing required Razorpay verification parameters.' };
  }

  const signaturePayload = isSubscription ? `${paymentId}|${subId}` : `${orderId}|${paymentId}`;
  if (!verifyHmacSignature(signaturePayload, credsRes.creds.keySecret, signature)) {
    return { status: 400, success: false, verified: false, message: 'Invalid Razorpay payment signature.' };
  }

  return store.withLock(`user:${params.authenticatedUserId}`, async () => {
    const state = store.getState();
    const intent = state.paymentIntents[intentId];
    if (!intent) {
      return { status: 404, success: false, verified: false, message: 'Payment order or subscription was not created by this server.' };
    }
    if (intent.userId !== params.authenticatedUserId) {
      store.appendAudit({
        userId: params.authenticatedUserId,
        category: 'PAYMENT',
        action: 'CROSS_ACCOUNT_PAYMENT_BLOCKED',
        details: { intentId, ownerUserId: intent.userId, paymentId },
        timestamp: now,
      });
      return { status: 403, success: false, verified: false, message: 'This payment order belongs to a different account and cannot be applied.' };
    }
    if (typeof params.reportedAmountPaise === 'number' && params.reportedAmountPaise !== intent.expectedAmountPaise) {
      return { status: 400, success: false, verified: false, message: `Payment amount mismatch. Expected ${intent.expectedAmountPaise} paise, got ${params.reportedAmountPaise} paise.` };
    }
    if (params.reportedCurrency && params.reportedCurrency !== intent.currency) {
      return { status: 400, success: false, verified: false, message: `Payment currency mismatch. Expected ${intent.currency}.` };
    }

    const existingPaymentUse = state.processedPayments[paymentId];
    if (existingPaymentUse) {
      if (existingPaymentUse.intentId === intentId && existingPaymentUse.userId === intent.userId) {
        return buildReplayResponse(intent, state.users[intent.userId], intentId, subId, paymentId, isSubscription, now);
      }
      return { status: 409, success: false, verified: false, message: 'This payment ID has already been consumed by another transaction.' };
    }
    if (intent.status === 'verified') {
      return buildReplayResponse(intent, state.users[intent.userId], intentId, subId, intent.razorpayPaymentId || paymentId, isSubscription, now);
    }

    const userAcc = state.users[intent.userId];
    if (!userAcc) return { status: 404, success: false, verified: false, message: 'Authenticated user account record not found.' };

    intent.status = 'verified';
    intent.razorpayPaymentId = paymentId;
    intent.verifiedAt = now;
    state.processedPayments[paymentId] = { intentId, userId: intent.userId, verifiedAt: now };

    const durationMs = intent.billingCycle === 'yearly' ? 365 * 86_400_000 : 30 * 86_400_000;
    const expiresAt = now + durationMs;

    if (intent.previousSubscriptionId && intent.previousSubscriptionId !== subId) {
      if (params.cancelUpstreamSubscriptionFn) await params.cancelUpstreamSubscriptionFn(intent.previousSubscriptionId).catch(() => {});
      store.appendAudit({
        userId: intent.userId,
        category: 'SUBSCRIPTION',
        action: 'PREVIOUS_SUBSCRIPTION_SUPERSEDED',
        details: { previousSubscriptionId: intent.previousSubscriptionId, newIntentId: intentId },
        timestamp: now,
      });
    }
    userAcc.subscriptionTier = intent.tier as SubscriptionTier;
    userAcc.subscriptionBillingCycle = intent.billingCycle as BillingCycle;
    userAcc.subscriptionStatus = 'active';
    userAcc.subscriptionUpdatedAt = now;
    userAcc.subscriptionExpiresAt = expiresAt;
    userAcc.subscriptionAutoPay = isSubscription;
    userAcc.razorpayPaymentId = paymentId;
    userAcc.razorpayOrderId = intentId;
    userAcc.razorpaySubscriptionId = isSubscription ? subId : userAcc.razorpaySubscriptionId;
    userAcc.updatedAt = now;
    creditLedgerOnPlanUpgrade(intent.userId, intent.tier as SubscriptionTier, store, now);

    const planName = SUBSCRIPTION_PLANS[intent.tier].name;
    if (!state.billingHistory[intent.userId]) state.billingHistory[intent.userId] = [];
    state.billingHistory[intent.userId].unshift({
      id: paymentId, userId: intent.userId, paymentId, orderId: intentId,
      subscriptionId: isSubscription ? subId : null, planName, tier: intent.tier, billingCycle: intent.billingCycle,
      amountINR: intent.expectedAmountPaise / 100, currency: intent.currency, status: 'captured',
      createdAt: now, receiptUrl: null, description: `${planName} (${intent.billingCycle})`,
    });

    store.appendAudit({
      userId: intent.userId,
      category: 'PAYMENT',
      action: 'SUBSCRIPTION_VERIFIED',
      details: { intentId, paymentId, tier: intent.tier, billingCycle: intent.billingCycle, amountPaise: intent.expectedAmountPaise },
      timestamp: now,
    });

    return {
      status: 200,
      success: true,
      verified: true,
      subscription: {
        userId: intent.userId, tier: intent.tier, billingCycle: intent.billingCycle, status: 'active',
        razorpayOrderId: intentId, razorpaySubscriptionId: isSubscription ? subId : undefined,
        razorpayPaymentId: paymentId, activatedAt: now, expiresAt,
      },
    };
  });
}
