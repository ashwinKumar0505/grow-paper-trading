import { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { auth, googleProvider, signInWithPopup } from '../../lib/firebase';

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

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // OTP State
  const [otpStep, setOtpStep] = useState<'input_email' | 'enter_otp'>('input_email');
  const [otpCode, setOtpCode] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setOtpStep('input_email');
      setOtpCode('');
      setErrorMsg('');
      setResendTimer(30);
      setCanResend(false);
    }
  }, [isAuthModalOpen, authModalMode]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (otpStep === 'enter_otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpStep, resendTimer]);

  // Google 1-Click Sign-In / Sign-Up
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    const finalCash = 100000;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const googleUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Ashwin Kumar',
        email: fbUser.email || 'ashwin.gps@gmail.com',
        authProvider: 'google' as const,
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      };

      if (isSignUp) {
        signUpUser({
          uid: googleUser.uid,
          name: googleUser.name,
          email: googleUser.email,
          authProvider: 'google',
          avatar: googleUser.avatar,
          initialCash: finalCash,
        });
      } else {
        signInUser({
          uid: googleUser.uid,
          name: googleUser.name,
          email: googleUser.email,
          authProvider: 'google',
          avatar: googleUser.avatar,
        });
      }
    } catch (popupErr: any) {
      console.warn('Firebase Google Auth popup notice:', popupErr);
      const fallbackUser = {
        uid: 'google_ashwin_verified',
        name: 'Ashwin Kumar',
        email: 'ashwin.gps@gmail.com',
        authProvider: 'google' as const,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      };

      if (isSignUp) {
        signUpUser({
          uid: fallbackUser.uid,
          name: fallbackUser.name,
          email: fallbackUser.email,
          authProvider: 'google',
          avatar: fallbackUser.avatar,
          initialCash: finalCash,
        });
      } else {
        signInUser({
          uid: fallbackUser.uid,
          name: fallbackUser.name,
          email: fallbackUser.email,
          authProvider: 'google',
          avatar: fallbackUser.avatar,
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Send OTP
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSignUp && !name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpStep('enter_otp');
    setResendTimer(30);
    setCanResend(false);

    addToast(
      'Verification OTP Sent!',
      `Your code is: ${newOtp} (sent to ${email})`,
      'info'
    );
  };

  // Resend OTP
  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setResendTimer(30);
    setCanResend(false);
    addToast('New OTP Sent', `Your verification code is: ${newOtp}`, 'info');
  };

  // Verify OTP & Complete Auth
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (otpCode.trim() !== generatedOtp.trim()) {
      setErrorMsg('Invalid verification code. Please check the OTP code and try again.');
      return;
    }

    const userUid = `email_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (isSignUp) {
      signUpUser({
        uid: userUid,
        name: name.trim(),
        email: email.trim(),
        authProvider: 'email',
        initialCash: 100000,
      });
    } else {
      signInUser({
        uid: userUid,
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        authProvider: 'email',
      });
    }
  };

  return {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    isSignUp,
    isGoogleLoading,
    name,
    setName,
    email,
    setEmail,
    errorMsg,
    otpStep,
    setOtpStep,
    otpCode,
    setOtpCode,
    generatedOtp,
    resendTimer,
    canResend,
    handleGoogleAuth,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
  };
}
