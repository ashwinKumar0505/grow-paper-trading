"""Comprehensive tests for Upstox Analytics Token provider, financials, caches, and artifact isolation."""

from datetime import datetime, timedelta
import json
import httpx
import numpy as np
import pandas as pd
import pytest

from app.config import settings
from app.data.cache import MarketDataCache, TokenBucketRateLimiter
from app.data.nse_calendar import IST
from app.data.providers.base import (
    DataUsagePolicy,
    ProviderNotConfiguredError,
    ProviderPolicyViolationError,
)
from app.data.providers.registry import get_provider
from app.data.providers.upstox_adapter import UpstoxMarketDataProvider, parse_upstox_candles_to_df
from app.data.providers.upstox_client import UpstoxAuthError, UpstoxHttpClient
from app.data.providers.upstox_financials import (
    fetch_upstox_financials,
    parse_upstox_income_statement,
    parse_upstox_key_ratios,
    parse_upstox_period,
    resolve_unit_multiplier,
)
from app.data.providers.upstox_instruments import UpstoxInstrumentResolver
from app.engine.artifact_store import check_artifact_compatibility, get_validated_backtest_report
from app.engine.backtester import run_universe_backtest


def _make_daily_candles(count: int = 80, start_price: float = 1000.0):
    """Build Upstox-style descending ISO+05:30 daily candles."""
    dates = pd.bdate_range("2026-07-01", periods=count)
    bars = []
    for i, d in enumerate(dates):
        p = round(start_price + i * 2.5, 2)
        bars.append([f"{d.strftime('%Y-%m-%d')}T00:00:00+05:30", p - 5, p + 8, p - 7, p, 500_000 + i * 1000, 0])
    bars.reverse()  # Upstox returns newest-first
    return bars


def test_upstox_instrument_aliases_and_unsupported_symbols(monkeypatch):
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "analytics-test-token")
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        if "/v2/instruments/search" in str(request.url):
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "data": [
                        {
                            "instrument_key": "NSE_EQ|INE999Z01011",
                            "tradingsymbol": "CUSTOMNSE",
                            "name": "Custom NSE Equity Ltd",
                            "segment": "NSE_EQ",
                            "instrument_type": "EQ",
                        }
                    ],
                },
            )
        return httpx.Response(200, json={"status": "success", "data": {}})

    client = UpstoxHttpClient(transport=httpx.MockTransport(handler))
    resolver = UpstoxInstrumentResolver(client)

    z = resolver.resolve("ZOMATO")
    e = resolver.resolve("ETERNAL")
    tm = resolver.resolve("TATAMOTORS")
    tmpv = resolver.resolve("TMPV")
    assert z is not None and e is not None and z.symbol == "ETERNAL" and z.instrument_key == e.instrument_key == "NSE_EQ|INE758T01015"
    assert tm is not None and tmpv is not None and tm.symbol == "TMPV" and tm.instrument_key == tmpv.instrument_key == "NSE_EQ|INE155A01022"
    assert len(calls) == 0  # Bundled NIFTY 500 ISINs require zero network calls

    assert resolver.resolve("DUMMYHEG") is None
    assert resolver.resolve("---") is None

    # Non-NIFTY-500 symbol resolves dynamically via /v2/instruments/search and caches internally
    custom = resolver.resolve("CUSTOMNSE")
    assert custom is not None and custom.instrument_key == "NSE_EQ|INE999Z01011"
    custom_again = resolver.resolve("CUSTOMNSE")
    assert custom_again == custom
    assert len(calls) == 1


