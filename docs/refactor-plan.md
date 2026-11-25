# Frontend, Security & Paper Trading Production-Readiness Plan

## 1. Audit and Baseline

Working on branch `fix-analysed-code` in `/Users/ashwinkumar/grow-paper-trading`.
Stack: React 19, TypeScript, Vite 8, Tailwind CSS 4, Node.js/Express backend (`server.ts` / `src/server/app.ts`), Firebase Authentication & Firestore (`firestore.rules`), Razorpay checkout & webhooks, and paper-trading engine (`src/utils/orderEngine.ts` + `src/server/trading/*`).

The objective is to resolve all production-readiness, security, data-provenance, payment-verification, paper-trading ledger, chart/screener integration, and feature-label issues identified in `TRADEDIA_PRODUCT_ANALYSIS.md` while keeping every refactored application file at `<= 200` lines in accordance with `AGENTS.md`.

## 2. Production-Readiness Stages & Progress

- [x] **Stage 1 — Market-Data Status Model, Provider Abstraction & Fake Fallback Removal (P0)**:
  - Introduced `MarketDataStatus` (`LIVE`, `DELAYED`, `HISTORICAL`, `STALE`, `UNAVAILABLE`, `SYNTHETIC_EDUCATIONAL`) and `MarketDataMetadata` in `src/types/market.ts`, `src/utils/marketCalendar.ts`, and `src/utils/marketFreshness.ts`.
  - Created provider interface & registry (`src/server/providers/types.ts`, `symbolCatalog.ts`, `marketDataPolicy.ts`, `diskCacheReader.ts`, `yahooHttpClient.ts`, `yahooFinanceProvider.ts`, `providerRegistry.ts`).
  - Updated active NSE symbol mappings (`ZOMATO -> ETERNAL.NS`, `TATAMOTORS -> TMPV.NS`), added local `raw_ohlcv` CSV disk cache fallback and bounded concurrency in `YahooFinanceProvider`, removed pre-seeded fake quote cache, and removed fabricated 5-level market depth and fundamentals.
  - Extracted `useStockChartData.ts` (`<= 145` lines) and updated `marketData.ts`, `StockChart.tsx`, `StockDepth.tsx`, `StockFundamentals.tsx`, and `useStockDetails.ts`.
  - Split screener API into `src/features/screener/api/adapters.js` and `src/features/screener/api/client.js` (`<= 195` lines each) with zero fabricated fallback generators and explicit stale-cache warnings or unavailable states.
- [x] **Stage 2 — Authentication, OTP & Firestore Security (P0)**:
  - Modularized auth & OTP into `src/server/auth/tokenService.ts`, `src/server/auth/authService.ts`, `src/server/auth/otpMailer.ts`, and `src/server/auth/otpService.ts` (`<= 195` lines each) with CSPRNG OTP generation, salted `scrypt` hashing, 10-minute expiry, max 5 attempts invalidation, 30-second resend cooldown, per-account and per-IP rate limiting, replay prevention, canonical user resolution, and signed session/Firebase token verification.
  - Rewrote `firestore.rules` with a deny-by-default approach removing unauthenticated prefix wildcards (`email_*`, `user_*`, `google_*`), locking down `users_by_email`, and blocking client mutation of protected server fields (`subscriptionTier`, `balance`, `razorpayPaymentId`, `paidTopUpCredit`, etc.).
  - Added Express CORS origin enforcement, security headers, 100kb payload limit, rate limiting, and error sanitization in `src/server/middleware/security.ts`.
- [x] **Stage 3 — Razorpay Payments, Webhooks & Entitlements (P0)**:
  - Modularized Razorpay server integration into `src/server/payments/razorpayConfig.ts`, `src/server/payments/razorpayVerification.ts`, `src/server/payments/razorpayWebhook.ts`, and `src/server/payments/razorpayService.ts` (`<= 195` lines each).
  - Modularized entitlement verification into `src/server/entitlements/screenerAndQuizEntitlements.ts` and `src/server/entitlements/entitlementService.ts` (`<= 145` lines each).
  - Split Express payment routes into `src/server/routes/paymentOrderRoutes.ts`, `src/server/routes/subscriptionManageRoutes.ts`, and `src/server/routes/paymentRoutes.ts` (`<= 195` lines each).
