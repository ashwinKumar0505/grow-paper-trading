import React from 'react';
import { useTrading } from '../context/TradingContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useTrading();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto p-4 bg-white dark:bg-[#1E222D] rounded-xl shadow-xl border border-gray-200 dark:border-[#2B303C] flex items-start justify-between gap-3 animate-slide-up transition-all"
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-[#00D09C] shrink-0 mt-0.5" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-[#EB5B5B] shrink-0 mt-0.5" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-extrabold text-xs text-gray-900 dark:text-white">
                  {toast.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {toast.description}
                </div>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
