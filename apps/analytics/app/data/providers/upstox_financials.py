"""Upstox Company Fundamentals parser (crore -> INR rupee conversion) and provider-scoped cache."""

import calendar
from datetime import datetime, timezone
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.data.cache import MarketDataCache
from app.data.nifty500_constituents import resolve_nse_symbol_alias
from app.data.nse_calendar import IST
from app.data.providers.base import FinancialsResult, ProviderNotConfiguredError
from app.data.providers.upstox_client import UpstoxAuthError, UpstoxHttpClient
from app.data.providers.upstox_instruments import UpstoxInstrumentResolver
from app.models.common import MarketDataProvenance

logger = logging.getLogger(__name__)

_MONTH_MAP: Dict[str, int] = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}

_UNIT_MULTIPLIERS: Dict[str, float] = {
    "crore": 1e7,
    "crores": 1e7,
    "cr": 1e7,
    "lakh": 1e5,
    "lakhs": 1e5,
    "million": 1e6,
    "millions": 1e6,
    "thousand": 1e3,
    "thousands": 1e3,
    "rupee": 1.0,
    "rupees": 1.0,
    "inr": 1.0,
    "ones": 1.0,
    "": 1.0,
}

_REVENUE_CATS = {"revenue", "total_revenue", "operating_revenue", "total operating revenue", "sales"}
_OP_PROFIT_CATS = {"operating_profit", "operating profit", "ebit", "operating_income", "operating income"}
_NET_PROFIT_CATS = {"net_profit", "net profit", "profit_after_tax", "pat", "net_income", "net income"}


