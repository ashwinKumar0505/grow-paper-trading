import { LockedFeatureCard } from '../../../components/LockedFeatureCard';
import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'planConfig' | 'marketDepth' | 'marketStatus'>;

export function StockDepth({ planConfig, marketDepth, marketStatus }: Props) {
  const isDepthAvailable = Boolean(
    marketDepth.available && (marketDepth.bids.length > 0 || marketDepth.asks.length > 0)
  );
  const isFeedConnectedEmpty = !isDepthAvailable && marketDepth.source === 'upstox';

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold text-base text-gray-900 dark:text-white">
          Market Depth
        </h3>
        <span className="text-xs text-gray-400">
          {isDepthAvailable
            ? marketStatus.isOpen
              ? 'Top 5 Bids & Asks · Live NSE'
              : 'Top 5 Bids & Asks · Last Session'
            : isFeedConnectedEmpty
              ? 'Order Book Empty'
              : 'Level-2 Order Book Unavailable'}
        </span>
      </div>

      {!planConfig.allowMarketDepth ? (
        <LockedFeatureCard
          requiredTier="advanced"
          featureName="5-Level Market Depth (When Supported by Data Feed)"
          description="Upgrade to the Advanced Package (₹699/mo) to inspect 5-level Bid/Ask order book depth when an authorized Level-2 broker or exchange feed is connected."
          compact
        />
      ) : !isDepthAvailable ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#282C37] bg-gray-50/70 dark:bg-[#14171F] p-5 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
          <div className="font-semibold text-gray-900 dark:text-white">
            {isFeedConnectedEmpty
              ? 'No Active Resting Orders'
              : 'Authentic Exchange Market Depth Unavailable'}
          </div>
          <p className="leading-relaxed text-gray-500 dark:text-gray-400">
            {marketDepth.reason ||
              'Live 5-level NSE/BSE order book depth requires an authorized Level-2 exchange or broker market-data feed. Synthetic order-book ladders are disabled to prevent misleading liquidity information.'}
          </p>
        </div>
      ) : (
        <>
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
            <div>
              <div className="flex justify-between text-gray-400 font-medium mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                <span>Bid Price</span>
                <span>Orders</span>
                <span>Qty</span>
              </div>
              <div className="space-y-2">
                {marketDepth.bids.map((b, i) => (
                  <div key={i} className="flex justify-between font-mono tabular-nums text-xs">
                    <span className="font-semibold text-[#00B386]">
                      {b.price > 0 ? `₹${b.price.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-gray-400">{b.orders > 0 ? b.orders : '—'}</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {b.quantity > 0 ? b.quantity.toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-[#282C37] flex justify-between font-semibold text-xs">
                <span className="text-gray-500">Total Buy Qty</span>
                <span className="font-mono text-[#00B386]">{marketDepth.totalBuyQty.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-400 font-medium mb-2 pb-1 border-b border-gray-100 dark:border-[#282C37]">
                <span>Ask Price</span>
                <span>Orders</span>
                <span>Qty</span>
              </div>
              <div className="space-y-2">
                {marketDepth.asks.map((a, i) => (
                  <div key={i} className="flex justify-between font-mono tabular-nums text-xs">
                    <span className="font-semibold text-[#EB5B3C]">
                      {a.price > 0 ? `₹${a.price.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-gray-400">{a.orders > 0 ? a.orders : '—'}</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {a.quantity > 0 ? a.quantity.toLocaleString('en-IN') : '—'}
                    </span>
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
  );
}
