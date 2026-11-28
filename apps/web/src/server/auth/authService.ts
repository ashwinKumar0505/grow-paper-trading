import crypto from 'crypto';
import { getCurrentMonthKey, getTodayKey } from '../../lib/subscription';
import type { DurableStore, DurableUserAccount } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { generateOpaqueSignupConversionId } from './signupConversionService';

export {
  claimNewAccountSignupConversion,
  generateOpaqueSignupConversionId,
  getPendingSignupConversion,
  SIGNUP_CONVERSION_CLAIM_WINDOW_MS,
  toPublicUserAccount,
} from './signupConversionService';
export {
  issueSessionToken,
  revokeSessionToken,
  tryCreateFirebaseCustomToken,
  verifyBearerToken,
} from './tokenService';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_OTP_SENDS_PER_WINDOW = 5;
export const MAX_OTP_ATTEMPTS = 5;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface VerifiedAuthIdentity {
  uid: string;
  email: string;
  name: string;
  authProvider: 'google' | 'email';
  emailVerified?: boolean;
  tokenId: string;
  expiresAt: number;
}

export function getSessionSecret(env: Record<string, string | undefined> = process.env): string {
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';
  const authSecret = (env.AUTH_SESSION_SECRET || '').trim();
  if (authSecret.length >= 16) return authSecret;
  if (isProd) {
    throw new Error('AUTH_SESSION_SECRET must be configured in production (min 16 characters).');
  }
  const devFallback = (env.RAZORPAY_KEY_SECRET || '').trim();
  if (devFallback.length >= 16) return devFallback;
  return 'niftylens_dev_test_session_secret_key_2026_v1';
}

export function normalizeEmailAddress(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export function canonicalEmailUid(email: string): string {
  const normalized = normalizeEmailAddress(email);
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20);
  return `usr_${hash}`;
}

export function hashOtpCode(code: string, salt: string): string {
  return crypto.scryptSync(code, salt, 32).toString('hex');
}

export function verifyOtpHash(code: string, salt: string, expectedHashHex: string): boolean {
  const actualHex = hashOtpCode(code, salt);
  const actualBuf = Buffer.from(actualHex, 'hex');
  const expectedBuf = Buffer.from(expectedHashHex, 'hex');
  return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function resolveOrCreateCanonicalUser(
  params: {
    preferredUid?: string;
    email: string;
    name?: string;
    phone?: string;
    avatar?: string;
    authProvider: 'google' | 'email';
  },
  store: DurableStore = defaultStore,
  now = Date.now()
): DurableUserAccount {
  const email = normalizeEmailAddress(params.email);
  if (!isValidEmailAddress(email)) {
    throw new Error('Valid verified email address is required to resolve canonical account.');
  }

  const state = store.getState();
  const existingUidByEmail = state.emailIndex[email];
  const existingByUid = params.preferredUid ? state.users[params.preferredUid] : undefined;

  const safeExistingByUid =
    existingByUid && normalizeEmailAddress(existingByUid.email) === email ? existingByUid : undefined;

  const existing =
    (existingUidByEmail ? state.users[existingUidByEmail] : undefined) || safeExistingByUid;

  if (existing) {
    existing.name = params.name?.trim() || existing.name;
    existing.avatar = params.avatar || existing.avatar;
    existing.phone = params.phone || existing.phone;
    existing.updatedAt = now;
    if (
      existing.subscriptionTier !== 'free' &&
      existing.subscriptionExpiresAt &&
      existing.subscriptionExpiresAt < now
    ) {
      existing.subscriptionTier = 'free';
      existing.subscriptionBillingCycle = 'free';
      existing.subscriptionStatus = 'expired';
      existing.subscriptionAutoPay = false;
    }
    state.emailIndex[email] = existing.uid;
    store.persist();
    return existing;
  }

  const uid =
    params.preferredUid && !state.users[params.preferredUid]
      ? params.preferredUid
      : canonicalEmailUid(email);

  const created: DurableUserAccount = {
    uid,
    email,
    name: params.name?.trim() || email.split('@')[0],
    phone: params.phone,
    avatar: params.avatar,
    authProvider: params.authProvider,
    subscriptionTier: 'free',
    subscriptionBillingCycle: 'free',
    subscriptionStatus: 'active',
    subscriptionUpdatedAt: now,
    subscriptionExpiresAt: null,
    subscriptionAutoPay: false,
    paidTopUpCredit: 0,
    usageQuota: {
      dateKey: getTodayKey(),
      analysisSearchesCount: 0,
      quizQuestionsCount: 0,
      lastPortfolioResetMonth: getCurrentMonthKey(),
      portfolioResetsThisMonth: 0,
      lastAutoResetMonth: getCurrentMonthKey(),
    },
    signupConversionId: generateOpaqueSignupConversionId(uid),
    createdAt: now,
    updatedAt: now,
  };

  state.users[uid] = created;
  state.emailIndex[email] = uid;
  store.appendAudit({
    userId: uid,
    category: 'AUTH',
    action: 'ACCOUNT_CREATED',
    details: { authProvider: params.authProvider },
    timestamp: now,
  });
  store.persist();
  return created;
}
