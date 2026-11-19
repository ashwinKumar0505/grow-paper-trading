import React from 'react';
import { ArrowRight, Crown, Receipt, RefreshCw } from 'lucide-react';
import type { SubscriptionPlanConfig, SubscriptionTier } from '../../lib/subscription';
import { navigate } from '../../lib/navigation';
import type { UserProfile } from '../../types/market';
import { formatProfileDate, getSubscriptionStatusDisplay } from '../../utils/profileBilling';
import { Button } from '../ui/button';

interface ProfileSubscriptionCardProps {
  user: UserProfile;
  subscriptionTier: SubscriptionTier;
  planConfig: SubscriptionPlanConfig;
  onUpgradeOrRenew: (tier: 'beginner' | 'advanced', cycle: 'monthly' | 'yearly') => void;
  onOpenCancelModal: () => void;
  onOpenBillingHistory: () => void;
}

export const ProfileSubscriptionCard: React.FC<ProfileSubscriptionCardProps> = ({
  user,
  subscriptionTier,
  planConfig,
  onUpgradeOrRenew,
  onOpenCancelModal,
  onOpenBillingHistory,
}) => {
  const billingCycle = user.subscriptionBillingCycle || 'free';
  const renewCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const isPaid = subscriptionTier !== 'free';
  const isCancelled = user.subscriptionStatus === 'cancelled';
  const nextUpgradeTier = subscriptionTier === 'free' ? 'beginner' : 'advanced';

  const statusDisplay = getSubscriptionStatusDisplay({
    tier: subscriptionTier,
    status: user.subscriptionStatus,
    billingCycle,
    expiresAt: user.subscriptionExpiresAt,
  });

  const badgeToneClass =
    statusDisplay.tone === 'amber'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
      : statusDisplay.tone === 'muted'
      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
      : 'bg-[#10B981]/15 text-[#008F6B] dark:text-emerald-400';

  return (
    <section className="min-w-0 rounded-2xl border border-emerald-900/15 dark:border-[#1E2F28] bg-white dark:bg-[#111C17] p-6 flex flex-col justify-between gap-6 transition-colors">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#4E655A] dark:text-[#A3B8AE]">
            <Crown className="w-4 h-4 text-[#10B981]" />
            <span>Subscription</span>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeToneClass}`}>
            {statusDisplay.badgeLabel}
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-[#15241D] dark:text-white">
            {planConfig.name}
          </h3>
          <p className="text-sm text-[#4E655A] dark:text-[#A3B8AE] mt-1">
            {statusDisplay.summaryText}
          </p>
        </div>

        <dl className="divide-y divide-emerald-900/10 dark:divide-[#1E2F28] border-t border-emerald-900/10 dark:border-[#1E2F28] text-sm">
          <div className="py-2.5 flex items-center justify-between gap-4">
            <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">Billing Cycle</dt>
            <dd className="font-medium text-[#15241D] dark:text-white capitalize">
              {isPaid ? billingCycle : 'Free forever'}
            </dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <dt className="text-[#4E655A] dark:text-[#A3B8AE] shrink-0">
              {isPaid ? (isCancelled ? 'Active Until' : 'Next Renewal') : 'Validity'}
            </dt>
            <dd className="font-medium text-[#15241D] dark:text-white">
              {isPaid ? formatProfileDate(user.subscriptionExpiresAt) : 'No expiry'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2.5">
          {isPaid && isCancelled ? (
            <>
              <Button
                type="button"
                onClick={() => onUpgradeOrRenew(subscriptionTier, renewCycle)}
                className="w-full whitespace-nowrap bg-[#10B981] hover:bg-[#059669] dark:bg-[#10B981] dark:hover:bg-[#059669] text-[#042218] font-semibold cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Renew Subscription</span>
              </Button>
              {subscriptionTier === 'beginner' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onUpgradeOrRenew('advanced', renewCycle)}
                  className="w-full whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>Upgrade to Advanced</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              )}
            </>
          ) : (
            <>
              {subscriptionTier !== 'advanced' && (
                <Button
                  type="button"
                  onClick={() => onUpgradeOrRenew(nextUpgradeTier, renewCycle)}
                  className="w-full whitespace-nowrap bg-[#10B981] hover:bg-[#059669] dark:bg-[#10B981] dark:hover:bg-[#059669] text-[#042218] font-semibold cursor-pointer transition-colors"
                >
                  <span>{subscriptionTier === 'beginner' ? 'Upgrade to Advanced' : 'Upgrade Plan'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/pricing')}
                className="w-full whitespace-nowrap cursor-pointer transition-colors"
              >
                {subscriptionTier === 'advanced' ? 'View Plan Details' : 'Compare Plans'}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenBillingHistory}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E655A] dark:text-[#A3B8AE] hover:text-[#15241D] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-[#10B981]" />
            <span>View Billing History</span>
          </button>

          {isPaid && !isCancelled && (
            <button
              type="button"
              onClick={onOpenCancelModal}
              className="text-xs font-medium text-rose-500/85 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
