# Tradedia — Paper Trading, Stock Screener & Chart Learning Platform

Monorepo containing both Tradedia applications, Firebase security rules, Docker Compose setup, CI workflow, and Railway deployment configs.

## Repository Structure

```text
├── apps/
│   ├── web/                # React 19 + Vite SPA & Express BFF (Node 22, port 3000)
│   └── analytics/          # FastAPI NSE NIFTY 500 Screener & Backtest Engine (Python 3.11, port 8000)
├── firebase/               # Firestore security rules & schema blueprint
├── docs/                   # Railway deployment runbook & engineering docs
├── compose.yaml            # Local multi-service Docker setup (web + analytics)
└── .github/workflows/      # GitHub Actions CI (web + analytics)
```

---

## Prerequisites

- **Node.js** `>= 20` (recommended: `22.x`) and `npm`
- **Python** `>= 3.10` (recommended: `3.11+`)
- **[`uv`](https://docs.astral.sh/uv/)** (Python package & virtualenv manager):
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- *(Optional)* **Docker Desktop** if you prefer running both apps via `docker compose`

---

## Quick Start: Install & Run Locally

Open **two terminals** (start `analytics` first, then `web`).

### 1. Analytics API (`apps/analytics` — port `8000`)

```bash
cd apps/analytics

# First time only: create local env file and set UPSTOX_ANALYTICS_TOKEN
cp .env.example .env

# Install locked runtime + dev dependencies into apps/analytics/.venv
uv sync --frozen --extra dev

# Start FastAPI with live reload
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's running: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) (API docs at [http://localhost:8000/docs](http://localhost:8000/docs)).

### 2. Web App + Express BFF (`apps/web` — port `3000`)

```bash
cd apps/web

# First time only: create local env file and set UPSTOX_ANALYTICS_TOKEN
# (plus optional RESEND_API_KEY / RAZORPAY_* keys)
cp .env.example .env

# Install Node dependencies
npm ci

# Start Express + Vite dev middleware on http://localhost:3000
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.
Express automatically proxies `/api/v1/*` requests to `http://127.0.0.1:8000/api/v1` (or `SCREENER_BACKEND_URL` from `apps/web/.env`).

> **Note on Auth in Local Dev:** `apps/analytics/.env.example` defaults to `AUTH_MODE=disabled_dev_only` for easy local development. To test signed service-to-service auth locally, set `AUTH_MODE=service_token` in `apps/analytics/.env` and set the same `SERVICE_AUTH_SECRET` in both `apps/analytics/.env` and `apps/web/.env`.

---

## Alternative: Run Both Apps with Docker Compose

From the repository root (ensure `UPSTOX_ANALYTICS_TOKEN` is in your shell or a root `.env`):

```bash
docker compose up --build
```

- Web app: [http://localhost:3000](http://localhost:3000)
- Analytics runs privately on the Docker bridge network (`http://analytics:8000/api/v1`), mirroring Railway's private networking topology.

---

## Common Development Commands

### Web & Express BFF (`cd apps/web`)
```bash
npm run dev       # Dev server (Express + Vite HMR on :3000)
npm run lint      # TypeScript type check (tsc --noEmit)
npm test          # Run 91 unit & integration tests
npm run build     # Build Vite SPA (dist/) + esbuild server (dist-server/server.mjs)
NODE_ENV=production npm start  # Run compiled production bundle locally
```

### Analytics & Screener (`cd apps/analytics`)
```bash
uv run uvicorn app.main:app --reload --port 8000               # Dev server
uv run pytest tests -v                                         # Run 48 backend tests
uv run python scripts/run_backtests.py --limit 500 --folds 4   # Run walk-forward backtest
uv lock                                                        # Refresh uv.lock after editing pyproject.toml
```

---

## Deployment

See **[docs/railway-deployment.md](docs/railway-deployment.md)** for the full step-by-step Railway deployment guide (two services from this repo: private `tradedia-analytics` at `apps/analytics` + public `tradedia-web` at `apps/web`, Volumes, Private Networking, Firebase, Razorpay, and Resend setup).
