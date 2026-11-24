import type { StockDetailsModel } from '../hooks/useStockDetails';
type Props = Pick<StockDetailsModel, 'stock' | 'fundamentals' | 'aboutText'>;

function formatRatio(val: number | null | undefined, suffix = '', prefix = ''): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  return `${prefix}${val}${suffix}`;
}

export function StockFundamentals({ stock, fundamentals, aboutText }: Props) {
  const hasAnyRatio = Boolean(
    fundamentals.marketCap ||
      fundamentals.peRatio !== null ||
      fundamentals.pbRatio !== null ||
      fundamentals.roe !== null ||
      fundamentals.roce != null ||
      fundamentals.roa != null ||
      fundamentals.eps !== null ||
      fundamentals.bookValue !== null ||
      fundamentals.divYield !== null
  );

  const items = [
    { label: 'Market Cap', value: fundamentals.marketCap || '—' },
    { label: 'ROE', value: formatRatio(fundamentals.roe, '%') },
    { label: 'P/E Ratio (TTM)', value: formatRatio(fundamentals.peRatio) },
    { label: 'EPS (TTM)', value: formatRatio(fundamentals.eps, '', '₹') },
    { label: 'P/B Ratio', value: formatRatio(fundamentals.pbRatio) },
    { label: 'Dividend Yield', value: formatRatio(fundamentals.divYield, '%') },
    { label: 'Industry P/E', value: formatRatio(fundamentals.industryPe) },
    { label: 'Book Value', value: formatRatio(fundamentals.bookValue, '', '₹') },
    ...(fundamentals.roce != null ? [{ label: 'ROCE', value: formatRatio(fundamentals.roce, '%') }] : []),
    ...(fundamentals.roa != null ? [{ label: 'ROA', value: formatRatio(fundamentals.roa, '%') }] : []),
    { label: 'Debt to Equity', value: formatRatio(fundamentals.debtToEquity) },
    { label: 'Exchange', value: stock.exchange || 'NSE' },
  ];

  return (
    <>
      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">
            Fundamentals
          </h3>
          {fundamentals.source && fundamentals.source !== 'unavailable' ? (
            <span className="text-[11px] text-gray-400">
              Source: {fundamentals.source}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">
              Unverified ratios omitted
            </span>
          )}
        </div>

        {!hasAnyRatio && (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#14171F] border border-gray-200 dark:border-[#282C37] rounded-xl p-3">
            Live fundamental ratios are not provided by the quote feed for {stock.symbol}. Use Stock Analysis for available financial statements.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-xs">
          {items.map((item) => (
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

      <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-6 shadow-xs space-y-2">
        <h3 className="font-bold text-base text-gray-900 dark:text-white">
          About {stock.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {aboutText}
        </p>
      </div>
    </>
  );
}
