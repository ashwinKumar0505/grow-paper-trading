import {
  createEmptyStore,
  type DurableAuditEntry, type DurableBillingItem, type DurableOtpRecord,
  type DurablePaymentIntent, type DurableQuizProgress, type DurableTradingLedger,
  type DurableUserAccount, type StoreSchema,
} from './durableTypes';
import type { FirestoreRestClient, FirestoreWriteOp } from './firestoreRestClient';
import { decodeFirestoreFields, encodeFirestoreDocId, extractDocIdFromName } from './firestoreValueCodec';

const COLS = {
  users: 'users', tradingLedgers: 'trading_ledgers', billingHistory: 'billing_history',
  quizProgress: 'quiz_progress', paymentIntents: 'payment_intents',
  processedPayments: 'processed_payments', processedWebhooks: 'processed_webhooks',
  otpRecords: 'otp_records', serverState: 'server_state',
} as const;

const MAX_AUDIT = 500;
const MAX_LEDGER_HISTORY = 500;

interface DocEntry {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
}

function sanitizeLedger(ledger: DurableTradingLedger): Record<string, unknown> {
  const open = ledger.orders.filter((o) => o.status === 'PENDING' || o.status === 'SCHEDULED');
  const closed = ledger.orders
    .filter((o) => o.status !== 'PENDING' && o.status !== 'SCHEDULED')
    .slice(-MAX_LEDGER_HISTORY);
  return {
    ...ledger,
    orders: [...closed, ...open],
    executions: ledger.executions.slice(-MAX_LEDGER_HISTORY),
    executedOrderKeys: ledger.executedOrderKeys.slice(-MAX_LEDGER_HISTORY),
    walletTransactions: ledger.walletTransactions.slice(-MAX_LEDGER_HISTORY),
  };
}

function buildDesiredDocs(state: StoreSchema, now = Date.now()): Map<string, DocEntry> {
  const docs = new Map<string, DocEntry>();
  const add = (collection: string, rawKey: string, data: Record<string, unknown>) => {
    const docId = encodeFirestoreDocId(rawKey);
    docs.set(`${collection}/${docId}`, { collection, docId, data });
  };

  for (const [uid, u] of Object.entries(state.users)) add(COLS.users, uid, { ...u, userId: uid });
  for (const [uid, l] of Object.entries(state.tradingLedgers)) add(COLS.tradingLedgers, uid, sanitizeLedger(l));
  for (const [uid, items] of Object.entries(state.billingHistory)) add(COLS.billingHistory, uid, { userId: uid, items });
  for (const [uid, p] of Object.entries(state.quizProgress)) add(COLS.quizProgress, uid, { ...p, userId: uid });
  for (const [id, intent] of Object.entries(state.paymentIntents)) add(COLS.paymentIntents, id, { ...intent, _key: id });
  for (const [id, rec] of Object.entries(state.processedPayments)) add(COLS.processedPayments, id, { ...rec, _key: id });
  for (const [id, rec] of Object.entries(state.processedWebhooks)) add(COLS.processedWebhooks, id, { ...rec, _key: id });
  for (const [email, otp] of Object.entries(state.otpRecords)) {
    if (otp.expiresAt > now) add(COLS.otpRecords, email, { ...otp, _key: email });
  }

  const activeRevoked: Record<string, number> = {};
  for (const [jti, exp] of Object.entries(state.revokedTokens)) {
    if (exp > now) activeRevoked[jti] = exp;
  }
  if (Object.keys(activeRevoked).length > 0) add(COLS.serverState, 'revoked_tokens', { tokens: activeRevoked });
  if (state.auditLog.length > 0) add(COLS.serverState, 'audit_log', { entries: state.auditLog.slice(-MAX_AUDIT) });
  return docs;
}

function hydrateUser(uid: string, d: Record<string, unknown>): DurableUserAccount {
  return {
    ...(d as unknown as DurableUserAccount),
    uid,
    email: String(d.email || '').trim().toLowerCase(),
    name: String(d.name || String(d.email || '').split('@')[0] || 'Trader'),
    authProvider: d.authProvider === 'google' ? 'google' : 'email',
    subscriptionTier: (d.subscriptionTier as DurableUserAccount['subscriptionTier']) || 'free',
    subscriptionBillingCycle: (d.subscriptionBillingCycle as DurableUserAccount['subscriptionBillingCycle']) || 'free',
    subscriptionStatus: (d.subscriptionStatus as DurableUserAccount['subscriptionStatus']) || 'active',
    subscriptionAutoPay: Boolean(d.subscriptionAutoPay),
    paidTopUpCredit: typeof d.paidTopUpCredit === 'number' ? d.paidTopUpCredit : 0,
  };
}

function hydrateLedger(uid: string, d: Record<string, unknown>): DurableTradingLedger {
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    ...(d as unknown as DurableTradingLedger),
    userId: uid,
    holdings: arr(d.holdings),
    positions: arr(d.positions),
    orders: arr(d.orders),
    executions: arr(d.executions),
    executedOrderKeys: arr(d.executedOrderKeys),
    walletTransactions: arr(d.walletTransactions),
    watchlists: arr(d.watchlists),
    squareOffPendingSymbols: arr(d.squareOffPendingSymbols),
  };
}

