import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import {
  cancelUserSubscription,
  computeAuthoritativePrice,
  resolveRazorpayCredentials,
  verifyAndActivatePayment,
} from '../server/payments/razorpayService';
import { DurableStore } from '../server/storage/durableStore';
import { getOrCreateTradingLedger } from '../server/trading/tradingLedger';

const TEST_ENV = {
  NODE_ENV: 'development',
  RAZORPAY_KEY_ID: 'rzp_test_ValidTestKey123',
  RAZORPAY_KEY_SECRET: 'test_razorpay_secret_key_for_unit_tests',
  RAZORPAY_WEBHOOK_SECRET: 'test_razorpay_webhook_secret_unit_tests',
};

function signOrderPayment(orderId: string, paymentId: string, secret = TEST_ENV.RAZORPAY_KEY_SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

test('Razorpay credential guard rejects missing keys, demo keys, and test/live environment mismatches', () => {
  const missing = resolveRazorpayCredentials({});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 503);

  const demo = resolveRazorpayCredentials({ RAZORPAY_KEY_ID: 'rzp_test_TradediaDemoKey', RAZORPAY_KEY_SECRET: 'any_secret' });
  assert.equal(demo.ok, false);
  const legacyDemo = resolveRazorpayCredentials({ RAZORPAY_KEY_ID: 'rzp_test_NiftyLensDemoKey', RAZORPAY_KEY_SECRET: 'any_secret' });
  assert.equal(legacyDemo.ok, false);

  const testInProd = resolveRazorpayCredentials({ NODE_ENV: 'production', RAZORPAY_KEY_ID: 'rzp_test_Key123', RAZORPAY_KEY_SECRET: 'prod_secret' });
  assert.equal(testInProd.ok, false);
  if (!testInProd.ok) assert.equal(testInProd.code, 'TEST_KEY_IN_PRODUCTION_FORBIDDEN');

  const liveInDev = resolveRazorpayCredentials({ NODE_ENV: 'development', RAZORPAY_KEY_ID: 'rzp_live_Key123', RAZORPAY_KEY_SECRET: 'live_secret' });
  assert.equal(liveInDev.ok, false);
  if (!liveInDev.ok) assert.equal(liveInDev.code, 'LIVE_KEY_IN_NON_PROD_FORBIDDEN');

  assert.equal(resolveRazorpayCredentials(TEST_ENV).ok, true);
});

test('Razorpay payment verification rejects demo IDs, invalid HMAC signatures, wrong amounts, cross-account hijack, and enforces idempotency', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;
  const alice = resolveOrCreateCanonicalUser({ email: 'alice@example.com', name: 'Alice', authProvider: 'email' }, store, now);
  const bob = resolveOrCreateCanonicalUser({ email: 'bob@example.com', name: 'Bob', authProvider: 'email' }, store, now);

  const demoAttempt = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: 'order_demo_12345',
    razorpayPaymentId: 'pay_demo_12345', razorpaySignature: 'demo_verified_signature', store, env: TEST_ENV, now,
  });
  assert.equal(demoAttempt.status, 400);
  assert.equal(demoAttempt.verified, false);

  const orderId = 'order_real_beginner_001';
  store.getState().paymentIntents[orderId] = {
    intentId: orderId, userId: alice.uid, userEmail: alice.email,
    tier: 'beginner', billingCycle: 'monthly', paymentType: 'order',
    expectedAmountPaise: 29900, fullPriceINR: 299, creditAppliedINR: 0,
    currency: 'INR', status: 'created', createdAt: now,
  };

  const badSig = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: orderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: '0'.repeat(64), store, env: TEST_ENV, now,
  });
  assert.equal(badSig.status, 400);
  assert.equal(badSig.verified, false);

  const validSig = signOrderPayment(orderId, 'pay_real_001');
  const hijackAttempt = await verifyAndActivatePayment({
    authenticatedUserId: bob.uid, razorpayOrderId: orderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: validSig, store, env: TEST_ENV, now,
  });
  assert.equal(hijackAttempt.status, 403);
  assert.equal(hijackAttempt.verified, false);
  assert.equal(store.getState().users[bob.uid].subscriptionTier, 'free');

  const wrongAmount = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: orderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: validSig, reportedAmountPaise: 5000, store, env: TEST_ENV, now,
  });
  assert.equal(wrongAmount.status, 400);
  assert.equal(wrongAmount.verified, false);

  const validVerify = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: orderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: validSig, reportedAmountPaise: 29900, reportedCurrency: 'INR', store, env: TEST_ENV, now,
  });
  assert.equal(validVerify.status, 200);
  assert.equal(validVerify.verified, true);
  assert.equal(store.getState().users[alice.uid].subscriptionTier, 'beginner');
  assert.equal(getOrCreateTradingLedger(alice.uid, store, now).balance, 1_000_000);

  const replaySame = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: orderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: validSig, store, env: TEST_ENV, now: now + 1000,
  });
  assert.equal(replaySame.status, 200);
  assert.equal(replaySame.idempotentReplay, true);
  assert.equal(store.getState().billingHistory[alice.uid].length, 1);

  const secondOrderId = 'order_real_advanced_002';
  store.getState().paymentIntents[secondOrderId] = {
    intentId: secondOrderId, userId: alice.uid, userEmail: alice.email,
    tier: 'advanced', billingCycle: 'monthly', paymentType: 'order',
    expectedAmountPaise: 69900, fullPriceINR: 699, creditAppliedINR: 0,
    currency: 'INR', status: 'created', createdAt: now,
  };
  const reusedAttempt = await verifyAndActivatePayment({
    authenticatedUserId: alice.uid, razorpayOrderId: secondOrderId, razorpayPaymentId: 'pay_real_001',
    razorpaySignature: signOrderPayment(secondOrderId, 'pay_real_001'), store, env: TEST_ENV, now: now + 2000,
  });
  assert.equal(reusedAttempt.status, 409);
  assert.equal(reusedAttempt.verified, false);
});

