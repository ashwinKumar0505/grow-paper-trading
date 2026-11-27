import {
ArrowRight,
BookOpen,
GraduationCap,
Lock,
Search,
TrendingDown,
TrendingUp,
X
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AppLink, buildLearnPatternPath, navigate } from '../../../lib/navigation';
import { PATTERN_TEMPLATES } from '../utils/dataGenerator';

import type { PatternLesson } from '../hooks/usePatternLesson';
import { CATEGORIES, shortName, toPatternSlug } from '../utils/patternCatalog';

type Props = Pick<PatternLesson, 'query' | 'setQuery' | 'category' | 'setCategory' | 'sidebarOpen' | 'setSidebarOpen' | 'unlockedPatternNames' | 'pattern' | 'filtered' | 'choosePattern'>;

export function PatternCatalog({ query, setQuery, category, setCategory, sidebarOpen, setSidebarOpen, unlockedPatternNames, pattern, filtered, choosePattern }: Props) {
  return <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Pattern Library Sidebar (Enlarged for easy browsing) */}
      <aside
        aria-label="Chart pattern catalog"
        className={`fixed lg:sticky top-[var(--workspace-header-height,65px)] left-0 z-40 h-[calc(100dvh-var(--workspace-header-height,65px))] w-[330px] sm:w-[350px] xl:w-[380px] shrink-0 bg-[#0c1d16] border-r border-[#1d3a2d] text-[#d6e6de] flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1d3a2d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d09c] text-[#04261c] grid place-items-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="font-extrabold text-base text-white leading-tight">Pattern Library</div>
              <div className="text-xs text-[#7f9c8e] font-medium mt-0.5">
                {PATTERN_TEMPLATES.length} interactive chart setups
              </div>
            </div>
          </div>
          <Button variant="unstyled" size="unstyled"
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#7f9c8e] hover:text-white hover:bg-white/5"
            aria-label="Close pattern menu"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 space-y-3 border-b border-[#1d3a2d]">
          <label className="relative block">
            <span className="sr-only">Search chart patterns</span>
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#7f9c8e]" />
            <Input unstyled
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pattern or meaning…"
              className="w-full rounded-xl bg-[#12281f] border border-[#1d3a2d] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-[#7f9c8e] focus:outline-none focus:border-[#00d09c]"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Button variant="unstyled" size="unstyled"
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#00d09c] text-[#04261c] font-bold shadow-xs'
                      : 'bg-[#12281f] text-[#9ab0a5] hover:text-white border border-[#1d3a2d]'
                  }`}
                >
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Pattern List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5" aria-label="Chart patterns">
          {filtered.map((item) => {
            const isSelected = pattern.name === item.name;
            const itemBullish = item.expectedDirection === 'BUY';
            const isLocked = !unlockedPatternNames.has(item.name);
            const href = buildLearnPatternPath(toPatternSlug(item.name));
            return (
              <AppLink
                key={item.name}
                href={href}
                aria-current={isSelected ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  choosePattern(item.name, { skipNavigate: true });
                }}
                className={`w-full rounded-xl px-4 py-3.5 text-left transition-all flex items-start justify-between gap-3 border ${
                  isSelected
                    ? 'bg-[#12281f] border-[#00d09c]/60 text-white shadow-sm'
                    : 'border-transparent text-[#d6e6de] hover:bg-white/[0.05]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#00d09c] shrink-0" />}
                    {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="block text-sm font-bold truncate">{shortName(item.name)}</span>
                  </div>
                  <span className="mt-1 block text-xs text-[#8fa99c] truncate">
                    {item.simpleName} · {item.difficulty} {isLocked ? '· Beginner+' : ''}
                  </span>
                </div>
                <span
                  className={`shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                    itemBullish
                      ? 'bg-[#00d09c]/15 text-[#00d09c]'
                      : 'bg-[#f0614a]/15 text-[#f0614a]'
                  }`}
                >
                  {itemBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {itemBullish ? 'Bullish' : 'Bearish'}
                </span>
              </AppLink>
            );
          })}
          {!filtered.length && (
            <p className="px-3 py-6 text-center text-xs text-[#7f9c8e]">
              No matching patterns. Try another search or category.
            </p>
          )}
        </div>

        {/* Bottom Sidebar CTA to Guess the Chart Quiz */}
        <div className="p-4 border-t border-[#1d3a2d] bg-[#12281f]/60">
          <Button variant="unstyled" size="unstyled"
            type="button"
            onClick={() => navigate('/quiz')}
            className="w-full rounded-xl bg-[#00d09c] hover:bg-[#00b386] text-[#04261c] font-extrabold text-sm py-3 px-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Guess the Chart Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </aside>

  </>;
}
