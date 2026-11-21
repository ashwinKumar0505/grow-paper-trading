import crypto from 'crypto';
import type { Request, Response } from 'express';
import { verifyBearerToken } from '../auth/authService';
import { resolveAuthoritativeUserTier } from '../entitlements/entitlementService';
import { sanitizeErrorMessage } from '../middleware/security';
import { defaultStore } from '../storage/durableStore';

/**
 * Same-origin proxy to Python FastAPI Screener Backend (/api/v1/* -> 8001 / 8000)
 * with HMAC-signed service headers.
 */
export async function handleScreenerProxyRequest(req: Request, res: Response): Promise<void> {
  const subPath = req.originalUrl.replace(/^\/api\/v1/, '') || '/';
  const urlPathOnly = `/api/v1${subPath.split('?')[0]}`;
  const bases = [
    process.env.SCREENER_BACKEND_URL,
    'http://127.0.0.1:8001/api/v1',
    'http://127.0.0.1:8000/api/v1',
  ].filter((b): b is string => Boolean(b));

  let userId = 'anonymous';
  let backendTier = 'FREE';
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    const identity = await verifyBearerToken(match[1], defaultStore).catch(() => null);
    if (identity) {
      userId = identity.uid;
      const userRecord = defaultStore.getState().users[identity.uid];
      const { tier } = resolveAuthoritativeUserTier(userRecord);
      backendTier = tier === 'advanced' ? 'PREMIUM' : tier === 'beginner' ? 'PRO' : 'FREE';
    }
  }

  const secret = process.env.SERVICE_AUTH_SECRET || process.env.SCREENER_SERVICE_SECRET || '';
  const serviceHeaders: Record<string, string> = {};
  if (secret) {
    const tsStr = String(Math.floor(Date.now() / 1000));
    const ctxB64 = Buffer.from(
      JSON.stringify({ user_id: userId, subscription_tier: backendTier, roles: ['user'] })
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${tsStr}.${req.method.toUpperCase()}.${urlPathOnly}.${ctxB64}`)
      .digest('hex');
    serviceHeaders['X-Service-Timestamp'] = tsStr;
    serviceHeaders['X-User-Context'] = ctxB64;
    serviceHeaders['X-Service-Signature'] = sig;
  }

  let lastErr: unknown = null;
  for (const base of bases) {
    try {
      const targetUrl = `${base.replace(/\/$/, '')}${subPath}`;
      const hasBody =
        req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0;
      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...serviceHeaders,
        },
        body: hasBody ? JSON.stringify(req.body) : undefined,
      });
      const text = await upstreamRes.text();
      res.status(upstreamRes.status);
      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
      res.send(text);
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  res.status(503).json({
    status: 'ERROR',
    error_code: 'SCREENER_BACKEND_UNREACHABLE',
    message: sanitizeErrorMessage(lastErr, 'Python screener analytics backend is unreachable.'),
  });
}
