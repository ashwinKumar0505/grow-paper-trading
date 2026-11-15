import React from 'react';
import {
  CreditCard,
  Landmark,
  Smartphone,
} from 'lucide-react';
import { CheckoutUpiSection, UPI_APPS } from './CheckoutUpiSection';
export { UPI_APPS };

interface CheckoutPaymentMethodsProps {
  paymentMethod: 'upi' | 'card' | 'netbanking';
  setPaymentMethod: (method: 'upi' | 'card' | 'netbanking') => void;
  selectedUpiApp: string;
  onSelectUpiApp: (appId: string, handle: string) => void;
  upiId: string;
  setUpiId: (id: string) => void;
  isUpiVerified: boolean;
  setIsUpiVerified: (v: boolean) => void;
  isTopUp: boolean;
  enableAutoPay: boolean;
  setEnableAutoPay: (v: boolean) => void;
  billingCycle: 'monthly' | 'yearly';
  nextRenewalDate: string;
  upgradeQuote: { fullPriceINR: number };
  selectedBank: string;
  setSelectedBank: (b: string) => void;
}

export const CheckoutPaymentMethods: React.FC<CheckoutPaymentMethodsProps> = ({
  paymentMethod,
  setPaymentMethod,
  selectedUpiApp,
  onSelectUpiApp,
  upiId,
  setUpiId,
  isUpiVerified,
  setIsUpiVerified,
  isTopUp,
  enableAutoPay,
  setEnableAutoPay,
  billingCycle,
  nextRenewalDate,
  upgradeQuote,
  selectedBank,
  setSelectedBank,
}) => {
  return (
    <>
      <div>
        <div className="text-xs font-semibold text-[#D6E6DE] mb-2">
          Payment Method
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'upi' as const, label: 'UPI / AutoPay', icon: Smartphone },
            { id: 'card' as const, label: 'Card', icon: CreditCard },
            { id: 'netbanking' as const, label: 'Netbanking', icon: Landmark },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                paymentMethod === id
                  ? 'border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]'
                  : 'border-[#1E2F28] bg-[#111C17] text-[#9AB0A5] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === 'upi' && (
        <CheckoutUpiSection
          selectedUpiApp={selectedUpiApp}
          onSelectUpiApp={onSelectUpiApp}
          upiId={upiId}
          setUpiId={setUpiId}
          isUpiVerified={isUpiVerified}
          setIsUpiVerified={setIsUpiVerified}
          isTopUp={isTopUp}
          enableAutoPay={enableAutoPay}
          setEnableAutoPay={setEnableAutoPay}
          billingCycle={billingCycle}
          nextRenewalDate={nextRenewalDate}
          upgradeQuote={upgradeQuote}
        />
      )}

      {paymentMethod === 'card' && (
        <div className="rounded-xl border border-[#1E2F28] p-4 space-y-3 bg-[#111C17]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Credit / Debit Card</span>
            <span className="text-[11px] font-mono text-[#00D09C]">RBI e-Mandate Supported</span>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <input
              type="text"
              readOnly
              value="4111 1111 1111 1111"
              className="col-span-2 px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-white"
            />
            <input
              type="text"
              readOnly
              value="12/29 · 123"
              className="px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-white"
            />
          </div>
        </div>
      )}

      {paymentMethod === 'netbanking' && (
        <div className="rounded-xl border border-[#1E2F28] p-4 space-y-2.5 bg-[#111C17]">
          <div className="text-xs font-semibold text-white">Select Bank</div>
          <div className="grid grid-cols-2 gap-2">
            {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBank(b)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                  selectedBank === b
                    ? 'border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]'
                    : 'border-[#1E2F28] bg-[#0B1310] text-[#9AB0A5] hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
