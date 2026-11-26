import { Router, type Response } from 'express';
import { resolveOrCreateCanonicalUser } from '../auth/authService';
import { createRateLimiter, createRequireAuth, sanitizeErrorMessage, type AuthenticatedRequest } from '../middleware/security';
import { computeAuthoritativePrice, resolveRazorpayCredentials } from '../payments/razorpayService';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';

const razorpayPlanCache = new Map<string, string>();

async function getOrCreateRazorpayPlan(
  authHeader: string,
  tier: 'beginner' | 'advanced',
  billingCycle: 'monthly' | 'yearly',
  amountInPaise: number
): Promise<string> {
  const cacheKey = `${tier}_${billingCycle}_${amountInPaise}`;
  const cached = razorpayPlanCache.get(cacheKey);
  if (cached) return cached;

  const envPlanKey = `RAZORPAY_PLAN_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;
  const configuredPlanId = process.env[envPlanKey];
  if (configuredPlanId) {
    razorpayPlanCache.set(cacheKey, configuredPlanId);
    return configuredPlanId;
  }

  const planLabel = tier === 'advanced' ? 'Advanced Pro' : 'Beginner';
  const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
  const planRes = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authHeader}` },
    body: JSON.stringify({
      period: billingCycle,
      interval: 1,
      item: {
        name: `Tradedia ${planLabel} (${cycleLabel})`,
        amount: amountInPaise,
        currency: 'INR',
        description: `Tradedia ${planLabel} ${cycleLabel} recurring subscription`,
      },
    }),
  });

  if (!planRes.ok) {
    const errBody = await planRes.text();
    throw new Error(`Razorpay plan creation failed (${planRes.status}): ${errBody}`);
  }

  const planData = (await planRes.json()) as { id: string };
  razorpayPlanCache.set(cacheKey, planData.id);
  return planData.id;
}

export function createPaymentOrderRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(store);
  const paymentRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 30, keyPrefix: 'payments_order' });

  router.post('/payments/create-order', paymentRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const credsRes = resolveRazorpayCredentials();
      if (!credsRes.ok) {
        res.status(credsRes.status).json({ success: false, code: credsRes.code, message: credsRes.message });
        return;
      }

      const { tier, billingCycle, upiId } = req.body || {};
      if (tier !== 'beginner' && tier !== 'advanced') {
        res.status(400).json({
          success: false,
          code: 'INVALID_SUBSCRIPTION_TIER',
          message: 'Only Beginner and Advanced recurring subscriptions are supported.',
        });
        return;
      }
      const validTier: 'beginner' | 'advanced' = tier;
      const validCycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';

      const userAccount = resolveOrCreateCanonicalUser(
        { preferredUid: authUser.uid, email: authUser.email, name: authUser.name, authProvider: authUser.authProvider },
        store
      );
      const priceQuote = computeAuthoritativePrice({ targetTier: validTier, billingCycle: validCycle, userAccount });

      const { keyId, keySecret } = credsRes.creds;
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const receipt = `rcpt_${validTier}_${Date.now()}`;
      const now = Date.now();

      const planAmountInPaise = priceQuote.fullPriceINR * 100;
      const planId = await getOrCreateRazorpayPlan(authHeader, validTier, validCycle, planAmountInPaise);
      const cycleDurationSec = validCycle === 'yearly' ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
      const subscriptionPayload: Record<string, unknown> = {
        plan_id: planId,
        total_count: validCycle === 'yearly' ? 10 : 120,
        quantity: 1,
        customer_notify: 1,
        notes: { tier: validTier, billingCycle: validCycle, userId: userAccount.uid, email: userAccount.email, name: userAccount.name },
      };

      if (priceQuote.isDifferentialUpgrade) {
        subscriptionPayload.start_at = Math.floor(now / 1000) + cycleDurationSec;
        subscriptionPayload.addons = [{
          item: {
            name: `Tier Upgrade Differential to Advanced (${validCycle})`,
            amount: priceQuote.amountInPaise,
            currency: 'INR',
          },
        }];
      }

      const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authHeader}` },
        body: JSON.stringify(subscriptionPayload),
      });
      if (!subRes.ok) {
        res.status(502).json({ success: false, message: 'Unable to create Razorpay subscription. Please try again.' });
        return;
      }
      const subData = (await subRes.json()) as { id: string };

      store.getState().paymentIntents[subData.id] = {
        intentId: subData.id, userId: userAccount.uid, userEmail: userAccount.email,
        tier: validTier, billingCycle: validCycle, paymentType: 'subscription',
        expectedAmountPaise: priceQuote.amountInPaise, fullPriceINR: priceQuote.fullPriceINR,
        creditAppliedINR: priceQuote.creditAppliedINR, currency: 'INR', status: 'created',
        previousSubscriptionId: priceQuote.previousSubscriptionId, createdAt: now,
      };
      await store.flush();

      res.json({
        success: true, mode: 'razorpay_api', paymentType: 'subscription', keyId,
        subscriptionId: subData.id, planId, orderId: subData.id,
        amount: priceQuote.amountInPaise, amountInINR: priceQuote.payableINR,
        fullPriceINR: priceQuote.fullPriceINR, creditAppliedINR: priceQuote.creditAppliedINR,
        autoPayEnabled: true, upiId: typeof upiId === 'string' ? upiId : undefined,
        currency: 'INR', tier: validTier, billingCycle: validCycle, receipt,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to create Razorpay order') });
    }
  });

  return router;
}
