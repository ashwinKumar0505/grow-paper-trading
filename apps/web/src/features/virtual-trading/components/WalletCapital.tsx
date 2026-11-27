import { formatINR } from '../../../utils/pricing';
import type { WalletViewModel } from '../hooks/useWalletView';
type Props = Pick<WalletViewModel, 'balance' | 'setIsWalletModalOpen' | 'portfolioSummary' | 'subscriptionTier' | 'openUpgradeModal' | 'isFreeTier' | 'tierMaxLimit' | 'tierLabel' | 'lockedMargin' | 'committedCapital' | 'maxAllowedToAdd' | 'isWalletFull' | 'capacityPercent'>;

export function WalletCapital({ balance, setIsWalletModalOpen, portfolioSummary, subscriptionTier, openUpgradeModal, isFreeTier, tierMaxLimit, tierLabel, lockedMargin, committedCapital, maxAllowedToAdd, isWalletFull, capacityPercent }: Props) {
 return <>
          {/* Capital Breakdown & Cap Summary Card */}
          <div className="rounded-xl bg-[#111C17] border border-[#1E2F28] p-3.5 sm:p-4 space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-3">
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <div className="text-[11px] text-[#9AB0A5]">Available Cash</div>
                <div className="font-mono tabular-nums text-lg font-extrabold text-white mt-0.5 truncate">
                  ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="min-w-0 pt-3 border-t border-[#1E2F28] sm:pt-0 sm:border-t-0 sm:border-l sm:pl-3">
                <div className="text-[11px] text-[#9AB0A5]">Locked Margin</div>
                <div className="font-mono tabular-nums text-sm sm:text-lg font-bold text-amber-300 mt-0.5 truncate">
                  ₹{lockedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="min-w-0 pt-3 border-t border-l border-[#1E2F28] pl-3 sm:pt-0 sm:border-t-0">
                <div className="text-[11px] text-[#9AB0A5]">In Holdings</div>
                <div className="font-mono tabular-nums text-sm sm:text-lg font-bold text-[#D6E6DE] mt-0.5 truncate">
                  ₹{portfolioSummary.currentValue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Cap Progress Bar (Cash + Margin + Holdings) */}
            <div className="pt-3 border-t border-[#1E2F28] space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs gap-x-2 gap-y-1">
                <span className="text-[#9AB0A5]">
                  Total Capital Used:{' '}
                  <strong className="text-white font-mono">
                    ₹{committedCapital.toLocaleString('en-IN')}
                  </strong>{' '}
                  / {formatINR(tierMaxLimit)}
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#00D09C] shrink-0">
                  {isFreeTier
                    ? 'Auto Monthly Reset'
                    : maxAllowedToAdd > 0
                    ? `₹${maxAllowedToAdd.toLocaleString('en-IN')} left to add`
                    : `${tierLabel} Limit Reached`}
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
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1 text-[11px]">
                  <span className="text-[#9AB0A5]">
                    {subscriptionTier === 'free'
                      ? 'Want ₹10L or ₹50L capital?'
                      : 'Want up to ₹50L capital?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWalletModalOpen(false);
                      openUpgradeModal({
                        requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
                        featureName: 'Higher Paper Trading Capital',
                        featureDescription:
                          'Upgrade to Beginner for ₹10,00,000 (10L) or Advanced for ₹50,00,000 (50L) with free top-ups.',
                      });
                    }}
                    className="font-semibold text-[#00D09C] hover:underline cursor-pointer shrink-0"
                  >
                    {subscriptionTier === 'beginner' ? 'Upgrade to Advanced →' : 'Upgrade Plan →'}
                  </button>
                </div>
              )}
            </div>
          </div>


 </>;
}
