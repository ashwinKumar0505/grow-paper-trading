import { LockedFeatureCard } from '../../../components/LockedFeatureCard';
import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'planConfig' | 'marketDepth'>;

export function StockDepth({ planConfig, marketDepth }: Props) {
 return <>
          {/* 5. Market Depth (Order Book) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Market Depth
              </h3>
              <span className="text-xs text-gray-400">NSE Top 5 Bids & Asks</span>
            </div>

            {!planConfig.allowMarketDepth ? (
              <LockedFeatureCard
                requiredTier="advanced"
                featureName="5-Level NSE Market Depth (Bids & Asks)"
                description="Upgrade to the Advanced Package (₹699/mo) to view live 5-level Bid/Ask order book depth, buy vs. sell pressure bars, and click-to-fill limit prices."
                compact
              />
            ) : (
              <>
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
              </>
            )}
          </div>


 </>;
}
