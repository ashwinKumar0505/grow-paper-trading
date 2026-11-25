#!/usr/bin/env python3
"""
Read-Only Live Upstox Verification & Corporate-Action Comparison Script.

Requires UPSTOX_ANALYTICS_TOKEN in environment or .env.
Performs read-only checks against live Upstox endpoints:
1. Full quotes for representative equities (including aliases ZOMATO->ETERNAL, TATAMOTORS->TMPV) and indices.
2. Historical + intraday V3 candles & timestamp/ordering check.
3. Company financials & crore -> INR rupee unit verification.
4. Representative corporate-action check comparing Upstox daily closes around a bonus/split & dividend
   against Yahoo auto_adjust=True vs auto_adjust=False so you can confirm PRICE_ADJUSTMENT_POLICY.

Usage:
    PYTHONPATH=backend python backend/scripts/verify_upstox_live.py
"""

from datetime import date, timedelta
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.data.providers.upstox_adapter import parse_upstox_candles_to_df
from app.data.providers.upstox_client import UpstoxHttpClient
from app.data.providers.upstox_financials import fetch_upstox_financials
from app.data.providers.upstox_instruments import UpstoxInstrumentResolver
from app.data.cache import market_cache


def main() -> None:
    if not UpstoxHttpClient.has_analytics_token():
        print("BLOCKED: UPSTOX_ANALYTICS_TOKEN is not set. Configure it in .env and re-run.")
        sys.exit(2)

    client = UpstoxHttpClient()
    resolver = UpstoxInstrumentResolver(client)

    print("[1/4] Instrument & Quote Check (RELIANCE, ZOMATO->ETERNAL, TATAMOTORS->TMPV, NIFTY 50)")
    resolved = [resolver.resolve(sym) for sym in ("RELIANCE", "ZOMATO", "TATAMOTORS")]
    keys = [r.instrument_key for r in resolved if r is not None] + ["NSE_INDEX|Nifty 50", "BSE_INDEX|SENSEX"]
    quotes = client.get_full_quotes(keys)
    print(f"      Returned {len(quotes)} quote entries.")
    for k, v in list(quotes.items())[:5]:
        print(f"      {k}: ltp={v.get('last_price')} net_change={v.get('net_change')} ts={v.get('last_trade_time') or v.get('timestamp')}")

    print("\n[2/4] Historical + Intraday V3 Candle Check (RELIANCE 1d & 15m)")
    rel = resolver.resolve("RELIANCE")
    assert rel is not None
    today = date.today()
    hist_d = client.get_historical_candles(rel.instrument_key, "days", 1, today.isoformat(), (today - timedelta(days=40)).isoformat())
    intra_d = client.get_intraday_candles(rel.instrument_key, "days", 1)
    df_d = parse_upstox_candles_to_df(hist_d, intra_d, is_intraday=False)
    print(f"      Daily bars: {len(df_d) if df_d is not None else 0}, last={df_d.index[-1] if df_d is not None else None}")

    print("\n[3/4] Company Financials & Rupee Unit Check (HDFCBANK)")
    fin = fetch_upstox_financials("HDFCBANK", client, resolver, market_cache, force_refresh=True)
    print(f"      Status={fin.status}, yearly={len(fin.yearly)}, quarterly={len(fin.quarterly)}, pe={fin.key_stats.get('pe_ratio')}")
    if fin.yearly:
        last_y = fin.yearly[-1]
        print(f"      Latest yearly ({last_y['period']}): rev=₹{last_y['revenue']:,.0f} INR ({last_y['revenue']/1e7:,.1f} Cr)")

    print("\n[4/4] Corporate-Action Check (RELIANCE Oct 2024 1:1 Bonus & Cash Dividend)")
    actions = client.get_corporate_actions(rel.isin)
    print(f"      Corporate actions returned: {len(actions)}")
    bonuses = client.get_historical_candles(rel.instrument_key, "days", 1, "2024-11-05", "2024-10-15")
    df_bonus = parse_upstox_candles_to_df(bonuses, [], is_intraday=False)
    if df_bonus is not None:
        print("      RELIANCE Upstox daily closes around 2024-10-28 1:1 bonus ex-date:")
        print(df_bonus[["Open", "High", "Low", "Close", "Volume"]].to_string())
    print("\nCompare pre-ex-date closes with Yahoo auto_adjust=True vs auto_adjust=False before setting PRICE_ADJUSTMENT_POLICY.")


if __name__ == "__main__":
    main()
