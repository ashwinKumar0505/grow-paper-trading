import { BookOpen, ChartCandlestick, GraduationCap, Volume2, VolumeX } from 'lucide-react';
import { AppLink, usePathname } from '../../lib/navigation';
import { useTrading } from '../../context/TradingContext';
import { sound } from '../../features/quiz/utils/sound';
import { useSyncExternalStore } from 'react';
import { HeaderFrame } from './HeaderFrame';
import { ThemeToggle } from './ThemeToggle';

export function WorkspaceHeader() {
  const pathname = usePathname();
  const { setCurrentTab } = useTrading();
  const isQuiz = pathname === '/quiz' || pathname === '/quiz/play';
  const isMuted = useSyncExternalStore(sound.subscribe, () => sound.getMuted());
  const modes = [
    { href: '/trade', label: 'Simulator / Trade', icon: ChartCandlestick, active: pathname === '/trade', select: () => setCurrentTab('explore') },
    { href: '/quiz', label: 'Chart Quiz', icon: GraduationCap, active: isQuiz },
    { href: '/pattern-library', label: 'Pattern Library', icon: BookOpen, active: pathname === '/pattern-library' },
  ];
  const navigation = <nav aria-label="Workspace modes" className="flex w-max items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
    {modes.map(({ href, label, icon: Icon, active, select }) => <AppLink key={href} href={href} onClick={select} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</AppLink>)}
  </nav>;
  return <HeaderFrame label="Workspace header" navigation={navigation} utilities={<>
    {isQuiz && <button type="button" onClick={() => sound.toggleMute()} aria-label={isMuted ? 'Unmute quiz sound' : 'Mute quiz sound'} aria-pressed={!isMuted} title={isMuted ? 'Unmute quiz sound' : 'Mute quiz sound'} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>}
    <ThemeToggle />
  </>} />;
}
