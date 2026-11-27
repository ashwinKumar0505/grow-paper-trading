import { SUBSCRIPTION_PLANS } from '../../../lib/subscription';
import { PATTERN_TEMPLATES, type PatternTemplate } from './dataGenerator';

export const shortName = (name: string) => name.replace(/\s*\([^)]*\)/g, '');

export const CATEGORIES = [
  { id: 'All patterns', label: 'All Patterns' },
  { id: 'Reversal', label: 'Reversal' },
  { id: 'Continuation', label: 'Continuation' },
  { id: 'Bilateral', label: 'Bilateral' },
  { id: 'Special', label: 'Candlestick & Special' },
];

export interface PatternCatalogEntry {
  template: PatternTemplate;
  slug: string;
  shortTitle: string;
  isPublicFree: boolean;
}

export function toPatternSlug(name: string): string {
  return shortName(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FREE_BEGINNER_NAMES = new Set(
  PATTERN_TEMPLATES.filter((p) => p.difficulty === 'Beginner')
    .slice(0, SUBSCRIPTION_PLANS.free.patternLibraryMaxFreePatterns)
    .map((p) => p.name)
);

const CATALOG_ENTRIES: PatternCatalogEntry[] = PATTERN_TEMPLATES.map((template) => ({
  template,
  slug: toPatternSlug(template.name),
  shortTitle: shortName(template.name),
  isPublicFree: FREE_BEGINNER_NAMES.has(template.name),
}));

const ENTRY_BY_SLUG = new Map<string, PatternCatalogEntry>(
  CATALOG_ENTRIES.map((entry) => [entry.slug, entry])
);

export function getPatternCatalogEntries(): readonly PatternCatalogEntry[] {
  return CATALOG_ENTRIES;
}

export function getPublicPatternEntries(): readonly PatternCatalogEntry[] {
  return CATALOG_ENTRIES.filter((entry) => entry.isPublicFree);
}

export function resolvePatternBySlug(slug: string | null | undefined): PatternCatalogEntry | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  return ENTRY_BY_SLUG.get(normalized) || null;
}
