"""Internal Upstox NSE instrument mapper (bundled NIFTY 500 ISINs + cached dynamic lookup)."""

from dataclasses import dataclass
import threading
from typing import Optional
from cachetools import TTLCache

from app.data.nifty500_constituents import (
    get_constituent_map,
    is_valid_nse_symbol,
    resolve_nse_symbol_alias,
)
from app.data.providers.upstox_client import UpstoxHttpClient


@dataclass(frozen=True)
class ResolvedUpstoxInstrument:
    symbol: str
    isin: str
    instrument_key: str
    name: str
    sector: str


class UpstoxInstrumentResolver:
    """
    Maps canonical NSE symbols (including aliases ZOMATO -> ETERNAL, TATAMOTORS -> TMPV)
    to internal Upstox `NSE_EQ|{ISIN}` instrument keys without exposing keys in public APIs.
    """

    def __init__(self, client: UpstoxHttpClient):
        self._client = client
        self._lock = threading.Lock()
        self._dynamic_cache: TTLCache = TTLCache(maxsize=256, ttl=86400)

    def prune_cache(self) -> None:
        with self._lock:
            self._dynamic_cache.expire()

    def resolve(self, raw_symbol: str, allow_remote: bool = True) -> Optional[ResolvedUpstoxInstrument]:
        clean = resolve_nse_symbol_alias(raw_symbol)
        if not is_valid_nse_symbol(clean):
            return None

        cmap = get_constituent_map()
        constituent = cmap.get(clean)
        if constituent and constituent.isin:
            isin = constituent.isin.strip().upper()
            return ResolvedUpstoxInstrument(
                symbol=clean,
                isin=isin,
                instrument_key=f"NSE_EQ|{isin}",
                name=constituent.name,
                sector=constituent.sector,
            )

        with self._lock:
            if clean in self._dynamic_cache:
                return self._dynamic_cache[clean]

        if not allow_remote or not self._client.has_analytics_token():
            return None

        items = self._client.search_instruments(clean, limit=10)
        matched: Optional[ResolvedUpstoxInstrument] = None
        for item in items:
            if not isinstance(item, dict):
                continue
            tsym = str(item.get("tradingsymbol") or item.get("trading_symbol") or "").strip().upper()
            seg = str(item.get("segment") or "").strip().upper()
            itype = str(item.get("instrument_type") or "").strip().upper()
            key = str(item.get("instrument_key") or "").strip()
            if tsym != clean:
                continue
            if seg and seg != "NSE_EQ":
                continue
            if itype and itype != "EQ":
                continue
            if not key or "|" not in key:
                continue
            isin = str(item.get("isin") or key.split("|", 1)[1]).strip().upper()
            if not isin:
                continue
            matched = ResolvedUpstoxInstrument(
                symbol=clean,
                isin=isin,
                instrument_key=key,
                name=str(item.get("name") or item.get("short_name") or clean).strip(),
                sector="NSE Equity",
            )
            break

        with self._lock:
            self._dynamic_cache[clean] = matched
        return matched