def test_upstox_candle_merge_ist_ordering_dedup_and_incomplete_bar_exclusion():
    hist = [
        ["2026-11-06T00:00:00+05:30", 105, 108, 104, 106, 1000, 0],
        ["2026-11-05T00:00:00+05:30", 102, 106, 101, 105, 900, 0],
        ["2026-11-05T00:00:00+05:30", 102, 106, 101, 105, 900, 0],  # duplicate
        ["2026-11-04T00:00:00+05:30", 100, 103, 99, 102, 800, 0],
    ]
    intra = [
        ["2026-11-06T09:15:00+05:30", 105, 110, 104, 109, 2500, 0],  # supersedes hist Nov 6
        ["2026-11-09T09:15:00+05:30", 109, 112, 108, 111, 1200, 0],  # today in-progress
    ]
    df = parse_upstox_candles_to_df(hist, intra, is_intraday=False)
    assert df is not None
    assert list(df.index.strftime("%Y-%m-%d")) == ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09"]
    assert float(df.loc["2026-11-06", "Close"]) == 109.0
    assert int(df.loc["2026-11-06", "Volume"]) == 2500

    # Verify incomplete candle exclusion via validate_and_normalize_ohlcv
    from app.data.quality import validate_and_normalize_ohlcv
    now_live = IST.localize(datetime(2026, 11, 9, 11, 0, 0))
    validated = validate_and_normalize_ohlcv(df, interval="1d", min_bars=3, now_ist=now_live, exclude_partial_candle=True)
    assert validated.quality.partial_candle_excluded is True
    assert validated.partial_candle is not None
    assert validated.df_completed is not None
    assert len(validated.df_completed) == 3
    assert str(validated.df_completed.index[-1])[:10] == "2026-11-06"


def test_upstox_financials_crore_to_rupee_conversion_and_provider_cache_isolation(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "analytics-fin-token")
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", False)
    cache = MarketDataCache(cache_dir=str(tmp_path))

    # Plant a legacy Yahoo financials artifact -> Upstox MUST NOT serve it!
    cache.save_json_artifact(
        "financials_HDFCBANK",
        {
            "symbol": "HDFCBANK",
            "source": "Yahoo Finance",
            "yearly": [{"period": "FY25", "end_date": "2025-03-31", "revenue": 999.0, "net_profit": 111.0}],
            "_fetched_at": 9999999999.0,
        },
    )

    assert resolve_unit_multiplier("crore") == 1e7
    assert resolve_unit_multiplier("lakh") == 1e5
    assert parse_upstox_period("Mar 2026", yearly=True) == ("FY26", "2026-03-31")
    assert parse_upstox_period("Jun 2025", yearly=False) == ("Jun 25", "2025-06-30")
    assert parse_upstox_period("Q1 FY26", yearly=False) == ("Jun 25", "2025-06-30")

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        assert request.headers["Authorization"] == "Bearer analytics-fin-token"
        if "income-statement" in url and "time_period=yearly" in url:
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "data": {
                        "type": "consolidated",
                        "time_period": "yearly",
                        "units_in": "crore",
                        "income_statement": [
                            {
                                "category": "revenue",
                                "history": [
                                    {"period": "Mar 2026", "value": 250000.0},
                                    {"period": "Mar 2025", "value": 200000.0},
                                ],
                            },
                            {
                                "category": "operating_profit",
                                "history": [
                                    {"period": "Mar 2026", "value": 90000.0},
                                    {"period": "Mar 2025", "value": 75000.0},
                                ],
                            },
                            {
                                "category": "net_profit",
                                "history": [
                                    {"period": "Mar 2026", "value": 70000.0},
                                    {"period": "Mar 2025", "value": 50000.0},
                                ],
                            },
                        ],
                    },
                },
            )
        if "income-statement" in url and "time_period=quarterly" in url:
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "data": {
                        "type": "consolidated",
                        "time_period": "quarterly",
                        "units_in": "crore",
                        "income_statement": [
                            {"category": "revenue", "history": [{"period": "Jun 2025", "value": 65000.0}]},
                            {"category": "net_profit", "history": [{"period": "Jun 2025", "value": 16250.0}]},
                        ],
                    },
                },
            )
        if "key-ratios" in url:
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "data": [
                        {"name": "P/E", "company_value": "19.25", "sector_value": "15.10"},
                        {"name": "ROE", "company_value": "16.8%", "sector_value": "14.0%"},
                    ],
                },
            )
        if "profile" in url:
            return httpx.Response(200, json={"status": "success", "data": {"sector_market_cap_inr": 99999999}})
        return httpx.Response(404)

    client = UpstoxHttpClient(transport=httpx.MockTransport(handler))
    resolver = UpstoxInstrumentResolver(client)
    res = fetch_upstox_financials("HDFCBANK", client, resolver, cache, force_refresh=False)

    assert res.status == "OK"
    assert res.available is True
    assert res.source == "Upstox Company Fundamentals API"
    assert len(res.yearly) == 2
    assert res.yearly[-1]["period"] == "FY26"
    # 250,000 crore -> 2,500,000,000,000 INR (2.5e12)
    assert res.yearly[-1]["revenue"] == 2_500_000_000_000.0
    assert res.yearly[-1]["net_profit"] == 700_000_000_000.0
    assert res.yearly[-1]["profit_margin_pct"] == 28.0
    assert res.quarterly[0]["period"] == "Jun 25"
    assert res.quarterly[0]["revenue"] == 650_000_000_000.0
    assert res.key_stats["pe_ratio"] == 19.25
    assert res.key_stats["revenue_growth_pct"] == 25.0
    assert res.key_stats["earnings_growth_pct"] == 40.0
    # Must NOT mistake sector_market_cap_inr for company market_cap
    assert res.key_stats["market_cap"] is None
    # Saved under provider-scoped artifact name, leaving legacy Yahoo artifact untouched
    assert (tmp_path / "artifacts" / "financials_upstox_HDFCBANK.json").exists()
    assert (tmp_path / "artifacts" / "financials_HDFCBANK.json").exists()


