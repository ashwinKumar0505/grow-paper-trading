import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from 'express';
import {
  canonicalEmailUid,
  issueSessionToken,
  resolveOrCreateCanonicalUser,
  revokeSessionToken,
  verifyBearerToken,
} from '../server/auth/authService';
import {
  createRateLimiter,
  createRequireAuth,
  type AuthenticatedRequest,
} from '../server/middleware/security';
import { DurableStore } from '../server/storage/durableStore';

test('authentication token verification issues and validates signed session tokens and canonical accounts', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;

  const user = resolveOrCreateCanonicalUser(
    { email: 'Trader.One@Example.com', name: 'Trader One', authProvider: 'email' },
    store,
    now
  );

  assert.equal(user.email, 'trader.one@example.com');
  assert.equal(user.uid, canonicalEmailUid('trader.one@example.com'));

  const secondUser = resolveOrCreateCanonicalUser(
    { preferredUid: user.uid, email: 'victim@example.com', name: 'Victim', authProvider: 'google' },
    store,
    now
  );
  assert.notEqual(secondUser.uid, user.uid);
  assert.equal(secondUser.email, 'victim@example.com');

  const issued = issueSessionToken(
    { uid: user.uid, email: user.email, name: user.name, authProvider: 'email' },
    now
  );

  const verified = await verifyBearerToken(issued.token, store, now + 1000);
  assert.ok(verified);
  assert.equal(verified.uid, user.uid);
  assert.equal(verified.email, 'trader.one@example.com');
  assert.equal(verified.tokenId, issued.tokenId);
});

test('expired, tampered, and revoked tokens are rejected', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const now = 1_750_000_000_000;

  const issued = issueSessionToken(
    { uid: 'usr_test_1', email: 'user1@example.com', name: 'User 1', authProvider: 'email' },
    now,
    60_000
  );

  const expiredResult = await verifyBearerToken(issued.token, store, now + 60_001);
  assert.equal(expiredResult, null);

  const parts = issued.token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      jti: issued.tokenId,
      sub: 'usr_victim_admin',
      email: 'victim@example.com',
      name: 'Admin',
      provider: 'email',
      iat: now,
      exp: now + 60_000,
    })
  ).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const tamperedResult = await verifyBearerToken(tamperedToken, store, now + 1000);
  assert.equal(tamperedResult, null);

  const validBeforeRevoke = await verifyBearerToken(issued.token, store, now + 1000);
  assert.ok(validBeforeRevoke);
  revokeSessionToken(issued.tokenId, issued.expiresAt, store);
  const afterRevoke = await verifyBearerToken(issued.token, store, now + 1000);
  assert.equal(afterRevoke, null);
});

test('protected Express route middleware enforces bearer token and derives identity from token', async () => {
  const store = new DurableStore({ inMemoryOnly: true });
  const requireAuth = createRequireAuth(store);
  const now = Date.now();
  const issued = issueSessionToken(
    { uid: 'usr_verified_99', email: 'verified99@example.com', name: 'Verified 99', authProvider: 'email' },
    now
  );

  const invokeRequireAuth = async (authHeader?: string) => {
    let statusCode = 200;
    let jsonBody: unknown = null;
    let nextCalled = false;

    const req = {
      headers: authHeader ? { authorization: authHeader } : {},
      body: { userId: 'spoofed_client_uid' },
    } as unknown as AuthenticatedRequest;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return this;
      },
    } as unknown as Response;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    return { statusCode, jsonBody, nextCalled, authUser: req.authUser };
  };

  const missing = await invokeRequireAuth(undefined);
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.nextCalled, false);

  const forged = await invokeRequireAuth('Bearer invalid.token.value');
  assert.equal(forged.statusCode, 401);
  assert.equal(forged.nextCalled, false);

  const valid = await invokeRequireAuth(`Bearer ${issued.token}`);
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.authUser?.uid, 'usr_verified_99');
  assert.notEqual(valid.authUser?.uid, 'spoofed_client_uid');

  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2, keyPrefix: 'test_rl' });
  let blockedCount = 0;
  for (let i = 0; i < 3; i++) {
    const req = { ip: '203.0.113.55', headers: {}, socket: {} } as unknown as AuthenticatedRequest;
    const res = {
      setHeader() { return this; },
      status(code: number) { if (code === 429) blockedCount += 1; return this; },
      json() { return this; },
    } as unknown as Response;
    limiter(req, res, () => {});
  }
  assert.equal(blockedCount, 1);
});
