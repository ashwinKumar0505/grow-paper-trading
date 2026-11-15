# Engineering rules

- Preserve functionality, visual appearance, responsive layouts, routes and public component contracts.
- Use React, TypeScript, Tailwind and a minimal shadcn/ui foundation; reuse Lucide icons and existing design tokens. Do not unnecessarily upgrade dependencies.
- Organize by feature. Keep reusable UI in components/ui and application patterns in components/common. Extract meaningful hooks, services, types and view components; do not create empty folders or generic abstractions without consumers.
- Target at most 200 nonblank/non-comment lines per application TS/TSX file. Cohesive financial engines, canvas renderers and static datasets may remain larger with documented rationale.
- Never change trading algorithms, technical indicators, signal conditions, financial/backtesting formulas, API contracts, database schemas, auth, subscription or payment rules during structural refactoring. Backend changes require explicit justification.
- Preserve state transitions, effect cleanup, loading/error/empty states, keyboard access, light/dark themes and mobile behavior.
- Do not introduce any types or suppress TypeScript/ESLint errors. Preserve existing contracts while improving types where supported by evidence.
- Optimize only demonstrated costs; no gratuitous memoization, virtualization or performance dependencies. Report measurements honestly.
- Inspect relevant source and direct dependencies before editing. Exclude node_modules, dist, build, coverage and generated output from searches.
- Work in verified feature batches. Run npm run lint (TypeScript), npm test and npm run build after each feature; report that ESLint is not configured rather than claiming it ran.
- Maintain docs/refactor-plan.md and docs/refactor-summary.md with progress, checks, remaining risks and justified oversized files. Do not claim unexecuted browser/manual checks.
- Preserve user changes, work on a dedicated branch when possible, never reset/discard unrelated work, and do not commit without authorization.
- Continue between authorized stages without routine confirmation; document blockers and continue independent safe work.
