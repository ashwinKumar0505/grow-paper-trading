# NiftyLens — Frontend, Security & Paper Trading Production Readiness Report

**Repository:** `/Users/ashwinkumar/grow-paper-trading`  
**Branch:** `fix-analysed-code`  
**Verification Status:** `npm run lint` (`tsc --noEmit`: 0 errors) · `npm test` (68/68 tests passed) · `npm run build` (`vite build`: passed)

---

## 1. Executive Summary

This report documents the end-to-end production-readiness refactoring of the NiftyLens React frontend, Node.js/Express server, Firebase Authentication & Firestore security rules, Razorpay payment/subscription/webhook integration, paper-trading ledger, screener API adapter, and Guess the Chart learning module.

Every P0/P1 vulnerability and misleading-data behavior identified during the audit and in `NIFTYLENS_PRODUCT_ANALYSIS.md` was verified against the live codebase, remediated in code, and covered by automated unit and integration tests:

1. **Zero Fabricated Financial Fallbacks (P0)**: Removed all production fallbacks that manufactured stock prices, historical candles, 5-level market depth, fundamental ratios, quarterly/annual financial statements (`"NSE Consolidated Filings"`), swing/intraday trading signals, or stock analysis scores when an API failed. Authentic cached data is now displayed with its original timestamp and an explicit stale-data warning; when no authentic cache exists, an explicit unavailable/error state with a retry button is shown.
2. **Reusable Market-Data Status Model & Provider Abstraction**: Introduced a unified `MarketDataStatus` (`LIVE`, `DELAYED`, `HISTORICAL`, `STALE`, `UNAVAILABLE`, `SYNTHETIC_EDUCATIONAL`) and decoupled Express from direct Yahoo Finance calls via a `MarketDataProvider` interface (`ProviderRegistry`) with separate domain policies for `stock_analytics`, `paper_trading`, `historical_replay`, and `educational_synthetic`.
3. **Authentication, Email OTP & Firestore Security (P0)**: Enforced Bearer token verification (`createRequireAuth`) across all private Express endpoints, deriving user identity strictly from verified tokens. Replaced browser-created `email_*` identities with a server-authoritative Email OTP flow featuring CSPRNG generation, salted `scrypt` hashing, 10-minute expiry, max 5 attempts lockout, 30-second server-side resend cooldown, IP/account rate limiting, replay prevention, and canonical identity resolution. Rewrote `firestore.rules` to deny-by-default, removing `email_*`/`user_*`/`google_*` prefix wildcards, locking down `users_by_email`, and blocking client mutation of server-controlled subscription, payment, and balance fields.
4. **Razorpay Payment, Webhook & Subscription Entitlement Security (P0)**: Removed all demo payment bypasses (`order_demo_*`, `pay_demo_*`, `sub_demo_*`, `NiftyLensDemoKey`). Enforced server-authoritative pricing, payment intent binding to the authenticated user, HMAC-SHA256 signature verification, amount/currency validation, cross-account hijack prevention, payment-ID idempotency, superseded subscription cancellation on Beginner-to-Advanced upgrades, raw-body verified webhook processing for all 8 lifecycle events, and backend entitlement enforcement with signed service-to-service tokens for the Python backend.
5. **Server-Authoritative Paper Trading Ledger & Historical Replay (P0/P1)**: Replaced the client-trusted `/api/paper-trading/sync` endpoint and volatile in-memory map with a durable, per-account locked server ledger (`DurableStore`, `tradingLedger.ts`). Moved pending-order evaluation and 15:20 IST intraday square-off to the server without fabricating fill prices at `entryPrice` during data outages (`squareOffPendingSymbols`). Built an isolated `HistoricalReplaySession` with its own simulation clock and strict look-ahead prevention. Fixed wallet top-up clamping on account restoration and monthly capital refresh accounting.
6. **Guess the Chart & Feature Label Alignment (P1)**: Scoped quiz history and stats per account (`uid` vs `guest`), synced authenticated progress to `/api/quiz/progress` and Firestore `users/{uid}/quiz_progress/main`, reconciled `stats.balance === startingBalance + netProfit`, replaced `$` labels with `₹` INR formatting, enforced `quizAllowHistoryDrawer`, unlocked the 8 Beginner templates on Free tier, labeled Tournament as a single-player 10-round challenge, and aligned all landing/pricing/screener copy (`21` patterns, `2-year` historical backtests, rule-based technical insights).

---

## 2. Files Modified and Created

