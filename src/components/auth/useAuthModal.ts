import { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { auth, googleProvider, isFirebaseConfigured, signInWithPopup } from '../../lib/firebase';
import { buildEmailUid, normalizeEmail } from '../../features/virtual-trading/utils/userProfileSync';

function mapGoogleAuthError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
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

export function useAuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    signInUser,
    signUpUser,
    addToast,
  } = useTrading();

  const isSignUp = authModalMode === 'signup';
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isOtpLoading, setIsOtpLoading] = useState<boolean>(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [otpStep, setOtpStep] = useState<'input_email' | 'enter_otp'>('input_email');
  const [otpCode, setOtpCode] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setOtpStep('input_email');
      setOtpCode('');
      setErrorMsg('');
      setResendTimer(30);
      setCanResend(false);
    }
  }, [isAuthModalOpen, authModalMode]);

  useEffect(() => {
    if (otpStep !== 'enter_otp' || resendTimer <= 0) {
      if (resendTimer === 0) setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, resendTimer]);

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    if (!isFirebaseConfigured) {
      setErrorMsg('Firebase is not configured. Add your Firebase Web App config to .env or firebase-applet-config.json.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const userEmail = fbUser.email ? normalizeEmail(fbUser.email) : '';
      if (!userEmail) {
        setErrorMsg('Google account did not return an email address. Please try another account.');
        return;
      }

      const displayName = fbUser.displayName || userEmail.split('@')[0];
      const avatar = fbUser.photoURL || undefined;

      if (isSignUp) {
        await signUpUser({
          uid: fbUser.uid,
          name: displayName,
          email: userEmail,
          authProvider: 'google',
          avatar,
          initialCash: 100000,
        });
      } else {
        await signInUser({
          uid: fbUser.uid,
          name: displayName,
          email: userEmail,
          authProvider: 'google',
          avatar,
        });
      }
    } catch (popupErr) {
      setErrorMsg(mapGoogleAuthError(popupErr));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const requestOtp = async (targetEmail: string, isResend = false) => {
    setIsOtpLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to send verification OTP.');
        return;
      }

      setOtpStep('enter_otp');
      setResendTimer(30);
      setCanResend(false);

      addToast(
        isResend ? 'New OTP Sent' : 'Verification OTP Sent!',
        `Check your inbox at ${targetEmail} for the 6-digit code.`,
        'info'
      );
    } catch {
      setErrorMsg('Unable to reach the authentication server. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSignUp && !name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    await requestOtp(normalized, false);
  };

  const handleResendOtp = async () => {
    await requestOtp(normalizeEmail(email), true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normalized = normalizeEmail(email);
    const trimmedCode = otpCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, code: trimmedCode }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Invalid verification code. Please try again.');
        return;
      }

      const userUid = buildEmailUid(normalized);
      if (isSignUp) {
        await signUpUser({
          uid: userUid,
          name: name.trim(),
          email: normalized,
          authProvider: 'email',
          initialCash: 100000,
        });
      } else {
        await signInUser({
          uid: userUid,
          name: name.trim() || normalized.split('@')[0],
          email: normalized,
          authProvider: 'email',
        });
      }
    } catch {
      setErrorMsg('Unable to verify OTP right now. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  return {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    isSignUp,
    isGoogleLoading,
    isOtpLoading,
    name,
    setName,
    email,
    setEmail,
    errorMsg,
    otpStep,
    setOtpStep,
    otpCode,
    setOtpCode,
    resendTimer,
    canResend,
    handleGoogleAuth,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
  };
}
