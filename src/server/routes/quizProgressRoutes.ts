import { Router, type Response } from 'express';
import { createRequireAuth, sanitizeErrorMessage, type AuthenticatedRequest } from '../middleware/security';
import type { DurableQuizProgress, DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';

export function createQuizProgressRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(store);

  router.get('/quiz/progress', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.authUser!.uid;
    const progress = store.getState().quizProgress[userId] || null;
    res.json({ success: true, userId, progress });
  });

  router.post('/quiz/progress', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.authUser!.uid;
      const now = Date.now();
      const raw = req.body?.progress || {};

      await store.withLock(`user:${userId}`, () => {
        const rawStats = raw.stats || {};
        const startingBalance =
          typeof rawStats.startingBalance === 'number' && rawStats.startingBalance > 0
            ? rawStats.startingBalance
            : 10000;
        const wins = Math.max(0, Math.floor(Number(rawStats.wins || 0)));
        const losses = Math.max(0, Math.floor(Number(rawStats.losses || 0)));
        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
        const tradeHistory = Array.isArray(rawStats.tradeHistory) ? rawStats.tradeHistory.slice(0, 200) : [];
        const netProfit = Number(Number(rawStats.netProfit || 0).toFixed(2));
        const consistentBalance = Math.max(0, Number((startingBalance + netProfit).toFixed(2)));

        const record: DurableQuizProgress = {
          userId,
          quizStats: {
            totalQuestions: Math.max(0, Math.floor(Number(raw.quizStats?.totalQuestions || 0))),
            correctAnswers: Math.max(0, Math.floor(Number(raw.quizStats?.correctAnswers || 0))),
            currentStreak: Math.max(0, Math.floor(Number(raw.quizStats?.currentStreak || 0))),
            bestStreak: Math.max(0, Math.floor(Number(raw.quizStats?.bestStreak || 0))),
            recentResults: Array.isArray(raw.quizStats?.recentResults)
              ? raw.quizStats.recentResults.slice(-10).map(Boolean)
              : [],
          },
          survivalBestStreak: Math.max(0, Math.floor(Number(raw.survivalBestStreak || 0))),
          survivalBestScore: Math.max(0, Math.floor(Number(raw.survivalBestScore || 0))),
          tournamentCompletedCount: Math.max(0, Math.floor(Number(raw.tournamentCompletedCount || 0))),
          tournamentBestBalance: Math.max(10000, Number(Number(raw.tournamentBestBalance || 10000).toFixed(2))),
          stats: {
            balance: consistentBalance,
            startingBalance,
            totalTrades,
            wins,
            losses,
            winRate,
            currentStreak: Math.max(0, Math.floor(Number(rawStats.currentStreak || 0))),
            bestStreak: Math.max(0, Math.floor(Number(rawStats.bestStreak || 0))),
            netProfit,
            tradeHistory,
          },
          updatedAt: now,
        };

        store.getState().quizProgress[userId] = record;
      });

      res.json({ success: true, userId, progress: store.getState().quizProgress[userId] });
    } catch (err) {
      res.status(500).json({ success: false, message: sanitizeErrorMessage(err, 'Failed to save quiz progress') });
    }
  });

  return router;
}
