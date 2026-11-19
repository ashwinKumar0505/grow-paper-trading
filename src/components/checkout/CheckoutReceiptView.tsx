import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { formatINR } from '../../utils/pricing';
import type { PaymentSuccessInfo } from './useRazorpayCheckout';

interface CheckoutReceiptViewProps {
  paymentSuccess: PaymentSuccessInfo;
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
    <div className="p-6 text-center space-y-5">
      <div className="w-12 h-12 mx-auto rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">
          {paymentSuccess.planName} Activated
        </h3>
        <p className="text-xs text-[#9AB0A5]">
          {isTopUp
            ? '₹1,00,000 paper trading capital has been added to your wallet.'
            : 'Your plan features and virtual capital limits are active immediately.'}
        </p>
      </div>

      <div className="rounded-xl bg-[#111C17] p-4 text-xs space-y-2.5 text-left font-mono">
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">Amount Paid</span>
          <strong className="text-white">{formatINR(paymentSuccess.amount)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">Payment ID</span>
          <strong className="text-emerald-400">{paymentSuccess.paymentId}</strong>
        </div>
        {paymentSuccess.isRecurring && (
          <div className="flex justify-between">
            <span className="text-[#9AB0A5]">Subscription</span>
            <strong className="text-emerald-400">
              Active · {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
            </strong>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#9AB0A5]">
            {isTopUp ? 'Updated Wallet Balance' : 'Virtual Capital Cap'}
          </span>
          <strong className="text-white">{formatINR(paymentSuccess.newWalletLimit)}</strong>
        </div>
      </div>

      <Button
        type="button"
        onClick={onClose}
        className="w-full h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#042218] font-semibold text-sm cursor-pointer"
      >
        Continue to Workspace
      </Button>
    </div>
  );
};
