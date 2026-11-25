import React from 'react';
import { ExternalLink, Receipt, RefreshCw, X } from 'lucide-react';
import type { SubscriptionTier } from '../../lib/subscription';
import type { UserProfile } from '../../types/market';
import { formatINR } from '../../utils/pricing';
import { formatProfileDate } from '../../utils/profileBilling';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { useBillingHistory } from './useBillingHistory';

interface BillingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  subscriptionTier: SubscriptionTier;
}

export const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({
  isOpen,
  onClose,
  user,
  subscriptionTier,
}) => {
  const { records, isLoading, errorMsg, reload } = useBillingHistory(
    isOpen,
    user,
    subscriptionTier
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-[#0B1310] border border-emerald-900/15 dark:border-[#1E2F28] shadow-2xl overflow-hidden text-left max-h-[85vh] flex flex-col focus:outline-none"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-emerald-900/10 dark:border-[#1E2F28]">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-[#10B981]" />
            <DialogTitle className="text-base font-bold text-[#15241D] dark:text-white">
              Billing History
            </DialogTitle>
            <DialogDescription className="sr-only">
              Subscription payments, transaction IDs, and receipts.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close billing history"
            className="p-1.5 rounded-lg text-[#5B7066] dark:text-[#9AB0A5] hover:text-[#15241D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading billing history">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-900/10 dark:border-[#1E2F28] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-2.5 animate-pulse"
                >
                  <div className="h-4 w-40 rounded bg-emerald-900/10 dark:bg-white/10" />
                  <div className="h-3 w-56 rounded bg-emerald-900/10 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : errorMsg ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-200 flex items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <Button type="button" variant="outline" size="sm" onClick={reload} className="cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-emerald-900/10 dark:border-[#1E2F28] bg-[#F3F6F4] dark:bg-[#111C17] p-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-[#15241D] dark:text-white">
                No subscription payments yet
              </p>
              <p className="text-xs text-[#4E655A] dark:text-[#A3B8AE]">
                Your Razorpay subscription charges and receipts will appear here after billing.
              </p>
            </div>
          ) : (
            records.map((item) => (
              <div
                key={item.id + item.transactionId}
                className="rounded-xl border border-emerald-900/10 dark:border-[#1E2F28] bg-[#F3F6F4] dark:bg-[#111C17] p-4 space-y-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#15241D] dark:text-white">
                      {item.planName}
                    </div>
                    <div className="text-xs text-[#4E655A] dark:text-[#A3B8AE] capitalize">
                      {formatProfileDate(item.dateMs)} · {item.billingCycle}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[#15241D] dark:text-white">
                      {formatINR(item.amountINR)}
                    </div>
                    <span className="inline-block rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#008F6B] dark:text-emerald-400 capitalize">
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-900/10 dark:border-[#1E2F28] flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-[#4E655A] dark:text-[#A3B8AE] truncate">
                    ID: {item.transactionId}
                  </span>
                  {item.receiptUrl && (
                    <a
                      href={item.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#008F6B] dark:text-emerald-400 hover:underline shrink-0"
                    >
                      <span>Receipt</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
