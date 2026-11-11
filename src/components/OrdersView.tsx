import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { OrderStatus } from '../types/market';
import { Clock, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { orders, cancelLimitOrder, selectStockBySymbol, setCurrentTab } = useTrading();
  const [filter, setFilter] = useState<'ALL' | 'EXECUTED' | 'PENDING'>('ALL');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Order Book & Trade History
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audit log of all your simulated paper orders and open limit triggers
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#20242F] rounded-xl self-start sm:self-auto text-xs font-bold">
          {(['ALL', 'EXECUTED', 'PENDING'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === tab
                  ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'ALL' ? `All (${orders.length})` : tab === 'EXECUTED' ? 'Executed' : 'Pending Limit'}
            </button>
          ))}
        </div>
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
              {filter === 'PENDING'
                ? 'You have no open limit orders waiting for market trigger.'
                : 'No executed paper trades yet. Start practicing with zero risk!'}
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('explore')}
            className="px-5 py-2.5 bg-[#00D09C] hover:bg-[#00c090] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
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
              const orderDate = new Date(order.timestamp);
              const formattedTime = orderDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

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
                      <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 dark:bg-[#282D3B] text-gray-400 font-semibold uppercase">
                        {order.product === 'DELIVERY' ? 'Delivery' : 'Intraday 5x'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        order.status === 'EXECUTED'
                          ? 'bg-emerald-50 text-[#00D09C] dark:bg-emerald-950/60'
                          : order.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      }`}
                    >
                      {order.status === 'EXECUTED' && <CheckCircle2 className="w-3 h-3" />}
                      {order.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {order.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                      <span>{order.status}</span>
                    </span>
                  </div>

                  {/* Stock name & Timestamp */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate max-w-[200px]">{order.stockName}</span>
                    <span className="font-mono text-[11px] shrink-0">{formattedTime}</span>
                  </div>

                  {/* Order Metrics Strip */}
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-[#14161D] rounded-xl text-xs font-mono tabular-nums border border-gray-100 dark:border-[#242834]">
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Quantity & Type</div>
                      <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                        {order.quantity} Shares ({order.orderType})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-sans">Exec / Trigger Price</div>
                      <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                        ₹{order.price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Total Value & Cancel Limit Order Action */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-gray-400">Total Value: </span>
                      <strong className="font-mono font-bold text-gray-900 dark:text-white">
                        ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {order.status === 'PENDING' && (
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
                    <th className="py-3 px-4">Time & Order ID</th>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Type & Product</th>
                    <th className="py-3 px-4 text-right">Qty & Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#242834]">
                  {filteredOrders.map((order) => {
                    const isBuy = order.action === 'BUY';
                    const orderDate = new Date(order.timestamp);
                    const formattedTime = orderDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-[#20242F] transition-colors"
                      >
                        {/* Time & ID */}
                        <td className="py-4 px-4">
                          <div className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                            {formattedTime}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {order.id}
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
                              {order.product === 'DELIVERY' ? 'Delivery' : 'Intraday'}
                            </span>
                          </div>
                          {order.note && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {order.note}
                            </div>
                          )}
                        </td>

                        {/* Qty & Price */}
                        <td className="py-4 px-4 text-right font-mono tabular-nums">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {order.quantity} Shares
                          </div>
                          <div className="text-xs text-gray-400">
                            {order.orderType === 'LIMIT' ? 'Limit ' : ''}₹{order.price.toFixed(2)}
                          </div>
                        </td>

                        {/* Total Value */}
                        <td className="py-4 px-4 text-right font-mono tabular-nums font-bold text-gray-900 dark:text-white">
                          ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              order.status === 'EXECUTED'
                                ? 'bg-emerald-50 text-[#00D09C] dark:bg-emerald-950/60'
                                : order.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                            }`}
                          >
                            {order.status === 'EXECUTED' && <CheckCircle2 className="w-3 h-3" />}
                            {order.status === 'PENDING' && <Clock className="w-3 h-3" />}
                            {order.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                            <span>{order.status}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 text-right">
                          {order.status === 'PENDING' && (
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
