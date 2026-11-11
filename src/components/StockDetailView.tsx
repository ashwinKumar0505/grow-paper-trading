import React, { useMemo, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { StockChart } from './StockChart';
import { OrderPanel } from './OrderPanel';
import { generateMarketDepth } from '../data/mockStocks';
import {
  ArrowLeft,
  Bookmark,
  Bell,
  Link2,
  Calendar,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';

// Brand colors for stock badge icons (Groww style)
const BRAND_COLORS: Record<string, string> = {
  'M&M': '#E31837',
  RELIANCE: '#0A5C36',
  TCS: '#1D4ED8',
  HDFCBANK: '#004C8F',
  INFY: '#007CC3',
  ICICIBANK: '#B02A30',
  TATAMOTORS: '#1E3A8A',
  SBIN: '#0284C7',
  ZOMATO: '#E23744',
  ITC: '#0369A1',
  BHARTIARTL: '#DC2626',
  ADANIENT: '#4F46E5',
  WIPRO: '#6D28D9',
  BAJFINANCE: '#005A9C',
  LT: '#0F766E',
};

export const StockDetailView: React.FC = () => {
  const {
    selectedStock,
    setSelectedStock,
    setCurrentTab,
    openOrderModal,
    toggleWatchlistStock,
    isStockInWatchlist,
    holdings,
    intradayPositions,
    exitPosition,
    addToast,
  } = useTrading();

  const stock = selectedStock;
  const inWatchlist = isStockInWatchlist(stock.symbol);
  const brandBg = BRAND_COLORS[stock.symbol] || '#E31837';

  // Ensure live price is refreshed for this stock
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
    document.title = `${stock.name} (${stock.symbol}) ₹${stock.price.toFixed(2)} – Groww Paper Trading`;
    return () => {
      document.title = originalTitle;
    };
  }, [stock.symbol, stock.name, stock.price]);

  const marketDepth = useMemo(() => generateMarketDepth(stock.price), [stock.price]);

  const currentHolding = holdings.find((h) => h.symbol === stock.symbol);
  const currentPositions = intradayPositions.filter((p) => p.symbol === stock.symbol);

  const todayRange = stock.high - stock.low || 1;
  const todayPositionPercent = Math.max(0, Math.min(100, ((stock.price - stock.low) / todayRange) * 100));

  const w52Range = stock.week52High - stock.week52Low || 1;
  const w52PositionPercent = Math.max(0, Math.min(100, ((stock.price - stock.week52Low) / w52Range) * 100));

  const lowerCircuit = (stock.previousClose * 0.8).toFixed(2);
  const upperCircuit = (stock.previousClose * 1.2).toFixed(2);

  return (
    <div className="animate-fade-in pb-24">
      {/* Breadcrumb bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('explore')}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Stocks</span>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">{stock.name}</span>
        </button>
      </div>

      {/* Groww 2-Column Desktop Layout: Left (Header + Chart + Details) | Right (Sticky Order Pad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* 1. Unified Stock Header + Chart Section (Matches Groww reference layout) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-5 sm:p-6 shadow-xs">
            {/* Top row: Brand Logo on left, Circular Action Icons on right */}
            <div className="flex items-start justify-between gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-xs select-none"
                style={{ backgroundColor: brandBg }}
              >
                {stock.symbol.slice(0, 3)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    addToast('Link Copied', `${stock.name} quote link copied to clipboard`, 'info');
                  }}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732] transition-colors cursor-pointer"
                  title="Copy stock link"
                >
                  <Link2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addToast(
                      'Price Alert Set',
                      `We'll notify you on significant price movement in ${stock.symbol}`,
                      'info'
                    )
                  }
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732] transition-colors cursor-pointer"
                  title="Set price alert"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleWatchlistStock('default', stock.symbol)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                    inWatchlist
                      ? 'border-[#00B386] text-[#00B386] bg-[#00B386]/10'
                      : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#232732]'
                  }`}
                  title={inWatchlist ? 'Remove from Watchlist' : 'Save to Watchlist'}
                >
                  <Bookmark className={`w-4 h-4 ${inWatchlist ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Symbol · Exchange pill & Stock Name */}
            <div className="mt-3 mb-2">
              <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                <span>{stock.symbol}</span>
                <span>·</span>
                <span>{stock.exchange}</span>
                <ChevronsUpDown className="w-3 h-3" />
              </div>
              <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 dark:text-white tracking-tight mt-0.5">
                {stock.name}
              </h1>
            </div>

            {/* Interactive Groww Chart (Includes Price Readout, X-Axis Times/Dates, Timeframe Pills & Terminal Mode) */}
            <StockChart stock={stock} />
          </div>

          {/* 2. Active User Position / Holding Banner (if user holds or trades this stock) */}
          {(currentHolding || currentPositions.length > 0) && (
            <div className="p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#00B386]/40 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00B386]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Your Position in {stock.symbol}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentTab('holdings')}
                  className="text-xs font-semibold text-[#00B386] hover:underline cursor-pointer"
                >
                  View in Portfolio &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {currentHolding && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F] flex items-center justify-between">
                    <div>
                      <div className="text-gray-400">Delivery Holdings (CNC)</div>
                      <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                        {currentHolding.quantity} shares · Avg ₹{currentHolding.averagePrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      {(() => {
                        const pnl = (stock.price - currentHolding.averagePrice) * currentHolding.quantity;
                        const up = pnl >= 0;
                        return (
                          <div className={`font-bold ${up ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                            {up ? '+' : ''}₹{pnl.toFixed(2)}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {currentPositions.map((pos) => {
                  const pnl =
                    pos.action === 'BUY'
                      ? (stock.price - pos.entryPrice) * pos.quantity
                      : (pos.entryPrice - stock.price) * pos.quantity;
                  const up = pnl >= 0;
                  return (
                    <div
                      key={pos.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-[#20242F] flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-gray-400">
                          Intraday {pos.action} (5x MIS)
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                          {pos.quantity} shares · Entry ₹{pos.entryPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`font-mono tabular-nums font-bold ${up ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                          {up ? '+' : ''}₹{pnl.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => exitPosition(pos.id)}
                          className="px-2.5 py-1 rounded-md bg-gray-200/80 dark:bg-[#2A2E39] hover:bg-[#EB5B3C] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Exit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Groww "Create Stock SIP" Card (Matches the card below the chart in the screenshot) */}
          <div
            onClick={() => openOrderModal(stock, 'BUY', 'DELIVERY', 1)}
            className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] px-5 py-4 shadow-xs flex items-center justify-between gap-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#232732] flex items-center justify-center text-gray-600 dark:text-gray-300">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  Create Stock SIP
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Automate your investments in this Stock
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          {/* 4. Performance (Today's Low/High, 52W Low/High & Key Session Metrics) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-6">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Performance
            </h3>

            {/* Today's Low / High */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <div>Today&apos;s Low</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{stock.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div>Today&apos;s High</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{stock.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#00B386] rounded-full"
                  style={{ width: `${todayPositionPercent}%` }}
                />
                <div
                  className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-[#1A1D24] -translate-x-1/2"
                  style={{ left: `${todayPositionPercent}%` }}
                />
              </div>
            </div>

            {/* 52W Low / High */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <div>52W Low</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{stock.week52Low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div>52W High</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{stock.week52High.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#00B386] rounded-full"
                  style={{ width: `${w52PositionPercent}%` }}
                />
                <div
                  className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-[#1A1D24] -translate-x-1/2"
                  style={{ left: `${w52PositionPercent}%` }}
                />
              </div>
            </div>

            {/* 6-metric Groww Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 pt-4 border-t border-gray-100 dark:border-[#282C37] text-xs">
              <div>
                <div className="text-gray-400">Open</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  ₹{stock.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Prev. Close</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  ₹{stock.previousClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Volume</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  {stock.volume.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Lower Circuit</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  ₹{lowerCircuit}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Upper Circuit</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  ₹{upperCircuit}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Sector</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  {stock.sector}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Market Depth (Order Book) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Market Depth
              </h3>
              <span className="text-xs text-gray-400">NSE Top 5 Bids & Asks</span>
            </div>

            {/* Buy vs Sell pressure bar */}
            {(() => {
              const tot = marketDepth.totalBuyQty + marketDepth.totalSellQty || 1;
              const buyPct = Math.round((marketDepth.totalBuyQty / tot) * 100);
              const sellPct = 100 - buyPct;
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#00B386]">Buy {buyPct}%</span>
                    <span className="text-[#EB5B3C]">{sellPct}% Sell</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-[#EB5B3C]/20">
                    <div className="bg-[#00B386]" style={{ width: `${buyPct}%` }} />
                    <div className="bg-[#EB5B3C]" style={{ width: `${sellPct}%` }} />
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pt-2">
              {/* Bid Side */}
              <div>
                <div className="flex justify-between text-gray-400 font-medium mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                  <span>Bid Price</span>
                  <span>Orders</span>
                  <span>Qty</span>
                </div>
                <div className="space-y-2">
                  {marketDepth.bids.map((b, i) => (
                    <div key={i} className="flex justify-between font-mono tabular-nums text-xs">
                      <span className="font-semibold text-[#00B386]">₹{b.price.toFixed(2)}</span>
                      <span className="text-gray-400">{b.orders}</span>
                      <span className="text-gray-800 dark:text-gray-200">{b.quantity.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-[#282C37] flex justify-between font-semibold text-xs">
                  <span className="text-gray-500">Total Buy Qty</span>
                  <span className="font-mono text-[#00B386]">{marketDepth.totalBuyQty.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Ask Side */}
              <div>
                <div className="flex justify-between text-gray-400 font-medium mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                  <span>Ask Price</span>
                  <span>Orders</span>
                  <span>Qty</span>
                </div>
                <div className="space-y-2">
                  {marketDepth.asks.map((a, i) => (
                    <div key={i} className="flex justify-between font-mono tabular-nums text-xs">
                      <span className="font-semibold text-[#EB5B3C]">₹{a.price.toFixed(2)}</span>
                      <span className="text-gray-400">{a.orders}</span>
                      <span className="text-gray-800 dark:text-gray-200">{a.quantity.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-[#282C37] flex justify-between font-semibold text-xs">
                  <span className="text-gray-500">Total Sell Qty</span>
                  <span className="font-mono text-[#EB5B3C]">{marketDepth.totalSellQty.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Fundamentals (Groww 2-column table layout) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Fundamentals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-xs">
              {[
                { label: 'Market Cap', value: stock.fundamentals.marketCap },
                { label: 'ROE', value: `${stock.fundamentals.roe}%` },
                { label: 'P/E Ratio (TTM)', value: String(stock.fundamentals.peRatio) },
                { label: 'EPS (TTM)', value: `₹${stock.fundamentals.eps}` },
                { label: 'P/B Ratio', value: String(stock.fundamentals.pbRatio) },
                { label: 'Dividend Yield', value: `${stock.fundamentals.divYield}%` },
                { label: 'Industry P/E', value: String(stock.fundamentals.industryPe) },
                { label: 'Book Value', value: `₹${stock.fundamentals.bookValue}` },
                { label: 'Debt to Equity', value: String(stock.fundamentals.debtToEquity) },
                { label: 'Face Value', value: '₹10' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#242834]"
                >
                  <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold font-mono text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. About the Company */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-2">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              About {stock.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {stock.about}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Groww Order Pad (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <OrderPanel stock={stock} />
        </div>
      </div>

      {/* Mobile Sticky Bottom Buy / Sell Action Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1A1D24] border-t border-gray-200 dark:border-[#282C37] p-3 flex items-center gap-3 shadow-lg">
        <button
          onClick={() => openOrderModal(stock, 'SELL')}
          className="flex-1 h-11 bg-[#EB5B3C] hover:opacity-95 text-white font-semibold text-sm rounded-lg cursor-pointer"
        >
          SELL
        </button>
        <button
          onClick={() => openOrderModal(stock, 'BUY')}
          className="flex-1 h-11 bg-[#00B386] hover:opacity-95 text-white font-semibold text-sm rounded-lg cursor-pointer"
        >
          BUY
        </button>
      </div>
    </div>
  );
};