def _epoch_to_ist(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST")


def _parse_float(raw: Any) -> Optional[float]:
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        val = float(raw)
        return None if (val != val or val in (float("inf"), float("-inf"))) else val
    text = str(raw).strip().replace(",", "").replace("%", "").replace("₹", "").strip()
    if not text or text in ("-", "--", "N/A", "NA", "null", "None"):
        return None
    try:
        val = float(text)
        return None if (val != val or val in (float("inf"), float("-inf"))) else val
    except ValueError:
        return None


def resolve_unit_multiplier(units_in: Any) -> float:
    """Convert Upstox monetary unit label (default 'crore') into INR rupee multiplier."""
    if units_in is None:
        return 1e7  # Upstox Fundamentals API documents monetary values in crores by default
    key = str(units_in).strip().lower()
    return _UNIT_MULTIPLIERS.get(key, 1e7)


def parse_upstox_period(raw_period: Any, yearly: bool) -> Optional[Tuple[str, str]]:
    """
    Parse Upstox statement period string (e.g. 'Mar 2026', 'Jun 2025', '2025', 'FY25', '2025-03-31')
    into (display_label, end_date_iso).
    """
    text = str(raw_period or "").strip()
    if not text:
        return None

    # ISO date YYYY-MM-DD
    iso_m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", text)
    if iso_m:
        y, m, d = int(iso_m.group(1)), int(iso_m.group(2)), int(iso_m.group(3))
        end_dt = datetime(y, m, d)
        if yearly:
            fy = y if m <= 3 else y + 1
            return f"FY{str(fy)[-2:]}", end_dt.strftime("%Y-%m-%d")
        return end_dt.strftime("%b %y"), end_dt.strftime("%Y-%m-%d")

    # Month + Year: "Mar 2025", "Jun 25", "Sep-2025"
    mon_m = re.match(r"^([A-Za-z]{3,9})[\s\-']+('?\d{2,4})$", text)
    if mon_m:
        month = _MONTH_MAP.get(mon_m.group(1).lower()[:4]) or _MONTH_MAP.get(mon_m.group(1).lower()[:3])
        if month:
            yr_str = mon_m.group(2).lstrip("'")
            year = int(yr_str) + (2000 if len(yr_str) == 2 else 0)
            last_day = calendar.monthrange(year, month)[1]
            end_dt = datetime(year, month, last_day)
            if yearly:
                fy = year if month <= 3 else year + 1
                return f"FY{str(fy)[-2:]}", end_dt.strftime("%Y-%m-%d")
            return end_dt.strftime("%b %y"), end_dt.strftime("%Y-%m-%d")

    # Fiscal year: "FY25", "FY 2025", or bare 4-digit year "2025"
    fy_m = re.match(r"^(?:FY\s*)?(\d{2}|\d{4})$", text, re.IGNORECASE)
    if fy_m:
        yr_str = fy_m.group(1)
        year = int(yr_str) + (2000 if len(yr_str) == 2 else 0)
        return f"FY{str(year)[-2:]}", f"{year:04d}-03-31"

    # Quarter format: "Q1 FY26" -> Jun 2025, Q2 -> Sep 2025, Q3 -> Dec 2025, Q4 -> Mar 2026
    q_m = re.match(r"^Q([1-4])\s*FY\s*'?(\d{2}|\d{4})$", text, re.IGNORECASE)
    if q_m:
        q_num = int(q_m.group(1))
        yr_str = q_m.group(2)
        fy_year = int(yr_str) + (2000 if len(yr_str) == 2 else 0)
        q_month_map = {1: (6, fy_year - 1), 2: (9, fy_year - 1), 3: (12, fy_year - 1), 4: (3, fy_year)}
        month, cal_year = q_month_map[q_num]
        last_day = calendar.monthrange(cal_year, month)[1]
        end_dt = datetime(cal_year, month, last_day)
        return end_dt.strftime("%b %y"), end_dt.strftime("%Y-%m-%d")

    return None


def parse_upstox_income_statement(data: Dict[str, Any], yearly: bool) -> List[Dict[str, Any]]:
    """Convert Upstox `/v2/fundamentals/{isin}/income-statement` payload into INR rupee rows."""
    if not isinstance(data, dict):
        return []
    categories = data.get("income_statement")
    if not isinstance(categories, list) or not categories:
        return []

    multiplier = resolve_unit_multiplier(data.get("units_in"))
    by_end_date: Dict[str, Dict[str, Any]] = {}

    for block in categories:
        if not isinstance(block, dict):
            continue
        cat_raw = str(block.get("category") or "").strip().lower().replace("-", "_")
        if cat_raw in _REVENUE_CATS:
            field = "revenue"
        elif cat_raw in _OP_PROFIT_CATS:
            field = "operating_profit"
        elif cat_raw in _NET_PROFIT_CATS:
            field = "net_profit"
        else:
            continue

        history = block.get("history")
        if not isinstance(history, list):
            continue
        for item in history:
            if not isinstance(item, dict):
                continue
            parsed_period = parse_upstox_period(item.get("period"), yearly=yearly)
            val_num = _parse_float(item.get("value"))
            if parsed_period is None or val_num is None:
                continue
            label, end_date = parsed_period
            row = by_end_date.setdefault(
                end_date,
                {
                    "period": label,
                    "end_date": end_date,
                    "revenue": None,
                    "net_profit": None,
                    "operating_profit": None,
                    "profit_margin_pct": None,
                },
            )
            row[field] = round(val_num * multiplier, 2)

    rows: List[Dict[str, Any]] = []
    for end_date in sorted(by_end_date.keys()):
        row = by_end_date[end_date]
        if row["revenue"] is None and row["net_profit"] is None:
            continue
        rev, prof = row["revenue"], row["net_profit"]
        if rev and prof is not None:
            row["profit_margin_pct"] = round((prof / rev) * 100.0, 2)
        rows.append(row)

    return rows[-6:] if yearly else rows[-8:]


def parse_upstox_key_ratios(raw_ratios: Any) -> Dict[str, Optional[float]]:
    """Parse Upstox `/v2/fundamentals/{isin}/key-ratios` across documented list or nested-dict shapes."""
    items: List[Dict[str, Any]] = []
    if isinstance(raw_ratios, list):
        items = [x for x in raw_ratios if isinstance(x, dict)]
    elif isinstance(raw_ratios, dict):
        nested = raw_ratios.get("ratios") or raw_ratios.get("key_ratios")
        if isinstance(nested, list):
            items = [x for x in nested if isinstance(x, dict)]

    out: Dict[str, Optional[float]] = {}
    for entry in items:
        name = str(entry.get("name") or "").strip().lower()
        val = _parse_float(entry.get("company_value") if "company_value" in entry else entry.get("value"))
        if val is None:
            continue
        if name in ("p/e", "pe", "price to earnings", "price to earnings (p/e)") or "(p/e)" in name:
            out["pe_ratio"] = round(val, 2)
        elif "dividend yield" in name:
            out["dividend_yield_pct"] = round(val, 2)
        elif name in ("roe", "return on equity", "return on equity (roe)") or "(roe)" in name:
            out["roe_pct"] = round(val, 2)
        elif name in ("p/b", "pb", "price to book", "price to book (p/b)") or "(p/b)" in name:
            out["pb_ratio"] = round(val, 2)
    return out


def _yoy_growth(rows: List[Dict[str, Any]], key: str) -> Optional[float]:
    if len(rows) < 2:
        return None
    curr = rows[-1].get(key)
    prev = rows[-2].get(key)
    if curr is None or prev is None or prev == 0:
        return None
    return round(((curr - prev) / abs(prev)) * 100.0, 2)


def _derive_52w_from_upstox_cache(cache: MarketDataCache, symbol: str) -> Tuple[Optional[float], Optional[float]]:
    for policy in ("SPLIT_ADJUSTED_ONLY", "UNADJUSTED_RAW", "SPLIT_AND_DIVIDEND_ADJUSTED"):
        df, _ = cache.get_ohlcv(symbol, interval="1d", provider_id="upstox", adjustment_policy=policy, allow_stale_disk=True)
        if df is not None and not df.empty and "High" in df.columns and "Low" in df.columns:
            tail = df.tail(252)
            return round(float(tail["High"].max()), 2), round(float(tail["Low"].min()), 2)
    return None, None


def _build_upstox_financials_provenance(
    is_stale: bool,
    cache_layer: str,
    fetched_epoch: Optional[float],
) -> MarketDataProvenance:
    utc_str = datetime.fromtimestamp(fetched_epoch, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if fetched_epoch else None
    ist_str = _epoch_to_ist(fetched_epoch) if fetched_epoch else None
    return MarketDataProvenance(
        provider_id="upstox",
        provider_display_name="Upstox Company Fundamentals API",
        is_realtime=False,
        estimated_delay_minutes=None,
        price_adjustment_policy=settings.PRICE_ADJUSTMENT_POLICY,
        adjustment_note="Company financial statements are reported in INR (converted from Upstox crores via units_in).",
        fetched_at_utc=utc_str,
        fetched_at_ist=ist_str,
        data_freshness="UNAVAILABLE" if cache_layer == "UNAVAILABLE" else ("STALE" if is_stale else "FRESH"),
        is_stale=is_stale,
        cache_layer=cache_layer,  # type: ignore[arg-type]
        production_approved=bool(
            UpstoxHttpClient.has_analytics_token() and settings.UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED
        ),
    )


def fetch_upstox_financials(
    symbol: str,
    client: UpstoxHttpClient,
    resolver: UpstoxInstrumentResolver,
    cache: MarketDataCache,
    force_refresh: bool = False,
) -> FinancialsResult:
    """
    Fetch yearly & quarterly company financials and key statistics from Upstox Fundamentals API.
    Uses provider-scoped cache (`financials_upstox_{symbol}`) and NEVER reads Yahoo financials cache.
    """
    clean = resolve_nse_symbol_alias(symbol)
    artifact_name = f"financials_upstox_{clean}"
    cached = cache.load_json_artifact(artifact_name)
    if cached and cached.get("provider_id") != "upstox":
        cached = None

    if cached and not force_refresh:
        fetched_at = float(cached.get("_fetched_at", 0))
        if (time.time() - fetched_at) <= settings.FINANCIALS_TTL_SECONDS and (
            cached.get("yearly") or cached.get("quarterly")
        ):
            return FinancialsResult(
                symbol=clean,
                status="OK",
                available=True,
                source=str(cached.get("source", "Upstox Company Fundamentals API")),
                fetched_at_ist=_epoch_to_ist(fetched_at),
                is_stale=False,
                yearly=cached.get("yearly", []),
                quarterly=cached.get("quarterly", []),
                key_stats=cached.get("key_stats", {}),
                provenance=_build_upstox_financials_provenance(False, "DISK_CACHE_FRESH", fetched_at),
            )

    yearly: List[Dict[str, Any]] = []
    quarterly: List[Dict[str, Any]] = []
    key_stats: Dict[str, Optional[float]] = {}
    error_note = ""

    if not settings.EDUCATIONAL_REPLAY_MODE:
        try:
            inst = resolver.resolve(clean)
            if inst is None:
                error_note = f"No Upstox ISIN mapping found for '{clean}'."
            else:
                y_data = client.get_income_statement(inst.isin, statement_type="consolidated", time_period="yearly")
                yearly = parse_upstox_income_statement(y_data, yearly=True)
                if not yearly:
                    y_stand = client.get_income_statement(inst.isin, statement_type="standalone", time_period="yearly")
                    yearly = parse_upstox_income_statement(y_stand, yearly=True)

                q_data = client.get_income_statement(inst.isin, statement_type="consolidated", time_period="quarterly")
                quarterly = parse_upstox_income_statement(q_data, yearly=False)
                if not quarterly:
                    q_stand = client.get_income_statement(inst.isin, statement_type="standalone", time_period="quarterly")
                    quarterly = parse_upstox_income_statement(q_stand, yearly=False)

                ratios: Dict[str, Optional[float]] = {}
                try:
                    ratios = parse_upstox_key_ratios(client.get_key_ratios(inst.isin))
                except UpstoxAuthError:
                    raise
                except Exception as exc:
                    logger.debug("Upstox key-ratios unavailable for %s: %s", clean, exc)

                company_mcap: Optional[float] = None
                try:
                    prof = client.get_company_profile(inst.isin)
                    raw_mcap = _parse_float(prof.get("market_cap_inr") or prof.get("market_cap"))
                    if raw_mcap is not None and raw_mcap > 0:
                        company_mcap = round(raw_mcap * resolve_unit_multiplier(prof.get("units_in") or "crore"), 2)
                except UpstoxAuthError:
                    raise
                except Exception:
                    pass

                w52_high, w52_low = _derive_52w_from_upstox_cache(cache, clean)
                latest_margin = (yearly[-1]["profit_margin_pct"] if yearly else None) or (
                    quarterly[-1]["profit_margin_pct"] if quarterly else None
                )
                key_stats = {
                    "market_cap": company_mcap,
                    "pe_ratio": ratios.get("pe_ratio"),
                    "profit_margin_pct": latest_margin,
                    "revenue_growth_pct": _yoy_growth(yearly, "revenue"),
                    "earnings_growth_pct": _yoy_growth(yearly, "net_profit"),
                    "dividend_yield_pct": ratios.get("dividend_yield_pct"),
                    "week52_high": w52_high,
                    "week52_low": w52_low,
                }
        except (ProviderNotConfiguredError, UpstoxAuthError) as exc:
            error_note = str(exc)
            logger.warning("Upstox financials auth/config error for %s: %s", clean, exc)
        except Exception as exc:
            error_note = str(exc)
            logger.warning("Failed to fetch Upstox financials for %s: %s", clean, exc)

    if yearly or quarterly:
        now_epoch = time.time()
        payload = {
            "provider_id": "upstox",
            "symbol": clean,
            "currency": "INR",
            "available": True,
            "source": "Upstox Company Fundamentals API",
            "yearly": yearly,
            "quarterly": quarterly,
            "key_stats": key_stats,
            "message": "",
            "_fetched_at": now_epoch,
        }
        try:
            cache.save_json_artifact(artifact_name, payload)
        except Exception:
            pass
        return FinancialsResult(
            symbol=clean,
            status="OK",
            available=True,
            source=payload["source"],
            fetched_at_ist=_epoch_to_ist(now_epoch),
            is_stale=False,
            yearly=yearly,
            quarterly=quarterly,
            key_stats=key_stats,
            provenance=_build_upstox_financials_provenance(False, "LIVE_PROVIDER", now_epoch),
        )

    if cached and settings.ALLOW_STALE_CACHE_FALLBACK and (cached.get("yearly") or cached.get("quarterly")):
        fetched_at = float(cached.get("_fetched_at", 0))
        return FinancialsResult(
            symbol=clean,
            status="STALE_DATA",
            available=True,
            source=str(cached.get("source", "Upstox Company Fundamentals API (cached)")),
            fetched_at_ist=_epoch_to_ist(fetched_at),
            is_stale=True,
            yearly=cached.get("yearly", []),
            quarterly=cached.get("quarterly", []),
            key_stats=cached.get("key_stats", {}),
            message=error_note or "Serving stale cached Upstox financials because upstream fetch was unavailable.",
            provenance=_build_upstox_financials_provenance(True, "DISK_CACHE_STALE", fetched_at),
        )

    return FinancialsResult(
        symbol=clean,
        status="UNAVAILABLE",
        available=False,
        source="Upstox Company Fundamentals API",
        message=error_note or "Company financial statements are currently unavailable from Upstox.",
        provenance=_build_upstox_financials_provenance(True, "UNAVAILABLE", None),
    )
