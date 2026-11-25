import { useCallback, useEffect, type RefObject } from 'react';
import { db, doc, setDoc } from '../../../lib/firebase';
import {
  getCurrentMonthKey,
  normalizeUsageQuota,
  UserUsageQuota,
} from '../../../lib/subscription';
import { WalletTransaction } from '../../../types/market';
import { OrderBookState } from '../../../utils/orderEngine';
import type { TradingState } from './useTradingState';

const round2 = (n: number) => Math.round(n * 100) / 100;

type Options = Pick<
  TradingState,
  | 'usageQuota'
  | 'planConfig'
  | 'setInitialBalance'
  | 'setUsageQuota'
  | 'setWalletTransactions'
  | 'user'
  | 'openUpgradeModal'
  | 'subscriptionTier'
> & {
  engineRef: RefObject<OrderBookState>;
  commitEngine: (patch: Partial<OrderBookState>) => void;
};

export function useUsageQuota({
  usageQuota,
  planConfig,
  engineRef,
  commitEngine,
  setInitialBalance,
  setUsageQuota,
  setWalletTransactions,
  user,
  openUpgradeModal,
  subscriptionTier,
}: Options) {
  // Consistent Monthly Virtual-Capital Refresh Policy:
  // Computes committed capital (cash + holdings net of MTF loans + intraday margin + reserved orders)
  // and tops up any shortfall below the plan's starting capital floor without destroying or creating phantom funds.
  useEffect(() => {
    const currentMonth = getCurrentMonthKey();
    if (usageQuota.lastAutoResetMonth && usageQuota.lastAutoResetMonth !== currentMonth) {
      const targetFloor = round2(planConfig.defaultStartingCash + (user?.paidTopUpCredit || 0));
      const curBook = engineRef.current;
      const holdingsNet = curBook.holdings.reduce(
        (s, h) => s + ((h.totalInvested || 0) - (h.mtfLoanAmount || 0)),
        0
      );
      const posMargin = curBook.positions.reduce((s, p) => s + (p.marginBlocked || 0), 0);
      const reserved = curBook.orders.reduce(
        (s, o) =>
          s +
          ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount
            ? o.blockedAmount
            : 0),
        0
      );
      const committedCapital = round2(curBook.balance + holdingsNet + posMargin + reserved);
      const shortfall = Math.max(0, round2(targetFloor - committedCapital));
      const nextBalance = round2(curBook.balance + shortfall);

      const nextQuota: UserUsageQuota = {
        ...normalizeUsageQuota(usageQuota),
        lastAutoResetMonth: currentMonth,
        lastPortfolioResetMonth: currentMonth,
        portfolioResetsThisMonth: 0,
      };
      setUsageQuota(nextQuota);

      if (shortfall > 0) {
        commitEngine({ balance: nextBalance });
        setInitialBalance(targetFloor);
        const autoTx: WalletTransaction = {
          id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          type: 'DEPOSIT',
          amount: shortfall,
          description: `Monthly Virtual Capital Refresh (+₹${shortfall.toLocaleString('en-IN')} to ₹${targetFloor.toLocaleString('en-IN')} floor · ${planConfig.name})`,
          timestamp: Date.now(),
        };
        setWalletTransactions((prev) => [autoTx, ...prev]);
      }

      if (user?.uid) {
        setDoc(
          doc(db, 'users', user.uid),
          {
            usage: nextQuota,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, [
    usageQuota,
    planConfig.defaultStartingCash,
    planConfig.name,
    commitEngine,
    engineRef,
    setInitialBalance,
    setUsageQuota,
    setWalletTransactions,
    user?.uid,
    user?.paidTopUpCredit,
  ]);

  const consumeAnalysisSearch = useCallback(
    (_symbol?: string): boolean => {
      const normalized = normalizeUsageQuota(usageQuota);
      const limit = planConfig.analysisDailyLimit;
      if (normalized.analysisSearchesCount >= limit) {
        openUpgradeModal({
          requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
          featureName: 'Daily Stock Analysis Limit Reached',
          featureDescription: `You have used all ${limit} Stock Analysis searches included in your ${planConfig.name} today. Upgrade to unlock ${
            subscriptionTier === 'free'
              ? '15 searches/day (Beginner) or Unlimited searches (Advanced)'
              : 'Unlimited daily searches & 2-Year Strategy Backtests'
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
    [usageQuota, planConfig, subscriptionTier, openUpgradeModal, setUsageQuota, user?.uid]
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
  }, [usageQuota, planConfig, openUpgradeModal, setUsageQuota, user?.uid]);

  return { consumeAnalysisSearch, consumeQuizQuestion };
}
