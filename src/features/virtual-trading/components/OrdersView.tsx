import {
CalendarClock,
Clock
} from 'lucide-react';
import React,{ useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { SCHEDULED_ORDER_DISCLAIMER } from '../../../utils/orderEngine';
import { DesktopOrderTable } from './DesktopOrderTable';
import { MobileOrderList } from './MobileOrderList';

import { FILTER_TABS,type OrderFilter } from '../utils/orderHistory';
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
          <MobileOrderList filteredOrders={filteredOrders} cancelLimitOrder={cancelLimitOrder} selectStockBySymbol={selectStockBySymbol} />
          <DesktopOrderTable filteredOrders={filteredOrders} cancelLimitOrder={cancelLimitOrder} selectStockBySymbol={selectStockBySymbol} />

        </div>
      )}
    </div>
  );
};
