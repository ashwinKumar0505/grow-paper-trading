import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { resolveOrCreateCanonicalUser } from '../server/auth/authService';
import { DurableStore } from '../server/storage/durableStore';
import { FirestoreRestClient, resolveFirestoreConfig } from '../server/storage/firestoreRestClient';
import { FirestoreStoreAdapter } from '../server/storage/firestoreStoreAdapter';
import {
  decodeFirestoreFields,
  encodeFirestoreDocId,
  encodeFirestoreFields,
  type FirestoreDocument,
} from '../server/storage/firestoreValueCodec';
import { addFreeTierVirtualCash, getOrCreateTradingLedger } from '../server/trading/tradingLedger';

function createMockFirestoreFetch() {
  const db = new Map<string, FirestoreDocument>();
  let tokenCalls = 0;
  let commitCalls = 0;
  let lastCommitWriteCount = 0;

  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      tokenCalls += 1;
      return new Response(JSON.stringify({ access_token: 'mock-access-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith(':commit') && init?.method === 'POST') {
      commitCalls += 1;
      const body = JSON.parse(String(init.body || '{}')) as {
        writes?: Array<{ update?: FirestoreDocument; delete?: string }>;
      };
      const writes = body.writes || [];
      lastCommitWriteCount = writes.length;
      for (const w of writes) {
        if (w.update?.name) db.set(w.update.name, w.update);
        if (w.delete) db.delete(w.delete);
      }
      return new Response(JSON.stringify({ writeResults: writes.map(() => ({})) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (init?.method === 'GET' && url.includes('/documents/')) {
      const colPath = url.split('/documents/')[1].split('?')[0];
      const prefix = `/documents/${colPath}/`;
      const documents: FirestoreDocument[] = [];
      for (const [name, doc] of db.entries()) {
        if (name.includes(prefix)) documents.push(doc);
      }
      return new Response(JSON.stringify({ documents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  };

  return {
    fetchFn,
    db,
    getStats: () => ({ tokenCalls, commitCalls, lastCommitWriteCount }),
  };
}

test('firestoreValueCodec round-trips nested primitives, numbers, arrays, maps, and encodes doc IDs safely', () => {
  const input = {
    uid: 'usr_abc123',
    balance: 125000.75,
    timestamp: 1750000000000,
    active: true,
    expiresAt: null,
    skippedUndefined: undefined,
    emptyArr: [],
    emptyObj: {},
    nested: { items: [{ price: 42.5, qty: 10 }] },
  };
  const encoded = encodeFirestoreFields(input);
  assert.equal('skippedUndefined' in encoded, false);
  const decoded = decodeFirestoreFields(encoded);
  assert.deepEqual(decoded, {
    uid: 'usr_abc123',
    balance: 125000.75,
    timestamp: 1750000000000,
    active: true,
    expiresAt: null,
    emptyArr: [],
    emptyObj: {},
    nested: { items: [{ price: 42.5, qty: 10 }] },
  });

  assert.equal(encodeFirestoreDocId('usr_abc-123'), 'usr_abc-123');
  assert.match(encodeFirestoreDocId('trader@example.com'), /^k_/);
  assert.match(encodeFirestoreDocId('__reserved__'), /^k_/);
});

test('Firestore-backed DurableStore syncs only dirty documents and restores full state across restarts', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const cfg = resolveFirestoreConfig({
    FIREBASE_PROJECT_ID: 'tradedia-b6cb0',
    FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: 'firebase-adminsdk@tradedia-b6cb0.iam.gserviceaccount.com',
    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
  });
  assert.ok(cfg);
  assert.equal(cfg.databaseId, '(default)');

  const mock = createMockFirestoreFetch();
  const client1 = new FirestoreRestClient(cfg, mock.fetchFn);
  const store1 = new DurableStore({ inMemoryOnly: true, firestoreAdapter: new FirestoreStoreAdapter(client1) });
  await store1.init();
  assert.equal(store1.getStorageMode(), 'firestore');

  const now = Date.now();
  const user = resolveOrCreateCanonicalUser(
    { email: 'cloud.trader@example.com', name: 'Cloud Trader', authProvider: 'google' },
    store1,
    now
  );
  getOrCreateTradingLedger(user.uid, store1, now);
  user.subscriptionTier = 'advanced';
  user.subscriptionBillingCycle = 'yearly';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = now + 30 * 86_400_000;
  await store1.flush();

  const topUp = await addFreeTierVirtualCash({
    userId: user.uid,
    amount: 250_000,
    description: 'Firestore persistence top-up',
    store: store1,
    now: now + 1000,
  });
  assert.equal(topUp.success, true);

  // Unchanged second flush must produce zero additional Firestore commits
  const commitsBeforeNoop = mock.getStats().commitCalls;
  await store1.flush();
  assert.equal(mock.getStats().commitCalls, commitsBeforeNoop);
  // OAuth token should be cached and reused across multiple commits
  assert.equal(mock.getStats().tokenCalls, 1);

  // Add a second user and verify only the newly added user + audit log are written (not user 1's ledger!)
  resolveOrCreateCanonicalUser(
    { email: 'second@example.com', name: 'Second User', authProvider: 'email' },
    store1,
    now + 5000
  );
  await store1.flush();
  assert.equal(mock.getStats().lastCommitWriteCount, 2); // second user doc + audit_log doc

  // Verify OTP delete propagation
  store1.getState().otpRecords['second@example.com'] = {
    email: 'second@example.com',
    salt: 's1',
    codeHash: 'h1',
    expiresAt: now + 600_000,
    attempts: 0,
    lastSentAt: now,
    sendCountWindowStart: now,
    sendCountInWindow: 1,
  };
  await store1.flush();
  assert.equal(mock.getStats().lastCommitWriteCount, 1);
  delete store1.getState().otpRecords['second@example.com'];
  await store1.flush();
  assert.equal(mock.getStats().lastCommitWriteCount, 1);

  // Simulate full server restart with a fresh DurableStore reading from Firestore
  const client2 = new FirestoreRestClient(cfg, mock.fetchFn);
  const store2 = new DurableStore({ inMemoryOnly: true, firestoreAdapter: new FirestoreStoreAdapter(client2) });
  await store2.init();

  const restoredUser = store2.getState().users[user.uid];
  assert.ok(restoredUser);
  assert.equal(restoredUser.subscriptionTier, 'advanced');
  assert.equal(store2.getState().emailIndex['cloud.trader@example.com'], user.uid);
  assert.equal(store2.getState().otpRecords['second@example.com'], undefined);

  const restoredLedger = store2.getState().tradingLedgers[user.uid];
  assert.ok(restoredLedger);
  assert.equal(restoredLedger.balance, 350_000);
  assert.equal(restoredLedger.walletTransactions.length, 2);
  assert.equal(restoredLedger.walletTransactions[0].type, 'DEPOSIT');
  assert.ok(store2.getState().users[store2.getState().emailIndex['second@example.com']]);
});
