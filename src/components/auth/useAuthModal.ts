import { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { auth, googleProvider, isFirebaseConfigured, signInWithPopup } from '../../lib/firebase';
import { buildEmailUid, normalizeEmail } from '../../features/virtual-trading/utils/userProfileSync';
import {
  exchangeGoogleServerSession,
  mapGoogleAuthError,
  requestEmailOtp,
  verifyEmailOtpRequest,
} from './authModalService';

export function useAuthModal() {
  const {
    isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode,
    signInUser, signUpUser, addToast,
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
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
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

      const idToken = await fbUser.getIdToken();
      const canonicalUid = await exchangeGoogleServerSession({
        idToken, fallbackUid: fbUser.uid, displayName: fbUser.displayName, photoURL: fbUser.photoURL,
      });

      const displayName = fbUser.displayName || userEmail.split('@')[0];
      const avatar = fbUser.photoURL || undefined;

      if (isSignUp) {
        await signUpUser({ uid: canonicalUid, name: displayName, email: userEmail, authProvider: 'google', avatar, initialCash: 100000 });
      } else {
        await signInUser({ uid: canonicalUid, name: displayName, email: userEmail, authProvider: 'google', avatar });
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
      const result = await requestEmailOtp(targetEmail);
      if (!result.ok) {
        setErrorMsg(result.message || 'Failed to send verification OTP.');
        return;
      }
      setOtpStep('enter_otp');
      setResendTimer(30);
      setCanResend(false);
      addToast(isResend ? 'New OTP Sent' : 'Verification OTP Sent!', `Check your inbox at ${targetEmail} for the 6-digit code.`, 'info');
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
      const result = await verifyEmailOtpRequest({ email: normalized, code: trimmedCode, name: name.trim() });
      if (!result.ok) {
        setErrorMsg(result.message || 'Invalid verification code. Please try again.');
        return;
      }
      const userUid = result.uid || buildEmailUid(normalized);
      if (isSignUp) {
        await signUpUser({ uid: userUid, name: name.trim(), email: normalized, authProvider: 'email', initialCash: 100000 });
      } else {
        await signInUser({ uid: userUid, name: name.trim() || normalized.split('@')[0], email: normalized, authProvider: 'email' });
      }
    } catch {
      setErrorMsg('Unable to verify OTP right now. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  return {
    isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode,
    isSignUp, isGoogleLoading, isOtpLoading, name, setName, email, setEmail,
    errorMsg, otpStep, setOtpStep, otpCode, setOtpCode, resendTimer, canResend,
    handleGoogleAuth, handleSendOtp, handleResendOtp, handleVerifyOtp,
  };
}
