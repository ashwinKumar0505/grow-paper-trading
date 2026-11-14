import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Order, OrderStatus } from '../types/market';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
  TimerOff,
} from 'lucide-react';
import { SCHEDULED_ORDER_DISCLAIMER } from '../utils/orderEngine';

type OrderFilter =
  | 'ALL'
  | 'SCHEDULED'
  | 'PENDING'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

const FILTER_TABS: Array<{ id: OrderFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'PENDING', label: 'Open/Pending' },
  { id: 'EXECUTED', label: 'Executed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'EXPIRED', label: 'Expired' },
];

function formatISTDateTime(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  const date = new Date(ts);
  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart}, ${timePart.toUpperCase()}`;
}

function getStatusMeta(status: OrderStatus): {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        badgeClass:
          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50',
        icon: <CalendarClock className="w-3 h-3" />,
      };
    case 'PENDING':
      return {
        label: 'Open/Pending',
        badgeClass:
          'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50',
        icon: <Clock className="w-3 h-3" />,
      };
    case 'EXECUTED':
      return {
        label: 'Executed',
        badgeClass:
          'bg-emerald-50 text-[#00D09C] dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass:
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700',
        icon: <XCircle className="w-3 h-3" />,
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        badgeClass:
          'bg-rose-50 text-[#EB5B5B] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/50',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        badgeClass:
          'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/50',
        icon: <TimerOff className="w-3 h-3" />,
      };
  }
}

function getOrderDisplayPrices(order: Order) {
  const placedPrice = order.limitPrice ?? order.triggerPrice ?? order.price;
  const actualExecutionPrice =
    order.status === 'EXECUTED'
      ? order.executionPrice ?? order.avgPrice ?? order.price
      : undefined;
  return { placedPrice, actualExecutionPrice };
}

export const OrdersView: React.FC = () => {
  const { orders, cancelLimitOrder, selectStockBySymbol, setCurrentTab } = useTrading();
  const [filter, setFilter] = useState<OrderFilter>('ALL');

  const countByStatus = (status: OrderFilter) => {
    if (status === 'ALL') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const hasScheduledOrders = orders.some((o) => o.status === 'SCHEDULED');

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Order Book & Trade History
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Track scheduled after-market orders (AMO), open limit triggers, executed fills, and order history
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#20242F] rounded-xl overflow-x-auto no-scrollbar text-xs font-bold">
          {FILTER_TABS.map((tab) => {
            const count = countByStatus(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {hasScheduledOrders && (
          <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 px-4 py-2.5 text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>{SCHEDULED_ORDER_DISCLAIMER}</span>
          </div>
        )}
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-[#282D3B] flex items-center justify-center text-gray-400">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              No orders found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {filter === 'SCHEDULED'
                ? 'You have no scheduled orders queued for the next market session.'
                : filter === 'PENDING'
                  ? 'You have no open/pending orders waiting for market trigger.'
                  : 'No matching virtual orders in this category yet.'}
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('explore')}
            className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Explore Market & Trade
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Orders Card View (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.map((order) => {
              const isBuy = order.action === 'BUY';
              const placedTime = formatISTDateTime(order.placedAt ?? order.timestamp);
              const executedTime = order.executedAt ? formatISTDateTime(order.executedAt) : null;
              const statusMeta = getStatusMeta(order.status);
              const { placedPrice, actualExecutionPrice } = getOrderDisplayPrices(order);
              const canCancel = order.status === 'PENDING' || order.status === 'SCHEDULED';

              return (
                <div
                  key={order.id}
                  className="p-4 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] shadow-xs space-y-3"
                >
                  {/* Top Bar: Action, Symbol & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-extrabold text-xs px-2 py-0.5 rounded-md ${
                          isBuy
                            ? 'bg-emerald-100 text-[#00D09C] dark:bg-emerald-950'
                            : 'bg-rose-100 text-[#EB5B5B] dark:bg-rose-950'
                        }`}
                      >
                        {order.action}
                      </span>
                      <span
                        onClick={() => selectStockBySymbol(order.symbol)}
                        className="font-extrabold text-sm text-gray-900 dark:text-white cursor-pointer hover:text-[#00D09C] transition-colors"
                      >
                        {order.symbol}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 font-semibold uppercase">
                        {order.product === 'DELIVERY' ? 'Delivery' : order.product === 'MTF' ? 'MTF 5x' : 'Intraday 5x'} · {order.orderType}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.icon}
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 font-mono">
                    <div>Placed: {placedTime}</div>
                    {executedTime && <div className="text-[#00D09C]">Executed: {executedTime}</div>}
                    {order.status === 'SCHEDULED' && order.scheduledForSession && (
                      <div className="text-indigo-500 dark:text-indigo-300">
                        Next Session: {order.scheduledForSession} (09:15 AM IST)
                      </div>
                    )}
                  </div>

                  {/* Order Metrics Strip */}
                  <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-gray-50 dark:bg-[#14161D] rounded-xl text-xs font-mono tabular-nums border border-gray-100 dark:border-[#242834]">
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Quantity</div>
                      <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {order.quantity} Shares
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-sans">
                        {actualExecutionPrice !== undefined ? 'Execution Price' : 'Order / Ref Price'}
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                        ₹{(actualExecutionPrice ?? placedPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {(order.rejectionReason || order.note) && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {order.rejectionReason || order.note}
                    </div>
                  )}

                  {/* Total Value & Cancel Order Action */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-gray-400">Total Value: </span>
                      <strong className="font-mono font-bold text-gray-900 dark:text-white">
                        ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {canCancel && (
                      <button
                        onClick={() => cancelLimitOrder(order.id)}
                        className="px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Orders Table View (>= md) */}
          <div className="hidden md:block bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#282C37] text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-[#16181F]">
                    <th className="py-3 px-4">Placement & Execution Time</th>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Type & Product</th>
                    <th className="py-3 px-4 text-right">Qty & Order Price</th>
                    <th className="py-3 px-4 text-right">Execution Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
                  {filteredOrders.map((order) => {
                    const isBuy = order.action === 'BUY';
                    const placedTime = formatISTDateTime(order.placedAt ?? order.timestamp);
                    const executedTime = order.executedAt ? formatISTDateTime(order.executedAt) : null;
                    const statusMeta = getStatusMeta(order.status);
                    const { placedPrice, actualExecutionPrice } = getOrderDisplayPrices(order);
                    const canCancel = order.status === 'PENDING' || order.status === 'SCHEDULED';

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-[#20242F] transition-colors"
                      >
                        {/* Placement & Execution Time */}
                        <td className="py-4 px-4">
                          <div className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                            Placed: {placedTime}
                          </div>
                          {executedTime ? (
                            <div className="font-mono text-[11px] text-[#00D09C] mt-0.5">
                              Executed: {executedTime}
                            </div>
                          ) : order.status === 'SCHEDULED' && order.scheduledForSession ? (
                            <div className="font-mono text-[11px] text-indigo-500 dark:text-indigo-300 mt-0.5">
                              Target Session: {order.scheduledForSession}
                            </div>
                          ) : null}
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ID: {order.id}
                          </div>
                        </td>

                        {/* Instrument */}
                        <td className="py-4 px-4">
                          <div
                            onClick={() => selectStockBySymbol(order.symbol)}
                            className="cursor-pointer group"
                          >
                            <div className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-[#00D09C] transition-colors flex items-center gap-1.5">
                              <span>{order.symbol}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 font-semibold uppercase">
                                {order.exchange}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-[160px]">
                              {order.stockName}
                            </div>
                          </div>
                        </td>

                        {/* Type & Product */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-extrabold text-xs px-2 py-0.5 rounded-md ${
                                isBuy
                                  ? 'bg-emerald-100 text-[#00D09C] dark:bg-emerald-950'
                                  : 'bg-rose-100 text-[#EB5B5B] dark:bg-rose-950'
                              }`}
                            >
                              {order.action}
                            </span>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                              {order.product === 'DELIVERY' ? 'Delivery' : order.product === 'MTF' ? 'MTF 5x' : 'Intraday 5x'} · {order.orderType}
                            </span>
                          </div>
                          {(order.rejectionReason || order.note) && (
                            <div className="text-[10px] text-gray-400 mt-0.5 max-w-xs">
                              {order.rejectionReason || order.note}
                            </div>
                          )}
                        </td>

                        {/* Qty & Order Price */}
                        <td className="py-4 px-4 text-right font-mono tabular-nums">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {order.quantity} Shares
                          </div>
                          <div className="text-xs text-gray-400">
                            {order.orderType === 'MARKET' ? 'Ref ' : `${order.orderType} `}₹
                            {placedPrice.toFixed(2)}
                          </div>
                        </td>

                        {/* Execution Price */}
                        <td className="py-4 px-4 text-right font-mono tabular-nums">
                          {actualExecutionPrice !== undefined ? (
                            <span className="font-bold text-[#00D09C]">
                              ₹{actualExecutionPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Total Value */}
                        <td className="py-4 px-4 text-right font-mono tabular-nums font-bold text-gray-900 dark:text-white">
                          ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.icon}
                            <span>{statusMeta.label}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 text-right">
                          {canCancel && (
                            <button
                              onClick={() => cancelLimitOrder(order.id)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
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
    </div>
  );
};
