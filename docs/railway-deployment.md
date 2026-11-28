# Deploying Tradedia on Railway

This repository uses a clean two-service monorepo layout designed for isolated Railway builds:

- **`tradedia-web`** (`apps/web/`): Public Node 22 + Express BFF serving the built Vite SPA (`dist/`), `/api/*`, and the HMAC-signed reverse proxy at `/api/v1/*`.
- **`tradedia-analytics`** (`apps/analytics/`): Private Python 3.11 + FastAPI + Uvicorn (`--workers 1`, locked with `uv.lock`) powering the NIFTY 500 swing/intraday scanners, single-stock analysis, financials, and walk-forward backtester.
- **`firebase/`**: Firestore security rules (`firebase/firestore.rules`) and schema blueprint.

---

## 1. Push Your Branch / Merge to `main`

1. Review `git status` on branch `railway-deploy-ready`.
2. Commit and push to GitHub (and merge into `main`, or point Railway to your chosen branch).

---

## 2. Create One Railway Project with Two Services

In the Railway Dashboard, click **New Project → Deploy from GitHub Repo** and select your repository. Create **two services** from the same repo:

### Service 1: `tradedia-analytics` (Deploy FIRST — Private Only)
1. **Settings → Source**:
   - **Root Directory**: `apps/analytics`
   - **Watch Paths**: `apps/analytics/**`
   - *(Automatically uses `apps/analytics/railway.json` and `apps/analytics/Dockerfile` with `uv.lock`, healthcheck `GET /api/v1/health`.)*