- [x] **Stage 4 — Server-Authoritative Paper Trading Ledger & Historical Replay (P0/P1)**:
  - Split durable storage into `src/server/storage/durableTypes.ts` and `src/server/storage/durableStore.ts` (`<= 180` lines each).
  - Split authoritative trading ledger into `src/server/trading/ledgerCapital.ts`, `src/server/trading/ledgerOrders.ts`, `src/server/trading/ledgerWalletAndQueue.ts`, `src/server/trading/ledgerQueueProcessor.ts`, and barrel `src/server/trading/tradingLedger.ts` (`<= 190` lines each).
  - Split Express trading & market routes into `src/server/routes/paperTradingRoutes.ts`, `src/server/routes/quizProgressRoutes.ts`, `src/server/routes/marketRoutes.ts`, and `src/server/routes/screenerProxyRoute.ts` (`<= 195` lines each).
- [x] **Stage 5 — Guess the Chart & Learning Progress (P1)**:
  - Modularized account-scoped quiz storage and remote sync into `src/features/quiz/utils/quizStatsReconciler.ts`, `src/features/quiz/utils/quizStorage.ts`, `src/features/quiz/utils/quizRemoteSync.ts`, and `src/features/quiz/hooks/useQuizState.ts` (`<= 180` lines each).
- [x] **Stage 6 — Frontend Feature Hooks, Services & Pricing Modularization (`<= 200` Lines)**:
  - Extracted reusable services `src/components/auth/authModalService.ts`, `src/features/virtual-trading/utils/portfolioRemoteAdapter.ts`, `src/features/virtual-trading/utils/accountRestore.ts`, `src/features/virtual-trading/services/paperTradingApi.ts`, `src/features/virtual-trading/services/subscriptionPersistence.ts`, `src/features/pricing/pricingComparisonConfig.ts`, and `src/types/portfolioTypes.ts` so every refactored hook, service, and config file is `<= 200` total lines.
- [x] **Stage 7 — Comprehensive Automated Tests & Final Verification**:
  - Split new test suites into 7 focused `<= 200`-line test files (`securityAndAuth.test.ts`, `otpAndFirestoreRules.test.ts`, `paymentsAndEntitlements.test.ts`, `webhooksAndEntitlements.test.ts`, `paperTradingAndMarketData.test.ts`, `walletMarketAndQuiz.test.ts`, `walletPersistence.test.ts`).
  - Wired Paper Wallet top-up (`POST /api/paper-trading/wallet/topup`), manual reset (`POST /api/paper-trading/wallet/reset`), and authoritative profile/ledger sync (`GET /api/account/profile`, `POST /api/paper-trading/sync`) so upgrades, top-ups, and resets persist across logins and dev server restarts.
  - Verified `npm run lint` (`tsc --noEmit`: 0 errors), `npm test` (69/69 PASS), and `npm run build` (`vite build`: PASS).

## 3. Justified Files Over 200 Nonblank/Non-Comment Lines

Every backend service, route, provider, storage engine, entitlement module, frontend hook, API adapter, and test suite written or refactored in this pass is `<= 200` total lines. The only remaining files over 200 lines in the repository are pre-existing cohesive financial engines, canvas/SVG renderers, and static datasets documented in `docs/refactor-summary.md`.

## 4. Rebrand to Tradedia (2026-11-22)

- [x] Replaced user-facing Nifty Lens branding with Tradedia, swapped in the new logo (`public/images/landing/logo*.png`), and updated SEO metadata around "One Place to Learn Trading". Follow-up: storage keys, server setting names, store file, demo-key check and report documents renamed with backward-compatible migration/fallbacks. Details and risks are in `docs/refactor-summary.md` §6. lint/test/build: PASS.

## 5. Market-Data Migration: Yahoo Finance / yfinance → Upstox Analytics Token (2026-11-22, branch `upstox-implementation`)

- [x] **Frontend / Express (`grow-paper-trading`)**:
  - Replaced default active dev provider with `UpstoxMarketDataProvider` (`src/server/providers/upstoxTypes.ts`, `upstoxHttpClient.ts`, `upstoxNormalizer.ts`, `upstoxQuotes.ts`, `upstoxCandles.ts`, `upstoxProvider.ts`; every new/modified file `<= 195` code lines).
  - Enforced server-side read-only `UPSTOX_ANALYTICS_TOKEN` ONLY (no daily OAuth substitution, no `VITE_*` exposure, no token logging), shared-account rate limiting, request deduplication, bounded timeouts, retries with backoff on `429`/`5xx`, and `401`/`403` auth cooldown.
  - Added verified NSE ISIN / Upstox instrument mapping for all 59 catalog entries (preserving aliases `ZOMATO -> ETERNAL`, `TATAMOTORS -> TMPV`) and all 5 indices (`NIFTY 50`, `SENSEX`, `BANK NIFTY`, `NIFTY IT`, `NIFTY AUTO`), keeping Upstox instrument keys internal.
  - Switched active portfolio/background queue lookups in `app.ts` and `paperTradingRoutes.ts` to bulk `getStockQuotes()`.
  - Enforced provider-scoped disk CSV reading (`diskCacheReader.ts`) and v4 provider-aware browser `scanCache.js` (purging legacy v3 Yahoo entries) so Yahoo caches are never presented as Upstox data.
  - Retained `YahooFinanceProvider` as explicit rollback (`MARKET_DATA_PROVIDER=yahoo_finance`).
  - Added unit/integration suites (`src/utils/upstoxProvider.test.ts`, `src/utils/upstoxIntegration.test.ts`).
