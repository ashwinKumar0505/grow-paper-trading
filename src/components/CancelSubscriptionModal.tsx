import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Loader2, X } from 'lucide-react';
import { fetchRazorpaySubscriptionStatus } from './checkout/razorpayApi';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  billingCycle: string;
  expiresAt?: number | null;
  updatedAt?: number;
  subscriptionId?: string;
  onConfirmCancel: () => Promise<{ success: boolean; expiresAt?: number; message?: string }>;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  planName,
  billingCycle,
  expiresAt,
  updatedAt,
  subscriptionId,
  onConfirmCancel,
}) => {
  const cycleMs =
    billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const fallbackEndMs = expiresAt || (updatedAt ? updatedAt + cycleMs : Date.now() + cycleMs);

  const [lastActiveMs, setLastActiveMs] = useState<number>(fallbackEndMs);
  const [isCheckingDate, setIsCheckingDate] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLastActiveMs(fallbackEndMs);
    setErrorMsg(null);
    setIsCancelling(false);

    if (!subscriptionId || !subscriptionId.startsWith('sub_')) return;

    let active = true;
    setIsCheckingDate(true);
    fetchRazorpaySubscriptionStatus(subscriptionId)
      .then((res) => {
        if (!active) return;
        const liveEnd = res.currentEndMs || res.endedAtMs || res.chargeAtMs;
        if (res.success && liveEnd) {
          setLastActiveMs(liveEnd);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsCheckingDate(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, subscriptionId, fallbackEndMs]);

  if (!isOpen) return null;

  const lastDateLabel = formatDate(lastActiveMs);
  const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsCancelling(true);
    try {
      const result = await onConfirmCancel();
      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.message || 'Unable to cancel subscription. Please try again.');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isCancelling) onClose();
      }}
    >
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
        onClick={() => !isCancelling && onClose()}
      />
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0B1310] border border-[#1E2F28] shadow-2xl p-6 space-y-5 text-left focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Cancel Subscription?
              </DialogTitle>
              <DialogDescription className="text-xs text-[#9AB0A5] mt-0.5">
                {planName} · {cycleLabel}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            disabled={isCancelling}
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#9AB0A5] hover:text-white hover:bg-white/5 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#D1DED7] leading-relaxed">
          Are you sure you want to cancel your{' '}
          <span className="font-semibold text-white">{planName}</span> subscription?
        </p>

        <div className="rounded-xl bg-[#111C17] border border-[#1E2F28] p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#9AB0A5] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#10B981]" />
              <span>Active Until (Last Date)</span>
            </span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              {isCheckingDate && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10B981]" />}
              {lastDateLabel}
            </span>
          </div>
          <p className="text-xs text-[#9AB0A5] leading-relaxed border-t border-[#1E2F28] pt-2.5">
            You will keep full {planName} access until{' '}
            <span className="text-white font-medium">{lastDateLabel}</span>. After that date,
            auto-renewal will stop and your account will automatically move to the{' '}
            <span className="text-white font-medium">Free Starter</span> plan (₹1,00,000 virtual
            capital limit).
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isCancelling}
            onClick={onClose}
            className="flex-1 whitespace-nowrap cursor-pointer"
          >
            Keep Subscription
          </Button>
          <Button
            type="button"
            disabled={isCancelling || isCheckingDate}
            onClick={handleConfirm}
            className="flex-1 whitespace-nowrap bg-rose-600 hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-semibold cursor-pointer"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling…</span>
              </>
            ) : (
              <span>Yes, Cancel Subscription</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