def test_upstox_adjustment_policy_guard_token_auth_and_rate_limit_retries(tmp_path, monkeypatch):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    limiter = TokenBucketRateLimiter(rate_per_sec=100.0, capacity=100.0)

    # 1. Missing Analytics Token (even if daily UPSTOX_ACCESS_TOKEN is set -> never substituted!)
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "")
    monkeypatch.setattr(settings, "UPSTOX_ACCESS_TOKEN", "daily-oauth-token-forbidden")
    client_no_tok = UpstoxHttpClient(limiter=limiter)
    with pytest.raises(ProviderNotConfiguredError, match="UPSTOX_ANALYTICS_TOKEN"):
        client_no_tok.get_json("/v2/instruments/search")

    # 2. Adjustment policy guard blocks unverified SPLIT_AND_DIVIDEND_ADJUSTED on Upstox
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "valid-analytics-token")
    monkeypatch.setattr(settings, "UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED", False)
    prov = UpstoxMarketDataProvider(cache=cache, limiter=limiter)
    assert prov.capabilities.production_approved is False
    assert prov.capabilities.supports_adjusted_prices is False

    with pytest.raises(ProviderPolicyViolationError, match="not verified as split-and-dividend adjusted"):
        prov.fetch_daily_ohlcv_result(
            "RELIANCE",
            policy=DataUsagePolicy(
                purpose="INDIVIDUAL_STOCK_ANALYSIS",
                require_production_approved_provider=False,
                adjustment_policy="SPLIT_AND_DIVIDEND_ADJUSTED",
            ),
        )

    # 3. 401 Invalid/Expired Token raises UpstoxAuthError and avoids spamming via cooldown
    auth_hits = 0

    def auth_handler(_req: httpx.Request) -> httpx.Response:
        nonlocal auth_hits
        auth_hits += 1
        return httpx.Response(401, json={"status": "error", "errors": [{"errorCode": "UDAPI100050"}]})

    auth_client = UpstoxHttpClient(limiter=limiter, transport=httpx.MockTransport(auth_handler))
    with pytest.raises(UpstoxAuthError, match="invalid, expired, or revoked"):
        auth_client.get_json("/v3/historical-candle/NSE_EQ%7CINE002A01018/days/1/2026-11-01/2026-10-01")
    with pytest.raises(UpstoxAuthError):
        auth_client.get_json("/v3/historical-candle/NSE_EQ%7CINE002A01018/days/1/2026-11-01/2026-10-01")
    assert auth_hits == 1

    # 4. 429 Rate Limit retries with backoff and succeeds under explicit SPLIT_ADJUSTED_ONLY policy
    attempts = 0
    daily_bars = _make_daily_candles(80)

    def retry_handler(req: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "0.05"}, json={"status": "error"})
        if "/intraday/" in str(req.url):
            return httpx.Response(200, json={"status": "success", "data": {"candles": []}})
        return httpx.Response(200, json={"status": "success", "data": {"candles": daily_bars}})

    retry_client = UpstoxHttpClient(
        limiter=limiter, retry_attempts=3, retry_backoff=0.05, transport=httpx.MockTransport(retry_handler)
    )
    retry_prov = UpstoxMarketDataProvider(cache=cache, limiter=limiter, client=retry_client)
    res = retry_prov.fetch_daily_ohlcv_result(
        "RELIANCE",
        period="6mo",
        min_bars=50,
        policy=DataUsagePolicy(
            purpose="INDIVIDUAL_STOCK_ANALYSIS",
            require_production_approved_provider=False,
            adjustment_policy="SPLIT_ADJUSTED_ONLY",
        ),
    )
    assert res.status in ("OK", "STALE_CACHE")
    assert res.df is not None and len(res.df) >= 75
    assert res.provenance.provider_id == "upstox"
    assert res.provenance.price_adjustment_policy == "SPLIT_ADJUSTED_ONLY"
    assert attempts >= 2


