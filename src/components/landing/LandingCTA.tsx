import {
ArrowRight,
BookOpen,
ChartCandlestick,
Radar
} from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import type { LandingModel } from './useLandingPage';
type Props = Pick<LandingModel, 'stocks' | 'handleGetStarted'>;
export function LandingCTA({ stocks, handleGetStarted }: Props) {
return (
<section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1880px] mx-auto">
          <div className="bg-gradient-to-r from-[#0F2A1F] via-[#133628] to-[#0D241B] border border-[#1D3A2D] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="space-y-2.5 max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to scan stocks, practice trades, and master charts?
              </h3>
              <p className="text-xs sm:text-sm text-[#9AB0A5] leading-relaxed">
                Start with the AI-Powered Nifty 500 Stock Screener, practice risk-free on the Virtual Trading Desk, or explore 28+ setups in the Chart Pattern Library.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <AppLink
                href="/screener"
                className="px-7 py-3.5 rounded-xl font-extrabold text-sm bg-[#00D09C] text-[#04261C] hover:bg-[#00B386] shadow-md transition-all inline-flex items-center gap-2"
              >
                <Radar className="w-4 h-4" />
                <span>Open Stock Screener</span>
                <ArrowRight className="w-4 h-4" />
              </AppLink>
              <button
                type="button"
                onClick={handleGetStarted}
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <ChartCandlestick className="w-4 h-4 text-[#00D09C]" />
                <span>Launch Virtual Trading</span>
              </button>
              <AppLink
                href="/learn"
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all inline-flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#00D09C]" />
                <span>Learn Chart Patterns</span>
              </AppLink>
            </div>
          </div>
        </div>
      </section>
);
}
