import {
CalendarClock
} from 'lucide-react';
import { formatINR } from '../../../utils/pricing';
import type { WalletViewModel } from '../hooks/useWalletView';
type Props = Pick<WalletViewModel, 'planConfig' | 'activeTab' | 'showResetConfirm' | 'setShowResetConfirm' | 'isFreeTier' | 'tierMaxLimit' | 'handleConfirmReset' | 'resetPresets'>;

export function WalletReset({ planConfig, activeTab, showResetConfirm, setShowResetConfirm, isFreeTier, tierMaxLimit, handleConfirmReset, resetPresets }: Props) {
 return <>
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

 </>;
}
