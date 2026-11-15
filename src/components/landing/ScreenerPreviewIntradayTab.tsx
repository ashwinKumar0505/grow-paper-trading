import React from 'react';
import { navigate } from '../../lib/navigation';

export const DEMO_INTRADAY_PICKS = [
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

export const ScreenerPreviewIntradayTab: React.FC = () => {
  return (
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
            <div className="mt-3.5 pt-3 border-t border-[#1D3A2D] grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-2 text-xs items-center">
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
              <div className="text-left sm:text-right">
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
  );
};
