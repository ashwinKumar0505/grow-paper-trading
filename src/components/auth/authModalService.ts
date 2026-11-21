import { setStoredSessionToken } from '../../lib/authSession';

export function mapGoogleAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled. Please choose an account to continue.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Auth. Add it under Firebase Console -> Authentication -> Settings -> Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console -> Authentication -> Sign-in method.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check your Firebase config in .env or firebase-applet-config.json.';
    default:
      return err instanceof Error ? err.message : 'Google authentication failed. Please try again.';
  }
}

export async function exchangeGoogleServerSession(params: {
  idToken: string;
  fallbackUid: string;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<string> {
  let canonicalUid = params.fallbackUid;
  try {
    const sessionRes = await fetch('/api/auth/google-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({ name: params.displayName, avatar: params.photoURL }),
    });
    if (sessionRes.ok) {
      const sessionData = (await sessionRes.json()) as {
        sessionToken?: string;
        uid?: string;
      };
      setStoredSessionToken(sessionData.sessionToken || params.idToken);
      if (sessionData.uid) canonicalUid = sessionData.uid;
    } else {
      setStoredSessionToken(params.idToken);
    }
  } catch {
    setStoredSessionToken(params.idToken);
  }
  return canonicalUid;
}

export async function requestEmailOtp(targetEmail: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: targetEmail }),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !data.success) {
    return { ok: false, message: data.message || 'Failed to send verification OTP.' };
  }
  return { ok: true, message: data.message };
}

export async function verifyEmailOtpRequest(params: {
  email: string;
  code: string;
  name: string;
}): Promise<{ ok: boolean; uid?: string; message?: string }> {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    uid?: string;
    sessionToken?: string;
  };
  if (!res.ok || !data.success) {
    return { ok: false, message: data.message || 'Invalid verification code. Please try again.' };
  }
  if (data.sessionToken) {
    setStoredSessionToken(data.sessionToken);
  }
  return { ok: true, uid: data.uid };
}