2. **Settings → Networking**:
   - **Do NOT generate a public domain** (keep it private on Railway's internal network).
   - Note its internal hostname: `tradedia-analytics.railway.internal`.
3. **Settings → Deploy**:
   - **Replicas**: `1` *(required while using local Volume cache + in-process 5-min intraday scheduler)*.
4. **Volumes → Add Volume**:
   - **Mount Path**: `/data/cache`
5. **Variables**:
   - `PORT=8000`
   - `ENVIRONMENT=production` *(use `staging` while testing before commercial Upstox licensing is confirmed)*
   - `AUTH_MODE=service_token`
   - `SERVICE_AUTH_SECRET=<32+ random hex>` *(generate once and use the EXACT same secret in `tradedia-web`)*
   - `MARKET_DATA_PROVIDER=upstox`
   - `PRICE_ADJUSTMENT_POLICY=SPLIT_ADJUSTED_ONLY`
   - `UPSTOX_ANALYTICS_TOKEN=<your Upstox Analytics token>`
   - `UPSTOX_RATE_LIMIT_PER_MINUTE=300`
   - `UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED=true` *(required when `ENVIRONMENT=production`; leave `false` with `ENVIRONMENT=staging` for private testing)*
   - `CACHE_DIR=/data/cache`
   - `ENABLE_BACKGROUND_SCHEDULER=true`
   - `FIREBASE_PROJECT_ID=tradedia-b6cb0`

### Service 2: `tradedia-web` (Public — Stateless, Backed by Firebase Firestore)
1. **Settings → Source**:
   - **Root Directory**: `/apps/web`
   - **Watch Paths**: `apps/web/**`
   - *(Automatically uses `apps/web/railway.json` and `apps/web/Dockerfile`, healthcheck `GET /api/health`.)*
2. **Settings → Networking**:
   - Click **Generate Domain** (e.g., `tradedia-web-production.up.railway.app`) and optionally attach your custom domain (e.g., `tradedia.in` + `www.tradedia.in`).
3. **Settings → Deploy**:
   - **Replicas**: `1` *(keeps the 15s background trading tick single-instance; no Railway Volume is needed because all user/ledger/payment state persists directly to Firebase Firestore!)*.
4. **Volumes**: **None needed** for `tradedia-web` (all state is persisted to Firestore via your Firebase service account).
5. **Variables**:
   - `NODE_ENV=production`
   - `APP_URL=https://<your-domain>`
   - `ALLOWED_ORIGINS=https://<your-railway-domain>,https://<your-custom-domain>`
   - `AUTH_SESSION_SECRET=<32+ random hex>`
   - `SCREENER_BACKEND_URL=http://${{tradedia-analytics.RAILWAY_PRIVATE_DOMAIN}}:8000/api/v1`
   - `SERVICE_AUTH_SECRET=${{tradedia-analytics.SERVICE_AUTH_SECRET}}`
   - `MARKET_DATA_PROVIDER=upstox`
   - `AUTHORIZE_ANALYTICS_PROVIDER=true`
   - `AUTHORIZE_PAPER_TRADING_PROVIDER=true`
   - `AUTHORIZE_HISTORICAL_REPLAY_PROVIDER=true`
   - `UPSTOX_ANALYTICS_TOKEN=<your Upstox Analytics token>`
   - `UPSTOX_RATE_LIMIT_PER_MINUTE=100`
   - `FIREBASE_PROJECT_ID=tradedia-b6cb0`
   - `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=<client_email from Firebase Service Account JSON>`
   - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY=<private_key from Firebase Service Account JSON>`
   - `RESEND_API_KEY=<your Resend API key>`
   - `OTP_FROM_EMAIL=Tradedia <noreply@tradedia.in>`
   - `RAZORPAY_KEY_ID=rzp_live_...` *(or `rzp_test_...` + `ALLOW_RAZORPAY_TEST_IN_PROD=true` for staging)*
   - `RAZORPAY_KEY_SECRET=...`
   - `RAZORPAY_WEBHOOK_SECRET=...`
   - `VITE_GA_MEASUREMENT_ID=G-NTTB773KTH` *(production Google Analytics 4 Measurement ID — baked into the Vite bundle at Docker build time via `ARG VITE_GA_MEASUREMENT_ID`; leave unset in staging/local dev so analytics stays disabled)*
   - `VITE_GOOGLE_ADS_ID=AW-18600529507` *(production Google Ads conversion ID — reuses the existing `gtag.js` tag; leave unset in staging/local dev)*
   - `VITE_GOOGLE_ADS_SIGNUP_LABEL=ZG6OCMS0hMEdEOOctqVF` *(production Google Ads signup conversion label; leave unset in staging/local dev)*

> **Build-time Vite variables:** `VITE_GA_MEASUREMENT_ID`, `VITE_GOOGLE_ADS_ID`, and `VITE_GOOGLE_ADS_SIGNUP_LABEL` are read during `vite build` inside `apps/web/Dockerfile`. After adding or changing them in Railway Variables, trigger a redeploy of `tradedia-web` so the updated client bundle is built. Tracking only loads in production builds (`import.meta.env.PROD`) after the user grants consent for the relevant category (`analytics_storage` or `ad_storage` / `ad_user_data`).
>
> Do **not** set `VITE_SCREENER_API_URL` in production — leaving it unset ensures browsers always call same-origin `/api/v1/*` through Express.

---

## 3. External Dashboard Setup (Required After Getting Your Public URL)

1. **Firebase Console → Authentication → Settings → Authorized domains**: add your `*.up.railway.app` domain and custom domain (`tradedia.in`), or Google Sign-In popups will fail.
2. **Deploy Firestore Rules**: push `firebase/firestore.rules` to Firebase (`firebase deploy --only firestore:rules` with `firebase.json` pointing at `firebase/firestore.rules`, or paste in Firebase Console → Firestore → Rules).
3. **Razorpay Dashboard → Settings → Webhooks**: add `https://<your-domain>/api/payments/webhook` with `RAZORPAY_WEBHOOK_SECRET` and enable payment/subscription events.
4. **Resend Dashboard → Domains**: verify `tradedia.in` so `OTP_FROM_EMAIL` can send verification codes to all users (not just your Resend test email).
5. **Google Analytics 4 Admin → Data Streams → Web Stream (`G-NTTB773KTH`) → Enhanced measurement**: click the gear icon → under **Page views → Show advanced settings**, disable **"Page changes based on browser history events"** so GA4 does not emit unsanitized duplicate history `page_view` events alongside Tradedia's consent-gated, URL-sanitized SPA page tracker.
6. **Google Ads → Goals → Conversions → Settings → Enhanced conversions**: turn on **Enhanced conversions** and choose **Google tag → Edit code** (manual code-based collection, *not* Automatic detection). Tradedia supplies `sha256_email_address` via `gtag('set', 'user_data', ...)` strictly on consented, verified new signups.

---

## 4. Verify Live Deployment

1. `GET https://<your-domain>/api/health` → `200 { "status": "ok", "service": "tradedia-web", "storage": "firestore" }`
2. `GET https://<your-domain>/api/v1/health` → `200 { "status": "ok", "provider": "upstox", ... }` *(proves Railway private networking + HMAC proxy work end-to-end)*
3. `GET https://<your-domain>/api/market/status` → verifies authorized Upstox policies for `stockAnalytics` and `paperTrading`.
4. Open `https://<your-domain>` in a browser: verify landing WebP images load fast, Google & Email OTP sign-in succeed, paper-trading quotes/charts load, and Swing/Intraday scanners return data.
5. Verify GA4 consent & privacy: before accepting the analytics consent banner, confirm DevTools Network shows **zero** requests to `googletagmanager.com` / `google-analytics.com`; after clicking **Accept Analytics**, confirm `gtag/js?id=G-NTTB773KTH` loads once, SPA route changes emit a single sanitized `page_view` (e.g., `/trade/:symbol`, `/screener/analysis` with no `symbol`/token query params), and GA4 Realtime reports receive events.
6. Verify Technical SEO endpoints on `https://www.tradedia.in`:
   - `GET https://www.tradedia.in/sitemap.xml` → `200` `application/xml; charset=utf-8` (19 canonical public URLs including `/`, `/paper-trading-india`, `/ai-stock-screener`, `/guess-the-chart`, `/learn`, 8 free `/learn/:slug` guides, `/pricing`, and legal pages).
   - `GET https://www.tradedia.in/robots.txt` → `200` `text/plain; charset=utf-8` allowing `/paper-trading-india`, `/ai-stock-screener`, `/guess-the-chart`, and referencing `Sitemap: https://www.tradedia.in/sitemap.xml` (on `*.up.railway.app` preview hosts, returns `Disallow: /` and `X-Robots-Tag: noindex, nofollow`).
   - `GET https://www.tradedia.in/paper-trading-india`, `/ai-stock-screener`, `/guess-the-chart`, and `/learn/double-top` → `200` `text/html` with route-specific `<title>`, `<link rel="canonical">`, Open Graph/Twitter tags, JSON-LD, and crawler-readable markup.
   - `GET https://www.tradedia.in/does-not-exist` → `404` with `X-Robots-Tag: noindex, nofollow` and no canonical link.

---

## 5. Local Multi-Service Docker Test (Optional)

From repository root:
```bash
docker compose up --build
```
Starts `analytics` (private bridge network) and `web` on `http://localhost:3000`.
