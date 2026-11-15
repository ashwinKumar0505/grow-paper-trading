import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'stock' | 'safeLow' | 'safeHigh' | 'safeOpen' | 'safePrevClose' | 'safeVolume' | 'safeWeek52Low' | 'safeWeek52High' | 'todayPositionPercent' | 'w52PositionPercent' | 'lowerCircuit' | 'upperCircuit'>;

export function StockPerformance({ stock, safeLow, safeHigh, safeOpen, safePrevClose, safeVolume, safeWeek52Low, safeWeek52High, todayPositionPercent, w52PositionPercent, lowerCircuit, upperCircuit }: Props) {
 return <>
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
                    ₹{safeLow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div>Today&apos;s High</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{safeHigh.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    ₹{safeWeek52Low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div>52W High</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white font-mono mt-0.5">
                    ₹{safeWeek52High.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  ₹{safeOpen.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Prev. Close</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  ₹{safePrevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Volume</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-gray-900 dark:text-white mt-0.5">
                  {safeVolume.toLocaleString('en-IN')}
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
                  {stock.sector || 'NSE Equities'}
                </div>
              </div>
            </div>
          </div>


 </>;
}
