# Frontend refactoring plan

## Audit and baseline

Clean working tree on existing dedicated `refactor-code-structure` branch. React 19, TypeScript, Vite 8 and Tailwind 4; Lucide and Motion already installed. Bun lockfile is authoritative. `@/` resolves to repository root (preserve it). No existing AGENTS.md. No backend changes planned.

Routing uses history/popstate via `lib/navigation.tsx`; aliases and auth gates live in App. Quiz and screener are already lazy loaded. TradingContext combines authentication, subscriptions, payment state, persistence, quote polling, portfolio and order execution in 2,116 lines. Keep a single provider and transaction authority; extract cohesive types/services/hooks without duplicating state. Firebase and server contracts remain unchanged.

Quiz owns canvas rendering, generated chart scenarios, three game modes, local storage, keyboard shortcuts and reveal timers. Learn combines pattern filtering, entitlement gates and lesson rendering. Screener is legacy JSX with existing API/cache modules and scoped CSS; retain names and transport contracts. Trading has shared OrderPanel for desktop/modal, SVG charts, responsive tables, wallet and order history. Pricing is already feature-based.

Repeated patterns: raw buttons/inputs, metric cards, loading/error/empty states, overlay shells, gain/loss stock cards and mobile/desktop order displays. Static inline styling can become Tailwind; numeric chart coordinates, progress widths and data colors must remain dynamic. Avoid global resets or replacing native select controls during this pass.

## Proposed structure

- `src/app`: routing, shared modal composition and workspace content.
- `src/components/ui`: minimal shadcn primitives adapted to existing styles.
- `src/components/common`: shared loading and feedback components where repeated.
- `src/features/quiz`: keep established feature name; separate hooks, lesson components and quiz lifecycle.
- `src/features/screener`: keep established feature name, API and scoped CSS; extract page hooks and sections.
- `src/features/virtual-trading`: components, hooks, services, types and view utilities.
- `src/context/TradingContext.tsx`: compatibility entry point and single state authority.
- `src/utils`: shared financial engines retained with existing imports/tests.

## Priorities and files

1. Foundation: components.json, class merging, button/input/badge/card and accessible dialog primitives only where used; keep existing tokens and aliases.
2. Layout: App, workspace routes, trading shell/footer, modal composition.
3. Learn/quiz: QuizApp, LearnChartsPage; extract state/lifecycle and presentational sections without changing score calculations or chart renderers.
4. Screener: SwingScannerPage, IntradayScannerPage, StockAnalysisPage; isolate fetch/filter lifecycles and reuse existing tables/filters.
5. Trading: move feature-owned components, separate OrderPanel/OrdersView/view sections and context contracts, extract quote services/hooks.
6. Styling/performance: adopt shared primitives incrementally, remove static inline styles, measure route bundle sizes and remove redundant subscriptions.
7. Verification: typecheck, existing tests, production build, import and diff checks; browser checks if tooling can be run.

## Reusable inventory and dependencies

Reuse HeaderFrame, ThemeToggle, UserProfileMenu, BrandLogo, StockChart, OrderPanel, SignalFilters, RecommendationTable, ScreenerStatsGrid, SectionCard, LockedFeatureCard and pricing components. Add only needed UI primitives; do not add a table framework, router or state library. shadcn manual Vite setup: https://ui.shadcn.com/docs/installation/vite . Preserve React/Tailwind versions and existing design tokens.

## Risks and verification

Highest risks: order reservation/queue execution, market sessions, Firebase hydration, subscription quotas and payment state, quiz timer closures, scanner cache/refresh semantics, SVG/canvas geometry. Preserve calculations and API response handling verbatim when moving code. Leave cohesive engines/renderers oversized with documented reasons rather than arbitrary fragmentation.

Baseline: `npm run lint` (tsc) PASS; `npm test` 47/47 PASS; `npm run build` PASS. No ESLint configuration/script exists. Build warnings: existing __dirname compatibility notice and >500 kB entry chunk. Baseline entry JS 1,212.83 kB / 343.93 kB gzip; quiz 156.44 / 36.64; screener 103.33 / 30.14. No browser checks yet.

## Progress

- [x] Stage 1: audit, baseline, plan and engineering rules.
- [x] Stage 2: shared UI foundation verified.
- [x] Stage 3a: layout and navigation verified.
- [x] Stage 3b: Learn and quiz verified.
- [x] Stage 3c: screener verified.
- [x] Stage 3d: trading presentation verified.
- [x] Stage 3e: complex state/service boundaries verified.
- [x] Stage 4: styling/accessibility review.
- [x] Stage 5: measured performance and cleanup.
- [x] Stage 6: final verification and summary.

