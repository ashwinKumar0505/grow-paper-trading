import React from 'react';
import { ChevronDown } from 'lucide-react';
import { PRICING_FAQS } from '../pricingConfig';
import { focusRing, sectionHeading, surface, textMuted, textStrong } from '../pricingStyles';

/** Native <details> accordion: keyboard and screen-reader accessible with no extra state. */
export const PricingFAQ: React.FC = () => (
  <section aria-labelledby="pricing-faq-title" className="space-y-6">
    <h2 id="pricing-faq-title" className={`text-center ${sectionHeading}`}>
      Frequently Asked Questions
    </h2>
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-3 md:grid-cols-2">
      {PRICING_FAQS.map((faq) => (
        <details key={faq.q} className={`group rounded-xl ${surface}`}>
          <summary
            className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden ${textStrong} ${focusRing}`}
          >
            {faq.q}
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 ${textMuted}`}
              aria-hidden="true"
            />
          </summary>
          <p className={`px-5 pb-4 text-sm leading-relaxed ${textMuted}`}>{faq.a}</p>
        </details>
      ))}
    </div>
  </section>
);
