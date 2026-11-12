import { ArrowRight } from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import { HeaderFrame } from './HeaderFrame';
import { ThemeToggle } from './ThemeToggle';

export function MarketingHeader() {
  const { setCurrentTab } = useTrading();
  const linkClass = 'shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400';
  const navigation = <nav aria-label="Marketing navigation" className="flex w-max items-center gap-1">
    <a href="#how-it-works" className={linkClass}>How It Works</a>
    <a href="#features" className={linkClass}>Features</a>
    <a href="#faq" className={linkClass}>FAQ</a>
    <span aria-hidden="true" className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
    <AppLink href="/trade" onClick={() => setCurrentTab('explore')} className={linkClass}>Stocks</AppLink>
    <AppLink href="/trade" onClick={() => setCurrentTab('stock-detail')} className={linkClass}>Live Charts</AppLink>
    <AppLink href="/quiz" className={linkClass}>Chart Quiz</AppLink>
  </nav>;
  return <HeaderFrame label="Marketing header" navigation={navigation} utilities={<>
    <ThemeToggle />
    <AppLink href="/trade" aria-label="Start Paper Trading" className="flex h-9 items-center gap-2 rounded-full bg-emerald-500 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 sm:px-4">
      <span className="hidden sm:inline">Start Paper Trading</span><span className="sm:hidden">Start</span><ArrowRight className="h-4 w-4" />
    </AppLink>
  </>} />;
}
