import { useCallback,useEffect } from 'react';
import { db,doc,setDoc } from '../../../lib/firebase';
import {
getCurrentMonthKey,
normalizeUsageQuota,
UserUsageQuota
} from '../../../lib/subscription';
import {
WalletTransaction
} from '../../../types/market';
import {
OrderBookState
} from '../../../utils/orderEngine';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'usageQuota' | 'planConfig' | 'setInitialBalance' | 'setUsageQuota' | 'setWalletTransactions' | 'user' | 'openUpgradeModal' | 'subscriptionTier'> & { commitEngine: (patch: Partial<OrderBookState>) => void };

export function useUsageQuota({ usageQuota, planConfig, commitEngine, setInitialBalance, setUsageQuota, setWalletTransactions, user, openUpgradeModal, subscriptionTier }: Options) {
  // Automatic Monthly Reset (1L for Free, 10L for Beginner, 50L for Advanced)
  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    if (usageQuota.lastAutoResetMonth && usageQuota.lastAutoResetMonth !== currentMonth) {
      const targetResetAmount = planConfig.defaultStartingCash; // 1L Free, 10L Beginner, 50L Advanced
      commitEngine({ balance: targetResetAmount });
      setInitialBalance(targetResetAmount);

      const nextQuota: UserUsageQuota = {
        ...normalizeUsageQuota(usageQuota),
        lastAutoResetMonth: currentMonth,
        lastPortfolioResetMonth: currentMonth,
        portfolioResetsThisMonth: 0,
      };
      setUsageQuota(nextQuota);

      const autoTx: WalletTransaction = {
        id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        type: 'DEPOSIT',
        amount: targetResetAmount,
        description: `Automatic Monthly Reset (${planConfig.name} · ₹${targetResetAmount.toLocaleString('en-IN')})`,
        timestamp: Date.now(),
      };
      setWalletTransactions((prev) => [autoTx, ...prev]);

      if (user?.uid) {
        setDoc(
          doc(db, 'users', user.uid),
          {
            balance: targetResetAmount,
            initialBalance: targetResetAmount,
            usage: nextQuota,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, [usageQuota, planConfig.defaultStartingCash, planConfig.name, commitEngine, user?.uid]);

  // Daily Usage Quota Helpers for AI Stock Analysis & Guess the Chart Quiz
  const consumeAnalysisSearch = useCallback(
    (_symbol?: string): boolean => {
      const normalized = normalizeUsageQuota(usageQuota);
      const limit = planConfig.analysisDailyLimit;
      if (normalized.analysisSearchesCount >= limit) {
        openUpgradeModal({
          requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
          featureName: 'Daily AI Stock Analysis Limit Reached',
          featureDescription: `You have used all ${limit} AI Stock Analysis searches included in your ${planConfig.name} today. Upgrade to unlock ${
            subscriptionTier === 'free' ? '15 searches/day (Beginner) or Unlimited searches (Advanced)' : 'Unlimited daily searches & 2-Year Strategy Backtests'
          }.`,
        });
        return false;
      }
      const next: UserUsageQuota = {
        ...normalized,
        analysisSearchesCount: normalized.analysisSearchesCount + 1,
      };
      setUsageQuota(next);
      if (user?.uid) {
        setDoc(doc(db, 'users', user.uid), { usage: next, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      }
      return true;
    },
    [usageQuota, planConfig, subscriptionTier, openUpgradeModal, user?.uid]
  );

  const consumeQuizQuestion = useCallback((): boolean => {
    const normalized = normalizeUsageQuota(usageQuota);
    const limit = planConfig.quizDailyLimit;
    if (normalized.quizQuestionsCount >= limit) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Daily Quiz Limit Reached (5 Questions / Day)',
        featureDescription:
          'Free Starter accounts include 5 Guess the Chart questions per day in Practice mode. Upgrade to Beginner or Advanced for unlimited daily quiz rounds, 3-Life Survival, and the 10-Round Cash Challenge!',
      });
      return false;
    }
    const next: UserUsageQuota = {
      ...normalized,
      quizQuestionsCount: normalized.quizQuestionsCount + 1,
    };
    setUsageQuota(next);
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { usage: next, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
    return true;
  }, [usageQuota, planConfig, openUpgradeModal, user?.uid]);

  return { consumeAnalysisSearch, consumeQuizQuestion };
}
