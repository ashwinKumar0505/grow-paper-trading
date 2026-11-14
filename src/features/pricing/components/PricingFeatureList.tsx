import React from 'react';
import { Check } from 'lucide-react';
import type { PlanCardFeature } from '../pricingConfig';
import { textMuted } from '../pricingStyles';

interface PricingFeatureListProps {
  heading?: string;
  features: PlanCardFeature[];
  accent: 'green' | 'gold';
}

export const PricingFeatureList: React.FC<PricingFeatureListProps> = ({ heading, features, accent }) => {
  const checkClass =
    accent === 'gold'
      ? 'bg-amber-400/15 text-amber-600 dark:text-amber-300'
      : 'bg-[#00D09C]/15 text-[#00936E] dark:text-[#00D09C]';

  return (
    <div className="mt-5">
      {heading && <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${textMuted}`}>{heading}</p>}
      <ul className="space-y-3">
        {features.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm leading-snug text-[#26372F] dark:text-[#D6E4DD]">
            <span className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${checkClass}`}>
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="flex-1">{text}</span>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8AA197] dark:text-[#5F7A6D]" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
};
