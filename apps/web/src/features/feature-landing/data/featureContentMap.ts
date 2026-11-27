import { GUESS_CHART_CONTENT } from './guessChartContent';
import { PAPER_TRADING_CONTENT } from './paperTradingContent';
import { SCREENER_LANDING_CONTENT } from './screenerLandingContent';
import type { FeatureLandingContent, FeatureLandingRoute } from '../types';

export const FEATURE_LANDING_CONTENT: Record<FeatureLandingRoute, FeatureLandingContent> = {
  '/paper-trading-india': PAPER_TRADING_CONTENT,
  '/ai-stock-screener': SCREENER_LANDING_CONTENT,
  '/guess-the-chart': GUESS_CHART_CONTENT,
};

export function getFeatureLandingContent(pathname: string): FeatureLandingContent | null {
  if (pathname in FEATURE_LANDING_CONTENT) {
    return FEATURE_LANDING_CONTENT[pathname as FeatureLandingRoute];
  }
  return null;
}
