import React from 'react';
import { Crown, Check, ArrowRight } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { navigate } from '../../../lib/navigation';
import { useTrading } from '../../../context/TradingContext';

export default function PremiumFeatureGate({
  requiredTier = 'beginner',
  title,
  description,
  benefits = [],
  comparisonPlans = null, // optional array of { tier, label, items } for Intraday comparison
  ctaLabel,
}) {
  const { openUpgradeModal } = useTrading();
  const plan = SUBSCRIPTION_PLANS[requiredTier] || SUBSCRIPTION_PLANS.beginner;
  const displayCta = ctaLabel || `Upgrade to ${plan.name.replace(' Package', '')}`;

  const handleUpgrade = () => {
    openUpgradeModal({
      requiredTier,
      featureName: title,
      featureDescription: description,
    });
  };

  return (
    <section className="sc-gate" aria-label={title}>
      <div className="sc-gate-top">
        <div className="sc-gate-head">
          <span className="sc-gate-icon" aria-hidden="true">
            <Crown size={16} />
          </span>
          <div>
            <div className="sc-gate-title-row">
              <h4 className="sc-gate-title">{title}</h4>
              <span className="sc-gate-badge">
                {plan.name.replace(' Package', '')} · ₹{plan.monthlyPrice}/mo
              </span>
            </div>
            <p className="sc-gate-desc">{description}</p>
          </div>
        </div>

        <div className="sc-gate-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleUpgrade}>
            <Crown size={14} />
            <span>{displayCta}</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="sc-gate-link"
            onClick={() => navigate('/pricing')}
          >
            Compare Plans
          </button>
        </div>
      </div>

      {benefits.length > 0 && !comparisonPlans && (
        <ul className="sc-gate-benefits">
          {benefits.slice(0, 3).map((b) => (
            <li key={b}>
              <Check size={13} className="sc-gate-check" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {comparisonPlans && comparisonPlans.length > 0 && (
        <div className="sc-gate-compare">
          {comparisonPlans.map((cp) => {
            const p = SUBSCRIPTION_PLANS[cp.tier];
            return (
              <div key={cp.tier} className={`sc-gate-plan ${cp.tier === 'advanced' ? 'is-pro' : ''}`}>
                <div className="sc-gate-plan-head">
                  <strong>{p.name.replace(' Package', '')}</strong>
                  <span>₹{p.monthlyPrice}/mo</span>
                </div>
                <ul>
                  {cp.items.map((item) => (
                    <li key={item}>
                      <Check size={12} className="sc-gate-check" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