def test_backtest_artifact_provider_compatibility_rejects_yahoo_under_upstox(tmp_path, monkeypatch):
    from app.engine import artifact_store

    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(artifact_store, "market_cache", cache)
    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_AND_DIVIDEND_ADJUSTED")

    # Build a synthetic-flag-false report tagged as yfinance
    dates = pd.bdate_range("2024-01-01", periods=220)
    df = pd.DataFrame(
        {
            "Open": np.linspace(100, 180, 220),
            "High": np.linspace(102, 184, 220),
            "Low": np.linspace(98, 176, 220),
            "Close": np.linspace(101, 182, 220),
            "Volume": np.full(220, 1_000_000, dtype=np.int64),
        },
        index=dates,
    )
    yf_report = run_universe_backtest(
        daily_dfs={"RELIANCE": df},
        intraday_dfs={},
        save_artifact=False,
        num_folds=2,
        is_synthetic_fixture=False,
        data_provider_id="yfinance",
    )
    cache.save_json_artifact("backtest_report", yf_report.model_dump())

    # Under yfinance, legacy backtest_report.json is compatible
    ok_yf, reason_yf = check_artifact_compatibility(yf_report, active_provider_id="yfinance")
    assert ok_yf is True and reason_yf is None

    # Under upstox, Yahoo artifact MUST be rejected!
    ok_up, reason_up = check_artifact_compatibility(yf_report, active_provider_id="upstox")
    assert ok_up is False
    assert "Data provider mismatch" in (reason_up or "")

    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "upstox")
    loaded_up, why_up = get_validated_backtest_report()
    assert loaded_up is None
    assert "upstox" in (why_up or "")

    # Explicit rollback to yfinance still loads preserved legacy Yahoo artifact
    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "yfinance")
    loaded_yf, why_yf = get_validated_backtest_report()
    assert loaded_yf is not None and why_yf is None


