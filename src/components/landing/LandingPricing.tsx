import { BillingToggle } from '../../features/pricing/components/BillingToggle';
import { PricingCards } from '../../features/pricing/components/PricingCards';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription';
import { getMaxYearlySavingsPercent } from '../../utils/pricing';
import type { LandingModel } from './useLandingPage';
const MAX_YEARLY_SAVINGS = getMaxYearlySavingsPercent(Object.values(SUBSCRIPTION_PLANS));
type Props = Pick<LandingModel, 'billingCycle' | 'setBillingCycle'>;
export function LandingPricing({ billingCycle, setBillingCycle }: Props) {
return (
<section
        id="pricing-packages"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#F3F6F4] dark:bg-[#0B1310] border-t border-b border-emerald-900/10 dark:border-[#20332A]"
      >
        <div className="w-full max-w-[1200px] mx-auto space-y-10">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-[#15241D] dark:text-white">
              Find the Right Plan for Your{' '}
              <span className="text-[#00B386] dark:text-[#00D09C]">Trading Journey</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed sm:text-lg text-[#5B7066] dark:text-[#9AB0A5]">
              Start learning and practicing for free. Unlock backtested stock screening, deeper chart analysis, and
              advanced paper trading as you grow.
            </p>
            <div className="pt-1">
              <BillingToggle
                value={billingCycle}
                onChange={setBillingCycle}
                savingsPercent={MAX_YEARLY_SAVINGS}
              />
            </div>
          </div>

          <PricingCards
            billingCycle={billingCycle}
            compareHref="/pricing#compare-plans"
            compareLabel="Compare all features & full plan details"
          />
        </div>
      </section>
);
}
