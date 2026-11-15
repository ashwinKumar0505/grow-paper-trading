import React from 'react';
import { CalendarCheck2, Check, QrCode, RefreshCw } from 'lucide-react';
import { formatINR } from '../../utils/pricing';

export const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', handle: '@okicici' },
  { id: 'phonepe', label: 'PhonePe', handle: '@ybl' },
  { id: 'paytm', label: 'Paytm', handle: '@paytm' },
  { id: 'bhim', label: 'BHIM UPI', handle: '@upi' },
] as const;

interface CheckoutUpiSectionProps {
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
}

export const CheckoutUpiSection: React.FC<CheckoutUpiSectionProps> = ({
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
}) => {
  return (
    <div className="rounded-xl border border-[#1E2F28] p-4 space-y-3.5 bg-[#111C17]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-[#00D09C]" />
            <span>Select UPI App &amp; Enter UPI ID</span>
          </span>
          {isUpiVerified && upiId.includes('@') && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00D09C]">
              <Check className="w-3 h-3" /> Verified VPA
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {UPI_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectUpiApp(app.id, app.handle)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                selectedUpiApp === app.id
                  ? 'border-[#00D09C] bg-[#00D09C]/15 text-[#00D09C]'
                  : 'border-[#1E2F28] bg-[#0B1310] text-[#9AB0A5] hover:text-white'
              }`}
            >
              {app.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={upiId}
          onChange={(e) => {
            setUpiId(e.target.value);
            setIsUpiVerified(e.target.value.includes('@'));
          }}
          placeholder="yourname@okicici"
          className="flex-1 px-3.5 py-2 rounded-xl border border-[#1E2F28] bg-[#0B1310] text-sm font-mono text-white focus:outline-hidden focus:border-[#00D09C]"
        />
        <button
          type="button"
          onClick={() => setIsUpiVerified(upiId.includes('@'))}
          className="px-3 py-2 rounded-xl border border-[#1E2F28] bg-[#16241E] text-xs font-semibold text-[#00D09C] hover:bg-[#1E3129] cursor-pointer"
        >
          Verify
        </button>
      </div>

      {!isTopUp && (
        <div className="rounded-xl border border-[#00D09C]/30 bg-[#0B1310] p-3.5 space-y-2">
          <label className="flex items-start justify-between gap-3 cursor-pointer">
            <div className="flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>
                    Enable UPI AutoPay ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Mandate)
                  </span>
                </div>
                <p className="text-[11px] text-[#9AB0A5] mt-0.5 leading-relaxed">
                  Approve the mandate once in your UPI app. Automatic{' '}
                  {billingCycle === 'yearly' ? 'annual' : 'monthly'} renewal on{' '}
                  <strong className="text-white">{nextRenewalDate}</strong> ({formatINR(upgradeQuote.fullPriceINR)}/
                  {billingCycle === 'yearly' ? 'yr' : 'mo'}). Pause or cancel anytime in your UPI app.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={enableAutoPay}
              onChange={(e) => setEnableAutoPay(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#00D09C] rounded cursor-pointer shrink-0"
            />
          </label>

          {enableAutoPay && (
            <div className="flex items-center justify-between pt-2 border-t border-[#1E2F28] text-[11px] text-[#9AB0A5]">
              <span className="flex items-center gap-1 text-[#00D09C]">
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>AutoPay Mandate Ready · NPCI UPI 2.0</span>
              </span>
              <span className="font-mono">Max limit: {formatINR(upgradeQuote.fullPriceINR)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
