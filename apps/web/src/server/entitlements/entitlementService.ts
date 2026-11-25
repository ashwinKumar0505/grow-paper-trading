import {
  normalizeUsageQuota,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanConfig,
  type SubscriptionTier,
} from '../../lib/subscription';
import type { OrderProduct, OrderType } from '../../types/market';
import type { DurableStore, DurableUserAccount } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';

export {
  issueScreenerServiceToken,
  validateQuizEntitlement,
  validateScreenerEntitlement,
} from './screenerAndQuizEntitlements';

export function resolveAuthoritativeUserTier(
  user: DurableUserAccount | undefined,
  now = Date.now()
): { tier: SubscriptionTier; plan: SubscriptionPlanConfig } {
  if (!user) {
    return { tier: 'free', plan: SUBSCRIPTION_PLANS.free };
  }
  const isExpired =
    user.subscriptionTier !== 'free' &&
    Boolean(user.subscriptionExpiresAt && user.subscriptionExpiresAt <= now);
  const isHaltedPastExpiry =
    user.subscriptionStatus === 'halted' || user.subscriptionStatus === 'expired';
  const tier: SubscriptionTier =
    isExpired || isHaltedPastExpiry ? 'free' : user.subscriptionTier || 'free';
  return {
    tier,
    plan: SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free,
  };
}

export function validateTradingOrderEntitlement(params: {
  user: DurableUserAccount | undefined;
  product: OrderProduct;
  orderType: OrderType;
  isMarketOpen: boolean;
  now?: number;
}):
  | { allowed: true; tier: SubscriptionTier; plan: SubscriptionPlanConfig }
  | { allowed: false; status: number; code: string; message: string; requiredTier: SubscriptionTier } {
  const { tier, plan } = resolveAuthoritativeUserTier(params.user, params.now);

  if ((params.product === 'INTRADAY' || params.product === 'MTF') && !plan.allowIntradayTrading) {
    return {
      allowed: false,
      status: 403,
      code: 'PRODUCT_ENTITLEMENT_REQUIRED',
      requiredTier: 'beginner',
      message: `${params.product === 'MTF' ? 'MTF 5.00x' : '5x Intraday (MIS)'} trading requires the Beginner or Advanced Package.`,
    };
  }

  if (!plan.allowedOrderTypes.includes(params.orderType)) {
    const requiredTier: SubscriptionTier = params.orderType === 'LIMIT' ? 'beginner' : 'advanced';
    return {
      allowed: false,
      status: 403,
      code: 'ORDER_TYPE_ENTITLEMENT_REQUIRED',
      requiredTier,
      message: `${params.orderType} orders require the ${requiredTier === 'beginner' ? 'Beginner or Advanced' : 'Advanced'} Package.`,
    };
  }

  if (!params.isMarketOpen && !plan.allowAmoOrders) {
    return {
      allowed: false,
      status: 403,
      code: 'AMO_ENTITLEMENT_REQUIRED',
      requiredTier: 'advanced',
      message: 'After-Market Orders (AMO) scheduled outside regular NSE trading hours require the Advanced Package.',
    };
  }

  return { allowed: true, tier, plan };
}

export function consumeAuthoritativeQuota(params: {
  userId: string;
  quotaType: 'analysis' | 'quiz';
  store?: DurableStore;
  now?: number;
}): {
  allowed: boolean;
  status: number;
  used: number;
  limit: number;
  tier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  message?: string;
} {
  const store = params.store ?? defaultStore;
  const now = params.now ?? Date.now();
  const user = store.getState().users[params.userId];
  const { tier, plan } = resolveAuthoritativeUserTier(user, now);

  const currentQuota = normalizeUsageQuota(user?.usageQuota);
  const limit = params.quotaType === 'analysis' ? plan.analysisDailyLimit : plan.quizDailyLimit;
  const currentUsed =
    params.quotaType === 'analysis'
      ? currentQuota.analysisSearchesCount
      : currentQuota.quizQuestionsCount;

  if (currentUsed >= limit) {
    const requiredTier: SubscriptionTier = tier === 'free' ? 'beginner' : 'advanced';
    return {
      allowed: false,
      status: 403,
      used: currentUsed,
      limit,
      tier,
      requiredTier,
      message:
        params.quotaType === 'analysis'
          ? `Daily stock analysis limit (${limit}/day on ${plan.name}) reached.`
          : `Daily quiz question limit (${limit}/day on ${plan.name}) reached.`,
    };
  }

  if (user) {
    if (params.quotaType === 'analysis') {
      currentQuota.analysisSearchesCount += 1;
    } else {
      currentQuota.quizQuestionsCount += 1;
    }
    user.usageQuota = currentQuota;
    user.updatedAt = now;
    store.persist();
  }

  return {
    allowed: true,
    status: 200,
    used: currentUsed + 1,
    limit,
    tier,
  };
}
