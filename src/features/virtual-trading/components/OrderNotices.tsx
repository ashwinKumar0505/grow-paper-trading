import { Info } from 'lucide-react';
import React from 'react';

export const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900 dark:text-white' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export const Notice: React.FC<{ children: React.ReactNode; warn?: boolean }> = ({ children, warn }) => (
  <div
    className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] leading-relaxed ${
      warn
        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
        : 'bg-gray-50 text-gray-600 dark:bg-[#20242F] dark:text-gray-300'
    }`}
  >
    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);
