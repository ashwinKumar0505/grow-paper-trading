import { AppLink } from '../../lib/navigation';
import { BrandLogo } from '../BrandLogo';
export function LandingFooter() {
return (
<footer className="bg-white dark:bg-[#0E1713] border-t border-emerald-900/10 dark:border-[#20332A] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#5B7066] dark:text-[#9AB0A5] text-left">
        <div className="w-full max-w-[1880px] mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-emerald-900/10 dark:border-[#20332A]">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="cursor-pointer shrink-0"
              title="Nifty Lens Homepage"
            >
              <BrandLogo />
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
              <AppLink href="/screener" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Swing Screener
              </AppLink>
              <AppLink href="/screener/intraday" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Intraday Screener
              </AppLink>
              <AppLink href="/screener/analysis" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Stock Analysis
              </AppLink>
              <AppLink href="/trade" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Virtual Trading
              </AppLink>
              <AppLink href="/learn" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Learn Patterns
              </AppLink>
              <AppLink href="/quiz" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Guess the Chart
              </AppLink>
            </div>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed text-[#5B7066] dark:text-[#7F9C8E]">
            <p>
              <strong>Disclaimer:</strong> Nifty Lens is an educational stock screening, AI-assisted chart analysis, pattern learning, and paper trading platform created strictly for informational and strategy backtesting purposes. Historical backtesting and AI insights do not guarantee future profits. No real securities, equities, derivatives, commodities, or currencies are purchased or sold. All financial balances, portfolio holdings, orders, and gains or losses displayed are 100% simulated paper credits.
            </p>
            <p>
              This platform is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, sub-broker, portfolio manager, or investment adviser. Nothing on this website constitutes investment advice, financial guidance, tax advisory, or a recommendation to buy or sell any financial instrument.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-emerald-900/10 dark:border-[#20332A] text-[11px]">
            <div>© {new Date().getFullYear()} Nifty Lens. NSE Stock Screener, Virtual Trading &amp; Chart Pattern Studio.</div>
            <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
              <AppLink href="/terms" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Terms of Service
              </AppLink>
              <AppLink href="/privacy" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Privacy Policy
              </AppLink>
              <AppLink href="/refund-policy" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Refund Policy
              </AppLink>
              <AppLink href="/disclaimer" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                SEBI Disclaimer
              </AppLink>
              <AppLink href="/contact" className="hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors">
                Contact
              </AppLink>
            </div>
            <div>Educational Research &amp; Paper Trading Sandbox · Virtual Capital: ₹1,00,000 – ₹50,00,000</div>
          </div>
        </div>
      </footer>
);
}
