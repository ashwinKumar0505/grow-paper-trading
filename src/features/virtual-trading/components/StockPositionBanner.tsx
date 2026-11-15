import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'setCurrentTab' | 'holdings' | 'exitPosition' | 'stock' | 'currentHolding' | 'currentPositions'>;

export function StockPositionBanner({ setCurrentTab, holdings, exitPosition, stock, currentHolding, currentPositions }: Props) {
 return <>
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


 </>;
}
