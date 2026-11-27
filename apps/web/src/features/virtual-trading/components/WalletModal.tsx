import {
History,
PlusCircle,
RotateCcw,
Wallet,
X
} from 'lucide-react';
import React from 'react';
import { formatINR } from '../../../utils/pricing';
import { useWalletView } from '../hooks/useWalletView';
import { WalletCapital } from './WalletCapital';
import { WalletHistory } from './WalletHistory';
import { WalletReset } from './WalletReset';
import { WalletTopUp } from './WalletTopUp';

export const WalletModal: React.FC = () => {
 const model = useWalletView();
 const { isWalletModalOpen, setIsWalletModalOpen, walletTransactions, user, planConfig, activeTab, setActiveTab, isFreeTier, tierMaxLimit, tierLabel } = model;
 if (!isWalletModalOpen) return null;
 return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Tradedia Paper Wallet"
    >
      <div className="fixed inset-0" onClick={() => setIsWalletModalOpen(false)} />

      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B1310] border border-[#1E2F28] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Minimal Header */}
        <div className="flex items-start sm:items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#1E2F28] bg-[#111C17]/70 shrink-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#00D09C]/10 border border-[#00D09C]/25 flex items-center justify-center text-[#00D09C] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-bold text-base text-white whitespace-nowrap">Paper Wallet</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00D09C]/15 border border-[#00D09C]/30 text-[#00D09C] whitespace-nowrap">
                  {planConfig.name} · {tierLabel} Cap
                </span>
              </div>
              <p className="text-xs text-[#9AB0A5] mt-0.5 leading-snug">
                {user?.name ? `${user.name} · ` : ''}Auto monthly reset: {formatINR(tierMaxLimit)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWalletModalOpen(false)}
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Close wallet modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Navigation Tabs */}
        <div className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 border-b border-[#1E2F28] bg-[#0B1310] shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('add-money')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'add-money'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-[#9AB0A5] hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{isFreeTier ? 'Add Capital' : 'Top Up Capital'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'border-[#00D09C] text-[#00D09C]'
                : 'border-transparent text-[#9AB0A5] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Ledger ({walletTransactions.length})</span>
          </button>
          {!isFreeTier && (
            <button
              type="button"
              onClick={() => setActiveTab('reset')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ml-auto cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'reset'
                  ? 'border-rose-400 text-rose-400'
                  : 'border-transparent text-[#9AB0A5] hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Portfolio</span>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
<WalletCapital {...model} />
<WalletTopUp {...model} />
<WalletHistory {...model} />
<WalletReset {...model} />
        </div>
      </div>
    </div>
  );

};
