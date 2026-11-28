import crypto from 'crypto';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import {
  hashOtpCode,
  issueSessionToken,
  isValidEmailAddress,
  MAX_OTP_ATTEMPTS,
  MAX_OTP_SENDS_PER_WINDOW,
  normalizeEmailAddress,
  OTP_RATE_WINDOW_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  resolveOrCreateCanonicalUser,
  tryCreateFirebaseCustomToken,
  verifyOtpHash,
} from './authService';
import { deliverOtpEmailViaResend } from './otpMailer';
import { pruneMapEntries, setBoundedMapEntry } from '../utils/boundedCache';

const MAX_IP_OTP_BUCKETS = 2000;
const ipOtpWindow = new Map<string, { windowStart: number; count: number }>();
const MAX_IP_OTP_REQUESTS_PER_WINDOW = 10;

export function pruneOtpRateLimits(now = Date.now()): number {
  return pruneMapEntries(ipOtpWindow, (e) => now - e.windowStart >= OTP_RATE_WINDOW_MS, MAX_IP_OTP_BUCKETS);
}

export function resetOtpRateLimitsForTests(): void {
  ipOtpWindow.clear();
}

export async function createAndSendEmailOtp(params: {
  email: unknown;
  ipAddress?: string;
  now?: number;
  store?: DurableStore;
  skipEmailDeliveryForTests?: boolean;
}): Promise<{
  status: number;
  success: boolean;
  message: string;
  retryAfterSeconds?: number;
  testOtpCode?: string;
}> {
  const now = params.now ?? Date.now();
  const store = params.store ?? defaultStore;
  const email = normalizeEmailAddress(params.email);

  if (!isValidEmailAddress(email)) {
    return { status: 400, success: false, message: 'Please enter a valid email address.' };
  }

  const ip = params.ipAddress || 'unknown_ip';
  const ipState = ipOtpWindow.get(ip);
  if (ipState && now - ipState.windowStart < OTP_RATE_WINDOW_MS) {
    if (ipState.count >= MAX_IP_OTP_REQUESTS_PER_WINDOW) {
      return {
        status: 429,
        success: false,
        message: 'Too many verification requests from this network. Please wait and try again.',
        retryAfterSeconds: Math.ceil((OTP_RATE_WINDOW_MS - (now - ipState.windowStart)) / 1000),
      };
    }
    ipState.count += 1;
  } else {
    if (ipOtpWindow.size >= MAX_IP_OTP_BUCKETS) pruneOtpRateLimits(now);
    setBoundedMapEntry(ipOtpWindow, ip, { windowStart: now, count: 1 }, MAX_IP_OTP_BUCKETS);
  }

  const existing = store.getState().otpRecords[email];
  if (existing) {
    const elapsedSinceSend = now - existing.lastSentAt;
    if (elapsedSinceSend < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedSinceSend) / 1000);
      return {
        status: 429,
        success: false,
        message: `Please wait ${waitSec} seconds before requesting another verification code.`,
        retryAfterSeconds: waitSec,
      };
    }
    const inRateWindow = now - existing.sendCountWindowStart < OTP_RATE_WINDOW_MS;
    if (inRateWindow && existing.sendCountInWindow >= MAX_OTP_SENDS_PER_WINDOW) {
      const waitSec = Math.ceil((OTP_RATE_WINDOW_MS - (now - existing.sendCountWindowStart)) / 1000);
      return {
        status: 429,
        success: false,
        message: 'Maximum OTP requests reached for this address. Please try again later.',
        retryAfterSeconds: waitSec,
      };
    }
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashOtpCode(code, salt);
  const inWindow = Boolean(existing && now - existing.sendCountWindowStart < OTP_RATE_WINDOW_MS);

  store.getState().otpRecords[email] = {
    email,
    salt,
    codeHash,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    sendCountWindowStart: inWindow ? existing!.sendCountWindowStart : now,
    sendCountInWindow: inWindow ? existing!.sendCountInWindow + 1 : 1,
  };
  store.persist();

  if (params.skipEmailDeliveryForTests || process.env.NODE_ENV === 'test') {
    return {
      status: 200,
      success: true,
      message: 'If this email address is eligible, a 6-digit verification code has been sent.',
      testOtpCode: code,
    };
  }

  return deliverOtpEmailViaResend({ email, code, store });
}

export function verifyEmailOtpAndCreateSession(params: {
  email: unknown;
  code: unknown;
  name?: unknown;
  now?: number;
  store?: DurableStore;
}) {
  const now = params.now ?? Date.now();
  const store = params.store ?? defaultStore;
  const email = normalizeEmailAddress(params.email);
  const code = typeof params.code === 'string' ? params.code.trim() : '';

  if (!isValidEmailAddress(email) || !/^\d{6}$/.test(code)) {
    return { status: 400, success: false, message: 'Invalid or expired verification code.' };
  }

  const record = store.getState().otpRecords[email];
  if (!record) {
    return { status: 400, success: false, message: 'Invalid or expired verification code.' };
  }

  if (now > record.expiresAt) {
    delete store.getState().otpRecords[email];
    store.persist();
    return { status: 400, success: false, message: 'Verification code has expired. Please request a new OTP.' };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS || !verifyOtpHash(code, record.salt, record.codeHash)) {
    record.attempts += 1;
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      delete store.getState().otpRecords[email];
      store.persist();
      return { status: 429, success: false, message: 'Too many invalid verification attempts. Please request a new OTP.' };
    }
    store.persist();
    return { status: 400, success: false, message: 'Invalid or expired verification code.' };
  }

  delete store.getState().otpRecords[email];
  const requestedName = typeof params.name === 'string' ? params.name.trim() : undefined;
  const userAccount = resolveOrCreateCanonicalUser(
    { email, name: requestedName, authProvider: 'email' },
    store,
    now
  );
  const session = issueSessionToken(
    { uid: userAccount.uid, email: userAccount.email, name: userAccount.name, authProvider: 'email' },
    now
  );
  const firebaseCustomToken = tryCreateFirebaseCustomToken(userAccount.uid, userAccount.email);

  store.appendAudit({
    userId: userAccount.uid,
    category: 'AUTH',
    action: 'EMAIL_OTP_VERIFIED',
    details: { tokenId: session.tokenId },
    timestamp: now,
  });
  store.persist();

  return {
    status: 200,
    success: true,
    message: 'Authentication successful.',
    uid: userAccount.uid,
    email: userAccount.email,
    name: userAccount.name,
    sessionToken: session.token,
    firebaseCustomToken,
    expiresAt: session.expiresAt,
    user: userAccount,
  };
}
