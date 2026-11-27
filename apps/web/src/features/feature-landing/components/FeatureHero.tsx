import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { FloatingIllustration } from '../../../components/FloatingIllustration';
import { trackFeatureCtaClick } from '../../../lib/analytics';
import { AppLink } from '../../../lib/navigation';
import { accentText, btnPrimary, btnSecondary, textMuted, textStrong } from '../../pricing/pricingStyles';
import type { FeatureLandingContent } from '../types';

interface FeatureHeroProps {
  content: FeatureLandingContent;
  eyebrowIcon?: React.ReactNode;
}

export const FeatureHero: React.FC<FeatureHeroProps> = ({ content, eyebrowIcon }) => {
  return (
    <section className="pt-6 sm:pt-10 lg:pt-14 pb-12 sm:pb-18 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/10 dark:border-[#20332A]">
      <div className="w-full max-w-[1880px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        <div className="w-full lg:w-[45%] space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CFDCD5] dark:border-[#20332A] bg-white/90 dark:bg-[#111C17] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#008F6B] dark:text-[#00D09C]">
            {eyebrowIcon || <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>{content.eyebrow}</span>
          </div>

          <h1 className={`text-3xl sm:text-5xl xl:text-[3.5rem] font-black tracking-tight leading-[1.08] ${textStrong}`}>
            <span className="text-[#00B386] dark:text-[#00D09C]">{content.heroTitleStart}</span>{' '}
            {content.heroTitleAccent}
          </h1>

          <p className={`text-base sm:text-lg leading-relaxed max-w-2xl ${textMuted}`}>
            {content.heroDescription}
          </p>

          <ul className="space-y-2 pt-1">
            {content.heroBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-sm font-semibold text-[#15241D] dark:text-[#D6E6DE]"
              >
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${accentText}`} aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <AppLink
              href={content.primaryCta.href}
              onClick={() =>
                trackFeatureCtaClick({
                  sourcePage: content.route,
                  ctaId: content.primaryCta.ctaId,
                  destinationPath: content.primaryCta.href,
                  placement: 'hero',
                })
              }
              className={`${btnPrimary} px-6 py-3.5 shadow-md`}
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
                  placement: 'hero',
                })
              }
              className={`${btnSecondary} px-5 py-3.5 bg-white/80 dark:bg-[#111C17]`}
            >
              <span>{content.secondaryCta.label}</span>
            </AppLink>
          </div>
        </div>

        <div className="w-full lg:w-[55%] flex items-center justify-center">
          <FloatingIllustration
            src={content.illustration.src}
            alt={content.illustration.alt}
            loading="eager"
            fetchPriority="high"
            glowVariant={content.illustration.glowVariant}
            align="right"
            width={1254}
            height={1254}
            maxWidthClass="max-w-[540px] sm:max-w-[640px] lg:max-w-[740px]"
          />
        </div>
      </div>
    </section>
  );
};
