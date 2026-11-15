import React,{ useEffect,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
const round2 = (n: number) => Math.round(n * 100) / 100;
export function useWalletView() {
  const {
    balance,
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
    openRazorpayCheckout,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'add-money' | 'history' | 'reset'>('add-money');
  const [selectedAddPreset, setSelectedAddPreset] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isFreeTier = subscriptionTier === 'free';
  const tierMaxLimit = planConfig.maxWalletLimit; // 1L Free, 10L Beginner, 50L Advanced
  const tierLabel =
    subscriptionTier === 'advanced' ? '50L' : subscriptionTier === 'beginner' ? '10L' : '1L';

  // Include BOTH Available Cash AND Locked Margin (Intraday 5x + MTF 5.00x + open order margin)
  // so cancelling an order or closing a position after top-up can never push cash beyond the tier cap.
  const lockedMargin = round2(portfolioSummary.lockedMargin || 0);
  const committedCapital = round2(balance + lockedMargin);
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
        customError = `Exceeds available headroom of ₹${maxAllowedToAdd.toLocaleString('en-IN')} (${tierLabel} cap includes ₹${lockedMargin.toLocaleString('en-IN')} locked margin).`;
      }
    }
  } else {
    currentRequestedAmount = Math.min(selectedAddPreset, maxAllowedToAdd);
  }

  const isAddDisabled =
    isWalletFull ||
    currentRequestedAmount <= 0 ||
    currentRequestedAmount > maxAllowedToAdd;

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFreeTier) {
      setIsWalletModalOpen(false);
      openRazorpayCheckout('topup_1l', 'monthly');
      return;
    }
    if (isAddDisabled) return;

    const success = addMoneyToWallet(currentRequestedAmount, 'Added via Paper Wallet Top-Up');
    if (success) {
      setShowSuccessMessage(
        `₹${currentRequestedAmount.toLocaleString('en-IN')} credited to your paper wallet.`
      );
      setTimeout(() => {
        setShowSuccessMessage(null);
        setIsWalletModalOpen(false);
      }, 1200);
    }
  };

  const handleConfirmReset = (amount = planConfig.defaultStartingCash) => {
    resetPortfolio(amount);
    setShowResetConfirm(false);
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

  
 return { balance, isWalletModalOpen, setIsWalletModalOpen, walletTransactions, portfolioSummary, user, planConfig, subscriptionTier, openUpgradeModal, openRazorpayCheckout, activeTab, setActiveTab, selectedAddPreset, setSelectedAddPreset, customAmount, setCustomAmount, isCustom, setIsCustom, showSuccessMessage, showResetConfirm, setShowResetConfirm, isFreeTier, tierMaxLimit, tierLabel, lockedMargin, committedCapital, maxAllowedToAdd, isWalletFull, capacityPercent, standardPresets, currentRequestedAmount, customError, isAddDisabled, handleAddFunds, handleConfirmReset, resetPresets };
}
export type WalletViewModel = ReturnType<typeof useWalletView>;
