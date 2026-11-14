import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatINR } from '../utils/pricing';
import {
  X,
  Wallet,
  RotateCcw,
  PlusCircle,
  History,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CalendarClock,
  Sparkles,
  CreditCard,
  Crown,
} from 'lucide-react';

const round2 = (n: number) => Math.round(n * 100) / 100;

export const WalletModal: React.FC = () => {
  const {
    balance,
    isWalletModalOpen,
    setIsWalletModalOpen,
    addMoneyToWallet,
    walletTransactions,
    resetPortfolio,
    portfolioSummary,
    user,
    planConfig,
    subscriptionTier,
    openUpgradeModal,
    openRazorpayCheckout,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'add-money' | 'history' | 'reset'>('add-money');
  const [selectedAddPreset, setSelectedAddPreset] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isFreeTier = subscriptionTier === 'free';
  const tierMaxLimit = planConfig.maxWalletLimit; // 1L Free, 10L Beginner, 50L Advanced
  const tierLabel =
    subscriptionTier === 'advanced' ? '50L' : subscriptionTier === 'beginner' ? '10L' : '1L';

  // Include BOTH Available Cash AND Locked Margin (Intraday 5x + MTF 5.00x + open order margin)
  // so cancelling an order or closing a position after top-up can never push cash beyond the tier cap.
  const lockedMargin = round2(portfolioSummary.lockedMargin || 0);
  const committedCapital = round2(balance + lockedMargin);
  const maxAllowedToAdd = Math.max(0, round2(tierMaxLimit - committedCapital));
  const isWalletFull = committedCapital >= tierMaxLimit - 0.01;
  const capacityPercent = Math.min(100, Math.round((committedCapital / tierMaxLimit) * 100));

  useEffect(() => {
    if (isWalletModalOpen && maxAllowedToAdd > 0 && selectedAddPreset > maxAllowedToAdd) {
      setSelectedAddPreset(maxAllowedToAdd);
    }
  }, [isWalletModalOpen, maxAllowedToAdd, selectedAddPreset]);

  if (!isWalletModalOpen) return null;

  const standardPresets =
    subscriptionTier === 'advanced'
      ? [
          { label: '+₹1,00,000', sub: '1 Lakh', value: 100000 },
          { label: '+₹5,00,000', sub: '5 Lakhs', value: 500000, popular: true },
          { label: '+₹10,00,000', sub: '10 Lakhs', value: 1000000 },
          { label: '+₹25,00,000', sub: '25 Lakhs', value: 2500000 },
        ]
      : [
          { label: '+₹50,000', sub: '50K', value: 50000 },
          { label: '+₹1,00,000', sub: '1 Lakh', value: 100000, popular: true },
          { label: '+₹2,50,000', sub: '2.5 Lakhs', value: 250000 },
          { label: '+₹5,00,000', sub: '5 Lakhs', value: 500000 },
        ];

  let currentRequestedAmount = 0;
  let customError = '';

  if (isCustom) {
    const parsed = parseFloat(customAmount.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      currentRequestedAmount = round2(parsed);
      if (currentRequestedAmount > maxAllowedToAdd) {
        customError = `Exceeds available headroom of ₹${maxAllowedToAdd.toLocaleString('en-IN')} (${tierLabel} cap includes ₹${lockedMargin.toLocaleString('en-IN')} locked margin).`;
      }
    }
  } else {
    currentRequestedAmount = Math.min(selectedAddPreset, maxAllowedToAdd);
  }

  const isAddDisabled =
    isWalletFull ||
    currentRequestedAmount <= 0 ||
    currentRequestedAmount > maxAllowedToAdd;

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFreeTier) {
      setIsWalletModalOpen(false);
      openRazorpayCheckout('topup_1l', 'monthly');
      return;
    }
    if (isAddDisabled) return;

    const success = addMoneyToWallet(currentRequestedAmount, 'Added via Paper Wallet Top-Up');
    if (success) {
      setShowSuccessMessage(
        `₹${currentRequestedAmount.toLocaleString('en-IN')} credited to your paper wallet.`
      );
      setTimeout(() => {
        setShowSuccessMessage(null);
        setIsWalletModalOpen(false);
      }, 1200);
    }
  };

  const handleConfirmReset = (amount = planConfig.defaultStartingCash) => {
    resetPortfolio(amount);
    setShowResetConfirm(false);
  };

  const resetPresets =
    subscriptionTier === 'advanced'
      ? [
          { amount: 500000, label: '₹5,00,000', sub: '5 Lakhs' },
          { amount: 1000000, label: '₹10,00,000', sub: '10 Lakhs' },
          { amount: 2500000, label: '₹25,00,000', sub: '25 Lakhs' },
          { amount: 5000000, label: '₹50,00,000', sub: '50L Max Cap' },
        ]
      : [
          { amount: 100000, label: '₹1,00,000', sub: '1 Lakh' },
          { amount: 250000, label: '₹2,50,000', sub: '2.5 Lakhs' },
          { amount: 500000, label: '₹5,00,000', sub: '5 Lakhs' },
          { amount: 1000000, label: '₹10,00,000', sub: '10L Max Cap' },
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="NiftyLens Paper Wallet"
    >
      <div className="fixed inset-0" onClick={() => setIsWalletModalOpen(false)} />

      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B1310] border border-[#1E2F28] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2F28] bg-[#111C17]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D09C]/10 border border-[#00D09C]/25 flex items-center justify-center text-[#00D09C]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Paper Wallet</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 text-[#00D09C]">
                  {planConfig.name} · {tierLabel} Cap
                </span>
              </div>
              <p className="text-xs text-[#9AB0A5]">
                {user?.name ? `${user.name} · ` : ''}Auto monthly reset: {formatINR(tierMaxLimit)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWalletModalOpen(false)}
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close wallet modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Navigation Tabs */}
        <div className="flex items-center gap-5 px-6 border-b border-[#1E2F28] bg-[#0B1310] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('add-money')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'add-money'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-[#9AB0A5] hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isFreeTier ? 'Top Up (+₹1L)' : 'Top Up Capital'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-[#9AB0A5] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ledger ({walletTransactions.length})</span>
          </button>
          {!isFreeTier && (
            <button
              type="button"
              onClick={() => setActiveTab('reset')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ml-auto cursor-pointer ${
                activeTab === 'reset'
                  ? 'border-rose-400 text-rose-400'
                  : 'border-transparent text-[#9AB0A5] hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Portfolio</span>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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

          {/* 1. ADD MONEY / TOP UP TAB */}
          {activeTab === 'add-money' && (
            <div className="space-y-4">
              {showSuccessMessage ? (
                <div className="p-6 rounded-xl bg-[#111C17] border border-[#00D09C]/40 text-center space-y-2">
                  <CheckCircle2 className="w-9 h-9 text-[#00D09C] mx-auto" />
                  <h4 className="font-bold text-white text-sm">Funds Credited</h4>
                  <p className="text-xs text-[#9AB0A5]">{showSuccessMessage}</p>
                </div>
              ) : isFreeTier ? (
                /* FREE TIER: ₹50 for +₹1,00,000 (1L) Top-Up */
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
              ) : isWalletFull ? (
                <div className="p-5 rounded-xl bg-[#111C17] border border-amber-400/35 space-y-3">
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

                    {/* Clean Non-Clipping Presets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {standardPresets.map((preset) => {
                        const exceedsLimit = preset.value > maxAllowedToAdd;
                        const isSelected = !isCustom && selectedAddPreset === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            disabled={exceedsLimit}
                            onClick={() => {
                              setSelectedAddPreset(preset.value);
                              setIsCustom(false);
                            }}
                            className={`p-3 rounded-xl border text-left transition-colors ${
                              exceedsLimit
                                ? 'opacity-40 cursor-not-allowed bg-[#111C17]/40 border-[#1E2F28]'
                                : isSelected
                                ? 'border-[#00D09C] bg-[#00D09C]/10 cursor-pointer'
                                : 'border-[#1E2F28] hover:border-[#2E473C] bg-[#111C17] cursor-pointer'
                            }`}
                          >
                            <div className="font-mono tabular-nums font-bold text-sm text-white">
                              {preset.label}
                            </div>
                            <div className="text-[10px] text-[#9AB0A5] mt-0.5">
                              {exceedsLimit ? `Exceeds ${tierLabel} headroom` : preset.sub}
                            </div>
                          </button>
                        );
                      })}

                      {/* Fill to Max Headroom */}
                      {maxAllowedToAdd > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddPreset(maxAllowedToAdd);
                            setIsCustom(false);
                          }}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            !isCustom && selectedAddPreset === maxAllowedToAdd
                              ? 'border-[#00D09C] bg-[#00D09C]/15'
                              : 'border-[#00D09C]/40 bg-[#111C17] hover:border-[#00D09C]'
                          }`}
                        >
                          <div className="font-mono tabular-nums font-bold text-sm text-[#00D09C]">
                            +₹{maxAllowedToAdd.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-[#9AB0A5] mt-0.5">
                            Fill to {tierLabel} Cap
                          </div>
                        </button>
                      )}
                    </div>
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
          )}

          {/* 2. TRANSACTION HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {walletTransactions.length === 0 ? (
                <div className="py-10 text-center text-[#9AB0A5] text-xs">
                  No wallet transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-[#1E2F28] rounded-xl border border-[#1E2F28] bg-[#111C17] px-4">
                  {walletTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.type === 'DEPOSIT'
                              ? 'bg-[#00D09C]/15 text-[#00D09C]'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{tx.description}</div>
                          <div className="text-[10px] text-[#9AB0A5] font-mono">
                            {new Date(tx.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono tabular-nums font-bold text-sm shrink-0 ${
                          tx.type === 'DEPOSIT' ? 'text-[#00D09C]' : 'text-white'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. RESET PORTFOLIO TAB */}
          {activeTab === 'reset' && !isFreeTier && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                  <CalendarClock className="w-4 h-4 shrink-0" />
                  <span>Unlimited Portfolio Reset ({planConfig.name})</span>
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed">
                  Clears all holdings, open intraday/MTF positions, and pending orders, and sets your fresh starting cash up to {formatINR(tierMaxLimit)}.
                </p>
              </div>

              {!showResetConfirm ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#D6E6DE]">
                    Select Fresh Starting Capital:
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {resetPresets.map((item) => (
                      <button
                        key={item.amount}
                        type="button"
                        onClick={() => handleConfirmReset(item.amount)}
                        className="p-3 rounded-xl border border-[#1E2F28] hover:border-rose-400/50 bg-[#111C17] text-left transition-colors cursor-pointer"
                      >
                        <div className="font-mono tabular-nums font-bold text-sm text-white">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-[#9AB0A5]">{item.sub}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2.5 rounded-xl font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs transition-colors cursor-pointer"
                  >
                    Reset to Full {planConfig.name} Capital ({formatINR(tierMaxLimit)})
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-[#111C17] space-y-3 text-center">
                  <p className="text-xs font-semibold text-white">
                    Confirm resetting your portfolio and open positions to {formatINR(tierMaxLimit)}?
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-[#9AB0A5] hover:text-white bg-[#16241E] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmReset(tierMaxLimit)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