export class FirestoreStoreAdapter {
  private client: FirestoreRestClient;
  private syncedSnapshots = new Map<string, string>();

  constructor(client: FirestoreRestClient) {
    this.client = client;
  }

  async loadAll(now = Date.now()): Promise<StoreSchema> {
    const state = createEmptyStore();
    const [uDocs, lDocs, bDocs, qDocs, iDocs, pDocs, wDocs, oDocs, mDocs] = await Promise.all([
      this.client.listCollection(COLS.users),
      this.client.listCollection(COLS.tradingLedgers),
      this.client.listCollection(COLS.billingHistory),
      this.client.listCollection(COLS.quizProgress),
      this.client.listCollection(COLS.paymentIntents),
      this.client.listCollection(COLS.processedPayments),
      this.client.listCollection(COLS.processedWebhooks),
      this.client.listCollection(COLS.otpRecords),
      this.client.listCollection(COLS.serverState),
    ]);

    for (const doc of uDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const uid = String(d.uid || d.userId || extractDocIdFromName(doc.name));
      if (!uid || !d.email) continue;
      const user = hydrateUser(uid, d);
      state.users[uid] = user;
      state.emailIndex[user.email] = uid;
    }
    for (const doc of lDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const uid = String(d.userId || extractDocIdFromName(doc.name));
      if (uid && typeof d.balance === 'number') state.tradingLedgers[uid] = hydrateLedger(uid, d);
    }
    for (const doc of bDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const uid = String(d.userId || extractDocIdFromName(doc.name));
      if (uid && Array.isArray(d.items)) state.billingHistory[uid] = d.items as DurableBillingItem[];
    }
    for (const doc of qDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const uid = String(d.userId || extractDocIdFromName(doc.name));
      if (uid) state.quizProgress[uid] = { ...d, userId: uid } as unknown as DurableQuizProgress;
    }
    for (const doc of iDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const key = String(d._key || d.intentId || extractDocIdFromName(doc.name));
      if (key) state.paymentIntents[key] = d as unknown as DurablePaymentIntent;
    }
    for (const doc of pDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const key = String(d._key || extractDocIdFromName(doc.name));
      if (key) state.processedPayments[key] = { intentId: String(d.intentId || ''), userId: String(d.userId || ''), verifiedAt: Number(d.verifiedAt || 0) };
    }
    for (const doc of wDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const key = String(d._key || extractDocIdFromName(doc.name));
      if (key) state.processedWebhooks[key] = { event: String(d.event || ''), processedAt: Number(d.processedAt || 0) };
    }
    for (const doc of oDocs) {
      const d = decodeFirestoreFields(doc.fields);
      const key = String(d._key || d.email || extractDocIdFromName(doc.name));
      if (key && Number(d.expiresAt || 0) > now) state.otpRecords[key] = d as unknown as DurableOtpRecord;
    }
    for (const doc of mDocs) {
      const id = extractDocIdFromName(doc.name);
      const d = decodeFirestoreFields(doc.fields);
      if (id === 'revoked_tokens' && d.tokens && typeof d.tokens === 'object') {
        for (const [jti, exp] of Object.entries(d.tokens as Record<string, unknown>)) {
          const expNum = Number(exp);
          if (Number.isFinite(expNum) && expNum > now) state.revokedTokens[jti] = expNum;
        }
      } else if (id === 'audit_log' && Array.isArray(d.entries)) {
        state.auditLog = d.entries as DurableAuditEntry[];
      }
    }

    this.syncedSnapshots.clear();
    for (const [key, entry] of buildDesiredDocs(state, now)) {
      this.syncedSnapshots.set(key, JSON.stringify(entry.data));
    }
    return state;
  }

  async syncDiff(state: StoreSchema, now = Date.now()): Promise<number> {
    const desired = buildDesiredDocs(state, now);
    const ops: FirestoreWriteOp[] = [];
    const nextSnapshots = new Map<string, string>();

    for (const [key, entry] of desired) {
      const serialized = JSON.stringify(entry.data);
      nextSnapshots.set(key, serialized);
      if (this.syncedSnapshots.get(key) !== serialized) {
        ops.push({ type: 'set', collection: entry.collection, docId: entry.docId, data: entry.data });
      }
    }
    for (const prevKey of this.syncedSnapshots.keys()) {
      if (!desired.has(prevKey)) {
        const slash = prevKey.indexOf('/');
        if (slash > 0) ops.push({ type: 'delete', collection: prevKey.slice(0, slash), docId: prevKey.slice(slash + 1) });
      }
    }

    if (ops.length === 0) return 0;
    await this.client.commitWrites(ops);
    this.syncedSnapshots = nextSnapshots;
    return ops.length;
  }
}
