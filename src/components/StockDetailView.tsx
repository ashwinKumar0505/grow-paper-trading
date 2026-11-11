import React, { useMemo, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { StockChart } from './StockChart';
import { generateMarketDepth } from '../data/mockStocks';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  TrendingUp,
  TrendingDown,
  Building2,
  Layers,
  Shield,
  HelpCircle,
} from 'lucide-react';

export const StockDetailView: React.FC = () => {
  const {
    selectedStock,
    setSelectedStock,
    setCurrentTab,
    marketStatus,
    openOrderModal,
    toggleWatchlistStock,
    isStockInWatchlist,
    holdings,
    intradayPositions,
  } = useTrading();

  const stock = selectedStock;
  const inWatchlist = isStockInWatchlist(stock.symbol);

  // Ensure live price is always refreshed for this stock
  useEffect(() => {
    fetch(`/api/stocks/${stock.symbol}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stock && data.stock.price > 0) {
          setSelectedStock(data.stock);
        }
      })
      .catch(() => {});
  }, [stock.symbol, setSelectedStock]);

  // Dynamic SEO Page Title for active stock
  useEffect(() => {
    const originalTitle = 'My Paper Trade – Live NSE/BSE Stock Paper Trading Simulator';
    document.title = `${stock.symbol} ₹${stock.price.toFixed(2)} (${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%) – My Paper Trade`;
    return () => {
      document.title = originalTitle;
    };
  }, [stock.symbol, stock.price, stock.change, stock.changePercent]);

  // Market Depth
  const marketDepth = useMemo(() => {
    return generateMarketDepth(stock.price);
  }, [stock.price]);

  // Holdings of this stock
  const currentHolding = holdings.find((h) => h.symbol === stock.symbol);
  const currentPositions = intradayPositions.filter((p) => p.symbol === stock.symbol);

  // Today's range percentage position
  const todayRange = stock.high - stock.low || 1;
  const todayPositionPercent = Math.max(0, Math.min(100, ((stock.price - stock.low) / todayRange) * 100));

  // 52W range percentage position
  const w52Range = stock.week52High - stock.week52Low || 1;
  const w52PositionPercent = Math.max(0, Math.min(100, ((stock.price - stock.week52Low) / w52Range) * 100));

  const isPositive = stock.change >= 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('explore')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleWatchlistStock('default', stock.symbol)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              inWatchlist
                ? 'border-[#00D09C] text-[#00D09C] bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-current' : ''}`} />
            <span>{inWatchlist ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
          </button>
        </div>
      </div>

      {/* Stock Header Banner */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#202735] flex items-center justify-center font-extrabold text-base text-gray-800 dark:text-white shrink-0 border border-gray-100 dark:border-gray-700">
            {stock.symbol.slice(0, 3)}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {stock.name}
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#282D3B] text-gray-600 dark:text-gray-300 uppercase">
                {stock.exchange}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stock.symbol}</span>
              <span>·</span>
              <span>{stock.sector}</span>
              <span>·</span>
              <span className={`font-semibold flex items-center gap-1.5 ${marketStatus.isOpen ? 'text-[#00D09C]' : 'text-amber-500'}`} title={marketStatus.subText}>
                <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? 'bg-[#00D09C] animate-pulse' : 'bg-amber-400'}`} />
                <span>{marketStatus.isOpen ? 'NSE Live Session' : 'NSE Closed (Closing LTP)'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Price & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="text-left md:text-right">
            <div className="font-mono tabular-nums text-3xl font-extrabold text-gray-900 dark:text-white">
              ₹{stock.price.toFixed(2)}
            </div>
            <div
              className={`font-mono tabular-nums text-sm font-bold flex items-center md:justify-end gap-1 ${
                isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
              }`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%) Today
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openOrderModal(stock, 'BUY')}
              className="px-6 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white font-extrabold text-sm rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              BUY
            </button>
            <button
              onClick={() => openOrderModal(stock, 'SELL')}
              className="px-6 py-2.5 bg-[#EB5B5B] hover:bg-[#d94f4f] text-white font-extrabold text-sm rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              SELL
            </button>
          </div>
        </div>
      </div>

      {/* User's existing holdings / positions for this stock (if any) */}
      {(currentHolding || currentPositions.length > 0) && (
        <div className="p-4 bg-emerald-50/70 dark:bg-[#132721] rounded-2xl border border-[#00D09C]/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Your Position in {stock.symbol}:
            </span>
            {currentHolding && (
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Holdings: <strong className="text-gray-900 dark:text-white">{currentHolding.quantity} shares</strong> (Avg: ₹{currentHolding.averagePrice})
              </span>
            )}
            {currentPositions.length > 0 && (
              <span className="text-xs text-[#00D09C] font-semibold">
                Intraday Active ({currentPositions.reduce((s, p) => s + p.quantity, 0)} shares)
              </span>
            )}
          </div>

          <button
            onClick={() => setCurrentTab('holdings')}
            className="text-xs font-bold text-[#00D09C] hover:underline"
          >
            Manage in Holdings &rarr;
          </button>
        </div>
      )}

      {/* 2. Interactive Chart (Line + Candlestick + Volumes) */}
      <StockChart stock={stock} />

      {/* 3. Performance & Market Depth 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groww Performance Range Bars */}
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-6">
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
            Performance
          </h3>

          {/* Today's Low / High */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Today's Low: <strong className="text-gray-900 dark:text-white font-mono">₹{stock.low.toFixed(2)}</strong></span>
              <span>Today's High: <strong className="text-gray-900 dark:text-white font-mono">₹{stock.high.toFixed(2)}</strong></span>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-[#00D09C] rounded-full"
                style={{ width: `${todayPositionPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>LTP: ₹{stock.price.toFixed(2)}</span>
              <span>Range: ₹{(stock.high - stock.low).toFixed(2)}</span>
            </div>
          </div>

          {/* 52-Week Low / High */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>52W Low: <strong className="text-gray-900 dark:text-white font-mono">₹{stock.week52Low.toFixed(2)}</strong></span>
              <span>52W High: <strong className="text-gray-900 dark:text-white font-mono">₹{stock.week52High.toFixed(2)}</strong></span>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-500 rounded-full"
                style={{ width: `${w52PositionPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>All-time high: ₹{stock.week52High.toFixed(2)}</span>
              <span>52W Spread: ₹{(stock.week52High - stock.week52Low).toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-[#282C37] text-xs">
            <div>
              <div className="text-gray-400">Open Price</div>
              <div className="font-mono tabular-nums font-bold text-gray-900 dark:text-white mt-0.5">
                ₹{stock.open.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Prev. Close</div>
              <div className="font-mono tabular-nums font-bold text-gray-900 dark:text-white mt-0.5">
                ₹{stock.previousClose.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Volume</div>
              <div className="font-mono tabular-nums font-bold text-gray-900 dark:text-white mt-0.5">
                {(stock.volume / 100000).toFixed(2)}L
              </div>
            </div>
            <div>
              <div className="text-gray-400">Lot Size</div>
              <div className="font-mono tabular-nums font-bold text-gray-900 dark:text-white mt-0.5">
                1 Share
              </div>
            </div>
          </div>
        </div>

        {/* Market Depth (Order Book) */}
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              Market Depth (Order Book)
            </h3>
            <span className="text-[11px] text-gray-400">Real-time Top 5</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Buy Orders (Bid) */}
            <div>
              <div className="flex justify-between text-gray-400 font-semibold mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                <span>Bid (Buy)</span>
                <span>Orders</span>
                <span>Qty</span>
              </div>
              <div className="space-y-2">
                {marketDepth.bids.map((b, i) => (
                  <div key={i} className="relative flex justify-between font-mono tabular-nums text-xs">
                    <span className="font-bold text-[#00D09C]">₹{b.price.toFixed(2)}</span>
                    <span className="text-gray-400">{b.orders}</span>
                    <span className="text-gray-700 dark:text-gray-300">{b.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-[#282C37] flex justify-between font-bold text-xs text-[#00D09C]">
                <span>Total Buy</span>
                <span>{marketDepth.totalBuyQty.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Sell Orders (Ask) */}
            <div>
              <div className="flex justify-between text-gray-400 font-semibold mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                <span>Ask (Sell)</span>
                <span>Orders</span>
                <span>Qty</span>
              </div>
              <div className="space-y-2">
                {marketDepth.asks.map((a, i) => (
                  <div key={i} className="relative flex justify-between font-mono tabular-nums text-xs">
                    <span className="font-bold text-[#EB5B5B]">₹{a.price.toFixed(2)}</span>
                    <span className="text-gray-400">{a.orders}</span>
                    <span className="text-gray-700 dark:text-gray-300">{a.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-[#282C37] flex justify-between font-bold text-xs text-[#EB5B5B]">
                <span>Total Sell</span>
                <span>{marketDepth.totalSellQty.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Fundamentals Grid */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
          Fundamentals
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Market Cap</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.marketCap}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">P/E Ratio</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.peRatio}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">P/B Ratio</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.pbRatio}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Industry P/E</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.industryPe}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Debt to Equity</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.debtToEquity}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">ROE (Return on Equity)</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.roe}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">EPS (Earnings per Share)</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              ₹{stock.fundamentals.eps}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Dividend Yield</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              {stock.fundamentals.divYield}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Book Value</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              ₹{stock.fundamentals.bookValue}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F]">
            <div className="text-gray-400">Face Value</div>
            <div className="font-bold text-gray-900 dark:text-white mt-1 text-sm font-mono">
              ₹10.00
            </div>
          </div>
        </div>
      </div>

      {/* 5. About the Company */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-2">
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
          About {stock.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {stock.about}
        </p>
      </div>
    </div>
  );
};
