import { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  sendPasswordResetEmail,
  signInWithPopup,
  type FirebaseUser,
} from '../../lib/firebase';
import { normalizeEmail } from '../../features/virtual-trading/utils/userProfileSync';
import { canRequestSignupConversionClaim } from '../../lib/analytics';
import {
  authenticateEmailPasswordAccount,
  dispatchVerifiedSignupConversion,
  exchangeFirebaseServerSessionDetails,
  mapFirebaseAuthError,
  registerEmailPasswordAccount,
  resendEmailVerificationLink,
} from './authModalService';

export function useAuthModal() {
  const {
    isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode,
    signInUser, signUpUser, addToast,
  } = useTrading();

  const isSignUp = authModalMode === 'signup';
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMsg('');
      setInfoMsg('');
      setPassword('');
      setVerificationPendingEmail(null);
      setResendTimer(30);
      setCanResend(false);
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
    setErrorMsg('');
    setInfoMsg('');
    setVerificationPendingEmail(null);
  }, [authModalMode]);

  useEffect(() => {
    if (!verificationPendingEmail || resendTimer <= 0) {
      if (resendTimer === 0) setCanResend(true);
      return;
    }
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [verificationPendingEmail, resendTimer]);

  const completeEmailSignIn = async (fbUser: FirebaseUser, fallbackEmail: string) => {
    if (!fbUser.emailVerified) return;
    const userEmail = fbUser.email ? normalizeEmail(fbUser.email) : fallbackEmail;
    const idToken = await fbUser.getIdToken(true);
    const session = await exchangeFirebaseServerSessionDetails({
      idToken, fallbackUid: fbUser.uid, displayName: fbUser.displayName || name.trim() || undefined,
      photoURL: fbUser.photoURL, authProvider: 'email',
      claimSignupConversion: canRequestSignupConversionClaim(),
    });
    const displayName = fbUser.displayName || name.trim() || userEmail.split('@')[0];
    await signInUser({
      uid: session.uid, name: displayName, email: userEmail,
      authProvider: 'email', avatar: fbUser.photoURL || undefined,
    });
    void dispatchVerifiedSignupConversion(session, {
      verifiedEmail: fbUser.emailVerified ? fbUser.email : null,
    });
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
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
      const session = await exchangeFirebaseServerSessionDetails({
        idToken, fallbackUid: fbUser.uid, displayName: fbUser.displayName,
        photoURL: fbUser.photoURL, authProvider: 'google',
        claimSignupConversion: fbUser.emailVerified !== false && canRequestSignupConversionClaim(),
      });
      const displayName = fbUser.displayName || userEmail.split('@')[0];
      const avatar = fbUser.photoURL || undefined;
      if (isSignUp) {
        await signUpUser({ uid: session.uid, name: displayName, email: userEmail, authProvider: 'google', avatar, initialCash: 100000 });
      } else {
        await signInUser({ uid: session.uid, name: displayName, email: userEmail, authProvider: 'google', avatar });
      }
      void dispatchVerifiedSignupConversion(session, {
        verifiedEmail: fbUser.emailVerified === true ? fbUser.email : null,
      });
    } catch (popupErr) {
      setErrorMsg(mapFirebaseAuthError(popupErr, 'google'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!isFirebaseConfigured) {
      setErrorMsg('Firebase is not configured. Add your Firebase Web App config to .env or firebase-applet-config.json.');
      return;
    }
    if (isSignUp && !name.trim()) { setErrorMsg('Please enter your full name.'); return; }
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (isSignUp && password.length < 8) { setErrorMsg('Password must be at least 8 characters long.'); return; }
    if (!password) { setErrorMsg('Please enter your password.'); return; }

    setIsEmailLoading(true);
    try {
      if (isSignUp) {
        await registerEmailPasswordAccount({ email: normalized, password, displayName: name.trim() });
        setVerificationPendingEmail(normalized);
        setResendTimer(30);
        setCanResend(false);
        addToast('Confirmation Email Sent', `Check your inbox at ${normalized} to confirm your email before signing in.`, 'info');
      } else {
        const result = await authenticateEmailPasswordAccount({ email: normalized, password });
        if (!result.verified) {
          setVerificationPendingEmail(normalized);
          setResendTimer(0);
          setCanResend(true);
          setErrorMsg('Your email is not confirmed yet. Click the link in your inbox or resend the confirmation email below.');
          return;
        }
        await completeEmailSignIn(result.user, normalized);
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, 'email'));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationPendingEmail) return;
    setErrorMsg('');
    setInfoMsg('');
    if (!password) {
      setVerificationPendingEmail(null);
      setAuthModalMode('signin');
      setErrorMsg('Enter your email and password to resend the confirmation link.');
      return;
    }
    setIsEmailLoading(true);
    try {
      const result = await resendEmailVerificationLink({ email: verificationPendingEmail, password });
      if (result.alreadyVerified) {
        await completeEmailSignIn(result.user, verificationPendingEmail);
        return;
      }
      setResendTimer(30);
      setCanResend(false);
      setInfoMsg(`Confirmation link resent to ${verificationPendingEmail}.`);
      addToast('Confirmation Email Resent', `Check your inbox at ${verificationPendingEmail}.`, 'info');
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, 'email'));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!isFirebaseConfigured) { setErrorMsg('Firebase is not configured.'); return; }
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      setErrorMsg('Enter your email address above first to receive a password reset link.');
      return;
    }
    setIsEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalized);
      setInfoMsg(`Password reset link sent to ${normalized}. Check your inbox.`);
      addToast('Password Reset Sent', `Check ${normalized} for instructions to reset your password.`, 'info');
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err, 'email'));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleProceedToSignIn = () => {
    setVerificationPendingEmail(null);
    setErrorMsg('');
    setInfoMsg('');
    setAuthModalMode('signin');
  };

  const handleBackToForm = () => {
    setVerificationPendingEmail(null);
    setErrorMsg('');
    setInfoMsg('');
  };

  return {
    isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode,
    isSignUp, isGoogleLoading, isEmailLoading, name, setName, email, setEmail,
    password, setPassword, errorMsg, infoMsg, verificationPendingEmail,
    resendTimer, canResend, handleGoogleAuth, handleEmailSubmit,
    handleResendVerification, handleProceedToSignIn, handleBackToForm,
    handleForgotPassword,
  };
}
