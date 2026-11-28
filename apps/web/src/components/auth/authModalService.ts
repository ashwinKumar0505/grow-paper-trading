import {
  canRequestSignupConversionClaim,
  trackSignUp,
  type SignupConversionPayload,
} from '../../lib/analytics';
import { setStoredSessionToken } from '../../lib/authSession';
export {
  confirmSignupConversionWithBackend,
  dispatchVerifiedSignupConversion,
} from './signupConversionClient';
import {
  auth,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  type FirebaseUser,
} from '../../lib/firebase';

export function mapFirebaseAuthError(err: unknown, provider: 'google' | 'email' = 'email'): string {
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
      return provider === 'google'
        ? 'Google Sign-In is not enabled in Firebase Console -> Authentication -> Sign-in method.'
        : 'Email/Password sign-in is not enabled in Firebase Console -> Authentication -> Sign-in method.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check your Firebase config in .env or firebase-applet-config.json.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Auth. Please check your connection and try again.';
    default:
      return err instanceof Error
        ? err.message
        : provider === 'google'
          ? 'Google authentication failed. Please try again.'
          : 'Authentication failed. Please try again.';
  }
}

export function mapGoogleAuthError(err: unknown): string {
  return mapFirebaseAuthError(err, 'google');
}

export interface FirebaseServerSessionResult {
  uid: string;
  isNewAccount: boolean;
  signupConversion: SignupConversionPayload | null;
  sessionToken?: string;
}

export async function exchangeFirebaseServerSessionDetails(params: {
  idToken: string;
  fallbackUid: string;
  displayName?: string | null;
  photoURL?: string | null;
  authProvider?: 'google' | 'email';
  claimSignupConversion?: boolean;
}): Promise<FirebaseServerSessionResult> {
  let canonicalUid = params.fallbackUid;
  let isNewAccount = false;
  let signupConversion: SignupConversionPayload | null = null;
  let sessionToken: string | undefined;
  const shouldRequestClaim =
    params.claimSignupConversion === true && canRequestSignupConversionClaim();
  try {
    const sessionRes = await fetch('/api/auth/firebase-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({
        name: params.displayName,
        avatar: params.photoURL,
        authProvider: params.authProvider,
        claimSignupConversion: shouldRequestClaim,
      }),
    });
    if (sessionRes.ok) {
      const sessionData = (await sessionRes.json()) as {
        sessionToken?: string;
        uid?: string;
        isNewAccount?: boolean;
        signupConversion?: SignupConversionPayload | null;
      };
      sessionToken = sessionData.sessionToken || params.idToken;
      setStoredSessionToken(sessionToken);
      if (sessionData.uid) canonicalUid = sessionData.uid;
      isNewAccount = sessionData.isNewAccount === true;
      if (
        sessionData.signupConversion?.eligible === true &&
        typeof sessionData.signupConversion.conversionId === 'string' &&
        sessionData.signupConversion.conversionId.length > 0
      ) {
        signupConversion = {
          eligible: true,
          conversionId: sessionData.signupConversion.conversionId,
          method:
            sessionData.signupConversion.method === 'google' ||
            sessionData.signupConversion.method === 'email'
              ? sessionData.signupConversion.method
              : params.authProvider || 'email',
        };
      }
    } else {
      setStoredSessionToken(params.idToken);
    }
  } catch {
    setStoredSessionToken(params.idToken);
  }
  return { uid: canonicalUid, isNewAccount, signupConversion, sessionToken };
}

export async function exchangeFirebaseServerSession(params: {
  idToken: string;
  fallbackUid: string;
  displayName?: string | null;
  photoURL?: string | null;
  authProvider?: 'google' | 'email';
  claimSignupConversion?: boolean;
}): Promise<string> {
  const result = await exchangeFirebaseServerSessionDetails(params);
  return result.uid;
}

export async function exchangeGoogleServerSession(params: {
  idToken: string;
  fallbackUid: string;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<string> {
  return exchangeFirebaseServerSession({ ...params, authProvider: 'google' });
}

export async function registerEmailPasswordAccount(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
  if (params.displayName) {
    await updateProfile(credential.user, { displayName: params.displayName }).catch(() => {});
  }
  await sendEmailVerification(credential.user);
  await firebaseSignOut(auth);
  trackSignUp('email');
}

export async function authenticateEmailPasswordAccount(params: {
  email: string;
  password: string;
}): Promise<{ verified: true; user: FirebaseUser } | { verified: false }> {
  const credential = await signInWithEmailAndPassword(auth, params.email, params.password);
  if (!credential.user.emailVerified) {
    await firebaseSignOut(auth);
    return { verified: false };
  }
  return { verified: true, user: credential.user };
}

export async function resendEmailVerificationLink(params: {
  email: string;
  password: string;
}): Promise<{ alreadyVerified: true; user: FirebaseUser } | { alreadyVerified: false }> {
  const credential = await signInWithEmailAndPassword(auth, params.email, params.password);
  if (credential.user.emailVerified) {
    return { alreadyVerified: true, user: credential.user };
  }
  await sendEmailVerification(credential.user);
  await firebaseSignOut(auth);
  return { alreadyVerified: false };
}
