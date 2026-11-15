import { Order } from '../../../types/market';

import { formatISTDateTime,getOrderDisplayPrices,getStatusMeta } from '../utils/orderHistory';

type Props = { filteredOrders: Order[]; cancelLimitOrder: (id: string) => void; selectStockBySymbol: (symbol: string) => void };
export function MobileOrderList({ filteredOrders, cancelLimitOrder, selectStockBySymbol }: Props) {
 return <>
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


 </>;
}
