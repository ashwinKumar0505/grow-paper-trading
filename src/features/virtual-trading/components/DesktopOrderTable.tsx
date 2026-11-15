import { Order } from '../../../types/market';

import { formatISTDateTime,getOrderDisplayPrices,getStatusMeta } from '../utils/orderHistory';

type Props = { filteredOrders: Order[]; cancelLimitOrder: (id: string) => void; selectStockBySymbol: (symbol: string) => void };
export function DesktopOrderTable({ filteredOrders, cancelLimitOrder, selectStockBySymbol }: Props) {
 return <>
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
 </>;
}
