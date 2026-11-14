import React from 'react';
import type { PaidBillingCycle } from '../../../utils/pricing';
import { focusRing } from '../pricingStyles';

interface BillingToggleProps {
  value: PaidBillingCycle;
  onChange: (cycle: PaidBillingCycle) => void;
  /** Genuine maximum yearly saving (0 hides the badge). */
  savingsPercent: number;
}

const OPTIONS: { value: PaidBillingCycle; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const BillingToggle: React.FC<BillingToggleProps> = ({ value, onChange, savingsPercent }) => (
  <div
    role="group"
    aria-label="Billing period"
    className="inline-flex items-center gap-1 rounded-full border border-[#D9E4DE] bg-white p-1 dark:border-[#1E3128] dark:bg-[#111C17]"
  >
    {OPTIONS.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(opt.value)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-200 cursor-pointer ${focusRing} ${
            active
              ? 'bg-[#00B386] text-white dark:bg-[#00D09C] dark:text-[#04261C]'
              : 'text-[#5B7066] hover:text-[#15241D] dark:text-[#9AB0A5] dark:hover:text-white'
          }`}
        >
          {opt.label}
          {opt.value === 'yearly' && savingsPercent > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                active ? 'bg-white/25 dark:bg-[#04261C]/15' : 'bg-[#00D09C]/15 text-[#00936E] dark:text-[#00D09C]'
              }`}
            >
              Save up to {savingsPercent}%
            </span>
          )}
        </button>
      );
    })}
  </div>
);
