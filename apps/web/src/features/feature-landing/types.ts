import type { GlowVariant } from '../../components/FloatingIllustration';

export type FeatureLandingRoute =
  | '/paper-trading-india'
  | '/ai-stock-screener'
  | '/guess-the-chart';

export interface FeatureCardItem {
  title: string;
  description: string;
  badge?: string;
}

export interface FeatureStepItem {
  step: string;
  title: string;
  description: string;
}

export interface FeatureFaqItem {
  q: string;
  a: string;
}

export interface RelatedLinkItem {
  href: string;
  title: string;
  description: string;
  ctaLabel: string;
}

export interface FeatureLandingContent {
  route: FeatureLandingRoute;
  breadcrumbLabel: string;
  eyebrow: string;
  heroTitleStart: string;
  heroTitleAccent: string;
  heroDescription: string;
  heroBullets: readonly string[];
  illustration: {
    src: string;
    alt: string;
    glowVariant: GlowVariant;
  };
  primaryCta: {
    label: string;
    href: string;
    ctaId: string;
  };
  secondaryCta: {
    label: string;
    href: string;
    ctaId: string;
  };
  whatIsTitle: string;
  whatIsParagraphs: readonly string[];
  featuresTitle: string;
  featuresSubtitle: string;
  features: readonly FeatureCardItem[];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: readonly FeatureStepItem[];
  audienceTitle: string;
  audienceSubtitle: string;
  audience: readonly FeatureCardItem[];
  faqsTitle: string;
  faqs: readonly FeatureFaqItem[];
  relatedLinks: readonly RelatedLinkItem[];
  finalCta: {
    title: string;
    description: string;
    disclaimer: string;
  };
}
