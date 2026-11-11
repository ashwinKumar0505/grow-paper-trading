import React from 'react';
import { useTrading } from '../context/TradingContext';
import { RefreshCw, Clock } from 'lucide-react';

export const IndicesTicker: React.FC = () => {
  const {
    indices,
    isRefreshingLive,
    refreshLiveMarketData,
    marketStatus,
    isSimulating,
    toggleSimulation,
  } = useTrading();

  return (
    <div className="bg-white dark:bg-[#181B22] border-b border-gray-200 dark:border-[#282C37] transition-colors overflow-hidden w-full max-w-full select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex items-center gap-6 min-w-max text-xs">
          {/* Market Status Indicator */}
          {marketStatus.isOpen ? (
            <div
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium shrink-0"
              title={marketStatus.subText}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D09C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D09C]"></span>
              </span>
              <span className="uppercase tracking-wider text-[11px] font-extrabold text-[#00D09C]">
                NSE / BSE Live · Live Ticks
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium shrink-0"
              title={marketStatus.subText}
            >
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-[#00D09C] animate-pulse' : 'bg-amber-500'}`}></span>
              <span className={`uppercase tracking-wider text-[11px] font-extrabold ${isSimulating ? 'text-[#00D09C]' : 'text-amber-600 dark:text-amber-400'}`}>
                {isSimulating ? 'Simulated Live Ticks' : marketStatus.statusLabel}
              </span>
              <button
                onClick={toggleSimulation}
                className="px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#20242F] text-gray-700 dark:text-gray-300 hover:text-[#00D09C] transition-colors cursor-pointer"
                title="Toggle simulated dynamic price updates after market hours"
              >
                {isSimulating ? 'Freeze to Official Close' : 'Test Live Simulation'}
              </button>
            </div>
          )}

          {/* Indices List */}
          {indices.map((idx) => {
            const isPositive = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="flex items-center gap-2 group cursor-default select-none"
              >
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {idx.symbol}
                </span>
                <span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white">
                  {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] flex items-center font-bold ${
                    isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {idx.change.toFixed(2)} ({isPositive ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Real Live Market Controls */}
        <div className="hidden md:flex items-center gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{marketStatus.istTimeString}</span>
          </div>

          {/* Refresh Real Quotes button */}
          <button
            onClick={() => refreshLiveMarketData()}
            disabled={isRefreshingLive}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#20242F] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-60 cursor-pointer active:scale-95"
            title={marketStatus.isOpen ? 'Fetch latest live quotes from NSE/BSE' : 'Refresh official closing prices'}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshingLive ? 'animate-spin text-[#00D09C]' : ''}`} />
            <span>{isRefreshingLive ? 'Fetching...' : 'Refresh Quotes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
