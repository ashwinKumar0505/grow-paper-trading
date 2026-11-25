#!/usr/bin/env python3
"""
Reproducible Historical OHLCV Fetcher for Bundled NSE NIFTY 500 Constituents.

Fetches Daily (2y) and Intraday (15m) OHLCV bars through the configured MarketDataProvider,
validates data quality, writes atomic cache files + metadata sidecars, and logs exclusions.

Usage:
    python backend/scripts/fetch_historical_data.py --daily-limit 500 --intraday-limit 100
"""

import argparse
from collections import Counter
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.data.nifty500_constituents import get_universe_metadata, load_nifty500_universe
from app.data.provider import data_provider
from app.data.providers.base import DataUsagePolicy


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch & validate NSE NIFTY 500 OHLCV into local cache.")
    parser.add_argument("--daily-limit", type=int, default=150, help="Number of NIFTY 500 stocks for 2y daily bars")
    parser.add_argument("--intraday-limit", type=int, default=100, help="Number of NIFTY 500 stocks for 15m bars")
    parser.add_argument("--period-daily", type=str, default="2y", help="Daily history period (default: 2y)")
    parser.add_argument("--period-intraday", type=str, default="5d", help="Intraday history period (default: 5d)")
    parser.add_argument("--force", action="store_true", help="Force network re-download even if cache is fresh")
    args = parser.parse_args()

    univ_meta = get_universe_metadata()
    universe = load_nifty500_universe()
    daily_symbols = [c.symbol for c in universe[: args.daily_limit]]
    intra_symbols = [c.symbol for c in universe[: args.intraday_limit]]

    policy = DataUsagePolicy(
        purpose="HISTORICAL_BACKTEST",
        allow_delayed_data=True,
        allow_stale_cache_fallback=not args.force,
        require_production_approved_provider=False,
        adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
    )

    print(f"Provider          : {data_provider.capabilities.display_name}")
    print(f"Universe Version  : {univ_meta.universe_version} ({univ_meta.constituent_count} valid symbols)")
    print(f"Adjustment Policy : {settings.PRICE_ADJUSTMENT_POLICY}")

    print(f"\n[1/2] Fetching {args.period_daily} Daily OHLCV for {len(daily_symbols)} symbols...")
    t0 = time.monotonic()
    daily_res = data_provider.fetch_batch_daily_ohlcv_results(
        symbols=daily_symbols,
        period=args.period_daily,
        force_refresh=args.force,
        min_bars=60,
        policy=policy,
    )
    daily_counts = Counter(r.status for r in daily_res.values())
    print(f"      -> Status summary ({time.monotonic() - t0:.1f}s): {dict(daily_counts)}")

    print(f"[2/2] Fetching {args.period_intraday} 15m Intraday OHLCV for {len(intra_symbols)} symbols...")
    t1 = time.monotonic()
    intra_res = data_provider.fetch_batch_intraday_ohlcv_results(
        symbols=intra_symbols,
        period=args.period_intraday,
        interval="15m",
        force_refresh=args.force,
        min_bars=20,
        policy=policy,
    )
    intra_counts = Counter(r.status for r in intra_res.values())
    print(f"      -> Status summary ({time.monotonic() - t1:.1f}s): {dict(intra_counts)}")


if __name__ == "__main__":
    main()
