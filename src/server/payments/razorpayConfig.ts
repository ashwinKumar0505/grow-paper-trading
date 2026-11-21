import crypto from 'crypto';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription';
import type { DurableUserAccount } from '../storage/durableStore';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isTestKey: boolean;
}

export function resolveRazorpayCredentials(
  env: Record<string, string | undefined> = process.env
): { ok: true; creds: RazorpayCredentials } | { ok: false; status: number; code: string; message: string } {
  const keyId = (env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (env.RAZORPAY_WEBHOOK_SECRET || '').trim();

  if (!keyId || !keySecret || keyId.includes('NiftyLensDemoKey') || keyId.includes('demo')) {
    return {
      ok: false,
      status: 503,
      code: 'PAYMENT_GATEWAY_UNCONFIGURED',
      message: 'Razorpay payment credentials are not configured on the server.',
    };
  }

  const isTestKey = keyId.startsWith('rzp_test_');
  const isLiveKey = keyId.startsWith('rzp_live_');
  if (!isTestKey && !isLiveKey) {
    return {
      ok: false,
      status: 503,
      code: 'PAYMENT_KEY_INVALID',
      message: 'Configured Razorpay key ID is invalid.',
    };
  }

  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd && isTestKey && env.ALLOW_RAZORPAY_TEST_IN_PROD !== 'true') {
    return {
      ok: false,
      status: 503,
      code: 'TEST_KEY_IN_PRODUCTION_FORBIDDEN',
      message: 'Test-mode Razorpay keys are not permitted in production.',
    };
  }

  if (!isProd && isLiveKey) {
    return {
      ok: false,
      status: 503,
      code: 'LIVE_KEY_IN_NON_PROD_FORBIDDEN',
      message: 'Live Razorpay keys cannot be used outside production environments.',
    };
  }

  return {
    ok: true,
    creds: { keyId, keySecret, webhookSecret, isTestKey },
  };
}

export function computeAuthoritativePrice(params: {
  targetTier: 'beginner' | 'advanced';
  billingCycle: 'monthly' | 'yearly';
  userAccount: DurableUserAccount;
  now?: number;
}): {
  fullPriceINR: number;
  creditAppliedINR: number;
  payableINR: number;
  amountInPaise: number;
  isDifferentialUpgrade: boolean;
  previousSubscriptionId?: string;
} {
  const now = params.now ?? Date.now();
  const targetPlan = SUBSCRIPTION_PLANS[params.targetTier];
  const fullPriceINR =
    params.billingCycle === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice;

  const hasActiveBeginner =
    params.userAccount.subscriptionTier === 'beginner' &&
    params.userAccount.subscriptionStatus === 'active' &&
    (!params.userAccount.subscriptionExpiresAt || params.userAccount.subscriptionExpiresAt > now) &&
    params.userAccount.subscriptionBillingCycle === params.billingCycle;

  const isDifferentialUpgrade = params.targetTier === 'advanced' && hasActiveBeginner;
  const beginnerPriceINR =
    params.billingCycle === 'yearly'
      ? SUBSCRIPTION_PLANS.beginner.yearlyPrice
      : SUBSCRIPTION_PLANS.beginner.monthlyPrice;

  const creditAppliedINR = isDifferentialUpgrade ? beginnerPriceINR : 0;
  const payableINR = Math.max(1, fullPriceINR - creditAppliedINR);

  return {
    fullPriceINR,
    creditAppliedINR,
    payableINR,
    amountInPaise: payableINR * 100,
    isDifferentialUpgrade,
    previousSubscriptionId: isDifferentialUpgrade
      ? params.userAccount.razorpaySubscriptionId
      : undefined,
  };
}

export function verifyHmacSignature(payload: string | Buffer, secret: string, signature: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}
