import { BookOpen, ChartCandlestick, GraduationCap, Radar, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { AppLink, usePathname } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import { sound } from '../../features/quiz/utils/sound';
import { useSyncExternalStore } from 'react';
import { HeaderFrame } from './HeaderFrame';
import { ThemeToggle } from './ThemeToggle';
import { UserProfileMenu } from './UserProfileMenu';

export function WorkspaceHeader() {
  const pathname = usePathname();
  const { setCurrentTab } = useTrading();
  const isScreener = pathname.startsWith('/screener');
  const isTrade = pathname === '/trade';
  const isLearn = pathname === '/learn';
  const isQuiz = pathname === '/quiz' || pathname === '/quiz/play';
  const isMuted = useSyncExternalStore(sound.subscribe, () => sound.getMuted());

  const modes = [
    {
      href: '/trade',
      label: 'Paper Trading',
      icon: ChartCandlestick,
      active: isTrade,
      select: () => setCurrentTab('explore'),
    },
    {
      href: '/screener',
      label: 'Stock Screener',
      icon: Radar,
      active: isScreener,
    },
    {
      href: '/learn',
      label: 'Learn',
      icon: BookOpen,
      active: isLearn || isQuiz,
    },
  ];

  const navigation = (
    <nav
      aria-label="Workspace modes"
      className="flex w-max items-center gap-1 rounded-full border border-emerald-900/10 bg-[#EEF5F1] p-1 dark:border-[#1E352B] dark:bg-[#111F19]"
    >
      {modes.map(({ href, label, icon: Icon, active, select }) => (
        <AppLink
          key={href}
          href={href}
          onClick={select}
          aria-current={active ? 'page' : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
            active
              ? 'bg-[#00B386] text-white shadow-xs dark:bg-[#00D09C] dark:text-[#04261C]'
              : 'text-[#3A5247] hover:bg-[#00B386] hover:text-white dark:text-[#9AB0A5] dark:hover:bg-[#00D09C] dark:hover:text-[#04261C]'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </AppLink>
      ))}
    </nav>
  );

  return (
    <HeaderFrame
      label="Workspace header"
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
