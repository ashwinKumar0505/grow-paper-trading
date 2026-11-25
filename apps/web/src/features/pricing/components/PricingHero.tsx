import React from 'react';
import type { PaidBillingCycle } from '../../../utils/pricing';
import { textMuted, textStrong } from '../pricingStyles';
import { BillingToggle } from './BillingToggle';

interface PricingHeroProps {
  billingCycle: PaidBillingCycle;
  onBillingCycleChange: (cycle: PaidBillingCycle) => void;
  savingsPercent: number;
}

export const PricingHero: React.FC<PricingHeroProps> = ({ billingCycle, onBillingCycleChange, savingsPercent }) => (
  <header className="mx-auto max-w-3xl space-y-5 text-center">
    <h1 className={`text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl ${textStrong}`}>
      Find the Right Plan for Your{' '}
      <span className="text-[#00B386] dark:text-[#00D09C]">Trading Journey</span>
    </h1>
    <p className={`mx-auto max-w-2xl text-base leading-relaxed sm:text-lg ${textMuted}`}>
      Start learning and practicing for free. Unlock powerful screening, advanced paper trading, and deeper market
      insights as you grow.
    </p>
    <div className="pt-1">
      <BillingToggle value={billingCycle} onChange={onBillingCycleChange} savingsPercent={savingsPercent} />
    </div>
  </header>
);
