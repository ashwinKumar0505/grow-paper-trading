import React, { lazy, Suspense } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { trackProductNavigation } from '../../../lib/analytics';
import { AppLink } from '../../../lib/navigation';
import { accentText, sectionHeading, textMuted } from '../../pricing/pricingStyles';
import { FeatureHero } from '../components/FeatureHero';
import {
  FeatureCardsSection,
  FeatureFaqSection,
  FeatureFinalCta,
  FeatureRelatedSection,
  FeatureStepsSection,
  FeatureWhatIsSection,
} from '../components/FeatureSharedSections';
import { GUESS_CHART_CONTENT } from '../data/guessChartContent';

const LandingChallengePreview = lazy(() =>
  import('../../../components/landing/LandingChallengePreview').then((m) => ({
    default: m.LandingChallengePreview,
  }))
);

function ChallengeSkeleton() {
  return (
    <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] p-6 sm:p-8 shadow-xl">
      <div className="h-[420px] w-full animate-pulse rounded-2xl bg-[#11241C]" />
    </div>
  );
}

export const GuessChartLandingPage: React.FC = () => (
  <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans">
    <main>
      <FeatureHero
        content={GUESS_CHART_CONTENT}
        eyebrowIcon={<GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      />
      <FeatureWhatIsSection
        title={GUESS_CHART_CONTENT.whatIsTitle}
        paragraphs={GUESS_CHART_CONTENT.whatIsParagraphs}
      />

      <section aria-labelledby="live-quiz-example-heading" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1880px] mx-auto space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <h2 id="live-quiz-example-heading" className={sectionHeading}>
                Try an Example Chart Pattern Question
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>
                Test up to two synthetic candlestick setups right here without signing in. Choose UP
                or DOWN to reveal the next candles and read the pattern breakdown.
              </p>
            </div>
            <AppLink
              href="/learn"
              onClick={() =>
                trackProductNavigation({
                  sourcePage: '/guess-the-chart',
                  targetPage: '/learn',
                  navLocation: 'inline',
                })
              }
              className={`inline-flex items-center gap-1.5 text-sm font-bold hover:underline shrink-0 ${accentText}`}
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Need a refresher? Open Pattern Library</span>
            </AppLink>
          </div>

          <Suspense fallback={<ChallengeSkeleton />}>
            <LandingChallengePreview />
          </Suspense>
        </div>
      </section>

      <FeatureStepsSection
        title={GUESS_CHART_CONTENT.stepsTitle}
        subtitle={GUESS_CHART_CONTENT.stepsSubtitle}
        steps={GUESS_CHART_CONTENT.steps}
      />
      <FeatureCardsSection
        id="guess-chart-modes"
        title={GUESS_CHART_CONTENT.featuresTitle}
        subtitle={GUESS_CHART_CONTENT.featuresSubtitle}
        items={GUESS_CHART_CONTENT.features}
      />
      <FeatureCardsSection
        id="guess-chart-benefits"
        title={GUESS_CHART_CONTENT.audienceTitle}
        subtitle={GUESS_CHART_CONTENT.audienceSubtitle}
        items={GUESS_CHART_CONTENT.audience}
      />
      <FeatureFaqSection
        title={GUESS_CHART_CONTENT.faqsTitle}
        faqs={GUESS_CHART_CONTENT.faqs}
      />
      <FeatureRelatedSection
        sourceRoute={GUESS_CHART_CONTENT.route}
        links={GUESS_CHART_CONTENT.relatedLinks}
      />
      <FeatureFinalCta content={GUESS_CHART_CONTENT} />
    </main>
    <LandingFooter />
  </div>
);

export default GuessChartLandingPage;
