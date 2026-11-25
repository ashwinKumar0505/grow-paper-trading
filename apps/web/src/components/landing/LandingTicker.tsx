import { navigate } from '../../lib/navigation';
import type { LandingModel } from './useLandingPage';
type Props = Pick<LandingModel, 'tickerList'>;
export function LandingTicker({ tickerList }: Props) {
return (
<section className="relative w-full py-3.5 border-b border-emerald-900/10 dark:border-[#20332A] bg-white dark:bg-[#111C17] overflow-hidden select-none">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-[#111C17] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-[#111C17] to-transparent z-10" />

        <div
          className="flex w-max cursor-pointer animate-marquee"
          style={{
            animation: 'tickerInfinite 120s linear infinite',
            willChange: 'transform',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.animationPlayState = 'running';
          }}
        >
          {[0, 1].map((trackIdx) => (
            <div
              key={trackIdx}
              className="flex items-center gap-8 shrink-0 pr-8"
              aria-hidden={trackIdx === 1 ? 'true' : undefined}
            >
              {tickerList.map((s, i) => {
                const isUp = s.change >= 0;
                return (
                  <div
                    key={`t${trackIdx}-${s.symbol}-${i}`}
                    onClick={() => navigate(`/screener/analysis?symbol=${s.symbol}`)}
                    className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity shrink-0"
                    title={`Click to analyse ${s.symbol}`}
                  >
                    <span className="font-extrabold text-[#15241D] dark:text-white">{s.symbol}</span>
                    <span className="font-mono tabular-nums text-[#5B7066] dark:text-[#9AB0A5]">
                      ₹{s.price.toFixed(2)}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-[11px] font-bold ${
                        isUp ? 'text-[#00B386] dark:text-[#00D09C]' : 'text-[#E0452B] dark:text-[#F0614A]'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {s.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-gray-300 dark:text-[#20332A] ml-4">·</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
);
}
