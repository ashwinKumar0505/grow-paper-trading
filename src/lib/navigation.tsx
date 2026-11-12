import { useSyncExternalStore, type AnchorHTMLAttributes } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};

export function canonicalPath(path: string) {
  const normalized = path.replace(/\/+$/, '') || '/';
  return ({ '/markets': '/trade', '/paper-trading': '/trade', '/quiz/learn': '/pattern-library' } as Record<string, string>)[normalized] || normalized;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => canonicalPath(window.location.pathname), () => '/');
}

export function navigate(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo(0, 0);
  }
}

/** Real links support new tabs; ordinary clicks retain the running app and portfolio. */
export function AppLink({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return;
    event.preventDefault();
    navigate(href);
  }} />;
}
