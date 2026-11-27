import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { trackFeatureCtaClick, trackProductNavigation } from '../../../lib/analytics';
import { AppLink } from '../../../lib/navigation';
import { accentText, focusRing, surface, textMuted, textStrong } from '../../pricing/pricingStyles';
import type { FeatureLandingContent, FeatureLandingRoute, RelatedLinkItem } from '../types';

export const FeatureRelatedSection: React.FC<{
  sourceRoute: FeatureLandingRoute;
  links: readonly RelatedLinkItem[];
}> = ({ sourceRoute, links }) => (
  <section
    aria-labelledby="related-tools-heading"
    className="py-14 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0E1713] border-t border-emerald-900/10 dark:border-[#20332A]"
  >
    <div className="max-w-[1880px] mx-auto space-y-6 text-left">
      <div className="space-y-1">
        <h2
          id="related-tools-heading"
          className={`text-xl sm:text-2xl font-extrabold tracking-tight ${textStrong}`}
        >
          Explore More Tradedia Learning Tools
        </h2>
        <p className={`text-sm ${textMuted}`}>
          Every module connects inside one unified Indian stock market education workspace.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {links.map((item) => (
          <div key={item.href} className={`rounded-2xl p-5 flex flex-col justify-between gap-4 ${surface}`}>
            <div className="space-y-1.5">
              <h3 className={`text-base font-extrabold ${textStrong}`}>{item.title}</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${textMuted}`}>{item.description}</p>
            </div>
            <AppLink
              href={item.href}
              onClick={() =>
                trackProductNavigation({
                  sourcePage: sourceRoute,
                  targetPage: item.href,
                  navLocation: 'feature_related',
                })
              }
              className={`inline-flex w-fit items-center gap-1.5 text-sm font-bold hover:underline rounded-md ${accentText} ${focusRing}`}
            >
              <span>{item.ctaLabel}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </AppLink>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const FeatureFinalCta: React.FC<{ content: FeatureLandingContent }> = ({ content }) => (
  <section className="py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1880px] mx-auto space-y-5">
      <div className="rounded-3xl border border-[#1D3A2D] bg-gradient-to-r from-[#0F2A1F] via-[#133628] to-[#0D241B] p-8 sm:p-12 text-center text-white space-y-6 shadow-xl">
        <div className="max-w-2xl mx-auto space-y-2.5">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {content.finalCta.title}
          </h2>
          <p className="text-sm text-[#9AB0A5] leading-relaxed">{content.finalCta.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AppLink
            href={content.primaryCta.href}
            onClick={() =>
              trackFeatureCtaClick({
                sourcePage: content.route,
                ctaId: content.primaryCta.ctaId,
                destinationPath: content.primaryCta.href,
                placement: 'final_cta',
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] px-7 py-3.5 text-sm font-extrabold text-[#04261C] shadow-md transition-colors"
          >
            <span>{content.primaryCta.label}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </AppLink>
          <AppLink
            href={content.secondaryCta.href}
            onClick={() =>
              trackFeatureCtaClick({
                sourcePage: content.route,
                ctaId: content.secondaryCta.ctaId,
                destinationPath: content.secondaryCta.href,
                placement: 'final_cta',
              })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 px-6 py-3.5 text-sm font-bold text-white transition-colors"
          >
            <span>{content.secondaryCta.label}</span>
          </AppLink>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5 text-xs leading-relaxed text-amber-950 dark:text-amber-200 flex items-start gap-2.5 text-left">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
        <p>{content.finalCta.disclaimer}</p>
      </div>
    </div>
  </section>
);