## Baseline files over 200 nonblank/non-comment lines

Counts use a consistent conservative line-based metric (exclude blank lines and lines starting //, /* or *); full baseline is in refactor-baseline.json. JSX comments may still count. Data and tests are reported separately in the final review.

| File | Code lines | Total lines |
| --- | ---: | ---: |
| `src/App.tsx` | 215 | 240 |
| `src/components/AuthGatePlaceholder.tsx` | 228 | 248 |
| `src/components/AuthModal.tsx` | 408 | 459 |
| `src/components/ExploreView.tsx` | 418 | 454 |
| `src/components/LandingPage.tsx` | 957 | 1032 |
| `src/components/LegalPages.tsx` | 245 | 260 |
| `src/components/OrderPanel.tsx` | 700 | 749 |
| `src/components/OrdersView.tsx` | 421 | 450 |
| `src/components/RazorpayCheckoutModal.tsx` | 631 | 676 |
| `src/components/StockChart.tsx` | 633 | 693 |
| `src/components/StockDetailView.tsx` | 528 | 569 |
| `src/components/StockSearchModal.tsx` | 259 | 282 |
| `src/components/TradingToolbar.tsx` | 213 | 226 |
| `src/components/UpgradeModal.tsx` | 286 | 310 |
| `src/components/WalletModal.tsx` | 628 | 669 |
| `src/components/WatchlistView.tsx` | 394 | 417 |
| `src/components/landing/ScreenerLivePreviewCard.tsx` | 350 | 368 |
| `src/components/navigation/UserProfileMenu.tsx` | 227 | 242 |
| `src/context/TradingContext.tsx` | 1859 | 2116 |
| `src/data/mockStocks.ts` | 1326 | 1345 |
| `src/features/pricing/pricingConfig.ts` | 240 | 271 |
| `src/features/quiz/QuizApp.tsx` | 600 | 707 |
| `src/features/quiz/components/DogOutcomeIllustration.tsx` | 224 | 262 |
| `src/features/quiz/components/HistoryDrawer.tsx` | 271 | 296 |
| `src/features/quiz/components/LearnChartsPage.tsx` | 496 | 529 |
| `src/features/quiz/components/OutcomeModal.tsx` | 521 | 558 |
| `src/features/quiz/components/PatternGuideModal.tsx` | 250 | 270 |
| `src/features/quiz/components/QuizToolbar.tsx` | 278 | 301 |
| `src/features/quiz/components/TradingCanvas.tsx` | 821 | 1013 |
| `src/features/quiz/utils/dataGenerator.ts` | 965 | 1098 |
| `src/features/screener/App.css` | 3016 | 3542 |
| `src/features/screener/api/client.js` | 433 | 455 |
| `src/features/screener/components/StockAnalysisDrawer.jsx` | 250 | 270 |
| `src/features/screener/pages/IntradayScannerPage.jsx` | 362 | 384 |
| `src/features/screener/pages/StockAnalysisPage.jsx` | 779 | 806 |
| `src/features/screener/pages/SwingScannerPage.jsx` | 331 | 347 |
| `src/lib/subscription.ts` | 213 | 221 |
| `src/utils/marketHours.ts` | 439 | 515 |
| `src/utils/orderEngine.test.ts` | 571 | 656 |
| `src/utils/orderEngine.ts` | 1168 | 1328 |

Foundation: minimal Slot, Dialog, CVA, clsx and tailwind-merge installed via Bun, existing dependency versions retained. ThemeToggle, billing toggle and screener badge use shared primitives. Typecheck/tests/build passed.

Layout and Learn/quiz batches: typecheck, 47 tests and production build pass. Quiz lifecycle is separated into state, actions, reveal execution and keyboard hooks; Learn catalog, explanation and demonstration preserve the existing JSX and canvas.

Trading batches: typecheck, 47 tests and build pass. One state hook and one order-engine ref remain authoritative. Extracted context contracts, quote/chart services, polling, portfolio projection, account hydration, persistence, quota/subscription, wallet and order actions. Order calculations and auth/payment branches were moved verbatim; no backend or financial-engine edits.

## Post-refactoring verification & summary

- All stages 1–6 are fully completed.
- TypeScript check (`npm run lint` / `tsc --noEmit`): PASS (0 errors).
- Test suite (`npm test` / 47 test cases): PASS (47 passed, 0 failed, 0 skipped).
- Production build (`npm run build` / `vite build`): PASS.
- Every interactive UI component in `src/` now adheres strictly to the target of <= 200 nonblank/non-comment lines.
- Only cohesive financial engines, canvas renderers, static datasets, and test suites exceed 200 lines, with explicit rationale documented in `docs/refactor-summary.md`.
