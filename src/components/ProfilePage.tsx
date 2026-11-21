import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { BillingHistoryModal } from './profile/BillingHistoryModal';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileSubscriptionCard } from './profile/ProfileSubscriptionCard';
import { ProfileWalletCard } from './profile/ProfileWalletCard';

export const ProfilePage: React.FC = () => {
  const {
    user,
    balance,
    holdings,
    intradayPositions,
    orders,
    stocks,
    subscriptionTier,
    planConfig,
    usageQuota,
    setIsWalletModalOpen,
    openUpgradeModal,
    openRazorpayCheckout,
    cancelSubscription,
    logOutUser,
  } = useTrading();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  if (!user) return null;

  const billingCycle = user.subscriptionBillingCycle || 'free';
  const razorpaySubscriptionId =
    user.razorpaySubscriptionId ||
    (user.razorpayOrderId?.startsWith('sub_') ? user.razorpayOrderId : undefined);

  const handleAddVirtualCash = () => {
    if (subscriptionTier === 'free') {
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Higher Paper Trading Capital & Free Refills',
        featureDescription:
          'Free accounts include ₹1,00,000 virtual capital with an automatic monthly reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for free virtual refills, unlimited resets, and full platform tools.',
      });
    } else {
      setIsWalletModalOpen(true);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <ProfileHeader user={user} onSignOut={logOutUser} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <ProfileSubscriptionCard
          user={user}
          subscriptionTier={subscriptionTier}
          planConfig={planConfig}
          onUpgradeOrRenew={openRazorpayCheckout}
          onOpenCancelModal={() => setIsCancelModalOpen(true)}
          onOpenBillingHistory={() => setIsBillingModalOpen(true)}
        />

        <ProfileWalletCard
          balance={balance}
          holdings={holdings}
          intradayPositions={intradayPositions}
          orders={orders}
          stocks={stocks}
          subscriptionTier={subscriptionTier}
          planConfig={planConfig}
          usageQuota={usageQuota}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onAddVirtualCash={handleAddVirtualCash}
        />
      </div>

      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        planName={planConfig.name}
        billingCycle={billingCycle}
        expiresAt={user.subscriptionExpiresAt}
        updatedAt={user.subscriptionUpdatedAt}
        subscriptionId={razorpaySubscriptionId}
        onConfirmCancel={cancelSubscription}
      />

      <BillingHistoryModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        user={user}
        subscriptionTier={subscriptionTier}
      />
    </main>
  );
};
