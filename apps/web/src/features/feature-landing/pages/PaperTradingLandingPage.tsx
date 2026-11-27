import React from 'react';
import { ChartCandlestick } from 'lucide-react';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { FeatureHero } from '../components/FeatureHero';
import {
  FeatureCardsSection,
  FeatureFaqSection,
  FeatureFinalCta,
  FeatureRelatedSection,
  FeatureStepsSection,
  FeatureWhatIsSection,
} from '../components/FeatureSharedSections';
import { PaperTradingPreview } from '../components/PaperTradingPreview';
import { PAPER_TRADING_CONTENT } from '../data/paperTradingContent';

export const PaperTradingLandingPage: React.FC = () => (
  <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans">
    <main>
      <FeatureHero
        content={PAPER_TRADING_CONTENT}
        eyebrowIcon={<ChartCandlestick className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      />
      <FeatureWhatIsSection
        title={PAPER_TRADING_CONTENT.whatIsTitle}
        paragraphs={PAPER_TRADING_CONTENT.whatIsParagraphs}
      />
      <FeatureCardsSection
        id="paper-trading-features"
        title={PAPER_TRADING_CONTENT.featuresTitle}
        subtitle={PAPER_TRADING_CONTENT.featuresSubtitle}
        items={PAPER_TRADING_CONTENT.features}
      />
      <FeatureStepsSection
        title={PAPER_TRADING_CONTENT.stepsTitle}
        subtitle={PAPER_TRADING_CONTENT.stepsSubtitle}
        steps={PAPER_TRADING_CONTENT.steps}
      />
      <PaperTradingPreview />
      <FeatureCardsSection
        id="paper-trading-audience"
        title={PAPER_TRADING_CONTENT.audienceTitle}
        subtitle={PAPER_TRADING_CONTENT.audienceSubtitle}
        items={PAPER_TRADING_CONTENT.audience}
      />
      <FeatureFaqSection
        title={PAPER_TRADING_CONTENT.faqsTitle}
        faqs={PAPER_TRADING_CONTENT.faqs}
      />
      <FeatureRelatedSection
        sourceRoute={PAPER_TRADING_CONTENT.route}
        links={PAPER_TRADING_CONTENT.relatedLinks}
      />
      <FeatureFinalCta content={PAPER_TRADING_CONTENT} />
    </main>
    <LandingFooter />
  </div>
);

export default PaperTradingLandingPage;
