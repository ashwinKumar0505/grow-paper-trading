import crypto from 'crypto';
import type { SubscriptionPlanConfig, SubscriptionTier } from '../../lib/subscription';
import type { DurableUserAccount } from '../storage/durableStore';
import { resolveAuthoritativeUserTier } from './entitlementService';

export function validateScreenerEntitlement(params: {
  user: DurableUserAccount | undefined;
  scannerType: 'swing' | 'intraday';
  forceRefresh?: boolean;
  now?: number;
}):
  | {
      allowed: true;
      tier: SubscriptionTier;
      maxSignals: number;
      allowForceRefresh: boolean;
      allowAutoRefresh: boolean;
    }
  | { allowed: false; status: number; code: string; message: string; requiredTier: SubscriptionTier } {
  const { tier, plan } = resolveAuthoritativeUserTier(params.user, params.now);

  if (params.scannerType === 'intraday' && plan.intradayAccess === 'locked') {
    return {
      allowed: false,
      status: 403,
      code: 'INTRADAY_SCREENER_LOCKED',
      requiredTier: 'beginner',
      message: '15-minute Intraday Screener requires the Beginner or Advanced Package.',
    };
  }

  if (params.scannerType === 'swing' && params.forceRefresh && !plan.swingAllowForceRefresh) {
    return {
      allowed: false,
      status: 403,
      code: 'FORCE_REFRESH_ENTITLEMENT_REQUIRED',
      requiredTier: 'advanced',
      message: 'On-demand Screener Force Refresh requires the Advanced Package.',
    };
  }

  return {
    allowed: true,
    tier,
    maxSignals: params.scannerType === 'swing' ? plan.swingMaxSignals : plan.intradayMaxSignals,
    allowForceRefresh: plan.swingAllowForceRefresh,
    allowAutoRefresh: plan.intradayAutoRefresh,
  };
}

export function validateQuizEntitlement(params: {
  user: DurableUserAccount | undefined;
  mode?: 'quiz' | 'survival' | 'tournament';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All';
  requireHistoryDrawer?: boolean;
  patternIndex?: number;
  now?: number;
}):
  | { allowed: true; tier: SubscriptionTier; plan: SubscriptionPlanConfig }
  | { allowed: false; status: number; code: string; requiredTier: SubscriptionTier; message: string } {
  const { tier, plan } = resolveAuthoritativeUserTier(params.user, params.now);

  if (params.mode && !plan.quizAllowedModes.includes(params.mode)) {
    const requiredTier: SubscriptionTier = params.mode === 'survival' ? 'beginner' : 'advanced';
    return {
      allowed: false,
      status: 403,
      code: 'QUIZ_MODE_LOCKED',
      requiredTier,
      message: `Quiz mode "${params.mode}" requires the ${requiredTier === 'beginner' ? 'Beginner or Advanced' : 'Advanced'} Package.`,
    };
  }

  if (params.difficulty && !plan.quizAllowedDifficulties.includes(params.difficulty)) {
    const requiredTier: SubscriptionTier =
      params.difficulty === 'Intermediate' ? 'beginner' : 'advanced';
    return {
      allowed: false,
      status: 403,
      code: 'QUIZ_DIFFICULTY_LOCKED',
      requiredTier,
      message: `Quiz difficulty "${params.difficulty}" requires the ${requiredTier === 'beginner' ? 'Beginner or Advanced' : 'Advanced'} Package.`,
    };
  }

  if (params.requireHistoryDrawer && !plan.quizAllowHistoryDrawer) {
    return {
      allowed: false,
      status: 403,
      code: 'QUIZ_HISTORY_DRAWER_LOCKED',
      requiredTier: 'advanced',
      message: 'The detailed Quiz Performance Journal & Trade Log Drawer requires the Advanced Package.',
    };
  }

  if (
    typeof params.patternIndex === 'number' &&
    params.patternIndex >= plan.patternLibraryMaxFreePatterns
  ) {
    return {
      allowed: false,
      status: 403,
      code: 'PATTERN_LIBRARY_LOCKED',
      requiredTier: 'beginner',
      message: 'Full 21-pattern interactive library requires the Beginner or Advanced Package.',
    };
  }

  return { allowed: true, tier, plan };
}

export function issueScreenerServiceToken(
  user: DurableUserAccount,
  now = Date.now(),
  env: Record<string, string | undefined> = process.env
): { token: string; expiresAt: number; claims: Record<string, unknown> } {
  const { tier, plan } = resolveAuthoritativeUserTier(user, now);
  const configuredSecret = (
    env.SERVICE_AUTH_SECRET ||
    env.SCREENER_SERVICE_SECRET ||
    env.AUTH_SESSION_SECRET ||
    ''
  ).trim();
  if (!configuredSecret && (env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('SERVICE_AUTH_SECRET must be configured in production.');
  }
  const secret = configuredSecret || 'niftylens_dev_screener_service_secret_2026';
  const expiresAt = now + 5 * 60 * 1000;
  const claims = {
    uid: user.uid,
    tier,
    swingMaxSignals: plan.swingMaxSignals,
    swingAllowForceRefresh: plan.swingAllowForceRefresh,
    intradayAccess: plan.intradayAccess,
    intradayMaxSignals: plan.intradayMaxSignals,
    analysisAllowAdvancedMode: plan.analysisAllowAdvancedMode,
    analysisAllowFinancialsAndLevels: plan.analysisAllowFinancialsAndLevels,
    iat: now,
    exp: expiresAt,
  };
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return {
    token: `${payloadB64}.${sig}`,
    expiresAt,
    claims,
  };
}
