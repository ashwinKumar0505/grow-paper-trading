import { ArrowRight, BookOpen, ChartCandlestick, Radar } from 'lucide-react';
import { AppLink } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import { HeaderFrame } from './HeaderFrame';
import { ThemeToggle } from './ThemeToggle';
import { UserProfileMenu } from './UserProfileMenu';

export function MarketingHeader() {
  const { setCurrentTab } = useTrading();

  const modes = [
    {
      href: '/screener',
      label: 'Signal Screener',
      icon: Radar,
    },
    {
      href: '/trade',
      label: 'Virtual Trading',
      icon: ChartCandlestick,
      select: () => setCurrentTab('explore'),
    },
    {
      href: '/learn',
      label: 'Learn',
      icon: BookOpen,
    },
  ];

  const navigation = (
    <nav
      aria-label="Primary navigation"
      className="flex w-max items-center gap-1 rounded-full border border-emerald-900/10 bg-[#EEF5F1] p-1 dark:border-[#1E352B] dark:bg-[#111F19]"
    >
      {modes.map(({ href, label, icon: Icon, select }) => (
        <AppLink
          key={href}
          href={href}
          onClick={select}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[#3A5247] transition-all hover:bg-[#00B386] hover:text-white dark:text-[#9AB0A5] dark:hover:bg-[#00D09C] dark:hover:text-[#04261C]"
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </AppLink>
      ))}
    </nav>
  );

  return (
    <HeaderFrame
      label="Marketing header"
      navigation={navigation}
      utilities={
        <>
          <ThemeToggle />
          <UserProfileMenu />
        </>
      }
    />
  );
}
