"""Bundled NSE NIFTY 500 Constituent Registry, Versioning, Validation, and Search."""

import csv
import re
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.models.common import UniverseMetadata
from app.models.market import StockConstituent

UNIVERSE_NAME = "NSE NIFTY 500"
UNIVERSE_VERSION = "NIFTY500-BUNDLED-2026-11-v2"
UNIVERSE_EFFECTIVE_DATE = "2026-11-09"
UNIVERSE_SOURCE = (
    "Bundled static snapshot derived from NSE ind_nifty500list.csv "
    "(cleaned of invalid dummy/duplicate tickers; requires authorized NSE index feed sync for production updates)"
)
SURVIVORSHIP_BIAS_DISCLOSURE = (
    "LIMITATION: Historical backtests use the current static NIFTY 500 constituent snapshot "
    "rather than historical point-in-time index membership. Delisted, merged, or previously "
    "removed constituents are absent, while recently listed IPOs have truncated histories. "
    "Results are NOT survivorship-bias-free."
)


LEGACY_SYMBOL_ALIASES: Dict[str, str] = {
    "ZOMATO": "ETERNAL",
    "TATAMOTORS": "TMPV",
}


def resolve_nse_symbol_alias(symbol: str) -> str:
    clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
    return LEGACY_SYMBOL_ALIASES.get(clean, clean)

VALID_NSE_SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9&-]{0,24}$")

# Priority tier tags strictly verified against bundled CSV (disjoint sets; no stale tickers)
NIFTY_50_SYMBOLS = frozenset({
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
    "BAJAJ-AUTO", "BAJAJFINSV", "BAJFINANCE", "BEL", "BHARTIARTL",
    "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL",
    "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", "HINDALCO",
    "HINDUNILVR", "ICICIBANK", "INDIGO", "INFY", "ITC",
    "JIOFIN", "JSWSTEEL", "KOTAKBANK", "LT", "M&M",
    "MARUTI", "MAXHEALTH", "NESTLEIND", "NTPC", "ONGC",
    "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", "SHRIRAMFIN",
    "SUNPHARMA", "TATACONSUM", "TATASTEEL", "TCS", "TECHM",
    "TITAN", "TMPV", "TRENT", "ULTRACEMCO", "WIPRO",
})

NIFTY_NEXT_50_SYMBOLS = frozenset({
    "ABB", "ADANIENSOL", "ADANIGREEN", "AMBUJACEM", "ATGL",
    "BAJAJHLDNG", "BANKBARODA", "BHEL", "BOSCHLTD", "BPCL",
    "BRITANNIA", "CANBK", "CGPOWER", "CHOLAFIN", "COLPAL",
    "CUMMINSIND", "DABUR", "DIVISLAB", "DLF", "DMART",
    "GAIL", "GODREJCP", "HAL", "HAVELLS", "HEROMOTOCO",
    "ICICIGI", "ICICILIFE", "INDUSINDBK", "INDUSTOWER", "IOC",
    "IRFC", "JINDALSTEL", "LODHA", "LUPIN", "MARICO",
    "MOTHERSON", "NAUKRI", "NHPC", "PERSISTENT", "PFC",
    "PIDILITIND", "PNB", "POLYCAB", "RECLTD", "SHREECEM",
    "SIEMENS", "TATAPOWER", "TORNTPHARM", "TVSMOTOR", "VBL",
    "VEDL", "ZYDUSLIFE",
})


def is_valid_nse_symbol(symbol: str) -> bool:
    """Validate normalized NSE ticker format and reject dummy/placeholder symbols."""
    clean = symbol.strip().upper().replace(".NS", "").replace(".BO", "")
    if not clean or clean.startswith("DUMMY"):
        return False
    return bool(VALID_NSE_SYMBOL_RE.match(clean))