test('Beginner-to-Advanced upgrade computes flat tier differential and cancels superseded subscription', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;

  const user = resolveOrCreateCanonicalUser({ email: 'upgrader@example.com', name: 'Upgrader', authProvider: 'email' }, store, now);
  user.subscriptionTier = 'beginner';
  user.subscriptionBillingCycle = 'monthly';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = now + 20 * 86_400_000;
  user.razorpaySubscriptionId = 'sub_old_beginner_111';

  const quote = computeAuthoritativePrice({ targetTier: 'advanced', billingCycle: 'monthly', userAccount: user, now });
  assert.equal(quote.isDifferentialUpgrade, true);
  assert.equal(quote.fullPriceINR, 699);
  assert.equal(quote.creditAppliedINR, 299);
  assert.equal(quote.payableINR, 400);
  assert.equal(quote.amountInPaise, 40000);
  assert.equal(quote.previousSubscriptionId, 'sub_old_beginner_111');

  const upgradeOrderId = 'order_upgrade_adv_001';
  store.getState().paymentIntents[upgradeOrderId] = {
    intentId: upgradeOrderId, userId: user.uid, userEmail: user.email,
    tier: 'advanced', billingCycle: 'monthly', paymentType: 'order',
    expectedAmountPaise: quote.amountInPaise, fullPriceINR: quote.fullPriceINR,
    creditAppliedINR: quote.creditAppliedINR, currency: 'INR',
    status: 'created', previousSubscriptionId: quote.previousSubscriptionId, createdAt: now,
  };

  const cancelledSubs: string[] = [];
  const res = await verifyAndActivatePayment({
    authenticatedUserId: user.uid, razorpayOrderId: upgradeOrderId, razorpayPaymentId: 'pay_upgrade_001',
    razorpaySignature: signOrderPayment(upgradeOrderId, 'pay_upgrade_001'),
    store, env: TEST_ENV, now,
    cancelUpstreamSubscriptionFn: async (subId) => { cancelledSubs.push(subId); },
  });

  assert.equal(res.status, 200);
  assert.equal(res.verified, true);
  assert.deepEqual(cancelledSubs, ['sub_old_beginner_111']);
  assert.equal(store.getState().users[user.uid].subscriptionTier, 'advanced');
  assert.equal(getOrCreateTradingLedger(user.uid, store, now).balance, 5_000_000);
});

test('Razorpay subscription cancellation fails closed on gateway errors and succeeds on confirmation or already-cancelled', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;
  const user = resolveOrCreateCanonicalUser(
    { email: 'canceller@example.com', name: 'Canceller', authProvider: 'email' },
    store,
    now
  );
  user.subscriptionTier = 'beginner';
  user.subscriptionBillingCycle = 'monthly';
  user.subscriptionStatus = 'active';
  user.subscriptionAutoPay = true;
  user.subscriptionExpiresAt = now + 15 * 86_400_000;
  user.razorpaySubscriptionId = 'sub_live_cancel_001';

  const noCreds = await cancelUserSubscription({ userId: user.uid, store, env: {}, now });
  assert.equal(noCreds.status, 503);
  assert.equal(noCreds.cancelled, false);
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');
  assert.equal(store.getState().users[user.uid].subscriptionAutoPay, true);

  const upstream500 = await cancelUserSubscription({
    userId: user.uid,
    store,
    env: TEST_ENV,
    now,
    fetchFn: async () => new Response('{"error":{"description":"Gateway timeout"}}', { status: 500 }),
  });
  assert.equal(upstream500.status, 502);
  assert.equal(upstream500.cancelled, false);
  assert.equal(upstream500.code, 'RAZORPAY_CANCEL_FAILED');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');
  assert.equal(store.getState().users[user.uid].subscriptionAutoPay, true);

  const networkFail = await cancelUserSubscription({
    userId: user.uid,
    store,
    env: TEST_ENV,
    now,
    fetchFn: async () => {
      throw new Error('ECONNRESET');
    },
  });
  assert.equal(networkFail.status, 502);
  assert.equal(networkFail.code, 'RAZORPAY_CANCEL_UNREACHABLE');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'active');

  const cycleEndSec = Math.floor((now + 20 * 86_400_000) / 1000);
  const confirmed = await cancelUserSubscription({
    userId: user.uid,
    store,
    env: TEST_ENV,
    now,
    fetchFn: async () =>
      new Response(JSON.stringify({ id: 'sub_live_cancel_001', status: 'cancelled', current_end: cycleEndSec }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.cancelled, true);
  assert.equal(confirmed.mode, 'razorpay_api');
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'cancelled');
  assert.equal(store.getState().users[user.uid].subscriptionAutoPay, false);
  assert.equal(store.getState().users[user.uid].subscriptionExpiresAt, cycleEndSec * 1000);

  user.subscriptionStatus = 'active';
  user.subscriptionAutoPay = true;
  const alreadyCancelled = await cancelUserSubscription({
    userId: user.uid,
    store,
    env: TEST_ENV,
    now: now + 1000,
    fetchFn: async () =>
      new Response(JSON.stringify({ error: { description: 'Subscription is already cancelled' } }), { status: 400 }),
  });
  assert.equal(alreadyCancelled.status, 200);
  assert.equal(alreadyCancelled.cancelled, true);
  assert.equal(store.getState().users[user.uid].subscriptionStatus, 'cancelled');
});
