import { formatINR } from '../../../utils/pricing';
import type { WalletViewModel } from '../hooks/useWalletView';
type Props = Pick<WalletViewModel, 'balance' | 'setIsWalletModalOpen' | 'portfolioSummary' | 'subscriptionTier' | 'openUpgradeModal' | 'isFreeTier' | 'tierMaxLimit' | 'tierLabel' | 'lockedMargin' | 'committedCapital' | 'maxAllowedToAdd' | 'isWalletFull' | 'capacityPercent'>;

export function WalletCapital({ balance, setIsWalletModalOpen, portfolioSummary, subscriptionTier, openUpgradeModal, isFreeTier, tierMaxLimit, tierLabel, lockedMargin, committedCapital, maxAllowedToAdd, isWalletFull, capacityPercent }: Props) {
 return <>
          {/* Capital Breakdown & Cap Summary Card */}
          <div className="rounded-xl bg-[#111C17] border border-[#1E2F28] p-4 space-y-3.5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-[#9AB0A5]">Available Cash</div>
                <div className="font-mono tabular-nums text-base sm:text-lg font-extrabold text-white mt-0.5">
                  ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="border-l border-[#1E2F28] pl-3">
                <div className="text-[11px] text-[#9AB0A5]">Locked Margin</div>
                <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-amber-300 mt-0.5">
                  ₹{lockedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="border-l border-[#1E2F28] pl-3">
                <div className="text-[11px] text-[#9AB0A5]">In Holdings</div>
                <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-[#D6E6DE] mt-0.5">
                  ₹{portfolioSummary.currentValue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Cap Progress Bar (Available Cash + Locked Margin) */}
            <div className="pt-3 border-t border-[#1E2F28] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9AB0A5]">
                  Allocated Capital (Cash + Margin):{' '}
                  <strong className="text-white font-mono">
                    ₹{committedCapital.toLocaleString('en-IN')}
                  </strong>{' '}
                  / {formatINR(tierMaxLimit)}
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#00D09C]">
                  {isFreeTier
                    ? '₹50 / +1L Top-Up'
                    : maxAllowedToAdd > 0
                    ? `₹${maxAllowedToAdd.toLocaleString('en-IN')} headroom`
                    : `${tierLabel} Cap Reached`}
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#1B2B23] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isWalletFull && !isFreeTier ? 'bg-amber-400' : 'bg-[#00D09C]'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              {subscriptionTier !== 'advanced' && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[#9AB0A5]">
                    {subscriptionTier === 'free'
                      ? 'Need ₹10L or ₹50L capital with free top-ups?'
                      : 'Need ₹50,00,000 (50L) capital? Pay only the upgrade difference.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWalletModalOpen(false);
                      openUpgradeModal({
                        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
                        featureName: 'Higher Paper Trading Capital & Unlimited Resets',
                        featureDescription:
                          'Upgrade to Beginner for ₹10,00,000 (10L) or Advanced for ₹50,00,000 (50L) with automatic monthly resets and unlimited free top-ups.',
                      });
                    }}
                    className="font-semibold text-[#00D09C] hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    {subscriptionTier === 'beginner' ? 'Get Advanced →' : 'Upgrade Plan →'}
                  </button>
                </div>
              )}
            </div>
          </div>


 </>;
}
