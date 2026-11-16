import React from 'react';
import { BrandLogo } from './BrandLogo';
import { X, AlertCircle } from 'lucide-react';
import { AuthEmailOtpForm } from './auth/AuthEmailOtpForm';
import { GoogleAuthButton } from './auth/GoogleAuthButton';
import { useAuthModal } from './auth/useAuthModal';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
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
  } = useAuthModal();

  if (!isAuthModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-left"
      role="dialog"
      aria-modal="true"
      aria-label={isSignUp ? 'Create your Account' : 'Welcome back'}
    >
      <div className="fixed inset-0" onClick={closeAuthModal} />

      <div className="relative w-full max-w-md bg-white dark:bg-[#151923] rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-200 dark:border-[#282F40] z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2533] transition-colors cursor-pointer"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo className="scale-105 mb-2" />
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
            {isSignUp ? 'Create your Account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            {isSignUp
              ? 'Start with ₹1,00,000 free paper trading capital (upgradeable to ₹10L on Beginner & ₹50L on Advanced)'
              : 'Sign in to access your portfolio, live watchlists & order desk'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-[#1E2433] rounded-xl mt-4 w-full">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('signup');
                setOtpStep('input_email');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isSignUp
                  ? 'bg-white dark:bg-[#121620] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('signin');
                setOtpStep('input_email');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isSignUp
                  ? 'bg-white dark:bg-[#121620] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <GoogleAuthButton isLoading={isGoogleLoading} onClick={handleGoogleAuth} />

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-[#282F40]" />
            </div>
            <div className="relative px-3 bg-white dark:bg-[#151923] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              or continue with email
            </div>
          </div>

          <AuthEmailOtpForm
            isSignUp={isSignUp}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            otpStep={otpStep}
            setOtpStep={setOtpStep}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            resendTimer={resendTimer}
            canResend={canResend}
            isLoading={isOtpLoading}
            onSendOtp={handleSendOtp}
            onResendOtp={handleResendOtp}
            onVerifyOtp={handleVerifyOtp}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#202533] text-center text-[11px] text-gray-400">
          <p>
            Virtual paper trading simulator only. No real bank accounts, real-money transactions, or brokerage fees.
          </p>
        </div>
      </div>
    </div>
  );
};
