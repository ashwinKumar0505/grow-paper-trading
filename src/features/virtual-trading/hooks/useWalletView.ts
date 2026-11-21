import React, { useEffect, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { computeCommittedCapitalAmount } from '../utils/portfolioRemoteAdapter';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function useWalletView() {
  const {
    balance,
    holdings,
    intradayPositions,
    orders,
    isWalletModalOpen,
    setIsWalletModalOpen,
    addMoneyToWallet,
    walletTransactions,
    resetPortfolio,
    portfolioSummary,
    user,
    planConfig,
    subscriptionTier,
    openUpgradeModal,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'add-money' | 'history' | 'reset'>('add-money');
  const [selectedAddPreset, setSelectedAddPreset] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFreeTier = subscriptionTier === 'free';
  const tierMaxLimit = planConfig.maxWalletLimit + (user?.paidTopUpCredit || 0);
  const tierLabel =
    subscriptionTier === 'advanced' ? '50L' : subscriptionTier === 'beginner' ? '10L' : '1L';

  // Match authoritative backend committed capital (cash + holdings net of MTF loan + intraday margin + reserved orders).
  const lockedMargin = round2(portfolioSummary.lockedMargin || 0);
  const committedCapital = computeCommittedCapitalAmount({
    balance,
    holdings,
    positions: intradayPositions,
    orders,
  });
  const maxAllowedToAdd = Math.max(0, round2(tierMaxLimit - committedCapital));
  const isWalletFull = committedCapital >= tierMaxLimit - 0.01;
  const capacityPercent = Math.min(100, Math.round((committedCapital / tierMaxLimit) * 100));

  useEffect(() => {
    if (isWalletModalOpen && maxAllowedToAdd > 0 && selectedAddPreset > maxAllowedToAdd) {
      setSelectedAddPreset(maxAllowedToAdd);
    }
  }, [isWalletModalOpen, maxAllowedToAdd, selectedAddPreset]);

  const standardPresets =
    subscriptionTier === 'advanced'
      ? [
          { label: '+₹1,00,000', sub: '1 Lakh', value: 100000 },
          { label: '+₹5,00,000', sub: '5 Lakhs', value: 500000, popular: true },
          { label: '+₹10,00,000', sub: '10 Lakhs', value: 1000000 },
          { label: '+₹25,00,000', sub: '25 Lakhs', value: 2500000 },
        ]
      : [
          { label: '+₹50,000', sub: '50K', value: 50000 },
          { label: '+₹1,00,000', sub: '1 Lakh', value: 100000, popular: true },
          { label: '+₹2,50,000', sub: '2.5 Lakhs', value: 250000 },
          { label: '+₹5,00,000', sub: '5 Lakhs', value: 500000 },
        ];

  let currentRequestedAmount = 0;
  let customError = '';

  if (isCustom) {
    const parsed = parseFloat(customAmount.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      currentRequestedAmount = round2(parsed);
      if (currentRequestedAmount > maxAllowedToAdd) {
        customError = `You can add up to ₹${maxAllowedToAdd.toLocaleString('en-IN')} under your ${tierLabel} plan limit.`;
      }
    }
  } else {
    currentRequestedAmount = Math.min(selectedAddPreset, maxAllowedToAdd);
  }

  const isAddDisabled =
    isSubmitting ||
    isWalletFull ||
    currentRequestedAmount <= 0 ||
    currentRequestedAmount > maxAllowedToAdd;

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFreeTier) {
      setIsWalletModalOpen(false);
      openUpgradeModal({
        requiredTier: 'beginner',
        featureName: 'Higher Paper Trading Capital & Free Refills',
        featureDescription:
          'Free accounts include ₹1,00,000 virtual capital with an automatic monthly reset. Upgrade to Beginner (₹10L) or Advanced (₹50L) for free virtual refills, unlimited resets, and full platform tools.',
      });
      return;
    }
    if (isAddDisabled) return;

    setIsSubmitting(true);
    try {
      const success = await addMoneyToWallet(currentRequestedAmount, 'Added via Paper Wallet Top-Up');
      if (success) {
        setShowSuccessMessage(
          `₹${currentRequestedAmount.toLocaleString('en-IN')} credited to your paper wallet.`
        );
        setTimeout(() => {
          setShowSuccessMessage(null);
          setIsWalletModalOpen(false);
        }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async (amount = planConfig.defaultStartingCash) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await resetPortfolio(amount);
      setShowResetConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPresets =
    subscriptionTier === 'advanced'
      ? [
          { amount: 500000, label: '₹5,00,000', sub: '5 Lakhs' },
          { amount: 1000000, label: '₹10,00,000', sub: '10 Lakhs' },
          { amount: 2500000, label: '₹25,00,000', sub: '25 Lakhs' },
          { amount: 5000000, label: '₹50,00,000', sub: '50L Max Cap' },
        ]
      : [
          { amount: 100000, label: '₹1,00,000', sub: '1 Lakh' },
          { amount: 250000, label: '₹2,50,000', sub: '2.5 Lakhs' },
          { amount: 500000, label: '₹5,00,000', sub: '5 Lakhs' },
          { amount: 1000000, label: '₹10,00,000', sub: '10L Max Cap' },
        ];

  
 return { balance, isWalletModalOpen, setIsWalletModalOpen, walletTransactions, portfolioSummary, user, planConfig, subscriptionTier, openUpgradeModal, activeTab, setActiveTab, selectedAddPreset, setSelectedAddPreset, customAmount, setCustomAmount, isCustom, setIsCustom, showSuccessMessage, showResetConfirm, setShowResetConfirm, isFreeTier, tierMaxLimit, tierLabel, lockedMargin, committedCapital, maxAllowedToAdd, isWalletFull, capacityPercent, standardPresets, currentRequestedAmount, customError, isAddDisabled, handleAddFunds, handleConfirmReset, resetPresets };
}
export type WalletViewModel = ReturnType<typeof useWalletView>;
