import React from 'react';
import { useTrading } from '../context/TradingContext';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../lib/subscription';
import { navigate } from '../lib/navigation';
import { ArrowRight, Crown, Lock, Sparkles } from 'lucide-react';

interface LockedFeatureCardProps {
  requiredTier?: SubscriptionTier;
  title?: string;
  featureName?: string;
  description: string;
  bullets?: string[];
  compact?: boolean;
}

export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({
  requiredTier = 'beginner',
  title,
  featureName,
  description,
  bullets = [],
  compact = false,
}) => {
  const displayTitle = title || featureName || 'Premium Feature';
  const { openUpgradeModal, openRazorpayCheckout } = useTrading();
  const plan = SUBSCRIPTION_PLANS[requiredTier];
  const checkoutTier = requiredTier === 'advanced' ? 'advanced' : 'beginner';

  if (compact) {
    return (
      <div className="rounded-2xl border border-[#00D09C]/35 bg-gradient-to-r from-[#0C1D16] via-[#132E23] to-[#0E221A] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00D09C]/20 border border-[#00D09C]/40 text-[#00D09C] flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm text-white">{displayTitle}</span>
              <span className="rounded-full bg-[#00D09C]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#00D09C]">
                Requires {plan.name}
              </span>
            </div>
            <p className="text-xs text-[#9AB0A5] mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              openUpgradeModal({
                requiredTier,
                featureName: displayTitle,
                featureDescription: description,
              })
            }
            className="px-4 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#04261C] font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Unlock (₹{plan.monthlyPrice}/mo)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#1D3A2D] bg-gradient-to-br from-[#0C1D16] via-[#122B21] to-[#0A1812] text-white p-6 sm:p-8 shadow-xl space-y-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#00D09C]/15 border border-[#00D09C]/35 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#00D09C]">
          <Lock className="w-3.5 h-3.5" />
          <span>{plan.name} Feature · Locked on Current Plan</span>
        </span>

        <span className="text-xs font-mono font-bold text-[#9AB0A5]">
          Starts at ₹{plan.monthlyPrice}/month · Instant Upgrade
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">{displayTitle}</h3>
        <p className="text-xs sm:text-sm text-[#9AB0A5] leading-relaxed max-w-2xl">{description}</p>
      </div>

      {bullets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {bullets.map((b) => (
            <div
              key={b}
              className="rounded-xl border border-[#1D3A2D] bg-[#12281F] px-3.5 py-2.5 text-xs text-[#D6E6DE] flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openRazorpayCheckout(checkoutTier, 'monthly')}
          className="px-5 py-3 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-[#04261C] font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-md"
        >
          <Crown className="w-4 h-4" />
          <span>
            Upgrade to {plan.name} (₹{plan.monthlyPrice}/mo)
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() =>
            openUpgradeModal({
              requiredTier,
              featureName: displayTitle,
              featureDescription: description,
            })
          }
          className="px-4 py-3 rounded-xl border border-[#254939] bg-[#132920] hover:border-[#00D09C] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
        >
          Compare Beginner vs Advanced
        </button>

        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="text-xs font-bold text-[#00D09C] hover:underline cursor-pointer ml-auto"
        >
          View Full Pricing Table →
        </button>
      </div>
    </div>
  );
};
