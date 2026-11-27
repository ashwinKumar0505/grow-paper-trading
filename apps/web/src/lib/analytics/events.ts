import { trackEvent } from './ga4';
import { toAnalyticsSlug } from './sanitize';
import type {
  AuthAnalyticsMethod,
  ChartPatternLearningPayload,
  PaperTradeActivityPayload,
  QuizCompletionPayload,
  ScreenerUsagePayload,
  SubscriptionCompletedPayload,
} from './types';

export function trackSignUp(method: AuthAnalyticsMethod): boolean {
  return trackEvent('sign_up', { method });
}

export function trackLogin(method: AuthAnalyticsMethod): boolean {
  return trackEvent('login', { method });
}

export function trackPaperTradeActivity(payload: PaperTradeActivityPayload): boolean {
  return trackEvent('paper_trade_activity', {
    activity_type: payload.activityType,
    product_type: payload.productType,
    order_type: payload.orderType,
    order_status: toAnalyticsSlug(payload.orderStatus),
  });
}

export function trackScreenerUsage(payload: ScreenerUsagePayload): boolean {
  return trackEvent('screener_usage', {
    screener_mode: payload.screenerMode,
    action: payload.action,
    trigger: payload.trigger,
    view_mode: payload.viewMode,
  });
}

export function trackChartPatternLearning(payload: ChartPatternLearningPayload): boolean {
  return trackEvent('chart_pattern_learning', {
    action: payload.action,
    pattern_slug: toAnalyticsSlug(payload.patternName),
    pattern_category: toAnalyticsSlug(payload.patternCategory),
    difficulty: toAnalyticsSlug(payload.difficulty),
    is_locked: payload.isLocked,
  });
}

export function trackQuizCompletion(payload: QuizCompletionPayload): boolean {
  return trackEvent('quiz_completed', {
    quiz_mode: payload.quizMode,
    completion_scope: payload.completionScope,
    difficulty: toAnalyticsSlug(payload.difficulty),
    is_correct: payload.isCorrect,
    pattern_category: toAnalyticsSlug(payload.patternCategory),
    rounds_completed: payload.roundsCompleted,
    correct_count: payload.correctCount,
    best_streak: payload.bestStreak,
  });
}

export function trackSubscriptionCompleted(payload: SubscriptionCompletedPayload): boolean {
  return trackEvent('subscription_completed', {
    plan_tier: payload.planTier,
    billing_cycle: payload.billingCycle,
    payment_type: payload.paymentType,
    previous_tier: payload.previousTier,
  });
}
