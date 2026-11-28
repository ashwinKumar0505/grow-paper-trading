import type { NextFunction, Request, Response } from 'express';
import { verifyBearerToken, type VerifiedAuthIdentity } from '../auth/authService';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { pruneMapEntries, setBoundedMapEntry } from '../utils/boundedCache';

export interface AuthenticatedRequest extends Request {
  authUser?: VerifiedAuthIdentity;
  rawBody?: Buffer;
}

const DEFAULT_DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export function getAllowedOrigins(env: Record<string, string | undefined> = process.env): Set<string> {
  const raw = env.ALLOWED_ORIGINS || '';
  const configured = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (configured.length > 0) {
    return new Set(configured);
  }
  return env.NODE_ENV === 'production' ? new Set() : DEFAULT_DEV_ORIGINS;
}

export function securityHeadersAndCors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  const origin = req.headers.origin;
  if (origin) {
    const allowed = getAllowedOrigins();
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    if (allowed.has(origin) || origin === hostOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Idempotency-Key, X-Razorpay-Signature'
      );
      res.setHeader('Vary', 'Origin');
    } else if (req.path.startsWith('/api/')) {
      res.status(403).json({
        success: false,
        code: 'CORS_ORIGIN_FORBIDDEN',
        message: 'Cross-origin request from untrusted origin is not permitted.',
      });
      return;
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

const MAX_RATE_BUCKETS = 2000;
const rateBuckets = new Map<string, { windowStart: number; count: number; windowMs: number }>();

export function pruneRateLimitBuckets(now = Date.now()): number {
  return pruneMapEntries(rateBuckets, (entry) => now - entry.windowStart >= entry.windowMs, MAX_RATE_BUCKETS);
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (rateBuckets.size >= MAX_RATE_BUCKETS) {
      pruneRateLimitBuckets(now);
    }
    const subject = req.authUser?.uid || req.ip || req.socket?.remoteAddress || 'anon';
    const key = `${options.keyPrefix}:${subject}`;
    const current = rateBuckets.get(key);

    if (current && now - current.windowStart < options.windowMs) {
      if (current.count >= options.maxRequests) {
        const retryAfter = Math.ceil((options.windowMs - (now - current.windowStart)) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again shortly.',
          retryAfterSeconds: retryAfter,
        });
        return;
      }
      current.count += 1;
    } else {
      setBoundedMapEntry(
        rateBuckets,
        key,
        { windowStart: now, count: 1, windowMs: options.windowMs },
        MAX_RATE_BUCKETS
      );
    }
    next();
  };
}

export function createRequireAuth(store: DurableStore = defaultStore) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication required. Please sign in to continue.',
      });
      return;
    }

    const identity = await verifyBearerToken(match[1], store);
    if (!identity) {
      res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_INVALID',
        message: 'Your session has expired or is invalid. Please sign in again.',
      });
      return;
    }

    req.authUser = identity;
    next();
  };
}

export function sanitizeErrorMessage(err: unknown, fallback = 'An unexpected server error occurred.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  return raw
    .replace(/rzp_(test|live)_[A-Za-z0-9]+/g, '[REDACTED_KEY]')
    .replace(/re_[A-Za-z0-9_]+/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
}
