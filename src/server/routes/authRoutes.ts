import { Router, type Request, type Response } from 'express';
import {
  issueSessionToken,
  resolveOrCreateCanonicalUser,
  revokeSessionToken,
  tryCreateFirebaseCustomToken,
} from '../auth/authService';
import { createAndSendEmailOtp, verifyEmailOtpAndCreateSession } from '../auth/otpService';
import {
  consumeAuthoritativeQuota,
  issueScreenerServiceToken,
  resolveAuthoritativeUserTier,
  validateQuizEntitlement,
  validateScreenerEntitlement,
} from '../entitlements/entitlementService';
import {
  createRateLimiter,
  createRequireAuth,
  sanitizeErrorMessage,
  type AuthenticatedRequest,
} from '../middleware/security';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { getOrCreateTradingLedger } from '../trading/tradingLedger';

export function createAuthRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(store);
  const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 25, keyPrefix: 'auth' });

  router.post('/auth/send-otp', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      const result = await createAndSendEmailOtp({ email: req.body?.email, ipAddress, store });
      res.status(result.status).json({
        success: result.success,
        delivery: 'email',
        message: result.message,
        ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
        ...(result.testOtpCode ? { testOtpCode: result.testOtpCode } : {}),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Unable to send OTP.') });
    }
  });

  router.post('/auth/verify-otp', authRateLimiter, (req: Request, res: Response) => {
    try {
      const result = verifyEmailOtpAndCreateSession({
        email: req.body?.email,
        code: req.body?.code,
        name: req.body?.name,
        store,
      });
      if (!result.success) {
        res.status(result.status).json({ success: false, message: result.message });
        return;
      }
      const ledger = getOrCreateTradingLedger(result.uid!, store);
      res.status(200).json({
        success: true,
        uid: result.uid,
        email: result.email,
        name: result.name,
        sessionToken: result.sessionToken,
        firebaseCustomToken: result.firebaseCustomToken,
        expiresAt: result.expiresAt,
        user: result.user,
        portfolio: {
          balance: ledger.balance,
          initialBalance: ledger.initialBalance,
          paidTopUpCredit: ledger.paidTopUpCredit,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'OTP verification failed.') });
    }
  });

  const handleFirebaseSession = (req: AuthenticatedRequest, res: Response) => {
    try {
      const authUser = req.authUser!;
      const requestedProvider =
        req.body?.authProvider === 'email' || req.body?.authProvider === 'google'
          ? (req.body.authProvider as 'google' | 'email')
          : authUser.authProvider;
      const userAccount = resolveOrCreateCanonicalUser(
        {
          preferredUid: authUser.uid,
          email: authUser.email,
          name: typeof req.body?.name === 'string' ? req.body.name : authUser.name,
          avatar: typeof req.body?.avatar === 'string' ? req.body.avatar : undefined,
          authProvider: requestedProvider,
        },
        store
      );
      const session = issueSessionToken({
        uid: userAccount.uid,
        email: userAccount.email,
        name: userAccount.name,
        authProvider: requestedProvider,
      });
      const firebaseCustomToken = tryCreateFirebaseCustomToken(userAccount.uid, userAccount.email);
      const ledger = getOrCreateTradingLedger(userAccount.uid, store);

      res.json({
        success: true,
        uid: userAccount.uid,
        email: userAccount.email,
        name: userAccount.name,
        sessionToken: session.token,
        firebaseCustomToken,
        expiresAt: session.expiresAt,
        user: userAccount,
        portfolio: {
          balance: ledger.balance,
          initialBalance: ledger.initialBalance,
          paidTopUpCredit: ledger.paidTopUpCredit,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to establish Firebase session.') });
    }
  };

  router.post('/auth/firebase-session', authRateLimiter, requireAuth, handleFirebaseSession);
  router.post('/auth/google-session', authRateLimiter, requireAuth, handleFirebaseSession);

  router.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    revokeSessionToken(authUser.tokenId, authUser.expiresAt, store);
    res.json({ success: true, message: 'Session invalidated.' });
  });

  router.get('/account/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const userAccount = resolveOrCreateCanonicalUser(
      { preferredUid: authUser.uid, email: authUser.email, name: authUser.name, authProvider: authUser.authProvider },
      store
    );
    const { tier, plan } = resolveAuthoritativeUserTier(userAccount);
    const ledger = getOrCreateTradingLedger(userAccount.uid, store);
    res.json({
      success: true,
      user: { ...userAccount, subscriptionTier: tier },
      entitlements: plan,
      ledger,
    });
  });

  router.post('/entitlements/consume-quota', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const quotaType = req.body?.quotaType === 'quiz' ? 'quiz' : 'analysis';
    const result = consumeAuthoritativeQuota({ userId: req.authUser!.uid, quotaType, store });
    res.status(result.status).json({ success: result.allowed, ...result });
  });

  router.post('/entitlements/check-screener', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = store.getState().users[req.authUser!.uid];
    const scannerType = req.body?.scannerType === 'intraday' ? 'intraday' : 'swing';
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const check = validateScreenerEntitlement({ user, scannerType, forceRefresh });
    if (!check.allowed) {
      res.status(check.status).json({ success: false, ...check });
      return;
    }
    const tokenInfo = user ? issueScreenerServiceToken(user) : null;
    res.json({
      success: true,
      ...check,
      serviceToken: tokenInfo?.token,
      serviceTokenExpiresAt: tokenInfo?.expiresAt,
    });
  });

  router.post('/entitlements/check-quiz', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = store.getState().users[req.authUser!.uid];
    const check = validateQuizEntitlement({
      user,
      mode: req.body?.mode,
      difficulty: req.body?.difficulty,
      requireHistoryDrawer: Boolean(req.body?.requireHistoryDrawer),
      patternIndex: typeof req.body?.patternIndex === 'number' ? req.body.patternIndex : undefined,
    });
    res.status(check.allowed ? 200 : check.status).json({ success: check.allowed, ...check });
  });

  return router;
}
