import React from 'react';
import { ArrowRight, Radar } from 'lucide-react';
import { useTrading } from '../../../context/TradingContext';
import { AppLink } from '../../../lib/navigation';
import { btnPrimary, btnSecondary, textMuted, textStrong } from '../pricingStyles';

export const PricingCTA: React.FC = () => {
  const { user, openAuthModal } = useTrading();

  return (
    <section
      aria-labelledby="pricing-cta-title"
      className="relative overflow-hidden rounded-2xl border border-[#00B386]/25 bg-gradient-to-br from-[#E9F7F1] to-white px-6 py-10 text-center sm:px-10 dark:border-[#00D09C]/20 dark:from-[#0F261C] dark:to-[#0D1712]"
    >
      <h2 id="pricing-cta-title" className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${textStrong}`}>
        Ready to Build Your Trading Skills?
      </h2>
      <p className={`mx-auto mt-2 max-w-xl text-sm sm:text-base ${textMuted}`}>
        Explore the markets, practice your strategies, and learn with confidence.
      </p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {user ? (
          <AppLink href="/trade" className={btnPrimary}>
            Start Trading for Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </AppLink>
        ) : (
          <button type="button" onClick={() => openAuthModal('signup')} className={btnPrimary}>
            Start Trading for Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <AppLink href="/screener" className={btnSecondary}>
          <Radar className="h-4 w-4" aria-hidden="true" />
          Explore Stock Screener
        </AppLink>
      </div>
      <p className={`mt-6 text-xs ${textMuted}`}>
        NiftyLens is an educational simulator. No real money is invested and no returns are guaranteed.
      </p>
    </section>
  );
};
