import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import {
  consumeAuthoritativeQuota,
  issueScreenerServiceToken,
  resolveAuthoritativeUserTier,
  validateQuizEntitlement,
  validateScreenerEntitlement,
  validateTradingOrderEntitlement,
} from '../server/entitlements/entitlementService';
import { processRazorpayWebhook } from '../server/payments/razorpayService';
import { DurableStore } from '../server/storage/durableStore';

const TEST_ENV = {
  NODE_ENV: 'development',
  RAZORPAY_KEY_ID: 'rzp_test_ValidTestKey123',
  RAZORPAY_KEY_SECRET: 'test_razorpay_secret_key_for_unit_tests',
  RAZORPAY_WEBHOOK_SECRET: 'test_razorpay_webhook_secret_unit_tests',
};

function signWebhookPayload(rawBody: Buffer, secret = TEST_ENV.RAZORPAY_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

test('Razorpay webhook reconciliation verifies raw-body signature, deduplicates events, ignores out-of-order events, and revokes on refund', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;

  const user = resolveOrCreateCanonicalUser(
    { email: 'webhook.user@example.com', name: 'Webhook User', authProvider: 'email' },
    store,
    now
  );
  user.razorpaySubscriptionId = 'sub_wh_001';

  const rawInvalid = Buffer.from(JSON.stringify({ event: 'subscription.activated' }), 'utf8');
  const rejected = await processRazorpayWebhook({
    rawBody: rawInvalid, signature: 'invalid_signature',
    payload: { event: 'subscription.activated' }, store, env: TEST_ENV, now,
  });
  assert.equal(rejected.status, 400);

  const activatedPayload = {
    event: 'subscription.activated',
    created_at: 2000,
    payload: {
      subscription: {
        entity: {
          id: 'sub_wh_001',
          current_end: Math.floor((now + 30 * 86_400_000) / 1000),
          notes: { userId: user.uid, tier: 'advanced' },
        },
      },
    },
  };
  const rawActivated = Buffer.from(JSON.stringify(activatedPayload), 'utf8');
  const sigActivated = signWebhookPayload(rawActivated);

  const firstWh = await processRazorpayWebhook({
    rawBody: rawActivated, signature: sigActivated, eventIdHeader: 'evt_activated_001',
    payload: activatedPayload, store, env: TEST_ENV, now,
  });
  assert.equal(firstWh.status, 200);
  assert.equal(store.getState().users[user.uid].subscriptionTier, 'advanced');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');

  const duplicateWh = await processRazorpayWebhook({
    rawBody: rawActivated, signature: sigActivated, eventIdHeader: 'evt_activated_001',
    payload: activatedPayload, store, env: TEST_ENV, now: now + 1000,
  });
  assert.equal(duplicateWh.status, 200);
  assert.equal(duplicateWh.duplicate, true);

  const olderPendingPayload = {
    event: 'subscription.pending',
    created_at: 1500,
    payload: { subscription: { entity: { id: 'sub_wh_001', notes: { userId: user.uid } } } },
  };
  const rawOlder = Buffer.from(JSON.stringify(olderPendingPayload), 'utf8');
  const olderWh = await processRazorpayWebhook({
    rawBody: rawOlder, signature: signWebhookPayload(rawOlder), eventIdHeader: 'evt_older_pending_001',
    payload: olderPendingPayload, store, env: TEST_ENV, now: now + 2000,
  });
  assert.equal(olderWh.status, 200);
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');
  assert.equal(store.getState().users[user.uid].subscriptionTier, 'advanced');

  const haltedPayload = {
    event: 'subscription.halted',
    created_at: 2500,
    payload: { subscription: { entity: { id: 'sub_wh_001', notes: { userId: user.uid } } } },
  };
  const rawHalted = Buffer.from(JSON.stringify(haltedPayload), 'utf8');
  await processRazorpayWebhook({
    rawBody: rawHalted, signature: signWebhookPayload(rawHalted), eventIdHeader: 'evt_halted_001',
    payload: haltedPayload, store, env: TEST_ENV, now: now + 3000,
  });
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'halted');

  const subCaptureId = 'sub_capture_wh_1';
  store.getState().paymentIntents[subCaptureId] = {
    intentId: subCaptureId, userId: user.uid, userEmail: user.email,
    tier: 'beginner', billingCycle: 'monthly', paymentType: 'subscription',
    expectedAmountPaise: 29900, fullPriceINR: 299, creditAppliedINR: 0,
    currency: 'INR', status: 'created', createdAt: now,
  };
  const capturePayload = {
    event: 'payment.captured',
    created_at: 3000,
    payload: { payment: { entity: { id: 'pay_sub_wh_1', subscription_id: subCaptureId } } },
  };
  const rawCapture = Buffer.from(JSON.stringify(capturePayload), 'utf8');
  await processRazorpayWebhook({
    rawBody: rawCapture, signature: signWebhookPayload(rawCapture), eventIdHeader: 'evt_capture_sub_1',
    payload: capturePayload, store, env: TEST_ENV, now: now + 4000,
  });
  assert.equal(store.getState().users[user.uid].subscriptionTier, 'beginner');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');

  const refundPayload = {
    event: 'refund.processed',
    created_at: 3500,
    payload: { refund: { entity: { id: 'rfnd_sub_1', payment_id: 'pay_sub_wh_1' } } },
  };
  const rawRefund = Buffer.from(JSON.stringify(refundPayload), 'utf8');
  await processRazorpayWebhook({
    rawBody: rawRefund, signature: signWebhookPayload(rawRefund), eventIdHeader: 'evt_refund_sub_1',
    payload: refundPayload, store, env: TEST_ENV, now: now + 5000,
  });
  assert.equal(store.getState().users[user.uid].subscriptionTier, 'free');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'expired');
});

