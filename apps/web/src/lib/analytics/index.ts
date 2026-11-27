export {
  ANALYTICS_CONSENT_STORAGE_KEY,
  closeAnalyticsPreferences,
  getAnalyticsConsent,
  isAnalyticsPreferencesOpen,
  openAnalyticsPreferences,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  subscribeAnalyticsPreferences,
  useAnalyticsConsent,
  useAnalyticsPreferencesOpen,
} from './consent';
export {
  trackChartPatternLearning,
  trackLogin,
  trackPaperTradeActivity,
  trackQuizCompletion,
  trackScreenerUsage,
  trackSignUp,
  trackSubscriptionCompleted,
} from './events';
export {
  applyAnalyticsConsent,
  getAnalyticsConfig,
  isAnalyticsEligible,
  resolveAnalyticsConfig,
  trackEvent,
  trackPageView,
} from './ga4';
export {
  containsSensitiveValue,
  getSanitizedPageTitle,
  isValidEventName,
  isValidMeasurementId,
  sanitizeEventParams,
  sanitizePageLocation,
  sanitizePagePath,
  sanitizeQueryString,
  toAnalyticsSlug,
} from './sanitize';
export { useAnalyticsTracking } from './useAnalyticsTracking';
export type {
  AnalyticsConfig,
  AnalyticsConsentRecord,
  AnalyticsConsentStatus,
  AnalyticsEventParams,
  AnalyticsPrimitive,
  AuthAnalyticsMethod,
  ChartPatternLearningPayload,
  PaperTradeActivityPayload,
  QuizCompletionPayload,
  SanitizedPageData,
  ScreenerUsagePayload,
  SubscriptionCompletedPayload,
} from './types';