- [x] **Python Analytics Backend (`grow-paper-trading-backend/backend`)**:
  - Implemented `UpstoxHttpClient`, `UpstoxInstrumentResolver`, `upstox_financials.py` (crore → INR rupee conversion via `units_in`, provider-scoped `financials_upstox_{symbol}.json`), and `UpstoxMarketDataProvider` (V3 historical + intraday merging, bounded concurrency, rate limits, honest commercial/realtime flags) behind `MarketDataProvider`.
  - Added provider compatibility verification in `artifact_store.py` (preserving legacy `backtest_report.json` while refusing to serve it under `upstox`), provider-scoped scan artifacts, and strict corporate-action guard failing closed on unverified `PRICE_ADJUSTMENT_POLICY=SPLIT_AND_DIVIDEND_ADJUSTED` until live verification or explicit policy selection (`SPLIT_ADJUSTED_ONLY` / `UNADJUSTED_RAW`).
  - Added `backend/scripts/verify_upstox_live.py` and `backend/tests/test_upstox_provider.py`.
- [x] **Live Read-Only Upstox & Corporate-Action Verification (2026-11-22)**:
  - Verified live read-only Upstox Analytics Token responses across 59/59 Node catalog equities, 500/500 NIFTY 500 ISINs, 5/5 indices, all 9 chart timeframes (`1D`–`ALL`), search (`ZOMATO -> ETERNAL`), yearly/quarterly financials with rupee conversion (`HDFCBANK`, `RELIANCE`, `ZOMATO`, `TATAMOTORS`), and 2y daily / 15m intraday candles.
  - Empirically verified corporate-action behaviour (`RELIANCE`, `HDFCBANK`, `COALINDIA`, `ITC`): Upstox V3 historical candles are **split/bonus-adjusted (`SPLIT_ADJUSTED_ONLY`)** and **NOT cash-dividend or demerger-adjusted** (not equivalent to Yahoo `auto_adjust=True`). Python backend remains safely fail-closed under `PRICE_ADJUSTMENT_POLICY=SPLIT_AND_DIVIDEND_ADJUSTED` pending user confirmation to switch to `SPLIT_ADJUSTED_ONLY`.
- [ ] **Remaining External Verification**:
  - Interactive Chrome UI verification (blocked: Chrome remote debugging `DevToolsActivePort` not active on host).
  - User decision on `PRICE_ADJUSTMENT_POLICY=SPLIT_ADJUSTED_ONLY` + running an Upstox walk-forward backtest (`run_backtests.py`) to replace `UNVALIDATED` status.

## 6. Quiz Mobile Layout & Stock Details Market Depth / Fundamentals (2026-11-23)

- [x] **Quiz Arena Mobile UX (`MobileQuizBar.tsx`, `MobileQuizOptionsDrawer.tsx`, `QuizApp.tsx`, `QuizToolbar.tsx`, `ChartHeader.tsx`, `TradingCanvas.tsx`, `ActionDock.tsx`, `src/index.css`)**:
  - Replaced stacked mobile toolbar/chart-header controls (`< md`) with a single slim top bar showing trade/score HUD and an expandable `Options` drawer closed by default (`aria-expanded="false"`), keeping the chart and UP/DOWN buttons front and center while preserving the full desktop (`md+`) toolbar & header layout.
  - Compacted mobile canvas telemetry + zoom into a single non-wrapping strip (`₹` currency aligned) and tightened mobile `ActionDock` spacing/min-height.
