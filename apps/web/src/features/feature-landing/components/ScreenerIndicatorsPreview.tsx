import React from 'react';
import { Activity, ArrowRight, BarChart2, Gauge, Layers } from 'lucide-react';
import { trackFeatureCtaClick } from '../../../lib/analytics';
import { AppLink } from '../../../lib/navigation';
import { sectionHeading, surface, textMuted, textStrong } from '../../pricing/pricingStyles';

const INDICATOR_GROUPS = [
  {
    icon: Activity,
    title: 'Trend & Moving Averages',
    items: ['EMA 20 / 50 / 200 alignment', 'Breakout & 20-EMA support retests', '20-Day & 55-Day range breakouts'],
  },
  {
    icon: Gauge,
    title: 'Momentum & Volatility',
    items: ['RSI pullback recovery', 'MACD bullish crossovers', 'Bollinger volatility squeeze & expansion'],
  },
  {
    icon: BarChart2,
    title: 'Volume & Session VWAP',
    items: ['20-Day VWAP accumulation', '15-min Session VWAP & EMA-9 pullbacks', 'Opening range & relative volume surges'],
  },
  {
    icon: Layers,
    title: 'Classical Chart Patterns',
    items: ['Double Bottom & Ascending Triangle', 'Bullish Engulfing & Morning Star', 'Confirmed vs Watchlist status tagging'],
  },
];

const VERDICT_PILLS = [
  {
    label: 'Bullish technical setup',
    tone: 'border-[#00B386]/35 bg-[#00B386]/10 text-[#008F6B] dark:border-[#00D09C]/35 dark:bg-[#00D09C]/15 dark:text-[#00D09C]',
    note: 'Multiple quantitative checks and trend filters align positively.',
  },
  {
    label: 'Neutral / Wait',
    tone: 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    note: 'Mixed signals or forming structure — wait for clearer confirmation.',
  },
  {
    label: 'Bearish / Caution',
    tone: 'border-[#F0614A]/35 bg-[#F0614A]/10 text-[#C93B24] dark:text-[#FF8A75]',
    note: 'Weak momentum or overhead resistance calls for caution.',
  },
];

export const ScreenerIndicatorsPreview: React.FC = () => (
  <section aria-labelledby="screener-indicators-heading" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1880px] mx-auto space-y-8 text-left">
      <div className="max-w-3xl space-y-2">
        <h2 id="screener-indicators-heading" className={sectionHeading}>
          Technical Indicators &amp; Chart Pattern Analysis
        </h2>
        <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>
          Every scan translates quantitative indicator math into plain-English labels, confidence
          scores (0–100), and transparent risk-reward reference levels — never black-box stock tips.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {INDICATOR_GROUPS.map(({ icon: Icon, title, items }) => (
          <div key={title} className={`rounded-2xl p-5 space-y-3 ${surface}`}>
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#008F6B] dark:text-[#00D09C]">
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{title}</span>
            </div>
            <ul className={`space-y-2 text-xs sm:text-sm ${textMuted}`}>
              {items.map((item) => (
                <li key={item} className="leading-snug">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl p-6 sm:p-7 space-y-4 ${surface}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={`text-base sm:text-lg font-extrabold ${textStrong}`}>
            Clear Technical Outlooks (Educational Context Only)
          </h3>
          <AppLink
            href="/screener"
            onClick={() =>
              trackFeatureCtaClick({
                sourcePage: '/ai-stock-screener',
                ctaId: 'indicators_open_screener',
                destinationPath: '/screener',
                placement: 'section',
              })
            }
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
          >
            <span>Open Live Screener</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </AppLink>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VERDICT_PILLS.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E2EAE6] dark:border-[#20332A] bg-[#F6F9F7] dark:bg-[#16241E] p-4 space-y-2"
            >
              <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${item.tone}`}>
                {item.label}
              </span>
              <p className={`text-xs leading-relaxed ${textMuted}`}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
