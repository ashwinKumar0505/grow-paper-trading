import crypto from 'crypto';
import type { Request, Response } from 'express';
import { verifyBearerToken } from '../auth/authService';
import { resolveAuthoritativeUserTier } from '../entitlements/entitlementService';
import { sanitizeErrorMessage } from '../middleware/security';
import { defaultStore } from '../storage/durableStore';

interface ProxyCauseSummary {
  code?: string;
  detail?: string;
  logDetail?: string;
}

function summarizeProxyError(err: unknown): ProxyCauseSummary {
  if (!(err instanceof Error) || !('cause' in err)) return {};
  const cause = (err as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') {
    return typeof cause === 'string' ? { detail: cause, logDetail: cause } : {};
  }
  const rec = cause as Record<string, unknown>;
  const nested = Array.isArray(rec.errors) ? rec.errors : [];
  if (nested.length > 0) {
    const parts = nested.map((item) => {
      if (!item || typeof item !== 'object') return String(item);
      const r = item as Record<string, unknown>;
      const code = typeof r.code === 'string' ? r.code : 'ERR';
      const target =
        typeof r.address === 'string'
          ? `${r.address}${typeof r.port === 'number' ? `:${r.port}` : ''}`
          : '';
      return target ? `${code} ${target}` : code;
    });
    const first = nested[0] as Record<string, unknown> | undefined;
    const firstCode = first && typeof first.code === 'string' ? first.code : undefined;
    return { code: firstCode, detail: parts.join('; '), logDetail: parts.join('; ') };
  }
  const code = typeof rec.code === 'string' ? rec.code : undefined;
  const target =
    typeof rec.address === 'string'
      ? `${rec.address}${typeof rec.port === 'number' ? `:${rec.port}` : ''}`
      : '';
  const msg = typeof rec.message === 'string' ? rec.message : undefined;
  const logDetail = [code, target, msg].filter(Boolean).join(' ');
  return { code, detail: code || msg, logDetail: logDetail || undefined };
}

/**
 * Same-origin proxy to Python FastAPI Screener Backend (/api/v1/* -> 8001 / 8000)
 * with HMAC-signed service headers.
 */
export async function handleScreenerProxyRequest(req: Request, res: Response): Promise<void> {
  const subPath = req.originalUrl.replace(/^\/api\/v1/, '') || '/';
  const urlPathOnly = `/api/v1${subPath.split('?')[0]}`;
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const configuredBase = process.env.SCREENER_BACKEND_URL?.trim();
  const bases = isProd
    ? [configuredBase].filter((b): b is string => Boolean(b))
    : [configuredBase, 'http://127.0.0.1:8001/api/v1', 'http://127.0.0.1:8000/api/v1'].filter(
        (b): b is string => Boolean(b)
      );

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
    const rawCtxB64 = Buffer.from(
      JSON.stringify({ user_id: userId, subscription_tier: backendTier, roles: ['user'] })
    ).toString('base64url');
    const ctxB64 = rawCtxB64 + '='.repeat((4 - (rawCtxB64.length % 4)) % 4);
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
        signal: AbortSignal.timeout(180_000),
      });
      const text = await upstreamRes.text();
      res.status(upstreamRes.status);
      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
      res.send(text);
      return;
    } catch (err) {
      lastErr = err;
      const summary = summarizeProxyError(err);
      console.error(
        `[screener-proxy] Failed reaching ${base.replace(/\/$/, '')}${urlPathOnly.replace(/^\/api\/v1/, '')}:`,
        sanitizeErrorMessage(err, 'fetch failed'),
        summary.logDetail ? `(${summary.logDetail})` : ''
      );
    }
  }

  const baseMsg = sanitizeErrorMessage(lastErr, 'Python screener analytics backend is unreachable.');
  const summary = summarizeProxyError(lastErr);
  const combinedMsg =
    summary.detail && !baseMsg.includes(summary.detail)
      ? `${baseMsg} (${sanitizeErrorMessage(summary.detail, '')})`
      : baseMsg;

  res.status(503).json({
    status: 'ERROR',
    error_code: 'SCREENER_BACKEND_UNREACHABLE',
    message: combinedMsg,
  });
}