- [x] **Stock Details Market Depth & Fundamentals (`upstoxTypes.ts`, `upstoxHttpClient.ts`, `upstoxNormalizer.ts`, `upstoxFundamentals.ts`, `upstoxProvider.ts`, `marketRoutes.ts`, `useMarketQuotes.ts`, `useStockSelection.ts`, `useStockDetails.ts`, `StockDepth.tsx`, `StockFundamentals.tsx`)**:
  - Parsed authentic 5-level NSE bid/ask order book (`depth.buy`, `depth.sell`, `total_buy_quantity`, `total_sell_quantity`) directly from Upstox `/v2/market-quote/quotes` and rendered clean `—` placeholders for empty levels and accurate empty-book messaging when closed.
  - Removed the Market Depth section from `StockDetailView.tsx` and added `StockAnalysisBanner.tsx` after the `About` card linking directly to `/screener/analysis?symbol=<SYMBOL>`.
  - Integrated authentic Upstox `/v2/fundamentals/{isin}/key-ratios`, `/profile`, and `/corporate-actions` (cached 6h) in `GET /api/stocks/:symbol` and `UpstoxMarketDataProvider.getFundamentals()` for Market Cap, P/E, Industry P/E, P/B, ROE, ROCE, ROA, EPS, Book Value, trailing 365-day Dividend Yield, and company profile (omitting unprovided `Debt to Equity` rather than fabricating from total liabilities).
  - Verified live read-only against Upstox (`INFY`, `RELIANCE`, `HDFCBANK`, `TCS`) and automated checks (`npm run lint`, `npm test` 91/91 PASS, `npm run build`).


## 7. Monorepo Restructure, Image Optimization & Railway Deployment Readiness (2026-11-25, branch `railway-deploy-ready`)

- [x] **Monorepo Layout (`apps/web/`, `apps/analytics/`, `firebase/`, `compose.yaml`, `.github/workflows/ci.yml`)**:
  - Moved the React + Express BFF app into `apps/web/` (Node 22 + `package-lock.json` + `esbuild` production server bundle + `Dockerfile` + `railway.json`).
  - Copied `/Users/ashwinkumar/grow-paper-trading-backend/backend` cleanly into `apps/analytics/` (original folder left untouched), added `apps/analytics/README.md`, locked Python dependencies with `uv.lock`, configured `uv sync --frozen` in `apps/analytics/Dockerfile`, updated remaining `NiftyLens` titles/log lines to `Tradedia`, and made `apps/analytics/tests/test_api.py` self-contained against isolated `tmp_path` caches.
  - Moved `firestore.rules` and `firebase-blueprint.json` into `firebase/` and updated `apps/web/src/utils/otpAndFirestoreRules.test.ts` + `apps/web/src/server/providers/diskCacheReader.ts` relative paths.
  - Added root `compose.yaml` (local multi-service Docker setup mirroring Railway) and `.github/workflows/ci.yml` (web + analytics CI).
- [x] **Landing & Quiz Image Optimization (Lossless + Lazy Loading)**:
  - Re-encoded the six original 1254×1254 PNG illustrations (`hero-trading`, `virtual-trading`, `stock-screener`, `interactive-learning`, `quiz-success`, `quiz-failure`) with `cwebp -lossless -z 6` at full 1254×1254 resolution (100% pixel-identical quality, shrinking total from **11.3 MB** to **7.8 MB**, ~31% lossless savings).
  - Upgraded `FloatingIllustration.tsx` with `IntersectionObserver` (`250px` rootMargin) + native `loading="lazy"` + `decoding="async"` + pulse placeholder and fade-in transition so below-the-fold illustrations fetch zero bytes until scrolled near while keeping `LandingHero` eager (`fetchPriority="high"`).
- [x] **Frontend & Repo Cleanup**:
  - Removed four unreferenced React components (`ScreenerLivePreviewCard.tsx`, `ScreenerPreviewSwingTab.tsx`, `ScreenerPreviewIntradayTab.tsx`, `DogOutcomeIllustration.tsx`), unused AI Studio screenshots (`public/assets/aistudio/`, `.aistudio/`), empty `public/assets/landing/`, raw `public/images/landing/logo.png`, stale `metadata.json`, stale `bun.lock`, and unused packages (`@google/genai`, `autoprefixer`).
  - Untracked `.data/tradedia-store.json` from git (preserving local disk file) and updated `.gitignore`.
- [x] **Railway Deployment Readiness**:
  - Added `esbuild` production server bundle (`npm run build:server` -> `dist-server/server.mjs`, `npm start` -> `node dist-server/server.mjs`), bumped `esbuild` to `^0.28.0` to satisfy `vite@8` peer optional range, and generated `apps/web/package-lock.json`.
  - Added `app.set('trust proxy', 1)` and `GET /api/health` in `apps/web/src/server/app.ts`, graceful `SIGTERM`/`SIGINT` shutdown + static asset caching in `apps/web/server.ts`, updated Firebase project ID fallback to `tradedia-b6cb0` in `apps/web/src/server/auth/tokenService.ts`, standardized `SERVICE_AUTH_SECRET` across proxy/entitlements, and guarded `localhost` screener fallbacks to non-production builds.
  - Documented the full Railway deployment runbook in `docs/railway-deployment.md`.
