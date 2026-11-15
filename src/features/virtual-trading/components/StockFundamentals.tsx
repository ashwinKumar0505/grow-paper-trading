import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'stock' | 'fundamentals' | 'aboutText'>;

export function StockFundamentals({ stock, fundamentals, aboutText }: Props) {
 return <>
          {/* 6. Fundamentals (Groww 2-column table layout) */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Fundamentals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-xs">
              {[
                { label: 'Market Cap', value: fundamentals.marketCap ?? '—' },
                { label: 'ROE', value: `${fundamentals.roe ?? 15.0}%` },
                { label: 'P/E Ratio (TTM)', value: String(fundamentals.peRatio ?? 22.0) },
                { label: 'EPS (TTM)', value: `₹${fundamentals.eps ?? 42.0}` },
                { label: 'P/B Ratio', value: String(fundamentals.pbRatio ?? 3.5) },
                { label: 'Dividend Yield', value: `${fundamentals.divYield ?? 1.0}%` },
                { label: 'Industry P/E', value: String(fundamentals.industryPe ?? 24.0) },
                { label: 'Book Value', value: `₹${fundamentals.bookValue ?? 280.0}` },
                { label: 'Debt to Equity', value: String(fundamentals.debtToEquity ?? 0.3) },
                { label: 'Face Value', value: '₹10' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#242834]"
                >
                  <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold font-mono text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. About the Company */}
          <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-2">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              About {stock.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {aboutText}
            </p>
          </div>

 </>;
}
