import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { AppLink, navigate } from '../../lib/navigation';

const DEMO_SWING_PICKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    confidence: 84,
    status: 'Confirmed Setup',
    buyAt: '₹1,336',
    target: '₹1,428',
    gainPct: '+6.9%',
    stopLoss: '₹1,298',
    rr: '2.4x',
    reason: 'Backtested 20-day resistance breakout + AI volume confirmation',
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    confidence: 79,
    status: 'Confirmed Setup',
    buyAt: '₹1,284',
    target: '₹1,365',
    gainPct: '+6.3%',
    stopLoss: '₹1,248',
    rr: '2.2x',
    reason: 'Backtested EMA 20/50/200 golden alignment + chart bounce',
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    confidence: 74,
    status: 'Watchlist Setup',
    buyAt: '₹3,980',
    target: '₹4,210',
    gainPct: '+5.8%',
    stopLoss: '₹3,875',
    rr: '2.1x',
    reason: 'Double bottom chart pattern with rising RSI momentum',
  },
];

const DEMO_INTRADAY_PICKS = [
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    confidence: 82,
    entry: '₹784.50',
    target: '₹802.00',
    stopLoss: '₹776.00',
    status: 'Open · Running',
    reason: '15-min opening range breakout above VWAP with 2.3x volume',
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    confidence: 78,
    entry: '₹832.00',
    target: '₹848.50',
    stopLoss: '₹824.50',
    status: 'Target Reached (+1.98%)',
    reason: 'Strong banking momentum + 15-min bullish flag breakout',
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    confidence: 75,
    entry: '₹1,745.00',
    target: '₹1,774.00',
    stopLoss: '₹1,731.00',
    status: 'Open · Running',
    reason: 'Price reclaimed day’s average traded price (VWAP) with buyers stepping in',
  },
];

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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AB0A5]">
              <span>Hold for a few days to 2 weeks · Sorted by Technical & Strategy Confidence Score</span>
              <span className="font-mono text-[#00D09C] font-bold">500 NSE Stocks Scanned</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {DEMO_SWING_PICKS.map((pick) => (
                <div
                  key={pick.symbol}
                  className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] hover:border-[#00D09C]/50 p-4 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#00D09C]/15 text-[#00D09C] font-extrabold text-xs grid place-items-center">
                          {pick.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{pick.symbol}</span>
                            <span className="rounded-full bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D09C]">
                              {pick.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8FA99C] mt-0.5">{pick.name}</div>
                        </div>
                      </div>

                      <span className="rounded-lg bg-[#0C1D16] border border-[#1D3A2D] px-2.5 py-1 text-xs font-mono font-bold text-[#00D09C]">
                        Score {pick.confidence}/100
                      </span>
                    </div>
                    <p className="text-xs text-[#9AB0A5] mt-2.5 leading-relaxed">{pick.reason}</p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#1D3A2D] space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[#7F9C8E] block text-[10px]">Rec. Entry</span>
                        <strong className="font-mono text-white">{pick.buyAt}</strong>
                      </div>
                      <div>
                        <span className="text-[#7F9C8E] block text-[10px]">Target</span>
                        <strong className="font-mono text-[#00D09C]">
                          {pick.target} ({pick.gainPct})
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#7F9C8E] block text-[10px]">Stop-Loss</span>
                        <strong className="font-mono text-[#F0614A]">{pick.stopLoss}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/screener/analysis?symbol=${pick.symbol}`)}
                        className="px-3 py-1.5 rounded-lg bg-[#163025] hover:bg-[#1D3D30] text-[11px] font-bold text-[#00D09C] cursor-pointer"
                      >
                        AI Analysis
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchTradeStock(pick.symbol)}
                        className="px-3 py-1.5 rounded-lg bg-[#00D09C] hover:bg-[#00B386] text-[11px] font-extrabold text-[#04261C] cursor-pointer"
                      >
                        Practice Trade
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Intraday 15m Preview */}
        {activeTab === 'intraday' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9AB0A5]">
              <span>15-minute chart breakouts · Auto-refreshes every 5 mins during market hours</span>
              <span className="font-mono text-[#00D09C] font-bold">3:20 PM Same-Day Exit</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {DEMO_INTRADAY_PICKS.map((pick) => (
                <div
                  key={pick.symbol}
                  className="rounded-2xl border border-[#1D3A2D] bg-[#11241C] hover:border-[#00D09C]/50 p-4 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{pick.symbol}</span>
                          <span className="rounded-full bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D09C]">
                            {pick.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#8FA99C] mt-1.5 leading-relaxed">{pick.reason}</p>
                      </div>
                      <span className="rounded-lg bg-[#0C1D16] border border-[#1D3A2D] px-2.5 py-1 text-xs font-mono font-bold text-[#00D09C]">
                        Score {pick.confidence}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-[#1D3A2D] grid grid-cols-4 gap-2 text-xs items-center">
                    <div>
                      <span className="text-[#7F9C8E] block text-[10px]">Entry</span>
                      <strong className="font-mono text-white">{pick.entry}</strong>
                    </div>
                    <div>
                      <span className="text-[#7F9C8E] block text-[10px]">Target</span>
                      <strong className="font-mono text-[#00D09C]">{pick.target}</strong>
                    </div>
                    <div>
                      <span className="text-[#7F9C8E] block text-[10px]">Stop-Loss</span>
                      <strong className="font-mono text-[#F0614A]">{pick.stopLoss}</strong>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/screener/intraday')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#00D09C] text-[#04261C] text-[11px] font-extrabold cursor-pointer"
                      >
                        Live →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
