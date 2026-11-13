import { useEffect, useRef, type ReactNode } from 'react';
import { BrandLogo } from '../BrandLogo';
import { AppLink, usePathname } from '../../lib/navigation';

/** Shared NiftyLens header frame with green-accented styling across every route. */
export function HeaderFrame({
  navigation,
  utilities,
  label,
}: {
  navigation: ReactNode;
  utilities: ReactNode;
  label: string;
}) {
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
    <header
      aria-label={label}
      className="platform-header sticky top-0 z-40 border-b border-emerald-900/10 bg-white/95 text-[#15241D] backdrop-blur-md dark:border-[#1E352B] dark:bg-[#0B1410]/95 dark:text-[#E9F2EE]"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <AppLink
          href="/"
          aria-label="NiftyLens home"
          className="shrink-0 rounded-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <BrandLogo />
        </AppLink>
        <div className="hidden min-w-0 md:flex md:flex-1 md:justify-center">{navigation}</div>
        <div className="flex min-w-[78px] shrink-0 items-center justify-end gap-2">{utilities}</div>
      </div>
      <div className="border-t border-emerald-900/10 px-4 py-2 dark:border-[#1E352B] sm:px-6 lg:px-8 md:hidden">
        <div ref={mobileNavigation} className="mx-auto w-full max-w-[1920px] overflow-x-auto no-scrollbar flex justify-center">
          {navigation}
        </div>
      </div>
    </header>
  );
}
