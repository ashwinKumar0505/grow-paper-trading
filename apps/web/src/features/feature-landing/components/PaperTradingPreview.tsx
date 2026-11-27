import React from 'react';
import { ArrowRight, BarChart3, Clock, Layers, ShieldCheck, Wallet } from 'lucide-react';
import { trackFeatureCtaClick } from '../../../lib/analytics';
import { AppLink } from '../../../lib/navigation';
import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { formatINR } from '../../../utils/pricing';
import { sectionHeading, textMuted } from '../../pricing/pricingStyles';

const WORKSPACE_VIEWS = [
  {
    icon: BarChart3,
    label: 'Explore & Live Charts',
    detail: 'Track NIFTY 50, SENSEX, BANK NIFTY, and NSE stocks with 1D–ALL charts and key ratios.',
  },
  {
    icon: Layers,
    label: 'Order Ticket & Margins',
    detail: 'Switch between Delivery (CNC), 5x Intraday (MIS), and MTF 5.00x with Market, Limit, SL, SL-M, and AMO.',
  },
  {
    icon: Wallet,
    label: 'Holdings, Positions & Wallet',
    detail: 'Monitor weighted average cost, unrealized & realized P&L, wallet ledger, and resets.',
  },
  {
    icon: Clock,
    label: '3:20 PM IST Intraday RMS',
    detail: 'Simulated intraday positions follow NSE market hours with automatic 3:20 PM IST square-off.',
  },
];

const TIER_LIMITS = [
  {
    tier: SUBSCRIPTION_PLANS.free.name,
    capital: formatINR(SUBSCRIPTION_PLANS.free.defaultStartingCash),
    orders: 'Delivery (CNC) · Market & AMO',
    resets: 'Auto monthly reset',
  },
  {
    tier: SUBSCRIPTION_PLANS.beginner.name,
    capital: formatINR(SUBSCRIPTION_PLANS.beginner.defaultStartingCash),
    orders: 'CNC + 5x MIS + MTF · Market & Limit',
    resets: 'Free top-ups + unlimited resets',
  },
  {
    tier: SUBSCRIPTION_PLANS.advanced.name,
    capital: formatINR(SUBSCRIPTION_PLANS.advanced.defaultStartingCash),
    orders: 'All modes · Market, Limit, SL & SL-M',
    resets: 'Free top-ups + Market Depth*',
  },
];

export const PaperTradingPreview: React.FC = () => (
  <section aria-labelledby="paper-preview-heading" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1880px] mx-auto space-y-8 text-left">
      <div className="max-w-3xl space-y-2">
        <h2 id="paper-preview-heading" className={sectionHeading}>
          Inside the Paper Trading Interface
        </h2>
        <p className={`text-sm sm:text-base leading-relaxed ${textMuted}`}>
          A clean workspace mirroring real NSE equity tabs, order modes, statutory fee calculation,
          and transparent plan-based virtual capital caps.
        </p>
      </div>

      <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-white p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#1D3A2D]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {['Explore', 'Holdings', 'Watchlist', 'Orders'].map((tab, index) => (
              <span
                key={tab}
                className={`rounded-full px-3.5 py-1.5 ${
                  index === 0
                    ? 'bg-[#00D09C] text-[#04261C]'
                    : 'bg-[#12281F] text-[#9AB0A5] border border-[#1D3A2D]'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00D09C]/30 bg-[#00D09C]/10 px-3 py-1 text-[11px] font-bold text-[#00D09C]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>100% Virtual Capital · No Real Money</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKSPACE_VIEWS.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#00D09C]">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </div>
              <p className="text-xs leading-relaxed text-[#B6C9C0]">{detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#1D3A2D] bg-[#091510] p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9AB0A5]">
              Virtual Capital &amp; Order Access by Tier
            </span>
            <AppLink
              href="/trade"
              onClick={() =>
                trackFeatureCtaClick({
                  sourcePage: '/paper-trading-india',
                  ctaId: 'preview_open_desk',
                  destinationPath: '/trade',
                  placement: 'section',
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#00D09C] hover:underline"
            >
              <span>Launch Paper Trading Desk</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </AppLink>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TIER_LIMITS.map((row) => (
              <div
                key={row.tier}
                className="rounded-xl border border-[#1D3A2D] bg-[#102119] p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#9AB0A5]">{row.tier}</span>
                  <span className="font-mono tabular-nums text-sm font-extrabold text-white">
                    {row.capital}
                  </span>
                </div>
                <p className="text-xs text-[#D6E6DE]">{row.orders}</p>
                <p className="text-[11px] text-[#7F9C8E]">{row.resets}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#7F9C8E]">
            *Level-2 Market Depth is displayed on Advanced when provided by the active market data feed during NSE hours.
          </p>
        </div>
      </div>
    </div>
  </section>
);
