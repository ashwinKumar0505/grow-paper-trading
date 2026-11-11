import React, { useState } from 'react';
import { Briefcase, Search, Wallet, ArrowUpRight } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatINR } from '../utils/orderEngine';
import { summarizePortfolio } from '../utils/portfolio';

const signed = (n: number) => `${n < 0 ? '−' : '+'}${formatINR(Math.abs(n))}`;
const tone = (n: number) => n < 0 ? 'text-[#d84949] dark:text-red-400' : 'text-[#008f75] dark:text-emerald-400';

export const HoldingsView: React.FC = () => {
  const { holdings, intradayPositions, stocks, orders, balance, selectStockBySymbol, openOrderModal,
    setIsWalletModalOpen, setCurrentTab, isSimulating, isLiveConnected, lastLiveUpdate } = useTrading();
  const [activeTab, setActiveTab] = useState<'delivery' | 'intraday'>(() => holdings.length === 0 && intradayPositions.length > 0 ? 'intraday' : 'delivery');
  const [search, setSearch] = useState('');
  const summary = summarizePortfolio(balance, holdings, intradayPositions, orders, stocks);
  const hasQuote = (symbol: string, exchange: string) => stocks.some(s => s.symbol === symbol && s.exchange === exchange && Number.isFinite(s.price) && s.price > 0);
  const missingHoldings = holdings.some(h => !hasQuote(h.symbol, h.exchange));
  const missingPositions = intradayPositions.some(p => !hasQuote(p.symbol, p.exchange));
  const missingQuotes = missingHoldings || missingPositions;
  const isDelivery = activeTab === 'delivery';
  const rows = isDelivery ? holdings.map(h => ({ key: h.symbol, symbol: h.symbol, name: h.stockName, exchange: h.exchange,
    quantity: h.quantity, average: h.totalInvested / h.quantity, cost: h.totalInvested, side: 'BUY' as const }))
    : intradayPositions.map(p => ({ key: p.id, symbol: p.symbol, name: p.stockName, exchange: p.exchange,
      quantity: p.quantity, average: p.entryPrice, cost: p.marginBlocked, side: p.action }));
  const filtered = rows.filter(r => `${r.symbol} ${r.name}`.toLowerCase().includes(search.toLowerCase()));
  const tabPnl = isDelivery ? summary.holdingsValue - summary.invested : summary.positionPnl;
  const status = isSimulating ? 'Simulation' : isLiveConnected ? 'Connected quotes' : 'Offline · last available quotes';
  const metric = (label: string, value: number | null, pnl = false) => <div className="min-w-0">
    <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className={`mt-2 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight ${pnl && value !== null ? tone(value) : ''}`}>{value === null ? '—' : pnl ? signed(value) : formatINR(value)}</dd>
  </div>;

  return <div className="space-y-6 pb-12 text-gray-800 dark:text-gray-100 animate-fade-in">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Your investments</h1><p className="mt-1 text-sm text-gray-500">Paper portfolio · Practice with virtual money</p></div>
      <div className="text-right text-xs text-gray-500"><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${isLiveConnected && !isSimulating ? 'bg-emerald-500' : 'bg-amber-500'}`} />{status}</span>
        {!!lastLiveUpdate && <p className="mt-1">Updated {new Date(lastLiveUpdate).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST</p>}</div>
    </div>
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D24]">
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 sm:p-7">
        {metric(missingQuotes ? 'Account value · estimated' : 'Account value', summary.equity)}{metric('Open P&L', missingQuotes ? null : summary.unrealized, true)}{metric('Net P&L after charges', missingQuotes ? null : summary.netPnl, true)}
      </dl>
      <div className="border-t border-gray-100 dark:border-gray-700 px-5 sm:px-7 py-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <span className="text-gray-500">Available cash <strong className="ml-2 font-medium text-gray-800 dark:text-gray-100">{formatINR(balance)}</strong></span>
        <span className="text-gray-500">Position margin <strong className="ml-2 font-medium text-gray-800 dark:text-gray-100">{formatINR(summary.margin)}</strong></span>
        <span className="text-gray-500">Reserved for orders <strong className="ml-2 font-medium text-gray-800 dark:text-gray-100">{formatINR(summary.reserved)}</strong></span>
        <button onClick={() => setIsWalletModalOpen(true)} className="sm:ml-auto inline-flex gap-2 items-center text-[#008f75] dark:text-emerald-400 font-semibold"><Wallet size={16} /> Add funds</button>
      </div>
    </section>
    <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-7" role="tablist" aria-label="Portfolio product">
        {(['delivery', 'intraday'] as const).map(tab => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`py-4 border-b-2 text-base font-semibold ${activeTab === tab ? 'border-[#00b386] text-[#008f75] dark:text-emerald-400' : 'border-transparent text-gray-500'}`}>
          {tab === 'delivery' ? `Holdings (${holdings.length})` : `Positions (${intradayPositions.length})`}
        </button>)}
      </div>
      <label className="flex items-center gap-2 mb-2 text-gray-500"><Search size={16} /><input aria-label="Search your investments" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search investments" className="w-44 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2 py-2" /></label>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5 px-1">
      {metric(isDelivery ? 'Invested value' : 'Margin used', isDelivery ? summary.invested : summary.margin)}
      {metric(isDelivery ? 'Current value' : 'Margin + open P&L', (isDelivery ? missingHoldings : missingPositions) ? null : isDelivery ? summary.holdingsValue : summary.margin + summary.positionPnl)}
      {metric(isDelivery ? 'Total returns · before charges' : 'Unrealized P&L · before charges', (isDelivery ? missingHoldings : missingPositions) ? null : tabPnl, true)}
    </dl>
    {missingQuotes && <p role="status" className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Waiting for a quote for one or more investments. Quotes retry automatically; P&L will appear when prices are available.</p>}
    {filtered.length === 0 ? <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D24] py-16 text-center">
      <Briefcase className="mx-auto text-gray-400 mb-4" size={32} /><h2 className="font-semibold text-lg">{search ? 'No matching investments' : isDelivery ? 'No holdings yet' : 'No open positions'}</h2>
      <p className="mt-2 text-sm text-gray-500">{search ? 'Try a different stock name or symbol.' : 'Your executed paper trades will appear here.'}</p>
      {!search && <button onClick={() => setCurrentTab('explore')} className="mt-5 rounded-lg bg-[#008f75] px-5 py-2.5 text-white font-medium">Explore stocks</button>}
    </div> : <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D24] overflow-hidden">
      <div className="hidden lg:block overflow-x-auto"><table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-gray-50 dark:bg-[#16181F] text-gray-500 text-right"><tr>
          {['Stock', 'Quantity', 'Average price', 'Current price (LTP)', isDelivery ? 'Invested / Current value' : 'Margin used', 'Returns', ''].map((h, i) => <th key={i} className={`px-5 py-4 font-medium ${i === 0 ? 'text-left' : ''}`}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{filtered.map(row => {
          const stock = stocks.find(s => s.symbol === row.symbol && s.exchange === row.exchange);
          const price = stock?.price;
          const pnl = price === undefined ? undefined : (price - row.average) * row.quantity * (row.side === 'BUY' ? 1 : -1);
          return <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-[#20242F]">
            <td className="px-5 py-6"><button onClick={() => selectStockBySymbol(row.symbol)} className="font-semibold hover:text-[#008f75] text-left">{row.symbol}</button><div className="mt-1 text-xs text-gray-500">{row.exchange} · {isDelivery ? 'Delivery' : `${row.side === 'BUY' ? 'Long' : 'Short'} · Intraday`}</div><div className="text-xs text-gray-500 mt-1 max-w-52 truncate">{row.name}</div></td>
            <td className="px-5 py-6 text-right tabular-nums">{row.quantity.toLocaleString('en-IN')}</td>
            <td className="px-5 py-6 text-right tabular-nums font-semibold">{formatINR(row.average)}</td>
            <td className="px-5 py-6 text-right tabular-nums font-semibold">{price === undefined ? 'Unavailable' : formatINR(price)}</td>
            <td className="px-5 py-6 text-right tabular-nums">{formatINR(row.cost)}{isDelivery && <div className="text-xs text-gray-500 mt-1">{price === undefined ? '—' : formatINR(price * row.quantity)}</div>}</td>
            <td className={`px-5 py-6 text-right tabular-nums font-semibold ${pnl === undefined ? '' : tone(pnl)}`}>{pnl === undefined ? '—' : signed(pnl)}<div className="text-xs mt-1 font-normal">{pnl === undefined ? 'Quote unavailable' : `${(pnl / (row.average * row.quantity) * 100).toFixed(2)}%${isDelivery ? '' : ' on trade value'}`}</div></td>
            <td className="px-5 py-6"><div className="flex justify-end gap-2">{stock && <><button onClick={() => openOrderModal(stock, row.side, isDelivery ? 'DELIVERY' : 'INTRADAY')} className="rounded-lg border border-emerald-200 dark:border-emerald-800 px-3 py-2 font-semibold text-[#008f75] dark:text-emerald-400">Add</button><button onClick={() => openOrderModal(stock, row.side === 'BUY' ? 'SELL' : 'BUY', isDelivery ? 'DELIVERY' : 'INTRADAY', row.quantity)} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 font-semibold">Exit</button></>}</div></td>
          </tr>;
        })}</tbody>
      </table></div>
      <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">{filtered.map(row => {
        const stock = stocks.find(s => s.symbol === row.symbol && s.exchange === row.exchange);
        const pnl = stock ? (stock.price - row.average) * row.quantity * (row.side === 'BUY' ? 1 : -1) : undefined;
        return <article key={row.key} className="p-5 space-y-4"><div className="flex justify-between gap-3"><button onClick={() => selectStockBySymbol(row.symbol)} className="font-semibold flex items-center gap-2">{row.symbol}<ArrowUpRight size={14} /></button><span className="text-xs text-gray-500">{row.exchange} · {isDelivery ? 'Delivery' : row.side === 'BUY' ? 'Long · Intraday' : 'Short · Intraday'}</span></div>
          <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-gray-500">Average price</dt><dd className="mt-1 font-semibold tabular-nums">{formatINR(row.average)}</dd></div><div><dt className="text-gray-500">Current price (LTP)</dt><dd className="mt-1 font-semibold tabular-nums">{stock ? formatINR(stock.price) : 'Unavailable'}</dd></div><div><dt className="text-gray-500">Quantity</dt><dd className="mt-1">{row.quantity}</dd></div><div><dt className="text-gray-500">Returns</dt><dd className={`mt-1 font-semibold tabular-nums ${pnl === undefined ? '' : tone(pnl)}`}>{pnl === undefined ? '—' : signed(pnl)}</dd></div></dl>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-gray-500">{isDelivery ? 'Invested' : 'Margin'}: {formatINR(row.cost)}</span>{stock && <div className="flex gap-3"><button onClick={() => openOrderModal(stock, row.side, isDelivery ? 'DELIVERY' : 'INTRADAY')} className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[#008f75] dark:text-emerald-400 font-semibold">Add</button><button onClick={() => openOrderModal(stock, row.side === 'BUY' ? 'SELL' : 'BUY', isDelivery ? 'DELIVERY' : 'INTRADAY', row.quantity)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">Exit</button></div>}</div>
        </article>;
      })}</div>
    </div>}
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500"><span>Realized P&L before charges: <strong className={tone(summary.realized)}>{signed(summary.realized)}</strong></span><span>Total charges: <strong className="text-gray-700 dark:text-gray-300">{formatINR(summary.fees)}</strong></span></div>
    <p className="text-xs leading-5 text-gray-500">Average prices exclude charges. Open returns are before charges; net P&L includes all executed trade charges. Missing quotes use cost for account estimates. Paper fills use the available quote without slippage; intraday uses a fixed 5× margin model. Charges are estimates.</p>
  </div>;
};
