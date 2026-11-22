import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { AuthEmailVerificationNotice } from './AuthEmailVerificationNotice';

interface AuthEmailPasswordFormProps {
  isSignUp: boolean;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  verificationPendingEmail: string | null;
  resendTimer: number;
  canResend: boolean;
  isLoading?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onResendVerification: () => void;
  onProceedToSignIn: () => void;
  onBackToForm: () => void;
  onForgotPassword: () => void;
}

export const AuthEmailPasswordForm: React.FC<AuthEmailPasswordFormProps> = ({
  isSignUp,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  verificationPendingEmail,
  resendTimer,
  canResend,
  isLoading = false,
  onSubmit,
  onResendVerification,
  onProceedToSignIn,
  onBackToForm,
  onForgotPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (verificationPendingEmail) {
    return (
      <AuthEmailVerificationNotice
        email={verificationPendingEmail}
        resendTimer={resendTimer}
        canResend={canResend}
        isLoading={isLoading}
        onResendVerification={onResendVerification}
        onProceedToSignIn={onProceedToSignIn}
        onBackToForm={onBackToForm}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isSignUp && (
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="e.g. Ashwin Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1B212D] border border-gray-200 dark:border-[#2D364A] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#00D09C] transition-colors"
              required={isSignUp}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1B212D] border border-gray-200 dark:border-[#2D364A] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#00D09C] transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            Password
          </label>
          {!isSignUp && (
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={isLoading}
              className="text-[11px] font-semibold text-[#00D09C] hover:underline disabled:opacity-60 cursor-pointer"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={isSignUp ? 'Create a password (min 8 chars)' : 'Enter your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={isSignUp ? 8 : undefined}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-[#1B212D] border border-gray-200 dark:border-[#2D364A] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#00D09C] transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {isSignUp && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            We&apos;ll send a confirmation link to verify your email before your first sign-in.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-[#00D09C] hover:bg-[#00c090] disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
      >
        <span>
          {isLoading
            ? isSignUp
              ? 'Creating Account...'
              : 'Signing In...'
            : isSignUp
              ? 'Create Account'
              : 'Sign In'}
        </span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};
