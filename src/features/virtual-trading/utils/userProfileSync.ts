import { db, doc, getDoc, setDoc } from '../../../lib/firebase';
import { BillingCycle, SubscriptionTier } from '../../../lib/subscription';
import type {
  Holding,
  IntradayPosition,
  Order,
  WalletTransaction,
  Watchlist,
} from '../../../types/market';

export interface RemoteUserRecord {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  authProvider?: 'google' | 'email';
  balance?: number;
  initialBalance?: number;
  holdings?: Holding[];
  intradayPositions?: IntradayPosition[];
  orders?: Order[];
  executedOrderKeys?: string[];
  watchlists?: Watchlist[];
  walletTransactions?: WalletTransaction[];
  portfolioUpdatedAt?: number;
  subscriptionTier?: SubscriptionTier;
  subscriptionBillingCycle?: BillingCycle;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled';
  subscriptionUpdatedAt?: number;
  subscriptionExpiresAt?: number | null;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  subscriptionAutoPay?: boolean;
  subscriptionUpiMandateId?: string;
  usage?: unknown;
  createdAt?: number;
  updatedAt?: number;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  beginner: 1,
  advanced: 2,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailToDocKey(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9]/g, '_');
}

export function buildEmailUid(email: string): string {
  return `email_${emailToDocKey(email)}`;
}

export function resolveActiveTier(record: RemoteUserRecord | null | undefined): SubscriptionTier {
  if (!record?.subscriptionTier) return 'free';
  const tier = record.subscriptionTier;
  if (tier !== 'free' && record.subscriptionExpiresAt && record.subscriptionExpiresAt < Date.now()) {
    return 'free';
  }
  return tier in TIER_RANK ? tier : 'free';
}

function pickBestRecord(
  primary: RemoteUserRecord | null,
  byEmail: RemoteUserRecord | null
): RemoteUserRecord | null {
  if (!primary && !byEmail) return null;
  if (!primary) return byEmail;
  if (!byEmail) return primary;

  const primaryRank = TIER_RANK[resolveActiveTier(primary)];
  const emailRank = TIER_RANK[resolveActiveTier(byEmail)];
  if (emailRank > primaryRank) return byEmail;
  if (primaryRank > emailRank) return primary;

  const primaryUpdated = primary.subscriptionUpdatedAt || primary.updatedAt || 0;
  const emailUpdated = byEmail.subscriptionUpdatedAt || byEmail.updatedAt || 0;
  return emailUpdated > primaryUpdated ? byEmail : primary;
}

export async function fetchUserProfileFromFirestore(
  uid: string,
  email?: string
): Promise<RemoteUserRecord | null> {
  const normalized = email ? normalizeEmail(email) : '';
  let uidRecord: RemoteUserRecord | null = null;
  let emailRecord: RemoteUserRecord | null = null;

  try {
    const uidSnap = await getDoc(doc(db, 'users', uid));
    if (uidSnap.exists()) {
      uidRecord = uidSnap.data() as RemoteUserRecord;
    }
  } catch (err) {
    console.warn('Firestore users/{uid} read warning:', err);
  }

  if (normalized) {
    try {
      const emailSnap = await getDoc(doc(db, 'users_by_email', emailToDocKey(normalized)));
      if (emailSnap.exists()) {
        emailRecord = emailSnap.data() as RemoteUserRecord;
      }
    } catch (err) {
      console.warn('Firestore users_by_email read warning:', err);
    }
  }

  const best = pickBestRecord(uidRecord, emailRecord);
  if (best && emailRecord && best === emailRecord && uidRecord !== emailRecord) {
    // Backfill uid document so real-time onSnapshot & future reads stay in sync
    setDoc(doc(db, 'users', uid), { ...emailRecord, userId: uid }, { merge: true }).catch(() => {});
  }
  return best;
}

export async function persistUserProfileToFirestore(
  uid: string,
  email: string | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  const writes: Promise<void>[] = [
    setDoc(doc(db, 'users', uid), payload, { merge: true }),
  ];
  const normalized = email ? normalizeEmail(email) : '';
  if (normalized) {
    writes.push(
      setDoc(
        doc(db, 'users_by_email', emailToDocKey(normalized)),
        { ...payload, email: normalized },
        { merge: true }
      )
    );
  }
  await Promise.all(writes);
}
