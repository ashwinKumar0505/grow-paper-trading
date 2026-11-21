import { Router, type Request, type Response } from 'express';
import { createRateLimiter, createRequireAuth, sanitizeErrorMessage, type AuthenticatedRequest } from '../middleware/security';
import { processRazorpayWebhook, resolveRazorpayCredentials, verifyAndActivatePayment } from '../payments/razorpayService';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';

export function createSubscriptionManageRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(store);
  const paymentRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 30, keyPrefix: 'payments_manage' });

  router.post('/payments/verify', paymentRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const {
        razorpay_order_id,
        razorpay_subscription_id,
        razorpay_payment_id,
        razorpay_signature,
        amountPaise,
        currency,
      } = req.body || {};

      const credsRes = resolveRazorpayCredentials();
      const cancelUpstreamFn = credsRes.ok
        ? async (oldSubId: string) => {
            const authHeader = Buffer.from(`${credsRes.creds.keyId}:${credsRes.creds.keySecret}`).toString('base64');
            await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(oldSubId)}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authHeader}` },
              body: JSON.stringify({ cancel_at_cycle_end: 0 }),
            });
          }
        : undefined;

      const result = await verifyAndActivatePayment({
        authenticatedUserId: authUser.uid,
        razorpayOrderId: typeof razorpay_order_id === 'string' ? razorpay_order_id : undefined,
        razorpaySubscriptionId: typeof razorpay_subscription_id === 'string' ? razorpay_subscription_id : undefined,
        razorpayPaymentId: typeof razorpay_payment_id === 'string' ? razorpay_payment_id : '',
        razorpaySignature: typeof razorpay_signature === 'string' ? razorpay_signature : '',
        reportedAmountPaise: typeof amountPaise === 'number' ? amountPaise : undefined,
        reportedCurrency: typeof currency === 'string' ? currency : undefined,
        store,
        cancelUpstreamSubscriptionFn: cancelUpstreamFn,
      });

      res.status(result.status).json(result);
    } catch (err) {
      res.status(500).json({ success: false, verified: false, message: sanitizeErrorMessage(err, 'Payment verification failed') });
    }
  });

  router.post('/payments/webhook', async (req: Request, res: Response) => {
    try {
      const signature = typeof req.headers['x-razorpay-signature'] === 'string' ? req.headers['x-razorpay-signature'] : undefined;
      const eventId = typeof req.headers['x-razorpay-event-id'] === 'string' ? req.headers['x-razorpay-event-id'] : undefined;
      const rawBody = (req as AuthenticatedRequest).rawBody;

      const result = await processRazorpayWebhook({
        rawBody,
        signature,
        eventIdHeader: eventId,
        payload: (req.body || {}) as Record<string, unknown>,
        store,
      });
      res.status(result.status).json(result);
    } catch (err) {
      res.status(500).json({ received: false, message: sanitizeErrorMessage(err, 'Webhook processing error') });
    }
  });

  router.post('/payments/subscription-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const user = store.getState().users[authUser.uid];
      const subscriptionId =
        typeof req.body?.subscriptionId === 'string' && req.body.subscriptionId.trim()
          ? req.body.subscriptionId.trim()
          : user?.razorpaySubscriptionId || '';

      if (user?.razorpaySubscriptionId && subscriptionId && subscriptionId !== user.razorpaySubscriptionId) {
        res.status(403).json({ success: false, message: 'Cannot query a subscription belonging to another user.' });
        return;
      }

      const credsRes = resolveRazorpayCredentials();
      if (credsRes.ok && subscriptionId.startsWith('sub_')) {
        const authHeader = Buffer.from(`${credsRes.creds.keyId}:${credsRes.creds.keySecret}`).toString('base64');
        const rzpRes = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
          { headers: { Authorization: `Basic ${authHeader}` } }
        );
        if (rzpRes.ok) {
          const subData = (await rzpRes.json()) as Record<string, unknown>;
          res.json({
            success: true, mode: 'razorpay_api', subscriptionId, status: subData.status,
            currentStartMs: typeof subData.current_start === 'number' ? subData.current_start * 1000 : null,
            currentEndMs: typeof subData.current_end === 'number' ? subData.current_end * 1000 : null,
            chargeAtMs: typeof subData.charge_at === 'number' ? subData.charge_at * 1000 : null,
            endedAtMs: typeof subData.ended_at === 'number' ? subData.ended_at * 1000 : null,
          });
          return;
        }
      }

      res.json({
        success: true, mode: 'local',
        subscriptionId: user?.razorpaySubscriptionId,
        status: user?.subscriptionStatus || 'active',
        currentEndMs: user?.subscriptionExpiresAt ?? null,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Unable to fetch subscription status') });
    }
  });

  router.post('/payments/cancel-subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const user = store.getState().users[authUser.uid];
      const subscriptionId =
        typeof req.body?.subscriptionId === 'string' && req.body.subscriptionId.trim()
          ? req.body.subscriptionId.trim()
          : user?.razorpaySubscriptionId || '';

      if (user?.razorpaySubscriptionId && subscriptionId && subscriptionId !== user.razorpaySubscriptionId) {
        res.status(403).json({ success: false, message: 'Cannot cancel a subscription belonging to another user.' });
        return;
      }

      const credsRes = resolveRazorpayCredentials();
      let currentEndMs: number | undefined = user?.subscriptionExpiresAt ?? undefined;
      let endedAtMs: number | undefined;
      let mode: 'razorpay_api' | 'local' = 'local';

      if (credsRes.ok && subscriptionId.startsWith('sub_')) {
        const authHeader = Buffer.from(`${credsRes.creds.keyId}:${credsRes.creds.keySecret}`).toString('base64');
        const rzpRes = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authHeader}` },
            body: JSON.stringify({ cancel_at_cycle_end: 1 }),
          }
        );

        if (rzpRes.ok) {
          const subData = (await rzpRes.json()) as Record<string, unknown>;
          mode = 'razorpay_api';
          if (typeof subData.current_end === 'number') currentEndMs = subData.current_end * 1000;
          if (typeof subData.ended_at === 'number') endedAtMs = subData.ended_at * 1000;
        }
      }

      if (user) {
        user.subscriptionStatus = 'cancelled';
        user.subscriptionAutoPay = false;
        if (currentEndMs) user.subscriptionExpiresAt = currentEndMs;
        user.subscriptionUpdatedAt = Date.now();
        user.updatedAt = Date.now();
        store.appendAudit({
          userId: user.uid, category: 'SUBSCRIPTION', action: 'SUBSCRIPTION_CANCELLED_BY_USER',
          details: { subscriptionId, currentEndMs },
        });
        store.persist();
      }

      res.json({
        success: true, cancelled: true, mode, subscriptionId,
        status: 'cancelled', currentEndMs, endedAtMs,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Subscription cancellation failed') });
    }
  });

  router.post('/payments/billing-history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const durableItems = store.getState().billingHistory[authUser.uid] || [];
      res.json({
        success: true,
        mode: resolveRazorpayCredentials().ok ? 'razorpay_api' : 'local',
        items: durableItems,
      });
    } catch (err) {
      res.status(500).json({ success: false, items: [], message: sanitizeErrorMessage(err, 'Unable to fetch billing history') });
    }
  });

  return router;
}
