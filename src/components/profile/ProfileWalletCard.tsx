import React from 'react';
import { PlusCircle, Wallet } from 'lucide-react';
import type { SubscriptionPlanConfig, SubscriptionTier, UserUsageQuota } from '../../lib/subscription';
import type { Holding, IntradayPosition, Order, Stock } from '../../types/market';
import { formatINR } from '../../utils/pricing';
import { computeProfileWalletMetrics } from '../../utils/profileBilling';
import { Button } from '../ui/button';

interface ProfileWalletCardProps {
  balance: number;
  holdings: Holding[];
  intradayPositions: IntradayPosition[];
  orders: Order[];
  stocks: Stock[];
  subscriptionTier: SubscriptionTier;
  planConfig: SubscriptionPlanConfig;
  usageQuota: UserUsageQuota;
  onOpenWallet: () => void;
  onAddVirtualCash: () => void;
}

export const ProfileWalletCard: React.FC<ProfileWalletCardProps> = ({
  balance,
  holdings,
  intradayPositions,
  orders,
  stocks,
  subscriptionTier,
  planConfig,
  usageQuota,
  onOpenWallet,
  onAddVirtualCash,
}) => {
  const metrics = computeProfileWalletMetrics({
    balance,
    holdings,
    intradayPositions,
    orders,
    stocks,
    planConfig,
    usageQuota,
  });

  return (
    <section className="min-w-0 rounded-2xl border border-emerald-900/15 dark:border-[#1E2F28] bg-white dark:bg-[#111C17] p-6 flex flex-col justify-between gap-6 transition-colors">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#4E655A] dark:text-[#A3B8AE]">
            <Wallet className="w-4 h-4 text-[#10B981]" />
            <span>Paper Trading Wallet</span>
          </div>
          <button
            type="button"
            onClick={onAddVirtualCash}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#008F6B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Virtual Cash</span>
          </button>
        </div>

        <div>
          <div className="text-xs font-medium text-[#4E655A] dark:text-[#A3B8AE]">
            Total Portfolio Value
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#15241D] dark:text-white mt-0.5">
            {formatINR(metrics.totalPortfolioValue)}
          </div>
        </div>

        <dl className="divide-y divide-emerald-900/10 dark:divide-[#1E2F28] border-t border-emerald-900/10 dark:border-[#1E2F28] text-sm">
          <div className="py-2.5 flex items-center justify-between gap-4">
            <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">Available Cash</dt>
            <dd className="font-mono font-medium text-[#15241D] dark:text-white">
              {formatINR(metrics.availableCash)}
            </dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">Invested Value</dt>
            <dd className="font-mono font-medium text-[#15241D] dark:text-white">
              {formatINR(metrics.investedMarketValue)}
            </dd>
          </div>
          <div className="py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">Daily Stock Analyses</dt>
              <dd className="font-mono font-medium text-[#15241D] dark:text-white">
                {metrics.isUnlimitedAnalyses
                  ? `${metrics.dailyUsed} / Unlimited`
                  : `${metrics.dailyUsed} / ${metrics.dailyLimit} used today`}
              </dd>
            </div>
            {!metrics.isUnlimitedAnalyses && (
              <div className="w-full h-1.5 rounded-full bg-emerald-900/10 dark:bg-[#1E2F28] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                  style={{ width: `${metrics.analysisUsagePercent}%` }}
                />
              </div>
            )}
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">Trading Leverage</dt>
            <dd className="font-medium text-[#15241D] dark:text-white">
              {subscriptionTier === 'free' ? 'Delivery Only' : 'Up to 5x Intraday & MTF'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenWallet}
          className="w-full whitespace-nowrap cursor-pointer transition-colors"
        >
          <Wallet className="w-4 h-4 text-[#10B981]" />
          <span>Open Paper Wallet</span>
        </Button>
        <p className="text-[11px] text-center text-[#5B7066] dark:text-[#8CA398]">
          Virtual funds only — cannot be withdrawn as real money.
        </p>
      </div>
    </section>
  );
};
