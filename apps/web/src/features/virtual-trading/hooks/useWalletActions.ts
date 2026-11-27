import type { RefObject } from 'react';
import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { trackPaperTradeActivity } from '../../../lib/analytics';
import { getCurrentMonthKey, normalizeUsageQuota, UserUsageQuota } from '../../../lib/subscription';
import { OrderBookState } from '../../../utils/orderEngine';
import {
  postAuthoritativeWalletReset,
  postAuthoritativeWalletTopUp,
  type ServerTradingLedgerState,
} from '../services/paperTradingApi';
import { computeCommittedCapitalAmount } from '../utils/portfolioRemoteAdapter';
import type { TradingState } from './useTradingState';

const round2 = (n: number) => Math.round(n * 100) / 100;

type Options = Pick<
  TradingState,
  | 'subscriptionTier' | 'planConfig' | 'openUpgradeModal'
  | 'setWalletTransactions' | 'user' | 'setInitialBalance' | 'setIsWalletModalOpen'
  | 'usageQuota' | 'setUsageQuota'
> &
  Pick<TradingContextType, 'addToast'> & {
    engineRef: RefObject<OrderBookState>;
    commitEngine: (patch: Partial<OrderBookState>) => void;
  };

export function useWalletActions({
  addToast, subscriptionTier, planConfig, engineRef,
  openUpgradeModal, commitEngine, setWalletTransactions, user,
  setInitialBalance, setIsWalletModalOpen, usageQuota, setUsageQuota,
}: Options) {
  const applyAuthoritativeLedger = (state: ServerTradingLedgerState) => {
    commitEngine({
      balance: state.balance,
      holdings: state.holdings,
      positions: state.positions,
      orders: state.orders,
      executedOrderKeys: state.executedOrderKeys || [],
    });
    if (typeof state.initialBalance === 'number') setInitialBalance(state.initialBalance);
    if (Array.isArray(state.walletTransactions)) setWalletTransactions(state.walletTransactions);
  };

  const addMoneyToWallet = async (
    amount: number,
    description = 'Funds added via Add Money'
  ): Promise<boolean> => {
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Invalid Amount', 'Please enter a valid amount greater than zero.', 'error');
      return false;
    }
    if (subscriptionTier === 'free') {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Higher Paper Trading Capital & Free Refills',
        featureDescription:
          'Free accounts include ₹1,00,000 virtual capital with an automatic monthly reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for free virtual refills, unlimited resets, and full platform tools.',
      });
      return false;
    }

    const planMax = planConfig.maxWalletLimit + (user?.paidTopUpCredit || 0);
    const committedCapital = computeCommittedCapitalAmount(engineRef.current);
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
        `You can add at most ₹${allowedAdd.toLocaleString('en-IN')} to stay within your ₹${planMax.toLocaleString('en-IN')} limit.`,
        'error'
      );
      return false;
    }

    if (user?.uid) {
      const serverRes = await postAuthoritativeWalletTopUp({ amount, description });
      if (!serverRes.ok || !serverRes.state) {
        addToast('Wallet Top-Up Failed', serverRes.message || 'Unable to save top-up to server. Please try again.', 'error');
        if (serverRes.code === 'WALLET_CAP_EXCEEDED' && serverRes.requiredTier) {
          openUpgradeModal({ requiredTier: serverRes.requiredTier, featureName: 'Expand Virtual Capital Limit', featureDescription: serverRes.message });
        }
        return false;
      }
      applyAuthoritativeLedger(serverRes.state);
      addToast('Money Added!', `₹${amount.toLocaleString('en-IN')} added to your paper wallet. New balance: ₹${serverRes.state.balance.toLocaleString('en-IN')}.`, 'success');
      trackPaperTradeActivity({ activityType: 'wallet_topup' });
      return true;
    }

    const newBalance = round2(engineRef.current.balance + amount);
    commitEngine({ balance: newBalance });
    setInitialBalance((prev) => round2(prev + amount));
    setWalletTransactions((prev) => [{
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT', amount, description, timestamp: Date.now(),
    }, ...prev]);
    addToast('Money Added!', `₹${amount.toLocaleString('en-IN')} added to your paper wallet. New balance: ₹${newBalance.toLocaleString('en-IN')}.`, 'success');
    trackPaperTradeActivity({ activityType: 'wallet_topup' });
    return true;
  };

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
    setWalletTransactions((prev) => [{
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT', amount: clampedAmount, description: 'Direct balance adjustment', timestamp: Date.now(),
    }, ...prev]);
    addToast('Paper Cash Updated', `Paper trading balance set to ₹${clampedAmount.toLocaleString('en-IN')}`, 'success');
  };

  const resetPortfolio = async (startingCash = planConfig.defaultStartingCash): Promise<void> => {
    if (!Number.isFinite(startingCash)) return;
    if (subscriptionTier === 'free' || !planConfig.allowUnlimitedWalletResets) {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Unlimited Manual Portfolio Resets',
        featureDescription:
          'Free accounts include an automatic monthly reset to ₹1,00,000, with no manual portfolio reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for unlimited manual portfolio resets.',
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
    const normalized = normalizeUsageQuota(usageQuota);
    const nextQuota: UserUsageQuota = {
      ...normalized,
      lastPortfolioResetMonth: getCurrentMonthKey(),
      portfolioResetsThisMonth: normalized.portfolioResetsThisMonth + 1,
    };

    if (user?.uid) {
      const serverRes = await postAuthoritativeWalletReset({ startingCash: clampedCash });
      if (!serverRes.ok || !serverRes.state) {
        addToast(
          'Portfolio Reset Failed',
          serverRes.message || 'Unable to reset paper portfolio on server. Please try again.',
          'error'
        );
        return;
      }
      applyAuthoritativeLedger(serverRes.state);
      setUsageQuota(nextQuota);
      setIsWalletModalOpen(false);
      addToast('Portfolio Reset', serverRes.message || `Reset paper portfolio with fresh ₹${clampedCash.toLocaleString('en-IN')} cash`, 'info');
      trackPaperTradeActivity({ activityType: 'portfolio_reset' });
      return;
    }

    commitEngine({ balance: clampedCash, holdings: [], positions: [], orders: [] });
    setInitialBalance(clampedCash);
    setIsWalletModalOpen(false);
    setUsageQuota(nextQuota);
    setWalletTransactions([{
      id: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      type: 'DEPOSIT', amount: clampedCash,
      description: `Portfolio reset credit (${planConfig.name})`, timestamp: Date.now(),
    }]);
    addToast('Portfolio Reset', `Reset paper portfolio with fresh ₹${clampedCash.toLocaleString('en-IN')} cash`, 'info');
    trackPaperTradeActivity({ activityType: 'portfolio_reset' });
  };

  return { addMoneyToWallet, setPaperBalance, resetPortfolio };
}
