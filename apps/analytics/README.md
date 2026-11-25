# Tradedia Analytics — Rule-Based NSE Stock Screener & Backtesting API

Deterministic, rule-based technical stock screening, single-stock technical analysis, company financials, and chronological walk-forward out-of-sample backtesting API built with **Python 3.11 / FastAPI** for NSE Indian equities (NIFTY 500).

> **Disclosure:** Runs deterministic rule-based technical indicators and heuristic scoring (`RULE_BASED_TECHNICAL_ANALYTICS`). Does not use AI/ML price prediction models and is not SEBI-registered investment advice.

## Local Development (with `uv`)

```bash
cd apps/analytics
cp .env.example .env

# Install runtime + dev dependencies from uv.lock
uv sync --frozen --extra dev

# Run FastAPI dev server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run full automated test suite
uv run pytest tests -v

# Run reproducible walk-forward backtest
uv run python scripts/run_backtests.py --limit 500 --folds 4 --mode expanding
```

## Production / Railway Notes

- Deploy as a **private Railway service** (disable Public Networking) behind `apps/web`'s HMAC-signed `/api/v1/*` proxy.
- Root Directory: `apps/analytics` · Healthcheck: `GET /api/v1/health`.
- Always run with **`--workers 1`** and **`1` replica** while using the local Volume cache (`/data/cache`) and in-process 5-minute intraday scheduler.
- See [../../docs/railway-deployment.md](../../docs/railway-deployment.md) for full setup instructions.
