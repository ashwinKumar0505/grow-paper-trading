import { auth } from './firebase';

const AUTH_TOKEN_KEY = 'tradedia_auth_token_v1';

export function getStoredSessionToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage access warnings
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isJwtTokenExpired(token: string, now = Date.now(), skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  const rawExp = payload?.exp;
  if (typeof rawExp !== 'number' || !Number.isFinite(rawExp)) return false;
  const expMs = rawExp > 1e12 ? rawExp : rawExp * 1000;
  return expMs <= now + skewMs;
}

export async function getActiveBearerToken(): Promise<string | null> {
  const stored = getStoredSessionToken();
  if (stored) {
    if (!isJwtTokenExpired(stored)) return stored;
    setStoredSessionToken(null);
  }
  try {
    if (auth?.currentUser) {
      const fbToken = await auth.currentUser.getIdToken();
      if (fbToken) return fbToken;
    }
  } catch {
    // Ignore Firebase token retrieval error in offline/guest mode
  }
  return null;
}

export async function buildAuthenticatedHeaders(
  extra: Record<string, string> = {},
  explicitToken?: string
): Promise<Record<string, string>> {
  const token = explicitToken || (await getActiveBearerToken());
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
