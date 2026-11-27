# Refactoring & Production-Readiness Summary

## 1. Executive Summary

The comprehensive frontend, security, Razorpay payment/webhook, market-data provenance, chart/screener integration, and paper-trading production-readiness refactoring on branch `fix-analysed-code` has been completed in accordance with `AGENTS.md`, `TRADEDIA_PRODUCT_ANALYSIS.md`, and `docs/refactor-plan.md`.

Every backend module, Express router, market-data provider adapter, storage module, entitlement engine, frontend hook, API client, and test file created or refactored during this work has been split into reusable modules of **at most 200 total lines** (and `<= 200` nonblank/non-comment lines).

---

## 2. Verification & Test Results

| Check | Tool / Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Type Check** | `npm run lint` (`tsc --noEmit`) | **PASS** (0 errors) | Strict typing preserved across frontend and backend; zero `any` introductions or `@ts-ignore` suppressions. |
| **Unit & Integration Tests** | `npm test` (`node --import tsx --test src/utils/*.test.ts`) | **PASS** (69 / 69 passed) | 0 failed, 0 cancelled, 0 skipped. Covers auth tokens, OTP lifecycle, Firestore rules, Razorpay payments/webhooks/upgrades, entitlements, server trading ledger, wallet top-up/reset restart persistence, historical replay, intraday square-off outage recovery, market-data policies, and quiz isolation. |
| **Production Build** | `npm run build` (`vite build`) | **PASS** | Client bundle builds cleanly in ~527ms with route code-splitting preserved. |
| **Linting** | ESLint | **N/A** | ESLint is not configured in this repository; `npm run lint` runs `tsc --noEmit`. Reported honestly. |
| **Browser Execution** | Manual / Automated Browser | **N/A** | No unexecuted browser or manual checks are claimed. |

---

## 3. Modular Architecture Map (`<= 200` Lines Per File)