def test_fastapi_routes_end_to_end_with_upstox_provider(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from app.data.provider import data_provider
    from app.engine import scanner as sc_mod
    from app.main import app

    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(sc_mod, "market_cache", cache)
    limiter = TokenBucketRateLimiter(rate_per_sec=100.0, capacity=100.0)
    daily_bars = _make_daily_candles(90, start_price=1400.0)

    def handler(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        if "/v2/fundamentals/" in url and "income-statement" in url:
            return httpx.Response(
                200,
                json={
                    "status": "success",
                    "data": {
                        "units_in": "crore",
                        "income_statement": [
                            {"category": "revenue", "history": [{"period": "Mar 2026", "value": 120000.0}]},
                            {"category": "net_profit", "history": [{"period": "Mar 2026", "value": 24000.0}]},
                        ],
                    },
                },
            )
        if "/v2/fundamentals/" in url and "key-ratios" in url:
            return httpx.Response(200, json={"status": "success", "data": [{"name": "P/E", "company_value": "21.5"}]})
        if "/v2/fundamentals/" in url and "profile" in url:
            return httpx.Response(200, json={"status": "success", "data": {}})
        if "/v3/historical-candle/intraday/" in url:
            return httpx.Response(200, json={"status": "success", "data": {"candles": []}})
        if "/v3/historical-candle/" in url and "/minutes/15/" in url:
            bars = []
            for d in pd.bdate_range("2026-11-02", periods=3):
                for t in pd.date_range(f"{d.strftime('%Y-%m-%d')} 09:15", f"{d.strftime('%Y-%m-%d')} 15:15", freq="15min"):
                    bars.append([f"{t.strftime('%Y-%m-%dT%H:%M:%S')}+05:30", 1400.0, 1408.0, 1396.0, 1405.0, 25000, 0])
            bars.reverse()
            return httpx.Response(200, json={"status": "success", "data": {"candles": bars}})
        if "/v3/historical-candle/" in url:
            return httpx.Response(200, json={"status": "success", "data": {"candles": daily_bars}})
        return httpx.Response(404)

    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "upstox")
    monkeypatch.setattr(settings, "UPSTOX_ANALYTICS_TOKEN", "e2e-analytics-token")
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", False)
    client_http = UpstoxHttpClient(limiter=limiter, transport=httpx.MockTransport(handler))
    up_provider = UpstoxMarketDataProvider(cache=cache, limiter=limiter, client=client_http)
    monkeypatch.setattr(data_provider, "_provider", up_provider)

    api_client = TestClient(app)
    r_health = api_client.get("/api/v1/health")
    assert r_health.status_code == 200
    h = r_health.json()
    assert h["provider"] == "upstox"
    assert h["provider_token_configured"] is True
    assert h["provider_production_approved"] is False
    assert h["provider_supports_adjusted_prices"] is False

    # Financials work immediately via Upstox even while daily adjustment policy is strict
    r_fin = api_client.get("/api/v1/stocks/HDFCBANK/financials")
    assert r_fin.status_code == 200
    fin = r_fin.json()
    assert fin["available"] is True
    assert fin["yearly"][-1]["revenue"] == 1_200_000_000_000.0
    assert fin["key_stats"]["pe_ratio"] == 21.5

    # Default SPLIT_AND_DIVIDEND_ADJUSTED fails closed (503) rather than mislabeling Upstox bars
    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_AND_DIVIDEND_ADJUSTED")
    r_blocked = api_client.get("/api/v1/stocks/RELIANCE/analysis")
    assert r_blocked.status_code == 503
    assert "not verified as split-and-dividend adjusted" in r_blocked.json()["message"]

    # Explicit SPLIT_ADJUSTED_ONLY executes full analysis & scanners with accurate provenance
    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_ADJUSTED_ONLY")
    r_ana = api_client.get("/api/v1/stocks/RELIANCE/analysis")
    assert r_ana.status_code == 200
    ana = r_ana.json()
    assert ana["symbol"] == "RELIANCE"
    assert ana["data_provenance"]["provider_id"] == "upstox"
    assert ana["data_provenance"]["price_adjustment_policy"] == "SPLIT_ADJUSTED_ONLY"

    r_sw = api_client.get("/api/v1/scanner/swing?universe_limit=3&min_score=0")
    assert r_sw.status_code == 200
    assert r_sw.json()["scan_coverage"]["stocks_analyzed"] == 3

    r_in = api_client.get("/api/v1/scanner/intraday?universe_limit=2")
    assert r_in.status_code == 200
    assert r_in.json()["scan_coverage"]["stocks_analyzed"] == 2

