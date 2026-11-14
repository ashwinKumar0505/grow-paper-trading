import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTrading } from '../../../context/TradingContext';
import { AppLink, navigate } from '../../../lib/navigation';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../../lib/subscription';
import {
  getPlanCtaState,
  getPlanPriceView,
  getUpgradeAmountQuote,
  type PaidBillingCycle,
  type PlanCtaState,
} from '../../../utils/pricing';
import { PLAN_CARDS, PLAN_ORDER } from '../pricingConfig';
import { accentText, focusRing } from '../pricingStyles';
import { PricingCard } from './PricingCard';

interface PricingCardsProps {
  billingCycle: PaidBillingCycle;
  /** Href for the bottom comparison link. Defaults to "#compare-plans". */
  compareHref?: string;
  /** Label for the bottom comparison link. */
  compareLabel?: string;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Connects plan cards to existing auth and checkout flows. Payment amounts are
 * never computed here: openRazorpayCheckout passes only tier + cycle, and the
 * server (/api/payments/create-order) resolves the amount.
 */
export const PricingCards: React.FC<PricingCardsProps> = ({
  billingCycle,
  compareHref = '#compare-plans',
  compareLabel = 'Compare all features',
}) => {
  const { user, subscriptionTier, openAuthModal, openRazorpayCheckout, razorpayModalState } = useTrading();

  const handleSelect = (tier: SubscriptionTier, state: PlanCtaState) => {
    if (state === 'signup') {
      openAuthModal('signup');
      return;
    }
    if (state === 'open-desk') {
      navigate('/trade');
      return;
    }
    if ((state === 'upgrade' || state === 'renew') && tier !== 'free') {
      openRazorpayCheckout(tier, billingCycle);
    }
  };

  const activeNoteFor = (tier: SubscriptionTier, state: PlanCtaState): string | undefined => {
    if (!user || tier !== subscriptionTier || tier === 'free') return undefined;
    const cycle = user.subscriptionBillingCycle === 'yearly' ? 'Yearly' : 'Monthly';
    const expiresAt = user.subscriptionExpiresAt;
    if (!expiresAt) return `${cycle} plan`;
    return state === 'renew'
      ? `${cycle} plan ended ${dateFmt.format(expiresAt)}`
      : `${cycle} plan · valid until ${dateFmt.format(expiresAt)}`;
  };

  return (
    <section aria-label="Plans" className="space-y-6">
      <div className="grid grid-cols-1 gap-6 pt-3 md:grid-cols-2 lg:pt-6 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
        {PLAN_ORDER.map((tier) => {
          const state = getPlanCtaState({
            cardTier: tier,
            isLoggedIn: Boolean(user),
            userTier: subscriptionTier,
            expiresAt: user?.subscriptionExpiresAt,
          });
          const quote =
            tier !== 'free' && user
              ? getUpgradeAmountQuote({
                  targetTier: tier,
                  billingCycle,
                  currentTier: subscriptionTier,
                  plans: SUBSCRIPTION_PLANS,
                })
              : null;
          return (
            <div key={tier} className={tier === 'advanced' ? 'md:col-span-2 md:mx-auto md:w-full md:max-w-md lg:col-span-1 lg:max-w-none' : ''}>
              <PricingCard
                plan={SUBSCRIPTION_PLANS[tier]}
                content={PLAN_CARDS[tier]}
                price={getPlanPriceView(SUBSCRIPTION_PLANS[tier], billingCycle)}
                ctaState={state}
                activeNote={activeNoteFor(tier, state)}
                upgradeDifference={
                  quote?.isDifferentialUpgrade
                    ? { payableINR: quote.payableINR, creditAppliedINR: quote.creditAppliedINR }
                    : undefined
                }
                isLoading={razorpayModalState.isOpen && razorpayModalState.tier === tier}
                onSelect={handleSelect}
              />
            </div>
          );
        })}
      </div>

      <p className="text-center">
        {compareHref.startsWith('#') ? (
          <a
            href={compareHref}
            className={`inline-flex items-center gap-1.5 rounded-md text-sm font-bold hover:underline ${accentText} ${focusRing}`}
          >
            {compareLabel}
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <AppLink
            href={compareHref}
            className={`inline-flex items-center gap-1.5 rounded-md text-sm font-bold hover:underline ${accentText} ${focusRing}`}
          >
            {compareLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </AppLink>
        )}
      </p>
    </section>
  );
};
