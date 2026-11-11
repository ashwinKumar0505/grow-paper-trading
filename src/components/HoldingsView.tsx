import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Layers,
  ArrowUpRight,
  Plus,
  Minus,
  AlertCircle,
  Zap,
  Wallet,
} from 'lucide-react';

export const HoldingsView: React.FC = () => {
  const {
    holdings,
    intradayPositions,
    stocks,
    portfolioSummary,
    selectStockBySymbol,
    openOrderModal,
    exitPosition,
    squareOffPosition,
    setIsWalletModalOpen,
    setCurrentTab,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<'delivery' | 'intraday'>('delivery');

  const {
    currentValue,
    totalInvested,
    totalPnL,
    totalPnLPercent,
    dayPnL,
    dayPnLPercent,
    availableCash,
    lockedMargin,
  } = portfolioSummary;

  const isTotalPositive = totalPnL >= 0;
  const isDayPositive = dayPnL >= 0;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Portfolio KPI Summary Card (Consistent with Groww Holdings) */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-4 sm:p-6 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-[#282C37]">
          {/* Total Portfolio Value & Returns */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Total Current Value</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />
              <span className="text-[11px] text-[#00D09C] normal-case font-bold">Live P&L</span>
            </div>
            <div className="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mt-1">
              ₹{(currentValue + lockedMargin).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Overall & 1-Day Returns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-sm">
            {/* Total Returns */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Returns</div>
              <div
                className={`font-mono tabular-nums text-base sm:text-lg font-extrabold flex items-center gap-1 mt-0.5 ${
                  isTotalPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                }`}
              >
                {isTotalPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isTotalPositive ? '+' : ''}₹{Math.abs(totalPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className={`font-mono tabular-nums text-xs font-bold ${
                  isTotalPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                }`}
              >
                ({isTotalPositive ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
              </div>
            </div>

            {/* 1D Returns */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">1D Returns</div>
              <div
                className={`font-mono tabular-nums text-base sm:text-lg font-extrabold flex items-center gap-1 mt-0.5 ${
                  isDayPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                }`}
              >
                <span>
                  {isDayPositive ? '+' : ''}₹{Math.abs(dayPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className={`font-mono tabular-nums text-xs font-bold ${
                  isDayPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                }`}
              >
                ({isDayPositive ? '+' : ''}{dayPnLPercent.toFixed(2)}%)
              </div>
            </div>

            {/* Invested Amount */}
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Invested</div>
              <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400">
                In {holdings.length} stocks
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip: Available Paper Cash */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-gray-600 dark:text-gray-400">
            <span>
              Available Paper Cash: <strong className="text-gray-900 dark:text-white font-mono font-bold">₹{availableCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            {lockedMargin > 0 && (
              <span>
                Blocked Margin: <strong className="text-amber-500 font-mono">₹{lockedMargin.toLocaleString('en-IN')}</strong>
              </span>
            )}
          </div>

          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#00D09C] hover:underline cursor-pointer self-start sm:self-auto"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Set / Add Paper Cash</span>
          </button>
        </div>
      </div>

      {/* 2. Holdings vs Intraday Positions Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#282C37]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('delivery')}
            className={`pb-3 text-sm font-extrabold transition-all relative ${
              activeTab === 'delivery'
                ? 'text-[#00D09C]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>Holdings ({holdings.length})</span>
            {activeTab === 'delivery' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('intraday')}
            className={`pb-3 text-sm font-extrabold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'intraday'
                ? 'text-[#00D09C]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>Positions ({intradayPositions.length})</span>
            {intradayPositions.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-[#00D09C] dark:bg-emerald-950">
                5x Active
              </span>
            )}
            {activeTab === 'intraday' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Delivery Holdings View */}
      {activeTab === 'delivery' && (
        <>
          {holdings.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center text-gray-400">
                <Briefcase className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  No holdings yet
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  You haven't bought any stocks for delivery yet. Explore the market and place your first simulated trade!
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('explore')}
                className="px-6 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Explore Stocks
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Card View (< md) - Touch-friendly, zero column clipping */}
              <div className="block md:hidden space-y-3">
                {holdings.map((holding) => {
                  const stock = stocks.find((s) => s.symbol === holding.symbol);
                  const ltp = stock ? stock.price : holding.averagePrice;
                  const curVal = ltp * holding.quantity;
                  const pnl = curVal - holding.totalInvested;
                  const pnlPercent = holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;
                  const isPositive = pnl >= 0;

                  return (
                    <div
                      key={holding.symbol}
                      className="p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs space-y-3"
                    >
                      {/* Top Header: Symbol, Name, Qty & Current Value */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => selectStockBySymbol(holding.symbol)}
                          className="cursor-pointer min-w-0 flex-1"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-base text-gray-900 dark:text-white hover:text-[#00D09C] transition-colors">
                              {holding.symbol}
                            </span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-500 uppercase font-bold">
                              {holding.exchange}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                              · {holding.quantity} {holding.quantity === 1 ? 'Share' : 'Shares'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">
                            {holding.stockName}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums font-extrabold text-base text-gray-900 dark:text-white">
                            ₹{curVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">Cur. Value</div>
                        </div>
                      </div>

                      {/* Middle Stats Bar: Avg Buy vs Live LTP vs Total P&L */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-gray-50 dark:bg-[#14161D] rounded-xl text-xs font-mono tabular-nums border border-gray-100 dark:border-[#242834]">
                        <div>
                          <div className="text-[10px] text-gray-400 font-sans">Avg. Price</div>
                          <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                            ₹{holding.averagePrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-400 font-sans">Live LTP</div>
                          <div
                            className={`font-bold mt-0.5 ${
                              stock?.tickDirection === 'up'
                                ? 'text-[#00D09C]'
                                : stock?.tickDirection === 'down'
                                ? 'text-[#EB5B5B]'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            ₹{ltp.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400 font-sans">Total P&L</div>
                          <div className={`font-extrabold mt-0.5 ${isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'}`}>
                            {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-bold ${isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'}`}>
                            ({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer: Invested Value & Action Buttons */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="text-gray-500 dark:text-gray-400">
                          Invested: <strong className="font-mono font-bold text-gray-800 dark:text-gray-200">₹{holding.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          {stock && (
                            <>
                              <button
                                onClick={() => openOrderModal(stock, 'BUY')}
                                className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                + Add
                              </button>
                              <button
                                onClick={() => openOrderModal(stock, 'SELL')}
                                className="px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                Exit
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#282C37] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-[#16181F]">
                        <th className="py-3 px-4">Instrument</th>
                        <th className="py-3 px-4 text-right">Qty & Avg. Price</th>
                        <th className="py-3 px-4 text-right">LTP (Live)</th>
                        <th className="py-3 px-4 text-right">Cur. Value / Invested</th>
                        <th className="py-3 px-4 text-right">Total P&L</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
                      {holdings.map((holding) => {
                        const stock = stocks.find((s) => s.symbol === holding.symbol);
                        const ltp = stock ? stock.price : holding.averagePrice;
                        const curVal = ltp * holding.quantity;
                        const pnl = curVal - holding.totalInvested;
                        const pnlPercent = holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;
                        const isPositive = pnl >= 0;

                        return (
                          <tr
                            key={holding.symbol}
                            className="hover:bg-gray-50/70 dark:hover:bg-[#20242F] transition-colors"
                          >
                            {/* Instrument */}
                            <td className="py-4 px-4">
                              <div
                                onClick={() => selectStockBySymbol(holding.symbol)}
                                className="cursor-pointer group"
                              >
                                <div className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-[#00D09C] transition-colors flex items-center gap-1.5">
                                  <span>{holding.symbol}</span>
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 uppercase font-semibold">
                                    {holding.exchange}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                  {holding.stockName}
                                </div>
                              </div>
                            </td>

                            {/* Qty & Avg Price */}
                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div className="font-bold text-gray-900 dark:text-white">
                                {holding.quantity} Shares
                              </div>
                              <div className="text-xs text-gray-400">
                                Avg ₹{holding.averagePrice.toFixed(2)}
                              </div>
                            </td>

                            {/* Live LTP */}
                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div
                                className={`font-extrabold text-sm ${
                                  stock?.tickDirection === 'up'
                                    ? 'tick-up text-[#00D09C]'
                                    : stock?.tickDirection === 'down'
                                    ? 'tick-down text-[#EB5B5B]'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                ₹{ltp.toFixed(2)}
                              </div>
                              <div
                                className={`text-[11px] font-semibold ${
                                  (stock?.change || 0) >= 0 ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                                }`}
                              >
                                {(stock?.change || 0) >= 0 ? '+' : ''}{(stock?.change || 0).toFixed(2)} Today
                              </div>
                            </td>

                            {/* Current Value / Invested */}
                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div className="font-bold text-gray-900 dark:text-white">
                                ₹{curVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-400">
                                Inv ₹{holding.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </td>

                            {/* Total P&L */}
                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div
                                className={`font-extrabold text-sm ${
                                  isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                                }`}
                              >
                                {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                              </div>
                              <div
                                className={`text-xs font-semibold ${
                                  isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                                }`}
                              >
                                ({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
                              </div>
                            </td>

                            {/* Actions: Add more or Exit/Sell */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {stock && (
                                  <>
                                    <button
                                      onClick={() => openOrderModal(stock, 'BUY')}
                                      className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                      title="Buy more shares"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => openOrderModal(stock, 'SELL')}
                                      className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                      title="Sell / Exit shares"
                                    >
                                      Exit
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. Intraday (MIS) Positions View */}
      {activeTab === 'intraday' && (
        <>
          {intradayPositions.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-[#132A22] flex items-center justify-center text-[#00D09C]">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  No active intraday positions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Trade intraday with 5x leverage. Choose "Intraday (MIS)" in the buy/sell order modal to test high-leverage day trading!
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('explore')}
                className="px-6 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Find Intraday Opportunities
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Positions Card View (< md) */}
              <div className="block md:hidden space-y-3">
                {intradayPositions.map((pos) => {
                  const stock = stocks.find((s) => s.symbol === pos.symbol);
                  const ltp = stock ? stock.price : pos.entryPrice;
                  const pnl = pos.action === 'BUY'
                    ? (ltp - pos.entryPrice) * pos.quantity
                    : (pos.entryPrice - ltp) * pos.quantity;
                  const isPositive = pnl >= 0;

                  return (
                    <div
                      key={pos.id}
                      className="p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => selectStockBySymbol(pos.symbol)}
                          className="cursor-pointer min-w-0 flex-1"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-base text-gray-900 dark:text-white hover:text-[#00D09C] transition-colors">
                              {pos.symbol}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                                pos.action === 'BUY'
                                  ? 'bg-emerald-100 text-[#00D09C] dark:bg-emerald-950'
                                  : 'bg-rose-100 text-[#EB5B5B] dark:bg-rose-950'
                              }`}
                            >
                              {pos.action} 5x
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                              · {pos.quantity} Shares
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">
                            {pos.stockName}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-mono tabular-nums font-extrabold text-base ${isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'}`}>
                            {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">Unrealized P&L</div>
                        </div>
                      </div>

                      {/* Stats Strip */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-gray-50 dark:bg-[#14161D] rounded-xl text-xs font-mono tabular-nums border border-gray-100 dark:border-[#242834]">
                        <div>
                          <div className="text-[10px] text-gray-400 font-sans">Entry Price</div>
                          <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                            ₹{pos.entryPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-400 font-sans">Live LTP</div>
                          <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                            ₹{ltp.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400 font-sans">Margin Blocked</div>
                          <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                            ₹{pos.marginBlocked.toFixed(0)}
                          </div>
                        </div>
                      </div>

                      {/* Groww-Style Actions: Buy, Sell, and Exit */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#282C37]">
                        <button
                          onClick={() => stock && openOrderModal(stock, 'BUY', 'INTRADAY', pos.action === 'SELL' ? pos.quantity : 1)}
                          className="flex-1 py-2 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                          title={pos.action === 'SELL' ? 'Buy to exit/cover short position' : 'Buy more intraday shares'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{pos.action === 'SELL' ? 'Buy to Exit' : 'Buy More'}</span>
                        </button>

                        <button
                          onClick={() => stock && openOrderModal(stock, 'SELL', 'INTRADAY', pos.action === 'BUY' ? pos.quantity : 1)}
                          className="flex-1 py-2 text-xs font-bold text-white bg-[#EB5B5B] hover:bg-[#d94f4f] rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                          title={pos.action === 'BUY' ? 'Sell to exit/reduce long position' : 'Sell more short shares'}
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>{pos.action === 'BUY' ? 'Sell to Exit' : 'Sell More'}</span>
                        </button>

                        <button
                          onClick={() => exitPosition(pos.id)}
                          className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-[#282D3B] dark:hover:bg-[#323848] rounded-xl transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
                          title="Instant 1-Click Exit at Market Price"
                        >
                          Exit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#282C37] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-[#16181F]">
                        <th className="py-3 px-4">Instrument</th>
                        <th className="py-3 px-4">Side / Leverage</th>
                        <th className="py-3 px-4 text-right">Qty & Entry Price</th>
                        <th className="py-3 px-4 text-right">LTP (Live)</th>
                        <th className="py-3 px-4 text-right">Blocked Margin</th>
                        <th className="py-3 px-4 text-right">Unrealized P&L</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
                      {intradayPositions.map((pos) => {
                        const stock = stocks.find((s) => s.symbol === pos.symbol);
                        const ltp = stock ? stock.price : pos.entryPrice;
                        const pnl = pos.action === 'BUY'
                          ? (ltp - pos.entryPrice) * pos.quantity
                          : (pos.entryPrice - ltp) * pos.quantity;
                        const isPositive = pnl >= 0;

                        return (
                          <tr
                            key={pos.id}
                            className="hover:bg-gray-50/70 dark:hover:bg-[#20242F] transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div
                                onClick={() => selectStockBySymbol(pos.symbol)}
                                className="cursor-pointer group"
                              >
                                <div className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-[#00D09C] transition-colors flex items-center gap-1.5">
                                  <span>{pos.symbol}</span>
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 uppercase font-semibold">
                                    {pos.exchange}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                  {pos.stockName}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                  pos.action === 'BUY'
                                    ? 'bg-emerald-100 text-[#00D09C] dark:bg-emerald-950'
                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950'
                                }`}
                              >
                                {pos.action} (5x)
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div className="font-bold text-gray-900 dark:text-white">
                                {pos.quantity} Shares
                              </div>
                              <div className="text-xs text-gray-400">
                                Entry ₹{pos.entryPrice.toFixed(2)}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div className={`font-extrabold text-sm ${
                                stock?.tickDirection === 'up'
                                  ? 'text-[#00D09C] tick-up'
                                  : stock?.tickDirection === 'down'
                                  ? 'text-[#EB5B5B] tick-down'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                ₹{ltp.toFixed(2)}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-right font-mono tabular-nums text-xs font-semibold text-gray-700 dark:text-gray-300">
                              ₹{pos.marginBlocked.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-4 px-4 text-right font-mono tabular-nums">
                              <div
                                className={`font-extrabold text-sm ${
                                  isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                                }`}
                              >
                                {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => stock && openOrderModal(stock, 'BUY', 'INTRADAY', pos.action === 'SELL' ? pos.quantity : 1)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#00D09C] hover:bg-[#00c090] rounded-lg transition-colors shadow-xs cursor-pointer active:scale-95"
                                  title={pos.action === 'SELL' ? `Buy ${pos.quantity} to close short position` : 'Buy more intraday shares'}
                                >
                                  {pos.action === 'SELL' ? 'Buy to Exit' : 'Buy'}
                                </button>

                                <button
                                  onClick={() => stock && openOrderModal(stock, 'SELL', 'INTRADAY', pos.action === 'BUY' ? pos.quantity : 1)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#EB5B5B] hover:bg-[#d94f4f] rounded-lg transition-colors shadow-xs cursor-pointer active:scale-95"
                                  title={pos.action === 'BUY' ? `Sell ${pos.quantity} to close long position` : 'Sell more short shares'}
                                >
                                  {pos.action === 'BUY' ? 'Sell to Exit' : 'Sell'}
                                </button>

                                <button
                                  onClick={() => exitPosition(pos.id)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#282D3B] dark:hover:bg-[#323848] rounded-lg transition-colors cursor-pointer active:scale-95"
                                  title="Instant 1-Click Exit at Market Price"
                                >
                                  Exit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
