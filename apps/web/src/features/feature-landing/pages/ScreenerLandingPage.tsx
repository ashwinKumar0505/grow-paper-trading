import React from 'react';
import { Radar, Search, TrendingUp, Zap } from 'lucide-react';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { LandingScreenerStrategyCard } from '../../../components/landing/LandingScreenerStrategyCard';
import { sectionHeading, textMuted } from '../../pricing/pricingStyles';
import { FeatureHero } from '../components/FeatureHero';
import {
  FeatureCardsSection,
  FeatureFaqSection,
  FeatureFinalCta,
  FeatureRelatedSection,
  FeatureStepsSection,
  FeatureWhatIsSection,
} from '../components/FeatureSharedSections';
import { ScreenerIndicatorsPreview } from '../components/ScreenerIndicatorsPreview';
import { SCREENER_LANDING_CONTENT } from '../data/screenerLandingContent';

export const ScreenerLandingPage: React.FC = () => (
  <div className="min-h-[calc(100dvh-var(--workspace-header-height,65px))] w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans">
    <main>
      <FeatureHero
        content={SCREENER_LANDING_CONTENT}
        eyebrowIcon={<Radar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      />
      <FeatureWhatIsSection
        title={SCREENER_LANDING_CONTENT.whatIsTitle}
        paragraphs={SCREENER_LANDING_CONTENT.whatIsParagraphs}
      />

      <section aria-labelledby="screener-modules-heading" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1880px] mx-auto space-y-8 text-left">
          <div className="max-w-3xl space-y-2">
            <h2 id="screener-modules-heading" className={sectionHeading}>
              {SCREENER_LANDING_CONTENT.featuresTitle}
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>
              {SCREENER_LANDING_CONTENT.featuresSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LandingScreenerStrategyCard
              icon={<TrendingUp className="w-6 h-6" aria-hidden="true" />}
              tag="Daily EOD Candles"
              title="1. Swing Trading Screener"
              description={SCREENER_LANDING_CONTENT.features[0].description}
              features={[
                { title: 'Confidence Score (0–100)', desc: 'Ranks aligned trend, breakout, and volume checks.' },
                { title: 'Confirmed vs Watchlist', desc: 'Separates confirmed closes from developing setups.' },
                { title: 'Reference Trade Plan', desc: 'Shows entry zone, target, stop-loss, and risk-reward.' },
              ]}
              footerNote="Free: Top 3 · Beginner: Nifty 200 · Advanced: Nifty 500"
              ctaText="Open Swing Screener"
              ctaHref="/screener"
            />
            <LandingScreenerStrategyCard
              icon={<Zap className="w-6 h-6" aria-hidden="true" />}
              tag="15-Min Intraday"
              title="2. Intraday Stock Screener"
              description={SCREENER_LANDING_CONTENT.features[1].description}
              features={[
                { title: 'Session VWAP & Volume', desc: 'Focuses on top 100 liquid NSE stocks during market hours.' },
                { title: 'Live Status Tracking', desc: 'Labels active signals, target reached, stopped, or closed.' },
                { title: 'Auto-Refresh on Advanced', desc: '5-minute automatic refresh while NSE is open.' },
              ]}
              footerNote="Beginner: Top 5 · Advanced: Full list + auto-refresh"
              ctaText="Open Intraday Scanner"
              ctaHref="/screener/intraday"
            />
            <LandingScreenerStrategyCard
              icon={<Search className="w-6 h-6" aria-hidden="true" />}
              tag="Technical + Financials"
              title="3. AI Stock Analysis"
              description={SCREENER_LANDING_CONTENT.features[2].description}
              features={[
                { title: 'Weighted Indicators', desc: 'Plain-English indicator table with individual weights.' },
                { title: 'Company Financials', desc: 'Yearly and quarterly revenue, profit, and valuation ratios.' },
                { title: '2-Year Strategy Backtests', desc: 'Historical rule performance on Beginner & Advanced plans.' },
              ]}
              footerNote="Free: 3/day · Beginner: 15/day · Advanced: Unlimited"
              ctaText="Analyse a Stock"
              ctaHref="/screener/analysis"
            />
          </div>
        </div>
      </section>

      <FeatureStepsSection
        title={SCREENER_LANDING_CONTENT.stepsTitle}
        subtitle={SCREENER_LANDING_CONTENT.stepsSubtitle}
        steps={SCREENER_LANDING_CONTENT.steps}
      />
      <ScreenerIndicatorsPreview />
      <FeatureCardsSection
        id="screener-learner-benefits"
        title={SCREENER_LANDING_CONTENT.audienceTitle}
        subtitle={SCREENER_LANDING_CONTENT.audienceSubtitle}
        items={SCREENER_LANDING_CONTENT.audience}
      />
      <FeatureFaqSection
        title={SCREENER_LANDING_CONTENT.faqsTitle}
        faqs={SCREENER_LANDING_CONTENT.faqs}
      />
      <FeatureRelatedSection
        sourceRoute={SCREENER_LANDING_CONTENT.route}
        links={SCREENER_LANDING_CONTENT.relatedLinks}
      />
      <FeatureFinalCta content={SCREENER_LANDING_CONTENT} />
    </main>
    <LandingFooter />
  </div>
);

export default ScreenerLandingPage;
