import React from 'react';
import { CalendarClock, PlusCircle, ShieldCheck, Wallet } from 'lucide-react';
import { useTrading } from '../../../context/TradingContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { formatLakh } from '../../../utils/pricing';
import { PLAN_ORDER } from '../pricingConfig';
import { accentText, btnSecondary, textMuted, textStrong } from '../pricingStyles';

const POINTS = [
  { icon: ShieldCheck, text: '100% simulated money. It cannot be withdrawn or converted to real cash.' },
  { icon: CalendarClock, text: "Balance resets automatically to your plan's capital at the start of each month." },
  { icon: PlusCircle, text: 'Top-ups: ₹50 per +₹1L on Free; free top-ups up to your plan limit on paid plans.' },
];

export const VirtualCapitalInfo: React.FC = () => {
  const { user, openAuthModal, setIsWalletModalOpen } = useTrading();

  return (
    <section
      aria-labelledby="virtual-capital-title"
      className="grid gap-6 rounded-2xl border border-[#00B386]/25 bg-[#00D09C]/[0.05] p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center dark:border-[#00D09C]/20 dark:bg-[#0F1F18]"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00D09C]/15 text-[#00936E] dark:text-[#00D09C]">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="virtual-capital-title" className={`text-xl font-extrabold sm:text-2xl ${textStrong}`}>
            Practice Trading With Virtual Capital
          </h2>
        </div>
        <p className={`text-sm leading-relaxed ${textMuted}`}>
          Every plan comes with its own virtual capital for risk-free practice. More capital gives you more room to
          practise position sizing. It does not improve trading results.
        </p>
        <dl className="flex flex-wrap gap-2">
          {PLAN_ORDER.map((tier) => (
            <div
              key={tier}
              className="rounded-lg border border-[#D9E4DE] bg-white px-3 py-1.5 text-xs dark:border-[#1E3128] dark:bg-[#111C17]"
            >
              <dt className={`inline ${textMuted}`}>{SUBSCRIPTION_PLANS[tier].name.replace(' Package', '')}: </dt>
              <dd className={`inline font-extrabold tabular-nums ${accentText}`}>
                {formatLakh(SUBSCRIPTION_PLANS[tier].defaultStartingCash)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-4">
        <ul className="space-y-3">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-snug text-[#26372F] dark:text-[#D6E4DD]">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${accentText}`} aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => (user ? setIsWalletModalOpen(true) : openAuthModal('signup'))}
        >
          Explore Virtual Capital Top-ups
        </button>
      </div>
    </section>
  );
};