@lru_cache(maxsize=1)
def _load_universe_and_exclusions() -> Tuple[List[StockConstituent], List[str]]:
    """Parse bundled NIFTY 500 CSV, removing invalid/dummy rows and duplicates."""
    csv_path = Path(__file__).resolve().parent / "ind_nifty500list.csv"
    constituents: List[StockConstituent] = []
    excluded: List[str] = []
    seen: set = set()

    if csv_path.exists():
        with open(csv_path, mode="r", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                raw_sym = (row.get("Symbol") or "").strip().upper()
                name = (row.get("Company Name") or "").strip()
                sector = (row.get("Industry") or "Diversified").strip()
                isin = (row.get("ISIN Code") or "").strip() or None

                if not is_valid_nse_symbol(raw_sym):
                    excluded.append(f"{raw_sym or 'EMPTY'} (invalid/dummy symbol)")
                    continue
                if isin and isin.upper().startswith("DUM"):
                    excluded.append(f"{raw_sym} (dummy ISIN {isin})")
                    continue
                if raw_sym in seen:
                    excluded.append(f"{raw_sym} (duplicate entry)")
                    continue
                seen.add(raw_sym)

                if raw_sym in NIFTY_50_SYMBOLS:
                    tier = "NIFTY 50"
                elif raw_sym in NIFTY_NEXT_50_SYMBOLS:
                    tier = "NIFTY NEXT 50"
                else:
                    tier = "NIFTY 500"

                constituents.append(
                    StockConstituent(
                        symbol=raw_sym,
                        yf_ticker=f"{raw_sym}.NS",
                        name=name or raw_sym,
                        sector=sector,
                        index_tier=tier,
                        isin=isin,
                        in_bundled_universe=True,
                    )
                )

    tier_priority = {"NIFTY 50": 0, "NIFTY NEXT 50": 1, "NIFTY 500": 2}
    constituents.sort(key=lambda c: (tier_priority.get(c.index_tier, 3), c.symbol))
    return constituents, excluded


def load_nifty500_universe() -> List[StockConstituent]:
    """Return deduplicated, validated NIFTY 500 constituents ordered by priority tier."""
    constituents, _ = _load_universe_and_exclusions()
    return list(constituents)


def get_universe_metadata() -> UniverseMetadata:
    """Return version, effective date, exclusions, and survivorship-bias disclosure."""
    constituents, excluded = _load_universe_and_exclusions()
    return UniverseMetadata(
        universe_name=UNIVERSE_NAME,
        universe_version=UNIVERSE_VERSION,
        effective_date=UNIVERSE_EFFECTIVE_DATE,
        source=UNIVERSE_SOURCE,
        constituent_count=len(constituents),
        excluded_invalid_entries=excluded,
        point_in_time_history_available=False,
        survivorship_bias_disclosure=SURVIVORSHIP_BIAS_DISCLOSURE,
    )


@lru_cache(maxsize=1)
def get_constituent_map() -> Dict[str, StockConstituent]:
    """Return a lookup dictionary mapping uppercase NSE symbol to StockConstituent."""
    return {c.symbol: c for c in load_nifty500_universe()}


def get_stock_info(symbol: str, allow_unlisted_nse: bool = True) -> Optional[StockConstituent]:
    """Look up a stock by NSE symbol (with or without .NS suffix), rejecting malformed tickers."""
    if not symbol or not isinstance(symbol, str):
        return None
    clean = resolve_nse_symbol_alias(symbol)
    if not is_valid_nse_symbol(clean):
        return None
    cmap = get_constituent_map()
    if clean in cmap:
        return cmap[clean]
    if allow_unlisted_nse:
        return StockConstituent(
            symbol=clean,
            yf_ticker=f"{clean}.NS",
            name=f"{clean} (NSE Listed - Outside Bundled NIFTY 500)",
            sector="NSE Equity",
            index_tier="NSE LISTED",
            in_bundled_universe=False,
        )
    return None


def search_stocks(query: str, limit: int = 20) -> List[StockConstituent]:
    """Search bundled NIFTY 500 stocks by exact symbol, prefix, name substring, or sector."""
    universe = load_nifty500_universe()
    if not query or not query.strip():
        return universe[:limit]

    q = resolve_nse_symbol_alias(query)
    exact_matches, prefix_matches, name_matches, sector_matches = [], [], [], []
    for stock in universe:
        if stock.symbol == q:
            exact_matches.append(stock)
        elif stock.symbol.startswith(q):
            prefix_matches.append(stock)
        elif q in stock.symbol or q in stock.name.upper():
            name_matches.append(stock)
        elif q in stock.sector.upper():
            sector_matches.append(stock)

    return (exact_matches + prefix_matches + name_matches + sector_matches)[:limit]
