import {
ArrowDownLeft,
ArrowUpRight
} from 'lucide-react';
import type { WalletViewModel } from '../hooks/useWalletView';
type Props = Pick<WalletViewModel, 'walletTransactions' | 'activeTab'>;

export function WalletHistory({ walletTransactions, activeTab }: Props) {
 return <>
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


 </>;
}
