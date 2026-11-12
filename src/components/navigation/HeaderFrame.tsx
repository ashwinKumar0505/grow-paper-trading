import { useEffect, useRef, type ReactNode } from 'react';
import { BrandLogo } from '../BrandLogo';
import { AppLink, usePathname } from '../../lib/navigation';

/** Both layouts use the exact same brand row, width, and gutters. */
export function HeaderFrame({ navigation, utilities, label }: { navigation: ReactNode; utilities: ReactNode; label: string }) {
  const pathname = usePathname();
  const mobileNavigation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = mobileNavigation.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !active || !container.clientWidth) return;
    const left = active.getBoundingClientRect().left - container.getBoundingClientRect().left;
    container.scrollLeft += left - (container.clientWidth - active.clientWidth) / 2;
  }, [pathname]);
  return (
    <header aria-label={label} className="platform-header sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur-md dark:border-slate-800 dark:bg-[#12161F]/95 dark:text-slate-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <AppLink href="/" aria-label="TradePlaybook home" className="shrink-0 rounded-lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandLogo />
        </AppLink>
        <div className="hidden min-w-0 xl:flex xl:flex-1 xl:justify-center">{navigation}</div>
        <div className="flex min-w-[78px] shrink-0 items-center justify-end gap-1.5 sm:gap-2">{utilities}</div>
      </div>
      <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800 sm:px-6 xl:hidden">
        <div ref={mobileNavigation} className="mx-auto max-w-7xl overflow-x-auto no-scrollbar">{navigation}</div>
      </div>
    </header>
  );
}
