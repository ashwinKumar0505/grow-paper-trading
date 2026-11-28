export function canonicalPath(path: string): string {
  const clean = path.split('?')[0].split('#')[0];
  const normalized = clean.replace(/\/+$/, '') || '/';
  const aliases: Record<string, string> = {
    '/markets': '/trade',
    '/paper-trading': '/trade',
    '/quiz/learn': '/learn',
    '/pattern-library': '/learn',
    '/screener/stock-analysis': '/screener/analysis',
  };
  if (normalized.startsWith('/stocks/')) {
    return `/trade/${normalized.slice('/stocks/'.length)}`;
  }
  if (normalized.startsWith('/pattern-library/')) {
    return `/learn/${normalized.slice('/pattern-library/'.length).toLowerCase()}`;
  }
  if (normalized.startsWith('/quiz/learn/')) {
    return `/learn/${normalized.slice('/quiz/learn/'.length).toLowerCase()}`;
  }
  if (normalized.startsWith('/learn/')) {
    return `/learn/${normalized.slice('/learn/'.length).toLowerCase()}`;
  }
  return aliases[normalized] || normalized;
}

export function getLearnPatternSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith('/learn/')) return null;
  const rest = pathname.slice('/learn/'.length);
  if (!rest || rest.includes('/')) return null;
  try {
    return decodeURIComponent(rest).trim().toLowerCase() || null;
  } catch {
    return rest.trim().toLowerCase() || null;
  }
}

export function buildLearnPatternPath(slug: string): string {
  return `/learn/${encodeURIComponent(slug.trim().toLowerCase())}`;
}

export function getTradeStockSymbolFromPath(pathname: string): string | null {
  if (!pathname.startsWith('/trade/')) return null;
  const raw = pathname.slice('/trade/'.length).split('/')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim().toUpperCase() || null;
  } catch {
    return raw.trim().toUpperCase() || null;
  }
}

export function buildTradeStockPath(symbol: string): string {
  return `/trade/${encodeURIComponent(symbol.trim().toUpperCase())}`;
}
