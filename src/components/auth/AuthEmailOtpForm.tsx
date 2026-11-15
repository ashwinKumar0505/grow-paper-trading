import React from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw, User } from 'lucide-react';

interface AuthEmailOtpFormProps {
  isSignUp: boolean;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  otpStep: 'input_email' | 'enter_otp';
  setOtpStep: (step: 'input_email' | 'enter_otp') => void;
  otpCode: string;
  setOtpCode: (code: string) => void;
  generatedOtp: string;
  resendTimer: number;
  canResend: boolean;
  onSendOtp: (e: React.FormEvent) => void;
  onResendOtp: () => void;
  onVerifyOtp: (e: React.FormEvent) => void;
}

export const AuthEmailOtpForm: React.FC<AuthEmailOtpFormProps> = ({
  isSignUp,
  name,
  setName,
  email,
  setEmail,
  otpStep,
  setOtpStep,
  otpCode,
  setOtpCode,
  generatedOtp,
  resendTimer,
  canResend,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
}) => {
  if (otpStep === 'input_email') {
    return (
      <form onSubmit={onSendOtp} className="space-y-4">
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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1B212D] border border-gray-200 dark:border-[#2D364A] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#00D09C] transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#00D09C] hover:bg-[#00c090] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
        >
          <span>Get 6-Digit OTP</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyOtp} className="space-y-4 animate-fade-in">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-[#00D09C]/30 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800 dark:text-[#00D09C] flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Your OTP Code:</span>
          </span>
          <button
            type="button"
            onClick={() => setOtpCode(generatedOtp)}
            className="text-[11px] font-extrabold text-[#00D09C] hover:underline cursor-pointer bg-white dark:bg-[#1E2433] px-2 py-0.5 rounded shadow-xs"
          >
            Auto-fill ({generatedOtp})
          </button>
        </div>
        <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
          Sent to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
          Enter 6-Digit Verification Code
        </label>
        <input
          type="text"
          maxLength={6}
          placeholder="e.g. 583920"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          className="w-full text-center tracking-[0.35em] font-mono text-xl py-3 bg-gray-50 dark:bg-[#1B212D] border border-gray-200 dark:border-[#2D364A] rounded-xl text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:border-[#00D09C] transition-colors"
          autoFocus
          required
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <button
          type="button"
          onClick={() => setOtpStep('input_email')}
          className="hover:underline text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
        >
          Change email
        </button>

        {canResend ? (
          <button
            type="button"
            onClick={onResendOtp}
            className="text-[#00D09C] font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Resend OTP</span>
          </button>
        ) : (
          <span>Resend in {resendTimer}s</span>
        )}
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-[#00D09C] hover:bg-[#00c090] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Verify & Get Started</span>
      </button>
    </form>
  );
};
