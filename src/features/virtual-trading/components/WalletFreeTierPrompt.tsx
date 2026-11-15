import React from 'react';
import { CreditCard, Sparkles } from 'lucide-react';

interface WalletFreeTierPromptProps {
  setIsWalletModalOpen: (open: boolean) => void;
  openRazorpayCheckout: (tier: any, billingCycle: any) => void;
  openUpgradeModal: (options: any) => void;
}

export const WalletFreeTierPrompt: React.FC<WalletFreeTierPromptProps> = ({
  setIsWalletModalOpen,
  openRazorpayCheckout,
  openUpgradeModal,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-5 rounded-xl bg-[#111C17] border border-[#00D09C]/35 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00D09C]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00D09C]">
              <Sparkles className="w-3 h-3" />
              Instant Recharge
            </span>
            <h4 className="text-base font-bold text-white">
              Add +₹1,00,000 Virtual Capital
            </h4>
            <p className="text-xs text-[#9AB0A5] leading-relaxed">
              Top up an instant +₹1,00,000 (1 Lakh) to your paper wallet anytime before your free monthly reset.
            </p>
          </div>
          <div className="text-right shrink-0 bg-[#0B1310] px-3.5 py-2 rounded-xl border border-[#1E2F28]">
            <div className="text-[10px] uppercase font-semibold text-[#9AB0A5]">Fee</div>
            <div className="font-mono text-xl font-extrabold text-[#00D09C]">₹50</div>
            <div className="text-[10px] text-[#6B8578]">for +₹1L</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsWalletModalOpen(false);
            openRazorpayCheckout('topup_1l', 'monthly');
          }}
          className="w-full py-3 px-4 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Top Up +₹1,00,000 for ₹50</span>
        </button>
      </div>

      <div className="p-4 rounded-xl bg-[#111C17]/60 border border-[#1E2F28] flex items-center justify-between gap-3 text-xs">
        <div className="text-[#9AB0A5]">
          <strong className="text-white">Want free unlimited top-ups &amp; ₹10L–₹50L capital?</strong>
          <div className="text-[11px] mt-0.5">Included on Beginner and Advanced plans.</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsWalletModalOpen(false);
            openUpgradeModal({ requiredTier: 'beginner' });
          }}
          className="px-3 py-2 rounded-lg bg-[#16241E] hover:bg-[#1E3129] border border-[#00D09C]/30 text-[#00D09C] font-semibold text-xs shrink-0 cursor-pointer"
        >
          View Plans
        </button>
      </div>
    </div>
  );
};