### Created Backend & Shared Modules
- [src/server/app.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/app.ts) — Express app factory with security headers, CORS enforcement, 100kb body limit, raw-body capture, and error sanitization.
- [src/server/storage/durableStore.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/storage/durableStore.ts) — Atomic file-backed durable store with per-key async mutex locking (`withLock`) and audit log.
- [src/server/auth/authService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/auth/authService.ts) — Session JWT & Firebase ID token verification, token revocation, `scrypt` OTP hashing, and canonical user resolution.
- [src/server/auth/otpService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/auth/otpService.ts) — Hardened Email OTP lifecycle (CSPRNG, expiry, attempt limits, cooldown, rate limits, replay prevention).
- [src/server/middleware/security.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/middleware/security.ts) — `securityHeadersAndCors`, `createRateLimiter`, `createRequireAuth`, and `sanitizeErrorMessage`.
- [src/server/payments/razorpayService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/payments/razorpayService.ts) — Credential guards, server-authoritative pricing, payment verification, idempotency, upgrade cancellation, and 8-event webhook processor.
- [src/server/entitlements/entitlementService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/entitlements/entitlementService.ts) — Backend tier checks for orders, screeners, daily quotas, quiz modes, and signed Python service tokens.
- [src/server/providers/types.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/types.ts) — `MarketDataProvider` interface, capability descriptors, and policy types.
- [src/server/providers/symbolCatalog.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/symbolCatalog.ts) — NSE symbol & index catalog (`ZOMATO -> ZOMATO.NS`).
- [src/server/providers/marketDataPolicy.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/marketDataPolicy.ts) — Per-domain provider policy enforcement (`stock_analytics`, `paper_trading`, `historical_replay`, `educational_synthetic`).
- [src/server/providers/yahooFinanceProvider.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/yahooFinanceProvider.ts) — Configurable Yahoo Finance adapter with authentic open price extraction, stale-cache warnings, and explicit unavailable states.
- [src/server/providers/providerRegistry.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/providerRegistry.ts) — Pluggable provider registry with policy enforcement.
- [src/server/trading/tradingLedger.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/trading/tradingLedger.ts) — Authoritative server-side paper-trading ledger, order processor, monthly capital refresh, top-up credit/revocation, and 15:20 IST intraday square-off.
- [src/server/trading/historicalReplay.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/trading/historicalReplay.ts) — Isolated `HistoricalReplaySession` engine with simulation clock and look-ahead prevention.
- [src/server/routes/authRoutes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/routes/authRoutes.ts) — `/api/auth/*` endpoints.
- [src/server/routes/paymentRoutes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/routes/paymentRoutes.ts) — `/api/payments/*` and `/api/subscriptions/*` endpoints.
- [src/server/routes/paperTradingRoutes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/routes/paperTradingRoutes.ts) — `/api/paper-trading/*` and `/api/quiz/progress` endpoints.
- [src/server/routes/marketRoutes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/routes/marketRoutes.ts) — `/api/market/*` and `/api/screener/entitlement-token` endpoints.
- [src/lib/authSession.ts](file:///Users/ashwinkumar/grow-paper-trading/src/lib/authSession.ts) — Client Bearer token manager (`getAuthenticatedHeaders`, token exchange).
- [src/features/quiz/utils/quizStorage.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/utils/quizStorage.ts) — Account-scoped quiz storage keys, legacy cleanup, and balance reconciliation.

### Created Automated Test Suites
- [src/utils/securityAndAuth.test.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/securityAndAuth.test.ts)
- [src/utils/paymentsAndEntitlements.test.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/paymentsAndEntitlements.test.ts)
- [src/utils/paperTradingAndMarketData.test.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/paperTradingAndMarketData.test.ts)

### Key Modified Files
- [server.ts](file:///Users/ashwinkumar/grow-paper-trading/server.ts), [firestore.rules](file:///Users/ashwinkumar/grow-paper-trading/firestore.rules)
- [src/types/market.ts](file:///Users/ashwinkumar/grow-paper-trading/src/types/market.ts), [src/utils/marketHours.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/marketHours.ts), [src/utils/portfolioQuotes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/portfolioQuotes.ts), [src/utils/profileBilling.ts](file:///Users/ashwinkumar/grow-paper-trading/src/utils/profileBilling.ts), [src/data/mockStocks.ts](file:///Users/ashwinkumar/grow-paper-trading/src/data/mockStocks.ts)
- [src/components/auth/useAuthModal.ts](file:///Users/ashwinkumar/grow-paper-trading/src/components/auth/useAuthModal.ts), [src/components/checkout/razorpayApi.ts](file:///Users/ashwinkumar/grow-paper-trading/src/components/checkout/razorpayApi.ts), [src/components/checkout/useRazorpayCheckout.ts](file:///Users/ashwinkumar/grow-paper-trading/src/components/checkout/useRazorpayCheckout.ts), [src/components/checkout/CheckoutOrderSummary.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/components/checkout/CheckoutOrderSummary.tsx)
- [src/features/virtual-trading/services/marketData.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/services/marketData.ts), [StockChart.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/components/StockChart.tsx), [StockDepth.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/components/StockDepth.tsx), [StockFundamentals.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/components/StockFundamentals.tsx), [OrderQuoteHeader.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/components/OrderQuoteHeader.tsx), [useStockDetails.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useStockDetails.ts), [useOrderTicket.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useOrderTicket.ts), [useStockSelection.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useStockSelection.ts), [useMarketQuotes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useMarketQuotes.ts), [usePortfolioQuotes.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/usePortfolioQuotes.ts), [usePortfolioSummary.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/usePortfolioSummary.ts), [useOrderExecution.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useOrderExecution.ts), [useOrderEngine.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useOrderEngine.ts), [useIntradaySquareOff.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useIntradaySquareOff.ts), [useAccountSync.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useAccountSync.ts), [useSignIn.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useSignIn.ts), [useSignUp.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useSignUp.ts), [useSignOut.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useSignOut.ts), [useUsageQuota.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/hooks/useUsageQuota.ts), [portfolioSync.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/utils/portfolioSync.ts), [userProfileSync.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/virtual-trading/utils/userProfileSync.ts)
- [src/features/screener/api/client.js](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/api/client.js), [scanCache.js](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/utils/scanCache.js), [useSwingScanner.js](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/hooks/useSwingScanner.js), [useIntradayScanner.js](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/hooks/useIntradayScanner.js), [useStockAnalysis.js](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/hooks/useStockAnalysis.js), [FinancialsSection.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/components/FinancialsSection.jsx), [AnalysisAdvanced.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/components/AnalysisAdvanced.jsx), [AnalysisOverview.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/components/AnalysisOverview.jsx), [SwingScannerPage.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/pages/SwingScannerPage.jsx), [IntradayScannerPage.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/pages/IntradayScannerPage.jsx), [StockAnalysisPage.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/pages/StockAnalysisPage.jsx)
- [src/features/quiz/QuizApp.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/QuizApp.tsx), [useQuizState.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/hooks/useQuizState.ts), [useQuizSession.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/hooks/useQuizSession.ts), [useQuizTrade.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/hooks/useQuizTrade.ts), [usePatternLesson.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/hooks/usePatternLesson.ts), [ChartHeader.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/ChartHeader.tsx), [LearnChartsPage.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/LearnChartsPage.tsx), [PatternDemonstration.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/PatternDemonstration.tsx), [ModeSelectPage.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/ModeSelectPage.tsx), [QuizToolbar.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/QuizToolbar.tsx), [QuizHud.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/QuizHud.tsx), [ActionDock.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/ActionDock.tsx), [OutcomeNumbersGrid.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/OutcomeNumbersGrid.tsx), [OutcomeMinimizedBar.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/OutcomeMinimizedBar.tsx), [HistoryDrawer.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/HistoryDrawer.tsx), [HistoryTradeItem.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/HistoryTradeItem.tsx), [TournamentResultModal.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/quiz/components/TournamentResultModal.tsx)
- [src/lib/subscription.ts](file:///Users/ashwinkumar/grow-paper-trading/src/lib/subscription.ts), [src/features/pricing/pricingConfig.ts](file:///Users/ashwinkumar/grow-paper-trading/src/features/pricing/pricingConfig.ts), [ProductHighlights.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/pricing/components/ProductHighlights.tsx), and landing page components in `src/components/landing/*` & [src/components/LearningSection.tsx](file:///Users/ashwinkumar/grow-paper-trading/src/components/LearningSection.tsx)

---

## 3. Fake Market-Data Fallback Removals

| Issue / Component | Prior Behavior | Remediation | Status |
| :--- | :--- | :--- | :--- |
| **Pre-seeded fake server quote cache** | `server.ts` pre-seeded `lastKnownQuotes` and `lastKnownIndices` with static hardcoded prices (`RELIANCE: 1339.45`, `NIFTY 50: 23842.50`) and returned them as live data when Yahoo failed. | `YahooFinanceProvider` starts with an empty cache. Only authentic fetched quotes are cached; when an API fails and authentic cache exists, it is returned as `STALE` with its original `quoteTimestamp` and `staleWarning`. Otherwise `UNAVAILABLE` is returned. | **Fixed and tested** |
| **Fabricated 5-level market depth** | `generateRealisticDepth` and `generateMarketDepth` manufactured 5 bid/ask levels around `price` using pseudo-random trigonometry. | Removed `generateRealisticDepth` and `generateMarketDepth` from production paths. `YahooFinanceProvider.getMarketDepth()` returns `{ available: false, status: 'UNAVAILABLE' }`, and `StockDepth.tsx` renders an explicit "5-Level Market Depth Unavailable" state. | **Fixed and tested** |
| **Fabricated stock fundamentals** | `buildDefaultStock` and `useStockSelection` invented `marketCap: '₹25,000 Cr'`, `peRatio: 22.4`, `roe: 14.2`, `eps: price / 22.4` for unknown symbols. | Replaced with `createUnavailableFundamentals()` (`available: false`, nullable metrics) and updated `StockFundamentals.tsx` to display an explicit unavailable notice when fundamentals are not provided by the feed. | **Fixed and tested** |
| **Synthetic chart fallback on API error** | `fetchStockChart` and `StockChart.tsx` fell back to `generateHistoricalChart()` (random walk candles) when `/api/market/chart/:symbol` failed. | Removed `generateHistoricalChart` fallback from `marketData.ts` and `StockChart.tsx`. Chart errors now show an explicit "Historical Chart Data Unavailable" state with a Retry button, or display authentic cached candles with a stale warning banner. | **Fixed and tested** |
| **Fabricated Screener & Financials fallbacks** | `src/features/screener/api/client.js` contained `buildSwingFallback`, `buildIntradayFallback`, `buildStockAnalysisFallback`, and `buildFinancialsFallback` (which fabricated 4 years of revenue/profit labeled `"NSE Consolidated Filings"`). | Deleted all four fallback generators from `client.js`. When the Python screener backend is unreachable, hooks (`useSwingScanner`, `useIntradayScanner`, `useStockAnalysis`, `FinancialsSection`) either display previously fetched authentic cache with its original timestamp and stale warning or show an unavailable error state with a Retry button. Unverified `"NSE Consolidated Filings"` labels are sanitized. | **Fixed and tested** |
| **`ZOMATO` -> `SWIGGY.NS` mapping bug** | `SYMBOL_MAP.ZOMATO` was mapped to `'SWIGGY.NS'`, returning Swiggy's share price under Zomato's ticker. | Corrected `NSE_SYMBOL_CATALOG.ZOMATO.yahooSymbol` to `'ZOMATO.NS'` and added `'SWIGGY'` as its own catalog entry (`'SWIGGY.NS'`). | **Fixed and tested** |
| **Misleading `open` price in Yahoo adapter** | `YahooFinanceProvider` used `meta.previousClose` as `open` before `indicators.quote[0].open[0]`. | Updated `extractOpenPrice` to inspect `meta.regularMarketOpen`, `indicators.quote[0].open[0]`, and `validCloses[0]` before falling back to `previousClose`. | **Fixed and tested** |

---

## 4. Market-Data Provider Architecture

- **Provider Interface ([src/server/providers/types.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/types.ts))**:
  - Defines `MarketDataProvider` supporting `searchSymbols`, `getStockQuotes`, `getIndexQuotes`, `getHistoricalCandles`, `getIntradayCandles`, `getFundamentals`, `getMarketDepth`, and `getCapabilities`.
  - Every provider response wraps its payload in `ProviderResponse<T>` containing `MarketDataMetadata` (`status`, `source`, `providerId`, `quoteTimestamp`, `fetchedAt`, `delaySeconds`, `isStale`, `isFallback`, `isEligibleForExecution`, `staleWarning`).
- **Separate Domain Policies ([src/server/providers/marketDataPolicy.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/providers/marketDataPolicy.ts))**:
  - Supports independent provider selection and authorization guards for `stock_analytics`, `paper_trading`, `historical_replay`, and `educational_synthetic`.
  - **Production Safeguards**: In `NODE_ENV=production`, `mock_test` is strictly prohibited and `yahoo_finance` is blocked by default unless explicitly permitted for a non-commercial pilot (`ALLOW_DEV_MARKET_DATA_IN_PROD=true`) and explicitly authorized per use case (`AUTHORIZE_ANALYTICS_PROVIDER=true`, `AUTHORIZE_PAPER_TRADING_PROVIDER=true`). Authorizing a provider for stock analytics never automatically authorizes it for paper trading.

---

## 5. Authentication, OTP, and Firestore Security Changes

| Security Area | Prior Vulnerability | Remediation | Status |
| :--- | :--- | :--- | :--- |
| **Unprotected Express APIs** | `/api/payments/*`, `/api/subscriptions/*`, `/api/paper-trading/*` accepted arbitrary `userId` and `email` from request bodies/queries without token verification. | Added `createRequireAuth` middleware ([src/server/middleware/security.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/middleware/security.ts)) verifying either server-signed HMAC session JWTs or Google-signed Firebase ID tokens (`RS256` against Google SecureToken X.509 certificates). All protected endpoints derive identity strictly from `req.authUser`. | **Fixed and tested** |
| **Email OTP Authentication** | OTPs were stored in plain text in an in-memory `Map`, had no attempt limits, no server-side resend cooldown, no IP/account rate limiting, and the browser created a local `email_${sanitized}` UID without establishing an authenticated session. | Implemented `createAndSendEmailOtp` and `verifyEmailOtpAndCreateSession` ([src/server/auth/otpService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/auth/otpService.ts)): `crypto.randomInt(100000, 1000000)` CSPRNG, 16-byte random salt + `crypto.scryptSync` hash, `crypto.timingSafeEqual` verification, 10-min TTL, max 5 failed attempts invalidation, 30s resend cooldown, 5 sends / 15m per email, 10 sends / 15m per IP, immediate deletion on verification to prevent replay, canonical UID resolution (`usr_<sha256>`), signed session token issuance, and optional Firebase Custom Token generation. | **Fixed and tested** |
| **Account Takeover via Email Linking** | Client-side email lookup could link an arbitrary UID to an existing email address. | `resolveOrCreateCanonicalUser` ([src/server/auth/authService.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/auth/authService.ts)) enforces a single canonical user record per verified normalized email and ignores any `preferredUid` that belongs to a different email address. | **Fixed and tested** |
| **Firestore Security Rules** | `firestore.rules` allowed any signed-in or unauthenticated client matching `userId.matches('^email_.*')`, `^user_.*`, or `^google_.*` to read/write any user document, read/write `users_by_email`, and overwrite `subscriptionTier`, `balance`, or `razorpayPaymentId`. | Rewrote [firestore.rules](file:///Users/ashwinkumar/grow-paper-trading/firestore.rules) with deny-by-default rules: removed all prefix wildcards, required `request.auth != null && request.auth.uid == userId`, blocked client writes to `protectedServerFields()` (`subscriptionTier`, `subscriptionStatus`, `subscriptionExpiresAt`, `razorpayPaymentId`, `balance`, `initialBalance`, `paidTopUpCredit`, `holdings`, `intradayPositions`, `orders`), and locked down `users_by_email` to `allow read, write: if false;`. | **Fixed and tested** |
| **Express API Hardening** | Open `cors()`, 1MB JSON body limit, no rate limiting, and raw error messages. | Restricted CORS to configured `ALLOWED_ORIGINS` (and same-origin host), added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers, reduced JSON limit to `100kb`, added per-route rate limiters, and added `sanitizeErrorMessage` redacting API keys and tokens. | **Fixed and tested** |

---

## 6. Razorpay Payment, Webhook, and Subscription Entitlement Changes

| Payment / Entitlement Area | Prior Vulnerability | Remediation | Status |
| :--- | :--- | :--- | :--- |
| **Demo Payment Bypasses** | Server and client accepted `order_demo_*`, `sub_demo_*`, `pay_demo_*`, and `NiftyLensDemoKey` to activate paid Beginner/Advanced plans and +₹1L wallet top-ups without payment. | Removed all demo fallbacks from `paymentRoutes.ts`, `razorpayService.ts`, and `useRazorpayCheckout.ts`. Missing or demo credentials fail safely with `503 PAYMENT_GATEWAY_UNCONFIGURED`. Test keys (`rzp_test_*`) are blocked in production, and live keys (`rzp_live_*`) are blocked outside production. | **Fixed and tested** |
| **Server-Authoritative Pricing & Verification** | `/api/payments/verify` did not check whether the order/subscription belonged to the caller, did not validate amount/currency, and was not idempotent. | `create-order` and `create-subscription` record a durable `DurablePaymentIntent` bound to `req.authUser.uid` with server-computed `expectedAmountPaise`. `verifyAndActivatePayment` verifies the HMAC-SHA256 signature, blocks cross-account payment hijack (`403`), validates amount and currency, enforces system-wide `paymentId` idempotency (`processedPayments`), and persists entitlement/wallet changes transactionally under `store.withLock`. | **Fixed and tested** |
| **Webhook Reconciliation** | Webhook handler parsed JSON instead of verifying raw bytes, allowed unsigned webhooks if secret was missing, had no deduplication or out-of-order protection, and only handled 3 events. | `processRazorpayWebhook` verifies `X-Razorpay-Signature` against `req.rawBody`, rejects unverifiable webhooks (`503`/`400`), deduplicates via `processedWebhooks[dedupKey]`, tracks `lastSubscriptionEventTs` to ignore out-of-order older `subscription.*` events, and handles `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.charged`/`renewed`, `subscription.pending`/`halted`, `subscription.cancelled`, `subscription.completed`/`expired`, and `refund.processed`/`payment.refunded`. | **Fixed and tested** |
| **Beginner -> Advanced Upgrade** | Upgrading from Beginner to Advanced created a new subscription without cancelling the existing Beginner subscription, risking double billing, and UI copy implied proration. | `computeAuthoritativePrice` records `previousSubscriptionId` on differential upgrades, and `verifyAndActivatePayment` cancels the superseded Razorpay subscription upon verification. Checkout and FAQ copy explicitly describe the credit as a flat tier price differential (`Advanced − Beginner`). | **Fixed and tested** |
| **Backend Feature Entitlements** | Subscription tier checks were enforced only in React UI components. | Added `entitlementService.ts` enforcing Free/Beginner/Advanced rules on the server for order types (`MARKET`, `LIMIT`, `SL`, `SL-M`), products (`DELIVERY`, `INTRADAY`, `MTF`), AMO orders, manual portfolio resets, unpaid top-ups, daily stock analysis and quiz quotas, quiz modes/difficulties/history drawer, and screener force-refresh. Added `GET /api/screener/entitlement-token` issuing a signed short-lived HMAC token for the Python FastAPI backend. | **Fixed and tested** |

---

## 7. Paper-Trading Ledger, Order Engine, Replay, and Square-Off Changes

| Paper-Trading Area | Prior Issue | Remediation | Status |
| :--- | :--- | :--- | :--- |
| **Client-Trusted Portfolio Sync** | `POST /api/paper-trading/sync` accepted arbitrary client JSON (`balance`, `holdings`, `positions`, `orders`) into a volatile in-memory `Map`. | Replaced with a server-authoritative durable ledger (`src/server/trading/tradingLedger.ts`). Orders, cancellations, top-ups, resets, and watchlists are executed via authenticated server endpoints (`POST /api/paper-trading/orders`, `/orders/:id/cancel`, `/topup`, `/reset`, `/process-queue`) serialized by per-account locks (`store.withLock`). Legacy client state is migrated at most once (`migrateClientPortfolioOnce`). | **Fixed and tested** |
| **Intraday Square-Off Fabricated Fills** | At 15:20 IST, `useIntradaySquareOff.ts` fell back to `pos.entryPrice` if a live quote was missing, fabricating a zero-P&L fill during data outages. | Removed `pos.entryPrice` fallback. Both server (`processAccountBackgroundQueue`) and client check for an authentic quote (`status !== 'UNAVAILABLE'`). If unavailable at 15:20 IST, the symbol is recorded in `squareOffPendingSymbols` (recoverable pending state) and squared off automatically as soon as an authentic quote arrives. | **Fixed and tested** |
| **Historical Replay Isolation** | No separation existed between current-market paper trading and historical replay clock timing. | Implemented `HistoricalReplaySession` ([src/server/trading/historicalReplay.ts](file:///Users/ashwinkumar/grow-paper-trading/src/server/trading/historicalReplay.ts)) and `/api/paper-trading/replay/*` routes with an isolated order book and `simulationClockMs`. `getVisibleReplayCandles` filters `c.timestamp <= simulationClockMs` to prevent look-ahead bias, and `advanceHistoricalReplayClock` steps chronologically bar-by-bar. | **Fixed and tested** |
| **Wallet Top-Up Clamping Bug** | `useAccountSync.ts`, `useSignIn.ts`, `useSignUp.ts`, and `portfolioSync.ts` clamped restored balances to `SUBSCRIPTION_PLANS[tier].maxWalletLimit` (`₹1,00,000` on Free), erasing paid ₹50 (`+₹1,00,000`) top-ups on reload. | Added `paidTopUpCredit` to user/ledger records and created `computeEffectiveWalletCap` so verified paid top-ups raise the effective restoration cap (`maxWalletLimit + paidTopUpCredit`). | **Fixed and tested** |
| **Monthly Capital Refresh Accounting** | `useUsageQuota.ts` overwrote `balance = planConfig.defaultStartingCash` on month rollover while keeping open holdings and positions, creating or destroying virtual equity. | `applyMonthlyCapitalRefreshIfDue` (server) and `useUsageQuota.ts` (client) now compute total committed capital (`cash + holdingsNetInvested + intradayMargin + reservedOrders`) and credit only any shortfall below `defaultStartingCash + paidTopUpCredit`. | **Fixed and tested** |

---

## 8. Guess the Chart and Learning Progress Fixes

| Quiz / Learning Area | Prior Issue | Remediation | Status |
| :--- | :--- | :--- | :--- |
| **Cross-Account Quiz Leakage** | Quiz stats, trade history, and survival streaks used global `localStorage` keys (`tradeplaybook_india_quiz_stats_v1`, `tradeplaybook_india_stats_v1`), leaking Account A's progress into Account B or Guest. | Created `src/features/quiz/utils/quizStorage.ts` scoping all keys by `uid` (`niftylens_quiz_stats_v2_${scope}` where `scope` is `user.uid` or `'guest'`), migrating legacy keys at most once and deleting unscoped keys. Added authenticated server sync (`GET/PUT /api/quiz/progress`) and Firestore sync (`users/{uid}/quiz_progress/main`). | **Fixed and tested** |
| **`stats.balance` Drift** | `useQuizTrade.ts` updated `netProfit`, `wins`, and `losses` in Quiz mode without updating `stats.balance`, leaving `balance` stuck at `10000`. | Fixed `useQuizTrade.ts` and `reconcileUserStats` so `stats.balance` always equals `Math.max(0, startingBalance + netProfit)`. | **Fixed and tested** |
| **Currency & Feature Gating Mismatches** | Quiz components displayed `$` (`+$1,200`, `$10k -> $25k`) alongside `₹`, left History Drawer open on all tiers despite `quizAllowHistoryDrawer: false` on Free/Beginner, and unlocked Intermediate patterns in the first 8 Free slots. | Replaced all `$` labels in Quiz components with `₹` INR formatting (`formatINR`), gated History Drawer behind `planConfig.quizAllowHistoryDrawer`, updated `usePatternLesson.ts` to unlock the 8 `Beginner`-difficulty patterns on Free tier, labeled Tournament as a single-player 10-round challenge, and added `Synthetic Educational Chart` badges in `ChartHeader.tsx`, `PatternDemonstration.tsx`, and `LandingChallengePreview.tsx`. | **Fixed and tested** |

---

## 9. UI, Marketing, and Backend Contract Updates

- **Pattern Count Alignment (`28+` -> `21`)**: Updated all references across `subscription.ts`, `pricingConfig.ts`, `ProductHighlights.tsx`, `LearnChartsPage.tsx`, `LandingHero.tsx`, `LandingLearn.tsx`, `LandingCTA.tsx`, `useLandingPage.ts`, and `LearningSection.tsx` to `21` interactive chart patterns (matching the 21 templates in `PATTERN_TEMPLATES`). (**Fixed and tested**)
- **Analysis & Backtest Claims (`AI-Powered` / `5-Year` -> `Rule-Based Technical` / `2-Year`)**: Replaced unsupported `"AI-Powered"` / `"AI Stock Screener"` / `"5-year strategy backtests"` claims across landing, pricing, and screener pages with accurate `"Rule-Based Technical"`, `"Quantitative Insights"`, and `"2-year historical strategy backtests"` descriptions. Added an `"Illustrative Sample Preview — Not a Live Scan"` badge on `ScreenerLivePreviewCard.tsx`. (**Fixed and tested**)
- **Beginner Support/Resistance Unlock**: Moved `<AnalysisTradePlan data={data} />` in [AnalysisAdvanced.jsx](file:///Users/ashwinkumar/grow-paper-trading/src/features/screener/components/AnalysisAdvanced.jsx) from `isAdvanced && planConfig.analysisAllowAdvancedMode` to `planConfig.analysisAllowFinancialsAndLevels`, so Beginner subscribers receive the Support/Resistance levels included in their plan. (**Fixed and tested**)

---

## 10. Test Coverage and Verification Results

| Verification Step | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **TypeScript Type Check** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Full type check across React frontend, Express backend, and test suites. (Note: ESLint is not configured in `package.json`; `npm run lint` runs `tsc --noEmit`.) |
| **Automated Test Suite** | `npm test` (`node --import tsx --test src/utils/*.test.ts`) | **PASS (68 / 68 passed)** | Runs `orderEngine.test.ts`, `securityAndAuth.test.ts`, `paymentsAndEntitlements.test.ts`, `paperTradingAndMarketData.test.ts`, `pricing.test.ts`, `profileBilling.test.ts`, `portfolioQuotes.test.ts`, `screenerSignals.test.ts`, `patternCatalog.test.ts`, and `evaluatePrediction.test.ts`. |
| **Production Build** | `npm run build` (`vite build`) | **PASS (493ms)** | Emits production client bundle cleanly into `dist/`. |

---

## 11. Required Environment Variables

Configure the following environment variables in production before launch:

```dotenv
# Runtime & CORS
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://niftylens.in,https://www.niftylens.in

# Authentication & Session Security
AUTH_SESSION_SECRET=<32+ byte high-entropy random secret>
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0644864015
FIREBASE_PROJECT_ID=gen-lang-client-0644864015
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=<firebase-adminsdk@...iam.gserviceaccount.com>
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email OTP Delivery (Resend)
RESEND_API_KEY=re_<production_resend_api_key>
OTP_FROM_EMAIL="NiftyLens <auth@niftylens.in>"

# Razorpay Production Credentials
RAZORPAY_KEY_ID=rzp_live_<production_key_id>
RAZORPAY_KEY_SECRET=<production_key_secret>
RAZORPAY_WEBHOOK_SECRET=<production_webhook_secret>
RAZORPAY_PLAN_BEGINNER_MONTHLY=plan_<id>
RAZORPAY_PLAN_BEGINNER_YEARLY=plan_<id>
RAZORPAY_PLAN_ADVANCED_MONTHLY=plan_<id>
RAZORPAY_PLAN_ADVANCED_YEARLY=plan_<id>

# Service-to-Service Screener Entitlement Secret (shared with Python FastAPI backend)
SCREENER_SERVICE_SECRET=<32+ byte shared HMAC secret>
VITE_SCREENER_API_URL=https://api.niftylens.in/api/v1

# Market-Data Provider & Authorization Policy
MARKET_DATA_PROVIDER_ANALYTICS=<licensed_provider_id>
MARKET_DATA_PROVIDER_PAPER_TRADING=<licensed_provider_id>
MARKET_DATA_PROVIDER_REPLAY=<licensed_provider_id>
AUTHORIZE_ANALYTICS_PROVIDER=true
AUTHORIZE_PAPER_TRADING_PROVIDER=true
AUTHORIZE_HISTORICAL_REPLAY_PROVIDER=true
ENABLE_LIVE_PAPER_TRADING=true

# Durable Server Ledger Storage Path
NIFTYLENS_STORAGE_PATH=/var/lib/niftylens/niftylens-store.json
```

---

## 12. Firestore Rules Deployment Instructions

1. Verify the updated [firestore.rules](file:///Users/ashwinkumar/grow-paper-trading/firestore.rules) file in the repository root.
2. Authenticate with Firebase CLI and select the target project:
   ```bash
   npx firebase-tools login
   npx firebase-tools use gen-lang-client-0644864015
   ```
3. Validate and deploy the rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
4. If migrating existing Email OTP users whose legacy Firestore documents were stored under `users/email_<sanitized>`, run a one-time Firebase Admin migration copying their profile fields to their canonical UID (`canonicalEmailUid(email)` -> `usr_<sha256_prefix>`) before disabling legacy support.

---

## 13. Razorpay Production Configuration Checklist

1. **Live API Keys**: Generate Live Mode API keys (`rzp_live_*`) in the Razorpay Dashboard and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the Express server. Never expose `RAZORPAY_KEY_SECRET` to client `VITE_*` variables.
2. **Subscription Plans**: Create the 4 recurring plans in Razorpay Live Mode (`Beginner Monthly ₹299`, `Beginner Yearly ₹2,899`, `Advanced Monthly ₹699`, `Advanced Yearly ₹6,699`) and set their `plan_*` IDs in environment variables.
3. **Webhook Endpoint**: Configure a live webhook in Razorpay Dashboard pointing to `https://<your-domain>/api/payments/webhook` with a dedicated `RAZORPAY_WEBHOOK_SECRET` and enable these events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.pending`
   - `subscription.halted`
   - `subscription.cancelled`
   - `subscription.completed`
   - `refund.processed`

---

## 14. Remaining External Dependencies, Commercial Market-Data Licensing Requirements, and Unresolved Risks

| Item | Classification | Description & Required Action |
| :--- | :--- | :--- |
| **Commercial NSE Market-Data Feed Adapter** | **Blocked by external dependency** | Yahoo Finance unofficial endpoints are restricted for commercial redistribution and paper-trading execution. The codebase now includes `MarketDataProvider`, `ProviderRegistry`, and `marketDataPolicy.ts` (which blocks Yahoo Finance in `NODE_ENV=production` by default). Before commercial launch, obtain an authorized data license (e.g., TrueData, NSE authorized vendor, or broker API where permitted by terms) and register its adapter in `ProviderRegistry`. |
| **Python Screener Backend Coordination** | **Fixed but not runtime verified** | The Express server now issues signed short-lived entitlement tokens (`GET /api/screener/entitlement-token`) and `src/features/screener/api/client.js` attaches `Authorization: Bearer <token>` and handles the new provenance/methodology fields. End-to-end runtime verification with the separate Python FastAPI repository (`/Users/ashwinkumar/trade-bot/backend`) should be performed once both services are deployed together. |
| **Multi-Instance Distributed Database for `DurableStore`** | **Fixed and tested** (Single-Node) / **Partially fixed** (Multi-Node Horizontal Scaling) | `DurableStore` replaces volatile in-memory maps with atomic file persistence (`writeFileSync` + `renameSync`) and per-account async mutex locking (`withLock`). For single-instance deployment with a persistent volume (`NIFTYLENS_STORAGE_PATH`), this is durable and race-free. If scaling horizontally across multiple stateless container replicas, back `DurableStore` with Firebase Admin Firestore transactions or PostgreSQL/Redis. |
| **Firebase Emulator Live Rule Execution** | **Fixed and tested** (Static Policy & Structural Verification) | `firestore.rules` has been rewritten to deny-by-default and verified via automated policy assertions in `src/utils/securityAndAuth.test.ts`. Running against a live local Java Firebase Firestore Emulator (`firebase emulators:exec`) requires the Firebase CLI + Java runtime in the CI pipeline. |
