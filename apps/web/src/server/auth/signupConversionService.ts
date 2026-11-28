import crypto from 'crypto';
import type { DurableStore, DurableUserAccount } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { encodeFirestoreDocId } from '../storage/firestoreValueCodec';
import { getSessionSecret } from './authService';

const SIGNUP_CONVERSIONS_COLLECTION = 'signup_conversions';
export const SIGNUP_CONVERSION_CLAIM_WINDOW_MS = 15 * 60 * 1000;

export function generateOpaqueSignupConversionId(uid: string): string {
  const digest = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`tradedia:signup_conversion:v1:${uid}`)
    .digest('hex')
    .slice(0, 32);
  return `scv_${digest}`;
}

export function toPublicUserAccount(
  user: DurableUserAccount
): Omit<DurableUserAccount, 'signupConversionId' | 'signupConversionClaimedAt'> {
  const { signupConversionId: _id, signupConversionClaimedAt: _claimedAt, ...publicUser } = user;
  return publicUser;
}

function isConversionEligibleInMemory(
  user: DurableUserAccount | undefined,
  now: number,
  windowMs: number
): user is DurableUserAccount & { signupConversionId: string } {
  if (!user || !user.signupConversionId || user.signupConversionClaimedAt) {
    return false;
  }
  return now - user.createdAt <= windowMs;
}

/**
 * Non-destructive Phase 1 check: returns the stable opaque conversion ID for a freshly created
 * verified account without permanently consuming it before the client dispatches gtag.
 * Performs a single Firestore lookup only for fresh unclaimed users when Firestore is active.
 */
export async function getPendingSignupConversion(params: {
  uid: string;
  store?: DurableStore;
  now?: number;
  windowMs?: number;
}): Promise<{ eligible: boolean; conversionId: string | null }> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const windowMs = params.windowMs ?? SIGNUP_CONVERSION_CLAIM_WINDOW_MS;
  const user = store.getState().users[params.uid];

  if (!isConversionEligibleInMemory(user, now, windowMs)) {
    return { eligible: false, conversionId: null };
  }

  const firestore = store.getFirestoreClient();
  if (firestore) {
    try {
      const existingClaim = await firestore.getDocument(
        SIGNUP_CONVERSIONS_COLLECTION,
        encodeFirestoreDocId(user.uid)
      );
      if (existingClaim !== null) {
        user.signupConversionClaimedAt = now;
        return { eligible: false, conversionId: null };
      }
    } catch {
      // Allow fallback to Phase 2 atomic confirm + Google Ads transaction_id dedup on transient read errors.
    }
  }

  return { eligible: true, conversionId: user.signupConversionId };
}

/**
 * Atomic Phase 2 claim/confirmation: marks a signup conversion as permanently claimed using
 * an in-process lock plus a cross-instance Firestore `exists: false` document precondition.
 */
export async function claimNewAccountSignupConversion(params: {
  uid: string;
  conversionId?: string;
  store?: DurableStore;
  now?: number;
  windowMs?: number;
}): Promise<{ eligible: boolean; conversionId: string | null }> {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const windowMs = params.windowMs ?? SIGNUP_CONVERSION_CLAIM_WINDOW_MS;

  return store.withLock(
    `auth:signup_conversion:${params.uid}`,
    async () => {
      const user = store.getState().users[params.uid];
      if (!isConversionEligibleInMemory(user, now, windowMs)) {
        return { eligible: false, conversionId: null };
      }
      if (params.conversionId && params.conversionId !== user.signupConversionId) {
        return { eligible: false, conversionId: null };
      }

      const firestore = store.getFirestoreClient();
      if (firestore) {
        try {
          const outcome = await firestore.createDocumentIfAbsent(
            SIGNUP_CONVERSIONS_COLLECTION,
            encodeFirestoreDocId(user.uid),
            {
              userId: user.uid,
              conversionId: user.signupConversionId,
              authProvider: user.authProvider,
              claimedAt: now,
            }
          );
          if (outcome === 'already_exists') {
            user.signupConversionClaimedAt = now;
            return { eligible: false, conversionId: null };
          }
        } catch {
          // Transient Firestore failure: do not corrupt local claim state or disrupt auth.
          return { eligible: false, conversionId: null };
        }
      }

      user.signupConversionClaimedAt = now;
      user.updatedAt = now;
      store.appendAudit({
        userId: user.uid,
        category: 'AUTH',
        action: 'SIGNUP_CONVERSION_CONFIRMED',
        details: { authProvider: user.authProvider },
        timestamp: now,
      });
      return { eligible: true, conversionId: user.signupConversionId };
    },
    { persist: (result) => result.eligible }
  );
}
