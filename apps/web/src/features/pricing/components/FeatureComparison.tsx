import React, { useState } from 'react';
import { Check, ChevronDown, Crown, Leaf, Minus, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '../../../lib/subscription';
import { formatINR, getPlanPriceView, type PaidBillingCycle } from '../../../utils/pricing';
import { COMPARISON_CATEGORIES, PLAN_ORDER, type ComparisonCell } from '../pricingConfig';
import { accentText, focusRing, sectionHeading, surface, textMuted, textStrong } from '../pricingStyles';
import { InfoTooltip } from './InfoTooltip';

const TIER_ICON: Record<SubscriptionTier, typeof Leaf> = { free: Leaf, beginner: Zap, advanced: Crown };
const BEGINNER_COL = 'bg-[#00D09C]/[0.05] dark:bg-[#00D09C]/[0.06]';
const STICKY_COL = 'sticky left-0 z-10 bg-white dark:bg-[#111C17]';

const Cell: React.FC<{ value: ComparisonCell }> = ({ value }) => {
  if (value === true) {
    return (
      <>
        <Check className={`mx-auto h-4 w-4 ${accentText}`} strokeWidth={3} aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-[#A9BBB2] dark:text-[#4A6457]" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span>{value}</span>;
};

export const FeatureComparison: React.FC<{ billingCycle: PaidBillingCycle }> = ({ billingCycle }) => {
  // First category open by default; the rest stay collapsed to keep the page short.
  const [open, setOpen] = useState<Set<string>>(() => new Set([COMPARISON_CATEGORIES[0].id]));
  const allOpen = open.size === COMPARISON_CATEGORIES.length;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="compare-plans" aria-labelledby="compare-plans-title" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <h2 id="compare-plans-title" className={sectionHeading}>
            Compare Plans in Detail
          </h2>
          <p className={`mt-1 text-sm ${textMuted}`}>Exact limits for every feature, grouped by product.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(COMPARISON_CATEGORIES.map((c) => c.id)))}
          className={`rounded-lg px-3 py-2 text-sm font-bold hover:underline cursor-pointer ${accentText} ${focusRing}`}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className={`overflow-x-auto rounded-2xl ${surface}`}>
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <caption className="sr-only">Feature comparison of Free Starter, Beginner and Advanced plans</caption>
          <thead>
            <tr className="border-b border-[#E3ECE7] dark:border-[#1E3128]">
              <th scope="col" className={`${STICKY_COL} w-[34%] px-5 py-4 text-xs font-bold uppercase tracking-wider ${textMuted}`}>
                Features
              </th>
              {PLAN_ORDER.map((tier) => {
                const plan = SUBSCRIPTION_PLANS[tier];
                const price = getPlanPriceView(plan, billingCycle);
                const Icon = TIER_ICON[tier];
                return (
                  <th
                    key={tier}
                    scope="col"
                    className={`w-[22%] px-4 py-4 text-center ${tier === 'beginner' ? BEGINNER_COL : ''}`}
                  >
                    <span className={`inline-flex items-center gap-1.5 font-extrabold ${textStrong}`}>
                      <Icon
                        className={`h-4 w-4 ${tier === 'advanced' ? 'text-amber-600 dark:text-amber-300' : accentText}`}
                        aria-hidden="true"
                      />
                      {plan.name.replace(' Package', '')}
                    </span>
                    <span className={`block text-xs font-medium ${textMuted}`}>
                      {formatINR(price.charged)} {price.periodLabel}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {COMPARISON_CATEGORIES.map((cat) => {
            const isOpen = open.has(cat.id);
            const panelId = `compare-${cat.id}`;
            return (
              <tbody key={cat.id} className="border-b border-[#E3ECE7] last:border-b-0 dark:border-[#1E3128]">
                <tr>
                  <th scope="colgroup" colSpan={4} className="p-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={cat.rows.map((_, i) => `${panelId}-${i}`).join(' ')}
                      onClick={() => toggle(cat.id)}
                      className={`flex w-full items-center gap-2.5 px-5 py-3.5 text-left text-sm font-extrabold hover:bg-[#F3F6F4] dark:hover:bg-[#14231C] cursor-pointer ${textStrong} ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}
                    >
                      <cat.icon className={`h-4 w-4 ${accentText}`} aria-hidden="true" />
                      <span className="flex-1">{cat.title}</span>
                      <span className={`text-xs font-semibold ${textMuted}`}>{cat.rows.length} features</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${textMuted} ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                </tr>
                {cat.rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    id={`${panelId}-${i}`}
                    hidden={!isOpen}
                    className="border-t border-[#EEF3F0] dark:border-[#18291F]"
                  >
                    <th scope="row" className={`${STICKY_COL} px-5 py-3 font-semibold text-[#26372F] dark:text-[#D6E4DD]`}>
                      <span className="inline-flex items-center gap-1">
                        {row.feature}
                        {row.tooltip && <InfoTooltip label={row.feature} text={row.tooltip} />}
                      </span>
                    </th>
                    {PLAN_ORDER.map((tier) => (
                      <td
                        key={tier}
                        className={`px-4 py-3 text-center text-[13px] ${tier === 'beginner' ? `${BEGINNER_COL} font-semibold ${textStrong}` : textMuted}`}
                      >
                        <Cell value={row.values[tier]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className={`text-center text-xs sm:hidden ${textMuted}`}>Swipe the table sideways to see all plans.</p>
    </section>
  );
};
