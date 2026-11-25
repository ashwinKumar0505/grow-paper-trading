import React, { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { getMaxYearlySavingsPercent, type PaidBillingCycle } from '../utils/pricing';
import { PricingHero } from '../features/pricing/components/PricingHero';
import { PricingCards } from '../features/pricing/components/PricingCards';
import { ProductHighlights } from '../features/pricing/components/ProductHighlights';
import { FeatureComparison } from '../features/pricing/components/FeatureComparison';
import { VirtualCapitalInfo } from '../features/pricing/components/VirtualCapitalInfo';
import { PricingFAQ } from '../features/pricing/components/PricingFAQ';
import { PricingCTA } from '../features/pricing/components/PricingCTA';

const MAX_YEARLY_SAVINGS = getMaxYearlySavingsPercent(Object.values(SUBSCRIPTION_PLANS));

/** /pricing — composition only; plan data lives in lib/subscription + features/pricing/pricingConfig. */
export const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<PaidBillingCycle>('yearly');

  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] w-full overflow-x-hidden bg-[#F3F6F4] font-sans text-[#15241D] dark:bg-[#0B1310] dark:text-[#E9F2EE]">
      <main className="mx-auto max-w-[1200px] space-y-14 px-4 pb-16 pt-10 sm:space-y-16 sm:px-6 sm:pt-14 lg:px-8">
        <div className="space-y-10">
          <PricingHero
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
            savingsPercent={MAX_YEARLY_SAVINGS}
          />
          <PricingCards billingCycle={billingCycle} />
        </div>
        <ProductHighlights />
        <FeatureComparison billingCycle={billingCycle} />
        <VirtualCapitalInfo />
        <PricingFAQ />
        <PricingCTA />
      </main>
    </div>
  );
};
