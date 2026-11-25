import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { TradingContextType } from '../types/tradingContext';

interface WalletFreeTierPromptProps {
  setIsWalletModalOpen: (open: boolean) => void;
  openUpgradeModal: TradingContextType['openUpgradeModal'];
}

export const WalletFreeTierPrompt: React.FC<WalletFreeTierPromptProps> = ({
  setIsWalletModalOpen,
  openUpgradeModal,
}) => {
  return (
    <div className="p-5 rounded-xl bg-[#111C17] border border-[#00D09C]/35 space-y-4">
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#00D09C]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00D09C]">
          <Sparkles className="w-3 h-3" />
          Beginner &amp; Advanced Plans
        </span>
        <h4 className="text-base font-bold text-white">
          Unlock ₹10L–₹50L Capital &amp; Free Refills
        </h4>
        <p className="text-xs text-[#9AB0A5] leading-relaxed">
          Free Starter includes ₹1,00,000 virtual capital with an automatic monthly reset. Upgrade to Beginner or Advanced for free virtual refills up to your plan cap, unlimited portfolio resets, 5x Intraday &amp; MTF, backtested screeners, and all 21 chart patterns.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setIsWalletModalOpen(false);
          openUpgradeModal({
            requiredTier: 'beginner',
            featureName: 'Higher Paper Trading Capital & Free Refills',
            featureDescription:
              'Upgrade to Beginner (₹10L) or Advanced (₹50L) to unlock free virtual refills, unlimited portfolio resets, 5x Intraday & MTF, and full screener & learning tools.',
          });
        }}
        className="w-full py-3 px-4 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>View Subscription Plans</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
