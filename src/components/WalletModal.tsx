import React, { useState } from 'react';
import { useTrading, MAX_WALLET_LIMIT } from '../context/TradingContext';
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
  Building2,
  Lock,
  Info,
} from 'lucide-react';

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
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'add-money' | 'history' | 'reset'>('add-money');
  const [selectedAddPreset, setSelectedAddPreset] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isWalletModalOpen) return null;

  const maxAllowedToAdd = Math.max(0, MAX_WALLET_LIMIT - balance);
  const isWalletFull = balance >= MAX_WALLET_LIMIT;
  const capacityPercent = Math.min(100, Math.round((balance / MAX_WALLET_LIMIT) * 100));

  const standardPresets = [
    { label: '+₹25,000', value: 25000 },
    { label: '+₹50,000', value: 50000, popular: true },
    { label: '+₹1,00,000', value: 100000 },
    { label: '+₹2,00,000', value: 200000 },
  ];

  // Effective requested amount
  let currentRequestedAmount = 0;
  let customError = '';

  if (isCustom) {
    const parsed = parseFloat(customAmount.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      currentRequestedAmount = parsed;
      if (parsed > maxAllowedToAdd) {
        customError = `Cannot add ₹${parsed.toLocaleString('en-IN')}. Maximum allowed headroom is ₹${maxAllowedToAdd.toLocaleString('en-IN')} (10 Lakhs limit).`;
      }
    }
  } else {
    currentRequestedAmount = selectedAddPreset;
  }

  const isAddDisabled =
    isWalletFull ||
    currentRequestedAmount <= 0 ||
    currentRequestedAmount > maxAllowedToAdd;

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddDisabled) return;

    const success = addMoneyToWallet(currentRequestedAmount, `Added via Paper Wallet Deposit`);
    if (success) {
      setShowSuccessMessage(`₹${currentRequestedAmount.toLocaleString('en-IN')} added to your paper wallet!`);
      setTimeout(() => {
        setShowSuccessMessage(null);
        setIsWalletModalOpen(false);
      }, 1400);
    }
  };

  const handleConfirmReset = (amount = 500000) => {
    resetPortfolio(amount);
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={() => setIsWalletModalOpen(false)} />

      <div className="relative w-full max-w-xl bg-white dark:bg-[#1A1D24] rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2B303C] overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#282C37]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132A22] flex items-center justify-center text-[#00D09C]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>TradePlaybook Wallet</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00D09C]">
                  Simulation Desk
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.name ? `${user.name} (+91 ${user.phone})` : 'Virtual Trading Capital'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWalletModalOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252A36] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Card & 10L Limit Progress */}
        <div className="p-6 pb-2 space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-[#132721] dark:to-[#172d27] border border-[#00D09C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Available Paper Cash
              </div>
              <div className="font-mono tabular-nums text-3xl font-black text-gray-900 dark:text-white mt-0.5">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1 sm:border-l sm:border-emerald-200 dark:sm:border-emerald-900/60 sm:pl-4">
              <div className="text-gray-500 dark:text-gray-400">
                In Holdings: <strong className="text-gray-900 dark:text-white font-mono">₹{portfolioSummary.currentValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Locked Margin: <strong className="text-gray-900 dark:text-white font-mono">₹{portfolioSummary.lockedMargin.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* 10L Wallet Limit Indicator Bar */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#00D09C]" />
                <span>Wallet Capacity (Max ₹10,00,000)</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-gray-600 dark:text-gray-400">
                {capacityPercent}% ({maxAllowedToAdd > 0 ? `₹${maxAllowedToAdd.toLocaleString('en-IN')} room left` : 'Full'})
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-[#2B303C] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isWalletFull
                    ? 'bg-amber-500'
                    : capacityPercent > 80
                    ? 'bg-emerald-500'
                    : 'bg-[#00D09C]'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 border-b border-gray-100 dark:border-[#282C37]">
          <button
            onClick={() => setActiveTab('add-money')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'add-money'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Money</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Transaction Ledger ({walletTransactions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ml-auto cursor-pointer ${
              activeTab === 'reset'
                ? 'border-rose-500 text-rose-500'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Portfolio</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* 1. ADD MONEY TAB */}
          {activeTab === 'add-money' && (
            <div className="space-y-5">
              {showSuccessMessage ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-[#00D09C]/40 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#00D09C] mx-auto animate-bounce" />
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                    Funds Credited!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {showSuccessMessage}
                  </p>
                </div>
              ) : isWalletFull ? (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      ₹10 Lakhs Wallet Limit Reached
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                      Your paper wallet has reached the maximum permitted balance of ₹10,00,000 (10 Lakhs). You cannot add more virtual cash right now.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWalletModalOpen(false)}
                      className="px-4 py-2 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Continue Trading
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddFunds} className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Choose Amount to Add
                      </label>
                      <span className="text-[11px] text-gray-400">
                        Max limit: ₹10,00,000
                      </span>
                    </div>

                    {/* Presets Grid */}
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
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                              exceedsLimit
                                ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-[#1E222B] border-gray-200 dark:border-[#282C37]'
                                : isSelected
                                ? 'border-[#00D09C] bg-emerald-50/70 dark:bg-[#152B24] ring-1 ring-[#00D09C] cursor-pointer'
                                : 'border-gray-200 dark:border-[#2B303C] hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#20242F] cursor-pointer'
                            }`}
                          >
                            <div className="font-mono tabular-nums font-bold text-sm text-gray-900 dark:text-white">
                              {preset.label}
                            </div>
                            {preset.popular && !exceedsLimit && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#00D09C] text-white rounded font-bold uppercase mt-1 inline-block">
                                Popular
                              </span>
                            )}
                            {exceedsLimit && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
                                Exceeds 10L
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Fill to Max Preset */}
                      {maxAllowedToAdd > 0 && maxAllowedToAdd < 1000000 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddPreset(maxAllowedToAdd);
                            setIsCustom(false);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                            !isCustom && selectedAddPreset === maxAllowedToAdd
                              ? 'border-[#00D09C] bg-emerald-50/70 dark:bg-[#152B24] ring-1 ring-[#00D09C]'
                              : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-[#132A22]/30 hover:border-[#00D09C]'
                          }`}
                        >
                          <div className="font-mono tabular-nums font-bold text-sm text-[#00D09C]">
                            +₹{maxAllowedToAdd.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold block mt-1">
                            Fill to 10L Max
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Or Custom Amount */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCustom(!isCustom)}
                      className="text-xs text-[#00D09C] font-bold hover:underline mb-1 inline-block cursor-pointer"
                    >
                      {isCustom ? '← Pick preset amount' : '+ Enter custom amount'}
                    </button>

                    {isCustom && (
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="1000"
                          max={maxAllowedToAdd}
                          autoFocus
                          placeholder={`Max: ₹${maxAllowedToAdd.toLocaleString('en-IN')}`}
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className={`w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-[#20242F] border rounded-xl text-sm font-bold font-mono text-gray-900 dark:text-white focus:outline-hidden transition-colors ${
                            customError
                              ? 'border-rose-400 focus:border-rose-500'
                              : 'border-gray-200 dark:border-[#2B303C] focus:border-[#00D09C]'
                          }`}
                        />
                      </div>
                    )}

                    {customError && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{customError}</span>
                      </p>
                    )}
                  </div>

                  {/* Simulated Bank Badge */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#20242F] border border-gray-200 dark:border-[#282C37] text-xs text-gray-500 dark:text-gray-400">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">Instant Simulated UPI / NetBanking Deposit (Free)</span>
                    <Lock className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isAddDisabled}
                    className={`w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                      isAddDisabled
                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                        : 'bg-[#00D09C] hover:bg-[#00c090] active:scale-[0.99] cursor-pointer'
                    }`}
                  >
                    <span>
                      Add ₹{currentRequestedAmount.toLocaleString('en-IN')} to Wallet
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 2. TRANSACTION HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {walletTransactions.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No wallet transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#282C37]">
                  {walletTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            tx.type === 'DEPOSIT'
                              ? 'bg-emerald-50 text-[#00D09C] dark:bg-[#132A22]'
                              : 'bg-rose-50 text-rose-500 dark:bg-rose-950/40'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {tx.description}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {new Date(tx.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono tabular-nums font-bold text-sm ${
                          tx.type === 'DEPOSIT' ? 'text-[#00D09C]' : 'text-gray-900 dark:text-white'
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
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Permanent Portfolio Reset</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Resetting will liquidate all active holdings, close intraday positions, clear past orders, and restore your paper cash to the chosen initial capital (up to ₹10,00,000).
                </p>
              </div>

              {!showResetConfirm ? (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Select Fresh Starting Cash:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[100000, 200000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleConfirmReset(amt)}
                        className="p-3 rounded-xl border border-gray-200 dark:border-[#2B303C] hover:border-rose-400 dark:hover:border-rose-600 bg-white dark:bg-[#20242F] text-left transition-colors cursor-pointer"
                      >
                        <div className="font-mono tabular-nums font-bold text-sm text-gray-900 dark:text-white">
                          ₹{amt.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {amt === 1000000 ? 'Max Cap (10L)' : amt === 500000 ? 'Default 5L' : 'Custom'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3 rounded-xl font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs transition-colors cursor-pointer"
                    >
                      Reset with Current User Initial Cash (₹{(user?.initialCash || 500000).toLocaleString('en-IN')})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#1E222B] space-y-3 text-center">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Are you sure you want to reset everything?
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmReset(user?.initialCash || 500000)}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                    >
                      Yes, Reset All
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
