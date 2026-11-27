import React from 'react';
import { ChevronDown } from 'lucide-react';
import { focusRing, sectionHeading, surface, textMuted, textStrong } from '../../pricing/pricingStyles';
import type { FeatureCardItem, FeatureFaqItem, FeatureStepItem } from '../types';

export { FeatureFinalCta, FeatureRelatedSection } from './FeatureConversionSections';

export const FeatureWhatIsSection: React.FC<{ title: string; paragraphs: readonly string[] }> = ({
  title,
  paragraphs,
}) => (
  <section
    aria-labelledby="what-is-heading"
    className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-b border-emerald-900/10 dark:border-[#20332A]"
  >
    <div className="max-w-4xl mx-auto space-y-5 text-left">
      <h2 id="what-is-heading" className={sectionHeading}>
        {title}
      </h2>
      <div className="space-y-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </section>
);

export const FeatureCardsSection: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  items: readonly FeatureCardItem[];
  columns?: 2 | 3;
}> = ({ id, title, subtitle, items, columns = 3 }) => (
  <section aria-labelledby={id} className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1880px] mx-auto space-y-8 text-left">
      <div className="max-w-3xl space-y-2">
        <h2 id={id} className={sectionHeading}>
          {title}
        </h2>
        <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>{subtitle}</p>
      </div>
      <div className={`grid grid-cols-1 gap-5 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {items.map((item) => (
          <article key={item.title} className={`rounded-2xl p-6 space-y-2.5 shadow-2xs ${surface}`}>
            {item.badge && (
              <span className="inline-block rounded-full border border-[#00B386]/25 dark:border-[#00D09C]/30 bg-[#00B386]/10 dark:bg-[#00D09C]/10 px-3 py-0.5 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
                {item.badge}
              </span>
            )}
            <h3 className={`text-lg font-extrabold ${textStrong}`}>{item.title}</h3>
            <p className={`text-sm leading-relaxed ${textMuted}`}>{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const FeatureStepsSection: React.FC<{
  title: string;
  subtitle: string;
  steps: readonly FeatureStepItem[];
}> = ({ title, subtitle, steps }) => (
  <section
    aria-labelledby="steps-heading"
    className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-y border-emerald-900/10 dark:border-[#20332A]"
  >
    <div className="max-w-[1880px] mx-auto space-y-8 text-left">
      <div className="max-w-3xl space-y-2">
        <h2 id="steps-heading" className={sectionHeading}>
          {title}
        </h2>
        <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>{subtitle}</p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((step) => (
          <li
            key={step.step}
            className="rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] bg-[#F3F6F4] dark:bg-[#111C17] p-6 space-y-3"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#00B386]/15 dark:bg-[#00D09C]/15 font-mono text-sm font-extrabold text-[#008F6B] dark:text-[#00D09C]">
              {step.step}
            </span>
            <h3 className={`text-lg font-extrabold ${textStrong}`}>{step.title}</h3>
            <p className={`text-sm leading-relaxed ${textMuted}`}>{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export const FeatureFaqSection: React.FC<{ title: string; faqs: readonly FeatureFaqItem[] }> = ({
  title,
  faqs,
}) => (
  <section aria-labelledby="feature-faq-heading" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <h2 id="feature-faq-heading" className={`text-center ${sectionHeading}`}>
        {title}
      </h2>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details key={faq.q} className={`group rounded-2xl ${surface}`}>
            <summary
              className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-sm sm:text-base font-bold [&::-webkit-details-marker]:hidden ${textStrong} ${focusRing}`}
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 ${textMuted}`}
                aria-hidden="true"
              />
            </summary>
            <p className={`px-5 pb-5 text-sm leading-relaxed border-t border-[#E2EAE6] dark:border-[#20332A] pt-3 ${textMuted}`}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  </section>
);
