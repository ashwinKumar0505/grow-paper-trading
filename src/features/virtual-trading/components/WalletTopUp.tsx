import {
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { WalletViewModel } from '../hooks/useWalletView';
import { WalletFreeTierPrompt } from './WalletFreeTierPrompt';
import { WalletLimitWarning } from './WalletLimitWarning';
import { WalletPresetAmounts } from './WalletPresetAmounts';

type Props = Pick<
  WalletViewModel,
  | 'balance'
  | 'setIsWalletModalOpen'
  | 'subscriptionTier'
  | 'openUpgradeModal'
  | 'openRazorpayCheckout'
  | 'activeTab'
  | 'selectedAddPreset'
  | 'setSelectedAddPreset'
  | 'customAmount'
  | 'setCustomAmount'
  | 'isCustom'
  | 'setIsCustom'
  | 'showSuccessMessage'
  | 'isFreeTier'
  | 'tierMaxLimit'
  | 'tierLabel'
  | 'lockedMargin'
  | 'maxAllowedToAdd'
  | 'isWalletFull'
  | 'standardPresets'
  | 'currentRequestedAmount'
  | 'customError'
  | 'isAddDisabled'
  | 'handleAddFunds'
>;

export function WalletTopUp({
  balance,
  setIsWalletModalOpen,
  subscriptionTier,
  openUpgradeModal,
  openRazorpayCheckout,
  activeTab,
  selectedAddPreset,
  setSelectedAddPreset,
  customAmount,
  setCustomAmount,
  isCustom,
  setIsCustom,
  showSuccessMessage,
  isFreeTier,
  tierMaxLimit,
  tierLabel,
  lockedMargin,
  maxAllowedToAdd,
  isWalletFull,
  standardPresets,
  currentRequestedAmount,
  customError,
  isAddDisabled,
  handleAddFunds,
}: Props) {
  if (activeTab !== 'add-money') return null;

  return (
    <div className="space-y-4">
      {showSuccessMessage ? (
        <div className="p-6 rounded-xl bg-[#111C17] border border-[#00D09C]/40 text-center space-y-2">
          <CheckCircle2 className="w-9 h-9 text-[#00D09C] mx-auto" />
          <h4 className="font-bold text-white text-sm">Funds Credited</h4>
          <p className="text-xs text-[#9AB0A5]">{showSuccessMessage}</p>
        </div>
      ) : isFreeTier ? (
        <WalletFreeTierPrompt
          setIsWalletModalOpen={setIsWalletModalOpen}
          openRazorpayCheckout={openRazorpayCheckout}
          openUpgradeModal={openUpgradeModal}
        />
      ) : isWalletFull ? (
        <WalletLimitWarning
          tierMaxLimit={tierMaxLimit}
          tierLabel={tierLabel}
          balance={balance}
          lockedMargin={lockedMargin}
          subscriptionTier={subscriptionTier}
          setIsWalletModalOpen={setIsWalletModalOpen}
          openUpgradeModal={openUpgradeModal}
        />
      ) : (
        <form onSubmit={handleAddFunds} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-[#D6E6DE]">
                Choose Top-Up Amount (Free up to {tierLabel} cap)
              </label>
              <span className="text-[11px] font-mono text-[#9AB0A5]">
                Max addable: ₹{maxAllowedToAdd.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Presets Grid */}
            <WalletPresetAmounts
              standardPresets={standardPresets}
              maxAllowedToAdd={maxAllowedToAdd}
              selectedAddPreset={selectedAddPreset}
              setSelectedAddPreset={setSelectedAddPreset}
              isCustom={isCustom}
              setIsCustom={setIsCustom}
              tierLabel={tierLabel}
            />
          </div>

          {/* Custom Amount Input */}
          <div>
            <button
              type="button"
              onClick={() => setIsCustom(!isCustom)}
              className="text-xs text-[#00D09C] font-semibold hover:underline cursor-pointer"
            >
              {isCustom ? '← Use preset amount' : '+ Enter custom amount'}
            </button>

            {isCustom && (
              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AB0A5] font-mono font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max={maxAllowedToAdd}
                  autoFocus
                  placeholder={`Up to ₹${maxAllowedToAdd.toLocaleString('en-IN')}`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2.5 bg-[#111C17] border rounded-xl text-sm font-bold font-mono text-white focus:outline-hidden transition-colors ${
                    customError
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-[#1E2F28] focus:border-[#00D09C]'
                  }`}
                />
              </div>
            )}

            {customError && (
              <p className="text-[11px] text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{customError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isAddDisabled}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
              isAddDisabled
                ? 'bg-[#16241E] text-[#6B8578] cursor-not-allowed'
                : 'bg-[#00D09C] hover:bg-[#00B386] text-[#06241B] cursor-pointer'
            }`}
          >
            <span>
              Top Up ₹{currentRequestedAmount.toLocaleString('en-IN')} to Wallet
            </span>
          </button>
        </form>
      )}
    </div>
  );
}
