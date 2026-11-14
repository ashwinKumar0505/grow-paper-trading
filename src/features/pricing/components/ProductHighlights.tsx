import React from 'react';
import { ArrowRight, BookOpen, ChartCandlestick, Radar } from 'lucide-react';
import { AppLink } from '../../../lib/navigation';
import { accentText, focusRing, surface, textMuted, textStrong } from '../pricingStyles';

const PRODUCTS = [
  {
    icon: Radar,
    title: 'AI Stock Screener & Backtests',
    description: 'Scan NSE stocks with chart analysis, 2- to 5-year backtested strategies, and an AI insights layer.',
    href: '/screener',
    cta: 'Explore Screener',
  },
  {
    icon: ChartCandlestick,
    title: 'Paper Trading Desk',
    description: 'Practice real market order flows with virtual capital and realistic charges.',
    href: '/trade',
    cta: 'Try Paper Trading',
  },
  {
    icon: BookOpen,
    title: 'Learn Charts & Guess the Chart',
    description: 'Master 28+ chart patterns, then sharpen your read with chart quizzes.',
    href: '/learn',
    cta: 'Start Learning',
  },
] as const;

export const ProductHighlights: React.FC = () => (
  <section aria-labelledby="products-title">
    <h2 id="products-title" className="sr-only">
      What every plan includes
    </h2>
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PRODUCTS.map(({ icon: Icon, title, description, href, cta }) => (
        <li key={title} className={`flex flex-col rounded-2xl p-5 ${surface}`}>
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D09C]/10 text-[#00936E] dark:text-[#00D09C]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className={`text-base font-extrabold ${textStrong}`}>{title}</h3>
          <p className={`mt-1.5 flex-1 text-sm leading-relaxed ${textMuted}`}>{description}</p>
          <AppLink
            href={href}
            className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-bold hover:underline ${accentText} ${focusRing}`}
          >
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </AppLink>
        </li>
      ))}
    </ul>
  </section>
);
