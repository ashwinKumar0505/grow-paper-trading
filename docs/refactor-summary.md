# Refactoring & Production-Readiness Summary

## 1. Executive Summary

The comprehensive frontend, security, Razorpay payment/webhook, market-data provenance, chart/screener integration, and paper-trading production-readiness refactoring on branch `fix-analysed-code` has been completed in accordance with `AGENTS.md`, `NIFTYLENS_PRODUCT_ANALYSIS.md`, and `docs/refactor-plan.md`.

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
| `src/features/quiz/components/DogOutcomeIllustration.tsx` | 224 | Vector Artwork | Cohesive SVG vector illustration component for quiz outcome feedback. |

---

## 5. Remaining External Dependencies & Operational Risks

1. **Licensed Commercial Market-Data Feed**:
   - Production configuration safeguards block `mock_test` and unconfigured `yahoo_finance` in production (`NODE_ENV=production`). Before commercial launch, an authorized commercial NSE market-data adapter (e.g., Upstox, Angel One, FYERS, TrueData) must be plugged into `ProviderRegistry` and enabled via `MARKET_DATA_PROVIDER_ANALYTICS` / `MARKET_DATA_PROVIDER_PAPER_TRADING`.
2. **External Production Credentials**:
   - Production deployment requires setting `AUTH_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, `RESEND_API_KEY`, `OTP_FROM_EMAIL`, `RAZORPAY_KEY_ID` (`rzp_live_*`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SCREENER_SERVICE_SECRET`, and `ALLOWED_ORIGINS`.
3. **Firestore Rules Deployment**:
   - The hardened `firestore.rules` file in the repository root must be deployed to the production Firebase project (`firebase deploy --only firestore:rules`).
