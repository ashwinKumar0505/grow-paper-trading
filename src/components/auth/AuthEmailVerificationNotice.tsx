import React from 'react';
import { CheckCircle2, MailCheck, RefreshCw } from 'lucide-react';

interface AuthEmailVerificationNoticeProps {
  email: string;
  resendTimer: number;
  canResend: boolean;
  isLoading?: boolean;
  onResendVerification: () => void;
  onProceedToSignIn: () => void;
  onBackToForm: () => void;
}

export const AuthEmailVerificationNotice: React.FC<AuthEmailVerificationNoticeProps> = ({
  email,
  resendTimer,
  canResend,
  isLoading = false,
  onResendVerification,
  onProceedToSignIn,
  onBackToForm,
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-[#00D09C]/30 rounded-xl space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-[#00D09C]">
        <MailCheck className="w-4 h-4 shrink-0" />
        <span>Confirm Your Email Address</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        We&apos;ve sent a confirmation link to{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{email}</span>. Click the
        link in your inbox (or spam folder) to verify your account, then sign in with your email
        and password.
      </p>
    </div>

    <button
      type="button"
      onClick={onProceedToSignIn}
      className="w-full py-3 bg-[#00D09C] hover:bg-[#00c090] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>I&apos;ve Confirmed — Go to Sign In</span>
    </button>

    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      <button
        type="button"
        onClick={onBackToForm}
        className="hover:underline text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
      >
        Use different email
      </button>

      {canResend ? (
        <button
          type="button"
          disabled={isLoading}
          onClick={onResendVerification}
          className="text-[#00D09C] font-bold hover:underline disabled:opacity-60 cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Sending...' : 'Resend link'}</span>
        </button>
      ) : (
        <span>Resend in {resendTimer}s</span>
      )}
    </div>
  </div>
);
