import React from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import { formatINR } from '../../../utils/pricing';

interface WalletLimitWarningProps {
  tierMaxLimit: number;
  tierLabel: string;
  balance: number;
  lockedMargin: number;
  subscriptionTier: string;
  setIsWalletModalOpen: (open: boolean) => void;
  openUpgradeModal: (options: any) => void;
}

export const WalletLimitWarning: React.FC<WalletLimitWarningProps> = ({
  tierMaxLimit,
  tierLabel,
  balance,
  lockedMargin,
  subscriptionTier,
  setIsWalletModalOpen,
  openUpgradeModal,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#111C17] border border-amber-400/35 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-white">
            {formatINR(tierMaxLimit)} ({tierLabel}) Capital Cap Reached
          </h4>
          <p className="text-xs text-[#9AB0A5] leading-relaxed">
            Your total allocated capital (Available Cash{' '}
            <strong className="text-white font-mono">₹{balance.toLocaleString('en-IN')}</strong>
            {lockedMargin > 0 && (
              <>
                {' '}+ Locked Margin{' '}
                <strong className="text-amber-300 font-mono">
                  ₹{lockedMargin.toLocaleString('en-IN')}
                </strong>
              </>
            )}
            ) is at your {tierLabel} plan limit.{' '}
            {lockedMargin > 0
              ? 'Cancel open orders or close margin positions to release locked margin back to cash.'
              : 'Top-ups beyond your plan cap are not permitted.'}
          </p>
        </div>
      </div>

      <div className="pt-1 flex flex-wrap items-center gap-2">
        {subscriptionTier === 'beginner' && (
          <button
            type="button"
            onClick={() => {
              setIsWalletModalOpen(false);
              openUpgradeModal({
                requiredTier: 'advanced',
                featureName: 'Expand Virtual Capital to ₹50,00,000 (50L)',
                featureDescription:
                  'Upgrade from Beginner to Advanced by paying only the plan difference to unlock ₹50,00,000 (50L) virtual capital.',
              });
            }}
            className="px-4 py-2 rounded-xl border border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Get Advanced (₹50L Cap)</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsWalletModalOpen(false)}
          className="px-4 py-2 rounded-xl bg-[#16241E] hover:bg-[#1E3129] border border-[#1E2F28] text-white text-xs font-semibold cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
