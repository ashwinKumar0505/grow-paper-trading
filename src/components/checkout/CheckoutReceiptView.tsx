import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { formatINR } from '../../utils/pricing';

interface CheckoutReceiptViewProps {
  paymentSuccess: {
    paymentId: string;
    orderId: string;
    planName: string;
    amount: number;
    newWalletLimit: number;
    autoPayEnabled: boolean;
    upiMandateId?: string;
    upiId?: string;
  };
  isTopUp: boolean;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
}

export const CheckoutReceiptView: React.FC<CheckoutReceiptViewProps> = ({
  paymentSuccess,
  isTopUp,
  billingCycle,
  onClose,
}) => {
  return (
    <div className="p-6 sm:p-7 text-center space-y-5">
      <div className="w-14 h-14 mx-auto rounded-full bg-[#00D09C]/15 text-[#00D09C] flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D09C]/15 px-3 py-0.5 text-xs font-semibold text-[#00D09C]">
          <Sparkles className="w-3.5 h-3.5" />
          Payment Verified &amp; Activated
        </span>
        <h3 className="text-xl font-bold text-white">
          {paymentSuccess.planName} Activated
        </h3>
        <p className="text-xs text-[#9AB0A5]">
          {isTopUp
            ? '₹1,00,000 virtual trading capital has been added to your paper wallet.'
            : 'Your plan features and virtual capital limits are active immediately.'}
        </p>
      </div>

      <div className="rounded-xl border border-[#1E2F28] bg-[#111C17] p-4 text-xs space-y-2 text-left font-mono">
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">Amount Paid Today:</span>
          <strong className="text-white">{formatINR(paymentSuccess.amount)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">Payment ID:</span>
          <strong className="text-[#00D09C]">{paymentSuccess.paymentId}</strong>
        </div>
        {paymentSuccess.autoPayEnabled && (
          <div className="flex justify-between">
            <span className="text-[#9AB0A5]">UPI AutoPay Mandate:</span>
            <strong className="text-[#00D09C]">
              Active ({paymentSuccess.upiId || 'UPI'}) · {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
            </strong>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">
            {isTopUp ? 'Updated Wallet Balance:' : 'Virtual Capital Cap:'}
          </span>
          <strong className="text-white">
            {formatINR(paymentSuccess.newWalletLimit)}
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-sm transition-colors cursor-pointer"
      >
        Continue to Workspace →
      </button>
    </div>
  );
};
