import crypto from 'crypto';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { resolveFirestoreConfig } from '../storage/firestoreRestClient';
import {
  getSessionSecret,
  normalizeEmailAddress,
  resolveOrCreateCanonicalUser,
  SESSION_TTL_MS,
  type VerifiedAuthIdentity,
} from './authService';

export function issueSessionToken(
  identity: Omit<VerifiedAuthIdentity, 'tokenId' | 'expiresAt'>,
  now = Date.now(),
  ttlMs = SESSION_TTL_MS
): { token: string; tokenId: string; expiresAt: number } {
  const secret = getSessionSecret();
  const tokenId = `tok_${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = now + ttlMs;
  const payloadObj = {
    jti: tokenId,
    sub: identity.uid,
    email: normalizeEmailAddress(identity.email),
    name: identity.name,
    provider: identity.authProvider,
    iat: now,
    exp: expiresAt,
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'NL_JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return {
    token: `${headerB64}.${payloadB64}.${signature}`,
    tokenId,
    expiresAt,
  };
}

export function tryCreateFirebaseCustomToken(uid: string, email: string): string | null {
  const cfg = resolveFirestoreConfig(process.env);
  if (!cfg) return null;
  try {
    const clientEmail = cfg.clientEmail;
    const privateKey = cfg.privateKey;
    const nowSec = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: nowSec,
        exp: nowSec + 3600,
        uid,
        claims: { email, email_verified: true },
      })
    ).toString('base64url');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const sig = signer.sign(privateKey, 'base64url');
    return `${header}.${payload}.${sig}`;
  } catch {
    return null;
  }
}

let googleCertsCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (googleCertsCache && Date.now() < googleCertsCache.expiresAt) {
    return googleCertsCache.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) throw new Error('Unable to fetch Google SecureToken public certificates');
  const certs = (await res.json()) as Record<string, string>;
  googleCertsCache = { certs, expiresAt: Date.now() + 3600 * 1000 };
  return certs;
}

export async function verifyBearerToken(
  token: string,
  store: DurableStore = defaultStore,
  now = Date.now()
): Promise<VerifiedAuthIdentity | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: string;
      typ?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;

    if (header.alg === 'HS256' && header.typ === 'NL_JWT') {
      const secret = getSessionSecret();
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest('base64url');
      const a = Buffer.from(parts[2], 'utf8');
      const b = Buffer.from(expectedSig, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

      const exp = Number(payload.exp || 0);
      const jti = String(payload.jti || '');
      const uid = String(payload.sub || '');
      const email = normalizeEmailAddress(payload.email);
      if (!uid || !email || exp <= now) return null;
      if (jti && store.getState().revokedTokens[jti]) return null;

      return {
        uid,
        email,
        name: String(payload.name || email.split('@')[0]),
        authProvider: payload.provider === 'google' ? 'google' : 'email',
        tokenId: jti,
        expiresAt: exp,
      };
    }

    const nowSec = Math.floor(now / 1000);
    const expSec = Number(payload.exp || 0);
    const sub = String(payload.sub || payload.user_id || '');
    const email = normalizeEmailAddress(payload.email);
    if (!sub || !email || expSec <= nowSec) return null;
    if (payload.email_verified === false) return null;

    const projectId =
      process.env.VITE_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      'tradedia-b6cb0';

    if (payload.aud && payload.aud !== projectId) return null;
    if (payload.iss && payload.iss !== `https://securetoken.google.com/${projectId}`) return null;

    const isEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) && header.alg === 'none';
    if (!isEmulator) {
      if (header.alg !== 'RS256' || !header.kid) return null;
      const certs = await fetchGooglePublicCerts();
      const cert = certs[header.kid];
      if (!cert) return null;
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${parts[0]}.${parts[1]}`);
      if (!verifier.verify(cert, parts[2], 'base64url')) return null;
    }

    const firebaseClaim = payload.firebase as { sign_in_provider?: unknown } | undefined;
    const authProvider: 'google' | 'email' =
      firebaseClaim?.sign_in_provider === 'password' ? 'email' : 'google';

    const canonical = resolveOrCreateCanonicalUser(
      {
        preferredUid: sub,
        email,
        name: String(payload.name || email.split('@')[0]),
        authProvider,
        avatar: typeof payload.picture === 'string' ? payload.picture : undefined,
      },
      store,
      now
    );

    return {
      uid: canonical.uid,
      email: canonical.email,
      name: canonical.name,
      authProvider,
      tokenId: `fb_${sub}_${expSec}`,
      expiresAt: expSec * 1000,
    };
  } catch {
    return null;
  }
}

export function revokeSessionToken(
  tokenId: string,
  expiresAt: number,
  store: DurableStore = defaultStore
): void {
  if (!tokenId) return;
  store.getState().revokedTokens[tokenId] = expiresAt;
  store.persist();
}
