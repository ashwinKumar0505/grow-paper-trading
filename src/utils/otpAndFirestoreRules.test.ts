import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  canonicalEmailUid,
  hashOtpCode,
  OTP_RATE_WINDOW_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  verifyOtpHash,
} from '../server/auth/authService';
import {
  createAndSendEmailOtp,
  resetOtpRateLimitsForTests,
  verifyEmailOtpAndCreateSession,
} from '../server/auth/otpService';
import { DurableStore } from '../server/storage/durableStore';

test('OTP hashing, 10-min expiry, max 5 attempts, 30s cooldown, rate limiting, and replay prevention', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  resetOtpRateLimitsForTests();
  const t0 = 1_750_000_000_000;
  const email = 'otp.user@example.com';

  const rawHash = hashOtpCode('123456', 'random_salt_1');
  assert.notEqual(rawHash, '123456');
  assert.equal(verifyOtpHash('123456', 'random_salt_1', rawHash), true);
  assert.equal(verifyOtpHash('654321', 'random_salt_1', rawHash), false);

  const send1 = await createAndSendEmailOtp({
    email, ipAddress: '198.51.100.10', now: t0, store, skipEmailDeliveryForTests: true,
  });
  assert.equal(send1.status, 200);
  assert.ok(send1.testOtpCode);
  const storedRecord = store.getState().otpRecords[email];
  assert.ok(storedRecord);
  assert.notEqual(storedRecord.codeHash, send1.testOtpCode);

  const cooldownBlocked = await createAndSendEmailOtp({
    email, ipAddress: '198.51.100.10', now: t0 + OTP_RESEND_COOLDOWN_MS - 1000, store, skipEmailDeliveryForTests: true,
  });
  assert.equal(cooldownBlocked.status, 429);

  for (let attempt = 1; attempt <= 4; attempt++) {
    const wrong = verifyEmailOtpAndCreateSession({ email, code: '000000', now: t0 + 1000, store });
    assert.equal(wrong.status, 400);
  }
  const fifthWrong = verifyEmailOtpAndCreateSession({ email, code: '000000', now: t0 + 2000, store });
  assert.equal(fifthWrong.status, 429);
  assert.equal(store.getState().otpRecords[email], undefined);

  const afterLockout = verifyEmailOtpAndCreateSession({
    email, code: send1.testOtpCode, now: t0 + 3000, store,
  });
  assert.equal(afterLockout.status, 400);

  const t1 = t0 + OTP_RESEND_COOLDOWN_MS + 1000;
  const send2 = await createAndSendEmailOtp({
    email, ipAddress: '198.51.100.10', now: t1, store, skipEmailDeliveryForTests: true,
  });
  assert.equal(send2.status, 200);
  const expiredVerify = verifyEmailOtpAndCreateSession({
    email, code: send2.testOtpCode, now: t1 + OTP_TTL_MS + 1, store,
  });
  assert.equal(expiredVerify.status, 400);

  const t2 = t1 + OTP_RESEND_COOLDOWN_MS + 1000;
  const send3 = await createAndSendEmailOtp({
    email, ipAddress: '198.51.100.10', now: t2, store, skipEmailDeliveryForTests: true,
  });
  assert.equal(send3.status, 200);

  const successVerify = verifyEmailOtpAndCreateSession({
    email, code: send3.testOtpCode, name: 'OTP Trader', now: t2 + 5000, store,
  });
  assert.equal(successVerify.status, 200);
  assert.equal(successVerify.success, true);
  assert.ok(successVerify.sessionToken);
  assert.equal(successVerify.uid, canonicalEmailUid(email));

  const replayAttempt = verifyEmailOtpAndCreateSession({
    email, code: send3.testOtpCode, now: t2 + 5001, store,
  });
  assert.equal(replayAttempt.status, 400);
  assert.equal(replayAttempt.success, false);

  const rateLimitEmail = 'heavy.requester@example.com';
  let lastStatus = 200;
  for (let i = 0; i < 6; i++) {
    const res = await createAndSendEmailOtp({
      email: rateLimitEmail,
      ipAddress: `198.51.100.${50 + i}`,
      now: t0 + i * (OTP_RESEND_COOLDOWN_MS + 1000),
      store,
      skipEmailDeliveryForTests: true,
    });
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);

  const afterWindow = await createAndSendEmailOtp({
    email: rateLimitEmail,
    ipAddress: '198.51.100.99',
    now: t0 + OTP_RATE_WINDOW_MS + 10_000,
    store,
    skipEmailDeliveryForTests: true,
  });
  assert.equal(afterWindow.status, 200);
});

test('Firestore security rules enforce deny-by-default, account isolation, and server-field protection', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  assert.equal(rules.includes("userId.matches('^email_.*')"), false);
  assert.equal(rules.includes("userId.matches('^user_.*')"), false);
  assert.equal(rules.includes("userId.matches('^google_.*')"), false);
  assert.equal(rules.includes('isSignedIn() && request.auth.uid == userId'), true);

  for (const protectedField of [
    'subscriptionTier',
    'subscriptionBillingCycle',
    'subscriptionStatus',
    'subscriptionExpiresAt',
    'razorpayPaymentId',
    'razorpayOrderId',
    'razorpaySubscriptionId',
    'balance',
    'initialBalance',
    'paidTopUpCredit',
  ]) {
    assert.equal(
      rules.includes(`'${protectedField}'`),
      true,
      `Expected ${protectedField} to be protected in firestore.rules`
    );
  }

  assert.ok(rules.includes('match /users_by_email/{emailKey}'));
  assert.ok(rules.includes('allow read, write: if false;'));
  assert.ok(rules.includes('match /{document=**}'));
});
