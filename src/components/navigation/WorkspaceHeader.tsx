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
      href: '/screener',
      label: 'Signal Screener',
      icon: Radar,
      active: isScreener,
    },
    {
      href: '/trade',
      label: 'Virtual Trading',
      icon: ChartCandlestick,
      active: isTrade,
      select: () => setCurrentTab('explore'),
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
              : 'text-[#5B7066] hover:text-[#15241D] dark:text-[#9AB0A5] dark:hover:text-white'
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
          {isLearn && (
            <AppLink
              href="/quiz"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#00B386] px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#009A73] dark:bg-[#00D09C] dark:text-[#04261C] dark:hover:bg-[#00E6A8]"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Guess the Chart</span>
              <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
            </AppLink>
          )}
          {isQuiz && (
            <>
              <AppLink
                href="/learn"
                className="flex h-9 items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-[#00D09C]"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pattern Library</span>
              </AppLink>
              <button
                type="button"
                onClick={() => sound.toggleMute()}
                aria-label={isMuted ? 'Unmute quiz sound' : 'Mute quiz sound'}
                aria-pressed={!isMuted}
                title={isMuted ? 'Unmute quiz sound' : 'Mute quiz sound'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          )}
          <ThemeToggle />
          <UserProfileMenu />
        </>
      }
    />
  );
}
