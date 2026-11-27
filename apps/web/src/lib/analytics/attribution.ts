import type { FeatureLandingPath } from './types';

export const LANDING_ORIGIN_STORAGE_KEY = 'tradedia_landing_origin_v1';

const FEATURE_LANDING_PATHS = new Set<FeatureLandingPath>([
  '/paper-trading-india',
  '/ai-stock-screener',
  '/guess-the-chart',
]);

let inMemoryLandingOrigin: FeatureLandingPath | null = null;

export function isFeatureLandingPath(pathname: string): pathname is FeatureLandingPath {
  return FEATURE_LANDING_PATHS.has(pathname as FeatureLandingPath);
}

export function recordLandingOrigin(pathname: string): void {
  if (!isFeatureLandingPath(pathname)) return;
  inMemoryLandingOrigin = pathname;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(LANDING_ORIGIN_STORAGE_KEY, pathname);
    }
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

export function getLandingOrigin(): FeatureLandingPath | null {
  if (inMemoryLandingOrigin) return inMemoryLandingOrigin;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem(LANDING_ORIGIN_STORAGE_KEY);
      if (saved && isFeatureLandingPath(saved)) {
        inMemoryLandingOrigin = saved;
        return saved;
      }
    }
  } catch {
    // Ignore storage failures.
  }
  return null;
}

export function consumeLandingOrigin(): FeatureLandingPath | null {
  const origin = getLandingOrigin();
  inMemoryLandingOrigin = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(LANDING_ORIGIN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
  return origin;
}

export function __resetLandingOriginForTests(): void {
  inMemoryLandingOrigin = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(LANDING_ORIGIN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}
