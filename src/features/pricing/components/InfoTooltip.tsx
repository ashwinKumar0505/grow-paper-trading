import React, { useId } from 'react';
import { Info } from 'lucide-react';
import { focusRing } from '../pricingStyles';

interface InfoTooltipProps {
  label: string;
  text: string;
}

/** Small accessible tooltip: opens on hover and keyboard focus, described via aria-describedby. */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ label, text }) => {
  const id = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={id}
        className={`rounded-full p-0.5 text-[#7E948A] hover:text-[#00936E] dark:hover:text-[#00D09C] ${focusRing}`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute left-full top-1/2 z-30 ml-2 w-60 -translate-y-1/2 rounded-lg border border-[#D9E4DE] bg-white px-3 py-2 text-xs font-normal leading-relaxed text-[#33463D] opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-[#2A4236] dark:bg-[#16241E] dark:text-[#C9D8D0]"
      >
        {text}
      </span>
    </span>
  );
};
