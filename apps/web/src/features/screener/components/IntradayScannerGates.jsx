import PremiumFeatureGate from './PremiumFeatureGate';

export function IntradayScannerGates({
  isLocked,
  data,
  loading,
  lockedCount,
  planConfig,
  B,
  A,
}) {
  if (isLocked) {
    return (
      <PremiumFeatureGate
        requiredTier="beginner"
        title="Unlock Intraday Signals"
        description="Access intraday trading setups with entry price, target, stop-loss, and signal tracking."
        comparisonPlans={[
          {
            tier: 'beginner',
            items: [
              `Top ${B.intradayMaxSignals} intraday picks per session`,
              '5x intraday (MIS) paper trading',
              'Entry, target, stop-loss & status tracking',
            ],
          },
          {
            tier: 'advanced',
            items: [
              `Up to ${A.intradayMaxSignals} liquid Nifty intraday setups`,
              '5-minute automatic live refresh',
              'Advanced filters & one-click intraday trade',
            ],
          },
        ]}
      />
    );
  }

  if (data && !loading && lockedCount > 0) {
    return (
      <PremiumFeatureGate
        requiredTier="advanced"
        title={`Unlock ${lockedCount} More Intraday Setups`}
        description={`Your ${planConfig.name} displays the top ${planConfig.intradayMaxSignals} intraday picks per session. Upgrade to Advanced for full scanner access and automatic live refresh.`}
        benefits={[
          `Up to ${A.intradayMaxSignals} liquid Nifty intraday setups per session`,
          '5-minute automatic live refresh during market hours',
          'One-click Paper Trading directly from intraday signals',
        ]}
      />
    );
  }

  return null;
}
