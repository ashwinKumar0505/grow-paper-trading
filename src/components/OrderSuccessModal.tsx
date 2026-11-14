import React, { useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { SCHEDULED_ORDER_DISCLAIMER } from '../utils/orderEngine';

export const OrderSuccessModal: React.FC = () => {
  const { lastExecutedOrder, setLastExecutedOrder, setCurrentTab } = useTrading();

  useEffect(() => {
    if (lastExecutedOrder && lastExecutedOrder.status === 'EXECUTED') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00D09C', '#5367FF', '#FFB800'],
      });
    }
  }, [lastExecutedOrder]);

  if (!lastExecutedOrder) return null;

  const isBuy = lastExecutedOrder.action === 'BUY';
  const isScheduled = lastExecutedOrder.status === 'SCHEDULED';
  const displayPrice =
    lastExecutedOrder.executionPrice ??
    lastExecutedOrder.avgPrice ??
    lastExecutedOrder.price;

  const handleClose = () => {
    setLastExecutedOrder(null);
  };

  const handlePrimaryNavigation = () => {
    setLastExecutedOrder(null);
    setCurrentTab(isScheduled ? 'orders' : 'holdings');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-[#1A1D24] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2B303C] p-6 text-center z-10 space-y-5">
        {/* Status Badge */}
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isScheduled
              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
              : 'bg-emerald-50 dark:bg-[#132B23] text-[#00D09C]'
          }`}
        >
          {isScheduled ? (
            <Clock className="w-10 h-10" />
          ) : (
            <CheckCircle2 className="w-10 h-10" />
          )}
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {isScheduled
              ? `Order Scheduled (${isBuy ? 'Schedule Buy' : 'Schedule Sell'})`
              : 'Order Executed Successfully!'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Order ID: {lastExecutedOrder.id}
          </p>
        </div>

        {isScheduled && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 text-left text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {SCHEDULED_ORDER_DISCLAIMER}
          </div>
        )}

        {/* Order Details Card */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#20242F] border border-gray-100 dark:border-[#2B303C] text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Stock:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {lastExecutedOrder.symbol} ({lastExecutedOrder.product})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Action:</span>
            <span
              className={`font-bold ${
                isBuy ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
              }`}
            >
              {lastExecutedOrder.action} {lastExecutedOrder.quantity} Shares ({lastExecutedOrder.orderType})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              {isScheduled ? 'Last Available / Ref Price:' : 'Execution Price:'}
            </span>
            <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white">
              ₹{displayPrice.toFixed(2)}
            </span>
          </div>
          {isScheduled && lastExecutedOrder.scheduledForSession && (
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled Session:</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {lastExecutedOrder.scheduledForSession} (09:15 AM IST)
              </span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-800">
            <span className="text-gray-500">
              {isScheduled ? 'Reserved Value:' : 'Total Value:'}
            </span>
            <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white">
              ₹{lastExecutedOrder.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handlePrimaryNavigation}
            className="w-full py-3 rounded-xl font-bold text-white bg-[#00D09C] hover:bg-[#00c090] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>
              {isScheduled ? 'View Scheduled Orders' : 'View Holdings & Positions'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
