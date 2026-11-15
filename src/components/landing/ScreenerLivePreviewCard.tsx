import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { AppLink, navigate } from '../../lib/navigation';
import { ScreenerPreviewSwingTab } from './ScreenerPreviewSwingTab';
import { ScreenerPreviewIntradayTab } from './ScreenerPreviewIntradayTab';

interface ScreenerLivePreviewCardProps {
  onLaunchTradeStock: (symbol: string) => void;
}

export const ScreenerLivePreviewCard: React.FC<ScreenerLivePreviewCardProps> = ({
  onLaunchTradeStock,
}) => {
  const [activeTab, setActiveTab] = useState<'swing' | 'intraday' | 'analysis'>('swing');

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#1D3A2D] bg-[#0C1D16] text-[#E9F2EE] p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Top Bar with Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1D3A2D]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#00D09C] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
              AI Insights · Backtested Strategies · Chart Analysis · Nifty 500
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              Interactive Screener & Stock Analysis Preview
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-[#12281F] p-1 border border-[#1D3A2D]">
            {[
              { id: 'swing' as const, label: 'Swing Picks' },
              { id: 'intraday' as const, label: 'Intraday 15m' },
              { id: 'analysis' as const, label: 'AI Stock Check' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00D09C] text-[#04261C] shadow-xs'
                    : 'text-[#9AB0A5] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Swing Picks Preview */}
        {activeTab === 'swing' && (
          <ScreenerPreviewSwingTab onLaunchTradeStock={onLaunchTradeStock} />
        )}

        {/* Tab 2: Intraday 15m Preview */}
        {activeTab === 'intraday' && <ScreenerPreviewIntradayTab />}

        {/* Tab 3: AI Stock Check Preview */}
        {activeTab === 'analysis' && (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-[#00D09C]/40 bg-[#11241C] p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-[#00D09C] font-bold uppercase">
                    NSE: RELIANCE · AI Technical & Fundamental Health Check
                  </span>
                  <h4 className="text-lg font-extrabold text-white">Reliance Industries Ltd</h4>
                </div>
                <div className="text-left sm:text-right">
                  <div className="rounded-xl bg-[#00D09C]/20 border border-[#00D09C]/40 px-3 py-1 text-xs font-extrabold text-[#00D09C] inline-block">
                    Signal Verdict: BUY (Confidence 84/100)
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#D6E6DE] leading-relaxed">
                AI-assisted technical synthesis shows price trading above its 20-day and 50-day moving averages with strong buying volume, a confirmed breakout above resistance, and historical strategy alignment.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#1D3A2D] text-xs">
                <div>
                  <span className="text-[10px] text-[#7F9C8E] block">Reference Buy Zone</span>
                  <strong className="font-mono text-white">₹1,330 – ₹1,342</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#7F9C8E] block">Target 1</span>
                  <strong className="font-mono text-[#00D09C]">₹1,428 (+6.9%)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#7F9C8E] block">Stop-Loss</span>
                  <strong className="font-mono text-[#F0614A]">₹1,298 (-2.8%)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#7F9C8E] block">Reward : Risk</span>
                  <strong className="font-mono text-[#00D09C]">2.4x</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AB0A5] px-1">
              <span>Includes Interactive Price Chart, Support/Resistance, Financials & 2-Yr Historical Backtest</span>
              <AppLink
                href="/screener/analysis?symbol=RELIANCE"
                className="font-extrabold text-[#00D09C] hover:underline"
              >
                Open Full AI Stock Analysis →
              </AppLink>
            </div>
          </div>
        )}

        {/* Research Disclaimer Note inside Preview */}
        <div className="rounded-xl bg-[#12281F] border border-[#1D3A2D] px-3.5 py-2 text-[11px] text-[#9AB0A5] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
          <span>
            <strong className="text-white">Educational Note:</strong> Signals combine AI-powered technical insights, chart analysis, and historical strategy backtests for educational research. Historical performance does not guarantee future returns.
          </span>
        </div>

        {/* Card Bottom Bar */}
        <div className="pt-2 border-t border-[#1D3A2D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#9AB0A5]">
            <AppLink href="/screener" className="hover:text-[#00D09C] font-semibold">
              Swing Scanner →
            </AppLink>
            <AppLink href="/screener/intraday" className="hover:text-[#00D09C] font-semibold">
              Intraday Scanner →
            </AppLink>
            <AppLink href="/screener/analysis" className="hover:text-[#00D09C] font-semibold">
              Stock Analysis →
            </AppLink>
          </div>
          <AppLink
            href="/screener"
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D09C] text-[#04261C] hover:bg-[#00B386] transition-colors"
          >
            Launch Screener →
          </AppLink>
        </div>
      </div>

      {/* Interactive Quick Stock Analysis Bar */}
      <div className="rounded-3xl border border-[#1D3A2D] bg-gradient-to-r from-[#0C1D16] via-[#122B21] to-[#0C1D16] p-6 sm:p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#00D09C]">
            Try Instant AI Stock Check
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold">
            Click any popular NSE stock to inspect its BUY / WAIT / AVOID signal, chart levels & backtest stats:
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'ITC'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => navigate(`/screener/analysis?symbol=${sym}`)}
              className="px-3.5 py-2 rounded-xl bg-[#163025] hover:bg-[#00D09C] text-[#E9F2EE] hover:text-[#04261C] border border-[#234737] font-mono text-xs font-extrabold transition-all cursor-pointer"
            >
              {sym} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
