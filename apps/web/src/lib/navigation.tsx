import { useSyncExternalStore, useCallback, useMemo, type AnchorHTMLAttributes } from 'react';
import {
  buildLearnPatternPath,
  buildTradeStockPath,
  canonicalPath,
  getLearnPatternSlugFromPath,
  getTradeStockSymbolFromPath,
} from './routePaths';

export {
  buildLearnPatternPath,
  buildTradeStockPath,
  canonicalPath,
  getLearnPatternSlugFromPath,
  getTradeStockSymbolFromPath,
};

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};

export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    () => canonicalPath(window.location.pathname),
    () => '/'
  );
}

export function useLocationSearch() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => ''
  );
}

export function useQueryParams(): [URLSearchParams, (params: Record<string, string>) => void] {
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const setParams = useCallback((nextObj: Record<string, string>) => {
    const sp = new URLSearchParams();
    Object.entries(nextObj).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const qs = sp.toString();
    const nextUrl = window.location.pathname + (qs ? `?${qs}` : '');
    window.history.replaceState(null, '', nextUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  return [params, setParams];
}

export function navigate(path: string) {
  const current = window.location.pathname + window.location.search;
  if (current !== path) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo(0, 0);
  }
}

/** Real links support new tabs; ordinary clicks retain the running app and portfolio. */
export function AppLink({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === '_blank'
        ) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
