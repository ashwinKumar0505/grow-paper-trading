import React from 'react';
import { navigate } from '../../lib/navigation';

export const DEMO_SWING_PICKS = [
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

interface ScreenerPreviewSwingTabProps {
  onLaunchTradeStock: (symbol: string) => void;
}

export const ScreenerPreviewSwingTab: React.FC<ScreenerPreviewSwingTabProps> = ({
  onLaunchTradeStock,
}) => {
  return (
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
  );
};
