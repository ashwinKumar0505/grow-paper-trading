import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import type { Stock } from '../../../types/market';
import type { StockExplorerModel } from '../hooks/useStockExplorer';
type Props = Pick<StockExplorerModel, 'topGainers' | 'topLosers' | 'handleStockClick'>;

function MoverCard({ stocks, gainers, handleStockClick }: { stocks: Stock[]; gainers: boolean; handleStockClick: (stock: Stock) => void }) {
  return (
<Card className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#282C37]">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${gainers ? "bg-emerald-50 dark:bg-[#132A22] text-[#00D09C]" : "bg-rose-50 dark:bg-rose-950/40 text-[#EB5B5B]"}`}>
                {gainers ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Top {gainers ? 'Gainers' : 'Losers'} Today
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">NSE Stocks</span>
          </div>

          <div className="space-y-3">
            {stocks.map((stk) => (
              <div
                key={stk.symbol}
                onClick={() => handleStockClick(stk)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#20242F] cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{stk.symbol}</span>
                    <span className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">{stk.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">{stk.sector}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono tabular-nums font-bold text-xs text-gray-900 dark:text-white">
                    ₹{stk.price.toFixed(2)}
                  </div>
                  <div className={`font-mono tabular-nums text-xs font-semibold ${gainers ? "text-[#00D09C]" : "text-[#EB5B5B]"}`}>
                    {gainers ? '+' : ''}{stk.change.toFixed(2)} ({gainers ? '+' : ''}{stk.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
  );
}

export function MarketMovers({ topGainers, topLosers, handleStockClick }: Props) {
  return <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <MoverCard stocks={topGainers} gainers handleStockClick={handleStockClick} />
    <MoverCard stocks={topLosers} gainers={false} handleStockClick={handleStockClick} />
  </section>;
}