test('backend subscription entitlement enforcement gates orders, screeners, quotas, quiz modes, and signs Python service tokens', () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;

  const freeUser = resolveOrCreateCanonicalUser({ email: 'free@example.com', name: 'Free', authProvider: 'email' }, store, now);
  const beginnerUser = resolveOrCreateCanonicalUser({ email: 'beginner@example.com', name: 'Beginner', authProvider: 'email' }, store, now);
  beginnerUser.subscriptionTier = 'beginner';
  beginnerUser.subscriptionStatus = 'active';
  beginnerUser.subscriptionExpiresAt = now + 86_400_000;

  const advancedUser = resolveOrCreateCanonicalUser({ email: 'advanced@example.com', name: 'Advanced', authProvider: 'email' }, store, now);
  advancedUser.subscriptionTier = 'advanced';
  advancedUser.subscriptionStatus = 'active';
  advancedUser.subscriptionExpiresAt = now + 86_400_000;

  assert.equal(validateTradingOrderEntitlement({ user: freeUser, product: 'DELIVERY', orderType: 'MARKET', isMarketOpen: true, now }).allowed, true);
  assert.equal(validateTradingOrderEntitlement({ user: freeUser, product: 'INTRADAY', orderType: 'MARKET', isMarketOpen: true, now }).allowed, false);
  assert.equal(validateTradingOrderEntitlement({ user: freeUser, product: 'DELIVERY', orderType: 'LIMIT', isMarketOpen: true, now }).allowed, false);
  assert.equal(validateTradingOrderEntitlement({ user: beginnerUser, product: 'INTRADAY', orderType: 'LIMIT', isMarketOpen: true, now }).allowed, true);
  assert.equal(validateTradingOrderEntitlement({ user: beginnerUser, product: 'DELIVERY', orderType: 'SL', isMarketOpen: true, now }).allowed, false);
  assert.equal(validateTradingOrderEntitlement({ user: beginnerUser, product: 'DELIVERY', orderType: 'MARKET', isMarketOpen: false, now }).allowed, false);
  assert.equal(validateTradingOrderEntitlement({ user: advancedUser, product: 'INTRADAY', orderType: 'SL', isMarketOpen: false, now }).allowed, true);

  assert.equal(validateScreenerEntitlement({ user: freeUser, scannerType: 'intraday', now }).allowed, false);
  assert.equal(validateScreenerEntitlement({ user: beginnerUser, scannerType: 'swing', forceRefresh: true, now }).allowed, false);
  const advSwing = validateScreenerEntitlement({ user: advancedUser, scannerType: 'swing', forceRefresh: true, now });
  assert.equal(advSwing.allowed, true);
  if (advSwing.allowed) assert.equal(advSwing.maxSignals, 500);

  for (let i = 1; i <= 3; i++) {
    const q = consumeAuthoritativeQuota({ userId: freeUser.uid, quotaType: 'analysis', store, now });
    assert.equal(q.allowed, true);
    assert.equal(q.used, i);
  }
  const fourthAnalysis = consumeAuthoritativeQuota({ userId: freeUser.uid, quotaType: 'analysis', store, now });
  assert.equal(fourthAnalysis.allowed, false);
  assert.equal(fourthAnalysis.status, 403);

  assert.equal(validateQuizEntitlement({ user: freeUser, mode: 'survival', now }).allowed, false);
  assert.equal(validateQuizEntitlement({ user: beginnerUser, mode: 'survival', difficulty: 'Intermediate', now }).allowed, true);
  assert.equal(validateQuizEntitlement({ user: beginnerUser, requireHistoryDrawer: true, now }).allowed, false);
  assert.equal(validateQuizEntitlement({ user: advancedUser, mode: 'tournament', difficulty: 'All', requireHistoryDrawer: true, now }).allowed, true);

  const expiredcheck = resolveAuthoritativeUserTier(beginnerUser, now + 2 * 86_400_000);
  assert.equal(expiredcheck.tier, 'free');

  const serviceTok = issueScreenerServiceToken(beginnerUser, now);
  assert.ok(serviceTok.token.includes('.'));
  assert.equal(serviceTok.claims.tier, 'beginner');
  assert.equal(serviceTok.claims.analysisAllowFinancialsAndLevels, true);
  assert.equal(serviceTok.claims.analysisAllowAdvancedMode, false);
});
