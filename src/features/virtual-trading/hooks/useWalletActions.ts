import type { RefObject } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
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
const round2 = (n: number) => Math.round(n * 100) / 100;
type Options = Pick<TradingState, 'subscriptionTier' | 'openRazorpayCheckout' | 'planConfig' | 'openUpgradeModal' | 'setWalletTransactions' | 'user' | 'setInitialBalance' | 'setIsWalletModalOpen' | 'usageQuota' | 'setUsageQuota'> & Pick<TradingContextType, 'addToast'> & { engineRef: RefObject<OrderBookState>; commitEngine: (patch: Partial<OrderBookState>) => void };

export function useWalletActions({ addToast, subscriptionTier, openRazorpayCheckout, planConfig, engineRef, openUpgradeModal, commitEngine, setWalletTransactions, user, setInitialBalance, setIsWalletModalOpen, usageQuota, setUsageQuota }: Options) {
  // Add Money to Wallet:
  // - Free tier: Paid top-up of +₹1,00,000 for ₹50 (no free manual add-money)
  // - Beginner (10L) & Advanced (50L): Unlimited free top-ups ONLY until the specified tier amount (10L or 50L)
  const addMoneyToWallet = (amount: number, description = 'Funds added via Add Money'): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount greater than zero.', 'error');
      return false;
    }

    if (subscriptionTier === 'free') {
      openRazorpayCheckout('topup_1l', 'monthly');
      return false;
    }

    const planMax = planConfig.maxWalletLimit; // ₹10,00,000 for Beginner, ₹50,00,000 for Advanced
    const cash = engineRef.current.balance;
    const mtfMargin = engineRef.current.holdings.reduce((s, h) => s + (h.mtfMarginBlocked || 0), 0);
    const posMargin = engineRef.current.positions.reduce((s, p) => s + (p.marginBlocked || 0), 0);
    const orderReserved = engineRef.current.orders.reduce(
      (s, o) => s + ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount ? o.blockedAmount : 0),
      0
    );
    const committedCapital = round2(cash + mtfMargin + posMargin + orderReserved);
    const allowedAdd = Math.max(0, round2(planMax - committedCapital));

    if (allowedAdd <= 0) {
      if (subscriptionTier === 'beginner') {
        openUpgradeModal({
          requiredTier: 'advanced',
          featureName: 'Expand Virtual Capital to ₹50,00,000 (50L)',
          featureDescription:
            'Your Beginner Package allows unlimited free top-ups up to ₹10,00,000 (10L) across available cash and locked margin. Upgrade to Advanced to unlock ₹50,00,000 (50L) virtual capital.',
        });
      } else {
        addToast(
          'Maximum 50L Capital Reached',
          'Your paper wallet (available cash + locked margin) is already at the ₹50,00,000 limit for the Advanced Package.',
          'error'
        );
      }
      return false;
    }

    if (amount > allowedAdd) {
      addToast(
        'Plan Capital Limit Exceeded',
        `Including ₹${round2(mtfMargin + posMargin + orderReserved).toLocaleString('en-IN')} in locked margin, you can top up at most ₹${allowedAdd.toLocaleString('en-IN')} to stay within your ₹${planMax.toLocaleString('en-IN')} limit.`,
        'error'
      );
      return false;
    }

    const newBalance = Number((cash + amount).toFixed(2));
    commitEngine({ balance: newBalance });
    const tx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount,
      description,
      timestamp: Date.now(),
    };
    setWalletTransactions((prev) => [tx, ...prev]);
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { balance: newBalance, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
    addToast(
      'Money Added!',
      `₹${amount.toLocaleString('en-IN')} added to your paper wallet. New balance: ₹${newBalance.toLocaleString('en-IN')}.`,
      'success'
    );
    return true;
  };

  // Set Paper Balance
  const setPaperBalance = (amount: number) => {
    if (!Number.isFinite(amount)) return;
    const planMax = planConfig.maxWalletLimit;
    if (amount > planMax && subscriptionTier !== 'advanced') {
      openUpgradeModal({
        requiredTier: amount <= 1000000 ? 'beginner' : 'advanced',
        featureName: `Virtual Capital Up to ₹${amount.toLocaleString('en-IN')}`,
        featureDescription: `Your ${planConfig.name} supports up to ₹${planMax.toLocaleString('en-IN')}. Upgrade to unlock higher virtual capital.`,
      });
      return;
    }
    const clampedAmount = Math.min(planMax, Math.max(0, amount));
    commitEngine({ balance: clampedAmount });
    setInitialBalance(clampedAmount);
    const tx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedAmount,
      description: 'Direct balance adjustment',
      timestamp: Date.now(),
    };
    setWalletTransactions((prev) => [tx, ...prev]);
    addToast('Paper Cash Updated', `Paper trading balance set to ₹${clampedAmount.toLocaleString('en-IN')}`, 'success');
  };

  // Reset Portfolio:
  // - Free tier: NO manual reset option (only automatic monthly reset of 1L + ₹50 for +1L top-up)
  // - Beginner & Advanced: Unlimited manual resets up to their specified tier cap (10L for Beginner, 50L for Advanced)
  const resetPortfolio = (startingCash = planConfig.defaultStartingCash) => {
    if (!Number.isFinite(startingCash)) return;

    if (subscriptionTier === 'free' || !planConfig.allowUnlimitedWalletResets) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Unlimited Manual Portfolio Resets',
        featureDescription:
          'Free accounts include an automatic monthly reset of ₹1,00,000 and ₹50 for +₹1,00,000 top-ups, with no manual portfolio reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for unlimited manual portfolio resets.',
      });
      return;
    }

    const planMax = planConfig.maxWalletLimit;

    if (startingCash > planMax && subscriptionTier !== 'advanced') {
      openUpgradeModal({
        requiredTier: 'advanced',
        featureName: `Reset Portfolio with ₹${startingCash.toLocaleString('en-IN')}`,
        featureDescription: `${planConfig.name} supports up to ₹${planMax.toLocaleString('en-IN')} virtual capital. Upgrade to Advanced (₹50L) for larger portfolio resets.`,
      });
      return;
    }

    const clampedCash = Math.min(planMax, Math.max(1000, startingCash));
    commitEngine({ balance: clampedCash, holdings: [], positions: [], orders: [] });
    setInitialBalance(clampedCash);
    setIsWalletModalOpen(false);
    const normalized = normalizeUsageQuota(usageQuota);
    const nextQuota: UserUsageQuota = {
      ...normalized,
      lastPortfolioResetMonth: getCurrentMonthKey(),
      portfolioResetsThisMonth: normalized.portfolioResetsThisMonth + 1,
    };
    setUsageQuota(nextQuota);
    if (user?.uid) {
      setDoc(
        doc(db, 'users', user.uid),
        { balance: clampedCash, initialBalance: clampedCash, usage: nextQuota, updatedAt: Date.now() },
        { merge: true }
      ).catch(() => {});
    }
    const resetTx: WalletTransaction = {
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT',
      amount: clampedCash,
      description: `Portfolio reset credit (${planConfig.name})`,
      timestamp: Date.now(),
    };
    setWalletTransactions([resetTx]);
    addToast('Portfolio Reset', `Reset paper portfolio with fresh ₹${clampedCash.toLocaleString('en-IN')} cash`, 'info');
  };

  return { addMoneyToWallet, setPaperBalance, resetPortfolio };
}