```
src/
├── components/
│   ├── auth/
│   │   ├── authModalService.ts        # Google session exchange & OTP HTTP helpers (106 lines)
│   │   └── useAuthModal.ts            # Unified Google & Email OTP modal hook (170 lines)
│   └── checkout/
│       └── useRazorpayCheckout.ts     # Server-verified Razorpay checkout controller (182 lines)
├── features/
│   ├── pricing/
│   │   ├── pricingComparisonConfig.ts # Comparison table categories & FAQs (161 lines)
│   │   └── pricingConfig.ts           # Plan cards & re-exports (99 lines)
│   ├── quiz/
│   │   ├── hooks/useQuizState.ts      # Account-scoped quiz state hook (176 lines)
│   │   └── utils/
│   │       ├── quizStatsReconciler.ts # Mathematical balance/win-rate reconciler (96 lines)
│   │       ├── quizStorage.ts         # Scoped localStorage persistence (151 lines)
│   │       └── quizRemoteSync.ts      # API & Firestore quiz progress sync (75 lines)
│   ├── screener/
│   │   └── api/
│   │       ├── adapters.js            # Swing, intraday, analysis & financials adapters (192 lines)
│   │       └── client.js              # Multi-base HTTP client & status emitter (183 lines)
│   └── virtual-trading/
│       ├── hooks/
│       │   ├── useAccountSync.ts      # Auth & Firestore subscription sync hook (167 lines)
│       │   ├── useOrderExecution.ts   # Order execution & cancellation hook (152 lines)
│       │   ├── useOrderTicket.ts      # Order ticket form & margin calculator hook (167 lines)
│       │   ├── useSignUp.ts           # Account sign-up & restoration hook (174 lines)
│       │   ├── useStockChartData.ts   # Chart candle loading & 1D quote alignment hook (145 lines)
│       │   └── useSubscriptionActions.ts # Upgrade, top-up & cancellation hook (181 lines)
│       ├── services/
│       │   ├── paperTradingApi.ts     # Authoritative server order/cancel sync service (65 lines)
│       │   └── subscriptionPersistence.ts # Firestore subscription upgrade/cancel sync (128 lines)
│       └── utils/
│           ├── accountRestore.ts      # Reusable remote profile & portfolio restorer (86 lines)
│           ├── portfolioRemoteAdapter.ts # Wallet cap & remote snapshot normalizer (95 lines)
│           └── portfolioSync.ts       # Scoped localStorage portfolio persistence (161 lines)
├── server/
│   ├── auth/
│   │   ├── tokenService.ts            # Session JWT, Firebase token & scrypt OTP helpers (186 lines)
│   │   ├── authService.ts             # Canonical user resolution & re-exports (153 lines)
│   │   ├── otpMailer.ts               # Resend OTP email delivery (59 lines)
│   │   └── otpService.ts              # CSPRNG OTP lifecycle, cooldown & rate limits (192 lines)
│   ├── entitlements/
│   │   ├── screenerAndQuizEntitlements.ts # Screener, quiz & HMAC service token helpers (140 lines)
│   │   └── entitlementService.ts      # Tier resolution, order & quota checks (136 lines)
│   ├── payments/
│   │   ├── razorpayConfig.ts          # Credential guard, HMAC verify & upgrade pricing (125 lines)
│   │   ├── razorpayVerification.ts    # Server-authoritative payment verification (192 lines)
│   │   ├── razorpayWebhook.ts         # Raw-body verified 8-event webhook processor (191 lines)
│   │   └── razorpayService.ts         # Barrel export (8 lines)
│   ├── providers/
│   │   ├── diskCacheReader.ts         # Local NSE OHLCV CSV fallback reader (165 lines)
│   │   ├── yahooHttpClient.ts         # Yahoo chart/search HTTP client & parser (185 lines)
│   │   └── yahooFinanceProvider.ts    # Configurable Yahoo Finance provider adapter (172 lines)
│   ├── routes/
│   │   ├── authRoutes.ts              # Auth, profile & entitlement endpoints (179 lines)
│   │   ├── screenerProxyRoute.ts      # Signed `/api/v1/*` proxy to Python FastAPI (81 lines)
│   │   ├── marketRoutes.ts            # Market status, quotes, charts, depth & search (178 lines)
│   │   ├── quizProgressRoutes.ts      # Account-scoped `/api/quiz/progress` routes (76 lines)
│   │   ├── paperTradingRoutes.ts      # Authoritative paper-trading ledger routes (165 lines)
│   │   ├── paymentOrderRoutes.ts      # Razorpay plan & order creation routes (180 lines)
│   │   ├── subscriptionManageRoutes.ts # Payment verify, webhook, status & cancel routes (179 lines)
│   │   └── paymentRoutes.ts           # Payment router composition (13 lines)
│   ├── storage/
│   │   ├── durableTypes.ts            # Durable state interfaces & factory (176 lines)
│   │   └── durableStore.ts            # Atomic file-backed store & per-key mutex (106 lines)
│   └── trading/
│       ├── ledgerCapital.ts           # Ledger creation, committed capital & top-ups (195 lines)
│       ├── ledgerOrders.ts            # Authoritative order submission & cancellation (189 lines)
│       ├── ledgerWalletAndQueue.ts    # Plan cash top-up & manual portfolio reset (134 lines)
│       ├── ledgerQueueProcessor.ts    # Pending queue & 15:20 IST RMS square-off (127 lines)
│       ├── tradingLedger.ts           # Trading ledger barrel export (25 lines)
│       └── historicalReplay.ts        # Isolated historical replay clock & look-ahead guard (188 lines)
├── types/
│   ├── portfolioTypes.ts              # Order, Holding, Position, Watchlist & UserProfile types (121 lines)
│   └── market.ts                      # Quote, Chart, Depth, Provenance & re-exported types (143 lines)
└── utils/
    ├── marketCalendar.ts              # NSE holiday calendar, IST parts & session cutoffs (170 lines)
    ├── marketFreshness.ts             # Market status & quote freshness classifier (184 lines)
    └── marketHours.ts                 # Market hours barrel export (26 lines)
```

---

## 4. Justified Oversized Files Inventory

Per `AGENTS.md`, the only files in the repository exceeding 200 nonblank/non-comment lines are pre-existing cohesive financial engines, canvas/SVG renderers, static datasets, and the core order-engine test suite:

| File | Code Lines | Category | Technical Rationale |
| :--- | :---: | :--- | :--- |
| `src/data/mockStocks.ts` | 1,344 | Static Dataset | Test/dev NSE stock definitions and company profile metadata. Kept isolated from production financial workflows. |
| `src/utils/orderEngine.ts` | 1,168 | Financial Engine | Core order matching algorithm, MIS 5x / MTF 5x margin calculator, delivery settlement, statutory charges (STT, NSE, SEBI, GST, stamp duty), and portfolio valuation. |
| `src/features/quiz/utils/dataGenerator.ts` | 965 | Mathematical Engine | Procedural synthetic chart scenario geometry and 21 candlestick/chart pattern generators for Guess the Chart and Pattern Library. |
| `src/features/quiz/components/TradingCanvas.tsx` | 826 | Canvas 2D Renderer | HTML5 2D Canvas chart renderer managing device pixel ratio, viewport transforms, crosshairs, candlestick paths, volume bars, and indicator overlays. |
| `src/features/virtual-trading/components/StockChart.tsx` | 578 | SVG Chart Renderer | Multi-timeframe SVG chart renderer handling coordinate geometry, crosshair tracking, volume histograms, and moving averages (data fetching extracted to `useStockChartData.ts`). |
| `src/utils/orderEngine.test.ts` | 571 | Test Suite | 33 mathematical test cases asserting order engine execution, charges, margin reservations, MTF 5x, and AMO scheduling. |

---

## 5. Remaining External Dependencies & Operational Risks

1. **Licensed Commercial Market-Data Feed**:
   - Production configuration safeguards block `mock_test` and unconfigured `yahoo_finance` in production (`NODE_ENV=production`). Before commercial launch, an authorized commercial NSE market-data adapter (e.g., Upstox, Angel One, FYERS, TrueData) must be plugged into `ProviderRegistry` and enabled via `MARKET_DATA_PROVIDER_ANALYTICS` / `MARKET_DATA_PROVIDER_PAPER_TRADING`.
2. **External Production Credentials**:
   - Production deployment requires setting `AUTH_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, `RESEND_API_KEY`, `OTP_FROM_EMAIL`, `RAZORPAY_KEY_ID` (`rzp_live_*`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SCREENER_SERVICE_SECRET`, and `ALLOWED_ORIGINS`.
3. **Firestore Rules Deployment**:
   - The hardened `firestore.rules` file in the repository root must be deployed to the production Firebase project (`firebase deploy --only firestore:rules`).

---

## 6. Rebrand: Nifty Lens → Tradedia (2026-11-22, branch `change-name`)

- **What changed**: Every user-facing "Nifty Lens"/"NiftyLens" string (landing, header, footer, legal pages, auth gates, pricing, screener, paper-trading desk, Razorpay checkout name/description, OTP email subject/body, server log, `.env.example`) now says **Tradedia**. Contact emails on legal pages now use `@tradedia.in`. `package.json` name is now `tradedia`.
- **Logo**: `BrandLogo` now renders `public/images/landing/logo-96.png` (downscaled from the new `logo.png`, 887px / 640 KB) with a "Trade**dia**" wordmark. Added `logo-48.png`, `logo-180.png`, `logo-512.png` for favicon, Apple touch icon and social previews.
- **SEO / positioning**: `index.html` title, description, keywords, author, application-name, OpenGraph and Twitter metadata now position Tradedia as "One Place to Learn Trading"; added `og:image`/`twitter:image`. Default document titles, footers and a hero eyebrow use the same tagline.
- **Follow-up rename (same day)**: browser storage keys `niftylens_*` → `tradedia_*` (moved once at startup by `src/lib/legacyStorageMigration.ts`, imported first in `main.tsx`, so sessions, theme, usage quota and quiz progress survive); server settings `TRADEDIA_STORAGE_PATH` / `TRADEDIA_BACKEND_CACHE_DIR` (legacy `NIFTYLENS_*` names still read as fallback); store file `.data/tradedia-store.json` (an existing `niftylens-store.json` is renamed automatically on first start); Razorpay placeholder `TradediaDemoKey` (legacy `NiftyLensDemoKey` still blocked, both covered by tests); `NIFTYLENS_PRODUCT_ANALYSIS.md` → `TRADEDIA_PRODUCT_ANALYSIS.md` and both reports rebranded.
- **Still unchanged**: Firebase project ID `nifty-lens-87f02` (cannot be renamed); dev-only fallback secrets `niftylens_dev_*` in `authService.ts` and `screenerAndQuizEntitlements.ts` (the screener secret must match the Python backend fallback, which was not accessible to verify).
- **Checks**: `npm run lint` (`tsc --noEmit`, ESLint not configured): PASS · `npm test`: 69/69 PASS · `npm run build`: PASS. No browser/manual check was run.
- **Risks**: `tradedia.in` emails assume that domain is owned and set up; `og:image` uses a relative URL (social crawlers prefer absolute URLs once the production domain is known); `OTP_FROM_EMAIL` in deployed environments must be updated separately.

---

## 7. Market-Data Migration: Yahoo Finance → Upstox Analytics Token (2026-11-22, branch `upstox-implementation`)

- **Scope Completed (Both Repositories)**:
  - **Node/Express (`grow-paper-trading`)**: Added modular Upstox provider (`upstoxTypes.ts` 62 lines, `upstoxHttpClient.ts` 181 lines, `upstoxNormalizer.ts` 169 lines, `upstoxQuotes.ts` 156 lines, `upstoxCandles.ts` 161 lines, `upstoxProvider.ts` 191 lines — all `<= 195` nonblank/non-comment code lines). Configured `'upstox'` as active default in `marketDataPolicy.ts` / `providerRegistry.ts` with `dotenv.config()` + `refreshPolicies()` in `server.ts`, bulk quote lookups in `app.ts` and `paperTradingRoutes.ts`, provider-scoped `diskCacheReader.ts`, and v4 provider-isolated browser `scanCache.js`. Retained `yahoo_finance` strictly as an explicit rollback option.
  - **Python/FastAPI (`grow-paper-trading-backend/backend`)**: Implemented `upstox_client.py`, `upstox_instruments.py`, `upstox_financials.py` (with explicit `units_in` crore → INR rupee conversion), and `upstox_adapter.py`. Enforced `UPSTOX_ANALYTICS_TOKEN` strictly (never substituting daily `UPSTOX_ACCESS_TOKEN`), isolated OHLCV/financials/scan/backtest artifacts by provider while preserving legacy Yahoo artifacts on disk, and preserved `PRICE_ADJUSTMENT_POLICY=SPLIT_AND_DIVIDEND_ADJUSTED` with a fail-closed policy guard on Upstox until corporate-action equivalence is live-verified or `SPLIT_ADJUSTED_ONLY`/`UNADJUSTED_RAW` is explicitly selected.
- **Verification Executed**:
  - `npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `npm test` (`node --import tsx --test src/utils/*.test.ts`): **PASS** (78/78 passed, including 8 new Upstox & cache-isolation tests).
  - `npm run build` (`vite build`): **PASS** (verified zero `UPSTOX_ANALYTICS_TOKEN` / `VITE_UPSTOX` presence in `dist/`).
  - Python `pytest -v backend/tests`: **PASS** (40/40 passed, including 6 new Upstox/artifact-isolation tests).
  - Local end-to-end integration with BOTH servers running (Express `:13000` + FastAPI `:18000` + isolated local mock Upstox upstream `:19876` + isolated `/tmp` storage/cache): **PASS** across quotes, 5 indices, aliases (`ZOMATO`/`TATAMOTORS`), all 9 chart timeframes, search, depth unavailable state, swing/intraday scanners, financials crore→rupee conversion, backtest artifact provider isolation, and isolated paper-trading order/cancel/square-off flows.
- **Live Upstox Read-Only Verification (PASSED — 2026-11-22)**:
  - **Node Adapter**: 5/5 indices (`NIFTY 50` 25,800.60, `SENSEX` 83,919.71, `BANK NIFTY` 64,635.20, `NIFTY IT` 31,322.65, `NIFTY AUTO` 28,787.65), 59/59 catalog quotes (including `ZOMATO`/`ETERNAL` ₹364.00, `TATAMOTORS`/`TMPV` ₹266.35, `RELIANCE` ₹1,377.50), all 9 chart timeframes (`1D` 75 bars → `ALL` 323 monthly bars back to Jan 2000), and `/v2/instruments/search` (`ZOMATO -> ETERNAL`, no `NSE_EQ|` leak).
  - **Python Adapter**: 500/500 bundled NIFTY 500 ISINs matched in live bulk quotes (`missing=0`), live yearly/quarterly financials converted crore→INR (`HDFCBANK` FY26 rev ₹4.95 L Cr / PE 15.59, `RELIANCE` FY26 rev ₹10.86 L Cr / PE 19.46, `ZOMATO->ETERNAL`, `TATAMOTORS->TMPV`), live 2y daily (`RELIANCE` 502 bars, last `2026-11-20`) & 15m intraday (`RELIANCE` 175 bars, last `2026-11-20 15:15:00 IST`).
  - **Corporate-Action Empirical Proof**: Compared live Upstox V3 daily closes vs `yfinance auto_adjust=False` (split/bonus-adjusted) and `auto_adjust=True` (split+bonus+cash-dividend-adjusted): `RELIANCE` Oct 2024 1:1 bonus (`1344.00` vs `1344.03` raw / `1332.52` adj), `HDFCBANK` Aug 2025 1:1 bonus (`1001.80` vs `1001.80` raw / `985.50` adj), `COALINDIA` Aug 2024 high dividend (`540.40` vs `540.40` raw / `451.37` adj), `ITC` May 2024 pre-demerger + dividend (`434.80` vs `418.68` raw / `378.91` adj). Conclusion: Upstox V3 candles are **`SPLIT_ADJUSTED_ONLY`**, NOT dividend- or demerger-adjusted.
- **Checks NOT RUN / BLOCKED**:
  - **Interactive Chrome Browser UI verification**: **BLOCKED** — Chrome DevTools remote debugging (`DevToolsActivePort`) was unavailable on the host.
- **Remaining Risks & Decisions Needed**:
  - **Historical Corporate-Action Adjustment Policy**: Empirically confirmed Upstox V3 historical candles are `SPLIT_ADJUSTED_ONLY` (not dividend-adjusted like Yahoo `auto_adjust=True`). Python OHLCV analytics/backtests intentionally fail closed under default `PRICE_ADJUSTMENT_POLICY=SPLIT_AND_DIVIDEND_ADJUSTED` until you confirm switching to `PRICE_ADJUSTMENT_POLICY=SPLIT_ADJUSTED_ONLY`.
  - **Commercial Redistribution & Paper-Trading Licensing**: Both services default commercial/redistribution authorization flags (`UPSTOX_COMMERCIAL_REDISTRIBUTION_AUTHORIZED`, `UPSTOX_PAPER_TRADING_AUTHORIZED`, `UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED`) to `false` until permitted data-use rights are confirmed.
  - **No Upstox Backtest Artifact Yet**: `/api/v1/backtest/report` truthfully returns `UNVALIDATED` under `upstox` until an Upstox-backed walk-forward backtest run is executed.

---

## 8. Swing & Intraday Screener Live-Market UX Clarity (2026-11-23, branch `upstox-implementation`)

- **Scope Completed**:
  - **Shared presentation helpers (`src/features/screener/utils/signalPresentation.ts`, `src/features/screener/utils/terms.js`, `src/features/screener/utils/screenerHelpers.ts`, `src/features/screener/api/adapters.js`)**: Added optional-field-safe helpers for EOD session comparison (`actionable_session_date`), Swing close sub-labels (`20 Nov close`), live entry status pills (`IN_ENTRY_ZONE`, `EXTENDED`, `TARGET_HIT`, `STOP_BREACHED`), Intraday live-session detection (`scanner_state` + `market_status` fallback), open/closed resolution (`is_projected_exit` + status fallback), recency pills (`FRESH` / `IN_PROGRESS` + `minutes_since_entry`), `live_risk_reward_ratio`, and safe `status_badge_text` fallback for unrecognized statuses.
  - **Swing Screener (`SwingScannerPage.jsx`, `useSwingScanner.js`, `MarketStatusBadge.jsx`, `ScreenerStatsGrid.jsx`, `SignalEntryCell.jsx`, `StockRecommendationRow.jsx`, `DrawerTradePlan.jsx`, `ui.jsx`, `App.css`)**: Added EOD daily-candle confirmation info tooltips on both the status strip `Prices as of` badge and `Data as of` stat card, optional `EOD signals from X · Valid for Y session` context note when `actionable_session_date` differs from `data_as_of_date`, clarified entry sub-label (`20 Nov close`), and conditional live price (`Now ₹... (+X.X%)`) + color-coded entry status pill when `live_price` is present.
  - **Intraday Signals (`useIntradayScanner.js`, `IntradayResultsSection.jsx`, `RecommendationTable.jsx`, `StockRecommendationRow.jsx`, `StockAnalysisDrawer.jsx`)**: Defaulted status tab to `Open` during live market hours (`ACTIVE_SCANNING` / `is_market_open === true`) and `All` when market is closed (`PAUSED_MARKET_CLOSED`), preserved manual tab selection across auto-refreshes, added one-click empty-open CTA (`"No active setups right now — View X earlier session outcomes"`), added `Fresh` / `Running · Xm ago` recency pills and optional `Now X.Xx` live R:R subtext on open setups, muted completed rows on `All`/`Closed` tabs, and added helper caption above the table.
  - **Zero extra API calls**: No additional fetches, polling loops, or per-row requests were added on either page. All updated TS/TSX/JS/JSX files remain `<= 200` non-blank/non-comment lines.
- **Verification Executed**:
  - `npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `npm test` (`node --import tsx --test src/utils/*.test.ts`): **PASS** (87/87 passed, including 9 new unit & React SSR render tests covering legacy payloads, enhanced payloads, market open/closed states, empty-open CTA, muted completed rows, and unknown status fallbacks).
  - `npm run build` (`vite build`): **PASS**.
- **Checks Not Executed**:
  - Manual interactive browser / Chrome DevTools Network-tab check was not executed in this environment.

---

## 9. Quiz Mobile Layout & Stock Details Market Depth / Fundamentals (2026-11-23)

- **Quiz Mobile Layout**:
  - Added `src/features/quiz/components/MobileQuizBar.tsx` (128 code lines) and `src/features/quiz/components/MobileQuizOptionsDrawer.tsx` (170 code lines) shown on `< md` viewports, collapsing Chart Style (`Normal`/`Candles`), Guides (`Trend Line`, `Floor & Ceiling`, `Activity (Vol)`, `Momentum (RSI)`), and Quiz Actions (`Mode / Level`, `Learn Charts`, `Patterns`, `History`, `Quit`) into a single `Options` drawer closed by default.
  - Desktop (`md+`) keeps `QuizToolbar` and `ChartHeader` unchanged; `TradingCanvas` top strip and `ActionDock` were tightened on mobile so the chart canvas and UP/DOWN buttons fit cleanly on one mobile screen.
- **Stock Details — Market Depth & Fundamentals**:
  - **Root causes fixed**: (1) `upstoxNormalizer.ts` ignored the 5-level `depth` object returned by Upstox `/v2/market-quote/quotes` and `upstoxProvider.ts` hardcoded `supportsMarketDepth: false` / `supportsFundamentals: false`; (2) `useStockDetails.ts` and `StockDepth.tsx` required `bids.length > 0` and overwrote post-session empty-book responses; (3) `GET /api/stocks/:symbol` never fetched Upstox company fundamentals endpoints (`/v2/fundamentals/{isin}/key-ratios`, `/profile`, `/corporate-actions`).
  - **Implementation**: Added `src/server/providers/upstoxFundamentals.ts` (180 code lines, 6-hour per-symbol cache), parsed 5-level `depth` in `upstoxNormalizer.ts` (196 code lines), updated `upstoxProvider.ts` (198 code lines) & `marketRoutes.ts` (169 code lines), preserved `fundamentals` & `marketDepth` in `useMarketQuotes.ts` / `useStockSelection.ts` / `useStockDetails.ts`, updated `StockFundamentals.tsx` (including `ROCE`/`ROA` when available and omitting `Debt to Equity` when not provided by Upstox), removed `<StockDepth />` from `StockDetailView.tsx`, and added `src/features/virtual-trading/components/StockAnalysisBanner.tsx` (63 code lines) after the About card linking directly to `/screener/analysis?symbol=<SYMBOL>`.
- **Verification Executed**:
  - `npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `npm test` (`node --import tsx --test src/utils/*.test.ts`): **PASS** (91/91 passed, including `src/utils/quizAndStockDetailsRender.test.ts` and updated Upstox depth/fundamentals assertions).
  - `npm run build` (`vite build`): **PASS**.
  - Read-only live Upstox provider check (`INFY`, `RELIANCE`, `HDFCBANK`, `TCS`): confirmed real 5-level depth and authentic Market Cap, P/E, P/B, ROE, ROCE, ROA, EPS, Book Value, Dividend Yield, and company profile descriptions.
- **Checks Not Executed & Notes**:
  - Interactive mobile browser / Chrome DevTools visual check was not run in this environment.
  - `Debt to Equity` stays `—` when Upstox `/key-ratios` does not report it (intentionally not approximated from `total_liability / equity`). Outside NSE market hours (9:15 AM – 3:30 PM IST), Market Depth shows resting closing-session orders or an explicit `No Active Resting Orders` state when the exchange book is empty.


---

## 10. Monorepo Restructure (`apps/web` + `apps/analytics`), Image Optimization & Railway Deployment Readiness (2026-11-25, branch `railway-deploy-ready`)

- **Monorepo Layout (`apps/web/`, `apps/analytics/`, `firebase/`, `compose.yaml`, `.github/workflows/ci.yml`)**:
  - Moved the React SPA + Express BFF into `apps/web/` (Node 22 + `package-lock.json` + `Dockerfile` + `railway.json`), keeping internal `src/` imports intact and updating `otpAndFirestoreRules.test.ts` + `diskCacheReader.ts` relative paths.
  - Copied `/Users/ashwinkumar/grow-paper-trading-backend/backend` cleanly into `apps/analytics/` (original directory left untouched), added `apps/analytics/README.md`, pinned Python dependencies with `apps/analytics/uv.lock`, updated `apps/analytics/Dockerfile` to `uv sync --frozen --no-dev --no-install-project` (`--host :: --workers 1`), updated remaining `"NiftyLens"` API metadata/log strings to `"Tradedia"`, and isolated `apps/analytics/tests/test_api.py` against `tmp_path` caches.
  - Moved `firestore.rules` and `firebase-blueprint.json` into `firebase/`, added root `compose.yaml` for local multi-service Docker runs, and added `.github/workflows/ci.yml`.
- **Landing & Quiz Image Optimization (Lossless + Lazy Loading)**:
  - Re-encoded all six original 1254×1254 PNG illustrations (`hero-trading`, `virtual-trading`, `stock-screener`, `interactive-learning`, `quiz-success`, `quiz-failure`) using `cwebp -lossless -z 6` at full `1254×1254` resolution (zero quality loss / zero chroma subsampling; **11.3 MB** → **7.8 MB**, ~31% lossless reduction).
  - Added `IntersectionObserver` (`rootMargin: '250px 0px'`) + native `loading="lazy"` + `decoding="async"` + pulse placeholder & smooth fade-in to `apps/web/src/components/FloatingIllustration.tsx` so below-the-fold illustrations only load on scroll.
- **Dead Code & Clutter Cleanup**:
  - Removed four unreferenced React components (`ScreenerLivePreviewCard.tsx`, `ScreenerPreviewSwingTab.tsx`, `ScreenerPreviewIntradayTab.tsx`, `DogOutcomeIllustration.tsx`), unused AI Studio screenshots (`public/assets/aistudio/`, `.aistudio/`), empty `public/assets/landing/`, raw `public/images/landing/logo.png`, stale `metadata.json`, stale `bun.lock`, and unused dependencies (`@google/genai`, `autoprefixer`). Total `public/` size dropped from **13 MB** → **1.0 MB**.
  - Untracked `.data/tradedia-store.json` from git (preserving local file on disk) and hardened `.gitignore`.
- **Railway Production Fixes**:
  - Added `esbuild` production server bundle (`npm run build:server` → `dist-server/server.mjs`; `npm start` → `node dist-server/server.mjs`), updated `esbuild` to `^0.28.0` for `vite@8` compatibility, and generated `apps/web/package-lock.json`.
  - Added `app.set('trust proxy', 1)` and `GET /api/health` in `apps/web/src/server/app.ts`, graceful `SIGTERM`/`SIGINT` shutdown and immutable `/assets` cache headers in `apps/web/server.ts`, fixed Firebase project ID fallback (`tradedia-b6cb0`) in `apps/web/src/server/auth/tokenService.ts`, unified `SERVICE_AUTH_SECRET` across proxy & entitlements, and restricted `localhost` screener fallbacks to non-production builds.
  - Documented the complete Railway deployment runbook in `docs/railway-deployment.md`.
- **Verification Executed**:
  - `cd apps/web && npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `cd apps/web && npm test`: **PASS** (91 / 91 passed).
  - `cd apps/web && npm run build` (`vite build` + `esbuild server.ts`): **PASS** (`dist/` in 433ms, `dist-server/server.mjs` 253.7 KB in 12ms).
  - Production bundle smoke test (`NODE_ENV=production node dist-server/server.mjs`): **PASS** (`GET /api/health` 200, `GET /` 200, `GET /images/landing/hero-trading.webp` 200 `image/webp`, clean exit `0` on `SIGTERM`).
  - `apps/analytics/uv.lock` generation + `pytest apps/analytics/tests -v`: **PASS** (48 / 48 passed).
  - Line-count compliance check: every modified TS/TSX/JS application file is `<= 198` nonblank/non-comment lines.
- **Checks NOT Executed**:
  - Interactive browser rendering check and remote Docker/Railway image builds were not run locally.


---

## 11. Firestore Write-Through Persistence for `tradedia-web` (2026-11-25, branch `railway-deploy-ready`)

- **Architecture**:
  - Implemented zero-dependency Google OAuth2 Service Account JWT + Firestore REST v1 persistence (`apps/web/src/server/storage/firestoreValueCodec.ts`, `firestoreRestClient.ts`, `firestoreStoreAdapter.ts`) behind `DurableStore` (`apps/web/src/server/storage/durableStore.ts`).
  - When `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL` and `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` are configured, `server.ts` calls `await defaultStore.init()` on boot to hydrate collections (`users`, `trading_ledgers`, `billing_history`, `quiz_progress`, `payment_intents`, `processed_payments`, `processed_webhooks`, `otp_records`, `server_state`) once into memory, and commits **only changed/deleted documents** asynchronously per mutation (awaited inside `withLock()` for orders/payments/wallet mutations and during `SIGTERM`/`SIGINT` shutdown).
  - `/api/health` now reports `storage: 'firestore' | 'disk' | 'memory'`. When service-account env vars are unset (local dev), `DurableStore` seamlessly falls back to `.data/tradedia-store.json`.
  - Removes the Railway Volume requirement from `tradedia-web` and fixes single-file synchronous write blocking at scale while staying within Firestore's free tier for early traffic (the 15s trading loop performs 0 Firestore reads).
- **Verification**:
  - `cd apps/web && npm run lint` (`tsc --noEmit`; ESLint not configured): **PASS** (0 errors).
  - `cd apps/web && npm test`: **PASS** (93 / 93 passed, including new `firestoreStoreAdapter.test.ts`).
  - `cd apps/web && npm run build`: **PASS** (Vite SPA + `esbuild` `dist-server/server.mjs`).
  - Every new/modified TS file is `<= 200` nonblank/non-comment lines.
- **Checks NOT Executed**:
  - Live end-to-end write against production Firebase project `tradedia-b6cb0` was not run locally (requires service account key in Railway Variables).

---

## 12. Signed `X-User-Context` Base64url Padding Fix, Stdout Logging & Proxy Diagnostics (2026-11-25)

- **Root Cause & Changes**:
  - `apps/analytics/app/api/auth.py` & `apps/web/src/server/routes/screenerProxyRoute.ts` (137 lines): Node's `Buffer.toString('base64url')` omits trailing `=` padding, while Python's `base64.urlsafe_b64decode()` requires length divisible by 4, throwing `401 Malformed signed X-User-Context payload.` for signed-in users whose context JSON byte length wasn't a multiple of 3. Fixed both sides (`auth.py` restores missing `=` padding before decoding; `screenerProxyRoute.ts` pads `ctxB64` before HMAC signing so rolling deploys work immediately).
  - `apps/analytics/tests/test_api.py`: Added regression assertions covering unpadded `X-User-Context` payloads across all length remainders.
  - `apps/web/src/features/screener/hooks/useSwingScanner.js` & `useStockAnalysis.js`: Scoped swing `universeLimit` to the user's tier (`100` Free / `200` Beginner / `500` Advanced, matching `SUBSCRIPTION_PLANS` and FastAPI `routes.py`) and avoided sending upstream `force_refresh=true` for Free retries so Free users never hit `403 ENTITLEMENT_DENIED` under `AUTH_MODE=service_token`.
  - `apps/analytics/app/main.py`: Directed `logging.basicConfig` to `stream=sys.stdout` so normal `INFO` logs (including `httpx` Upstox `200 OK` lines) are not flagged as errors in Railway.
  - `apps/web/src/server/routes/screenerProxyRoute.ts`: Added safe `err.cause` (including Node 22 `AggregateError`) logging and diagnostics.
- **Verification**:
  - `cd apps/web && npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `cd apps/web && npm test`: **PASS** (93 / 93 passed).
  - `cd apps/web && npm run build`: **PASS** (Vite SPA + `esbuild` `dist-server/server.mjs`).
  - `cd apps/analytics && .venv/bin/pytest tests -v`: **PASS** (48 / 48 passed, including new unpadded `X-User-Context` checks).
- **Checks NOT Executed**:
  - Live Railway redeploy verification and interactive browser checks require pushing to Railway.

---

## 13. Pricing Comparison Reordering, AI-Powered Layer Copy & Beginner AMO Support (2026-11-25)

- **Changes**:
  - `apps/web/src/features/pricing/pricingComparisonConfig.ts`: Moved `Paper Trading & Virtual Capital` to first (expanded by default) and `Stock Screener AI Powered` to second; preserved `Chart, strategy & technical stock analysis` and added `(AI-powered)` alongside it.
  - `apps/web/src/features/pricing/pricingConfig.ts`, `ProductHighlights.tsx`, `LandingScreener.tsx`, `LandingCTA.tsx`, `useLandingPage.ts`: Preserved all chart analysis, technical analysis, rule-based, and backtesting terms while adding `AI-powered` alongside them in key titles and descriptions.
  - `apps/web/src/lib/subscription.ts`, `useOrderExecution.ts`, `entitlementService.ts`: Enabled After-Market Orders (`allowAmoOrders: true`) on the `beginner` package across both UI gating and authoritative server validation, and updated Free-tier AMO upgrade prompts to require Beginner or Advanced.
  - `apps/web/src/utils/webhooksAndEntitlements.test.ts` & `pricing.test.ts`: Updated AMO entitlement assertions and added comparison order/title checks.
- **Verification**:
  - `cd apps/web && npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `cd apps/web && npm test`: **PASS** (94 / 94 passed).
  - `cd apps/web && npm run build`: **PASS** (Vite SPA + `esbuild` `dist-server/server.mjs`).
- **Checks NOT Executed**:
  - Interactive browser / visual check not executed locally.

---

## 14. Privacy-First Google Analytics 4 Integration (`VITE_GA_MEASUREMENT_ID`, 2026-11-27)

- **Existing Setup Audit**:
  - `apps/web/firebase-applet-config.json` already listed `"measurementId": "G-NTTB773KTH"` and `apps/web/src/lib/firebase.ts` forwarded it to `initializeApp`, but `firebase/analytics` (`getAnalytics`) and `gtag.js` were never imported or loaded anywhere. Firebase Analytics remains uninitialized so GA4 is exclusively managed by `apps/web/src/lib/analytics/` with consent gating and zero duplicate page views.
- **Changes**:
  - **Core GA4 & Consent Modules (`apps/web/src/lib/analytics/`)**:
    - `types.ts`, `sanitize.ts`, `consent.ts`, `ga4.ts`, `events.ts`, `useAnalyticsTracking.ts`, `index.ts`.
    - Enabled exclusively in Vite production builds (`import.meta.env.PROD === true`) when `VITE_GA_MEASUREMENT_ID` matches `/^G-[A-Z0-9]{6,20}$/i`.
    - Consent Mode v2 default-denied; injects `gtag.js` asynchronously only after explicit user consent (`tradedia_analytics_consent_v1`), respects `navigator.globalPrivacyControl`, and immediately sets `window['ga-disable-<id>'] = true` + updates consent to `denied` on withdrawal.
    - URL/query sanitization collapses `/trade/:symbol` and `/stocks/:symbol` to `/trade/:symbol`, normalizes canonical aliases, maps unknown paths to `/not-found`, strips URL hashes and all query parameters except safe UTM keys (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), and rejects values containing emails, JWTs, tokens, or payment IDs.
    - Defense-in-depth `sanitizeEventParams` strips PII, auth tokens, payment/order IDs, financial balances/amounts, and individual trading fields (symbols, quantities, prices, P&L).
    - `send_page_view: false` + consecutive sanitized `pageKey` deduplication eliminates duplicate SPA page views across initial load, canonical redirects, StrictMode effects, and stripped query updates.
    - Every storage, DOM, script, and `gtag` call is wrapped so failures or blockers never affect app behavior or performance.
  - **Consent UI & Privacy Transparency**:
    - `AnalyticsConsentBanner.tsx` (in `GlobalOverlays.tsx`), `AnalyticsPreferenceControl.tsx` (embedded in `LegalPageContent.tsx` Privacy Policy), and footer `Analytics Preferences` triggers in `LandingFooter.tsx` and `TradingWorkspace.tsx` (visible only when analytics is eligible in production).
  - **Event Instrumentation**:
    - Page views: `App.tsx` (`useAnalyticsTracking`).
    - Registrations & logins: `authModalService.ts`, `useSignUp.ts`, `useSignIn.ts` (`sign_up`, `login` — only `{ method }`, never fired on passive `onAuthStateChanged` restores).
    - Paper trading activity: `useOrderExecution.ts`, `useWalletActions.ts`, `useWatchlistActions.ts` (`paper_trade_activity` — categorical activity/product/order metadata only).
    - Stock screener usage: `useSwingScanner.js`, `useIntradayScanner.js`, `useStockAnalysis.js` (`screener_usage` — mode/action/trigger/view mode only, no symbols).
    - Chart pattern learning: `usePatternLesson.ts`, `PatternDemonstration.tsx`, `QuizApp.tsx` (`chart_pattern_learning`).
    - Quiz completions: `useQuizTrade.ts`, `useLandingChallenge.ts` (`quiz_completed` — computed outside React state updaters to avoid duplicate firing).
    - Successful subscriptions: `useRazorpayCheckout.ts` (`subscription_completed` on non-replay verified payments — plan tier, billing cycle, payment type, previous tier only; zero payment IDs or amounts).
  - **Env, Docker & Deployment Docs**:
    - Updated `apps/web/.env.example`, `apps/web/Dockerfile` (`ARG VITE_GA_MEASUREMENT_ID`), `compose.yaml`, and `docs/railway-deployment.md`.
- **Verification**:
  - `cd apps/web && npm run lint` (`tsc --noEmit`; ESLint is not configured): **PASS** (0 errors).
  - `cd apps/web && npm test`: **PASS** (101 / 101 passed, including 5 new suites in `apps/web/src/utils/analytics.test.ts`).
  - `cd apps/web && npm run build`: **PASS** (Vite client + esbuild server); verified Vite statically inlines `PROD: !0` and `VITE_GA_MEASUREMENT_ID: "G-NTTB773KTH"` when set at build time and leaves it disabled when unset.
  - Line-count check: every new and modified TS/TSX/JS application file is `<= 198` nonblank/non-comment lines.
- **Checks NOT Executed & Notes**:
  - Dedicated git branch creation was skipped because `.git/refs` is write-restricted in this sandbox environment; no commits were created.
  - Live interactive browser verification against GA4 Realtime (`G-NTTB773KTH`) and Railway Docker redeploy were not executed locally.
