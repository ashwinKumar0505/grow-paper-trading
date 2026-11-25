"""Integration tests for FastAPI endpoints, error envelopes, auth, entitlements, and rate limits."""

import base64
import json
import time
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.api.auth import api_rate_limiter, sign_service_request
from app.config import settings
from app.data.cache import MarketDataCache
from app.data.provider import data_provider
from app.data.providers.registry import get_provider
from app.data.providers.yfinance_adapter import YFinanceMarketDataProvider
from app.engine import artifact_store
from app.engine.backtester import run_universe_backtest
from app.main import app

client = TestClient(app)


def _make_sample_daily_df(periods: int = 240) -> pd.DataFrame:
    dates = pd.bdate_range("2024-01-01", periods=periods)
    base = np.linspace(1200.0, 1450.0, periods) + np.sin(np.linspace(0, 12, periods)) * 18.0
    return pd.DataFrame(
        {
            "Open": base - 4.0,
            "High": base + 12.0,
            "Low": base - 10.0,
            "Close": base,
            "Volume": np.full(periods, 2_500_000, dtype=np.int64),
        },
        index=dates,
    )


def _mount_yfinance_replay_cache(tmp_path, monkeypatch) -> MarketDataCache:
    cache = MarketDataCache(cache_dir=str(tmp_path))
    cache.set_ohlcv(
        "RELIANCE",
        _make_sample_daily_df(),
        interval="1d",
        provider_id="yfinance",
        adjustment_policy="SPLIT_AND_DIVIDEND_ADJUSTED",
    )
    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "yfinance")
    monkeypatch.setattr(data_provider, "_provider", YFinanceMarketDataProvider(cache=cache))
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", True)
    return cache


def _signed_headers(secret: str, method: str, path: str, user_ctx: dict, ts_offset: int = 0) -> dict:
    ts = str(int(time.time()) + ts_offset)
    ctx_b64 = base64.urlsafe_b64encode(json.dumps(user_ctx).encode("utf-8")).decode("utf-8")
    sig = sign_service_request(secret, ts, method, path, ctx_b64)
    return {
        "X-Service-Timestamp": ts,
        "X-Service-Signature": sig,
        "X-User-Context": ctx_b64,
    }


def test_health_market_calendar_and_methodology():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["analysis_engine_type"] == "RULE_BASED_TECHNICAL_ANALYTICS"
    assert data["uses_ai_or_ml"] is False
    assert data["nifty500_constituents_count"] == 500

    r_status = client.get("/api/v1/market/status")
    assert r_status.status_code == 200
    m = r_status.json()
    assert m["market_open_time_ist"] == "09:15:00"
    assert m["intraday_square_off_time_ist"] == "15:15:00"

    r_cal = client.get("/api/v1/market/calendar")
    assert r_cal.status_code == 200
    assert "2026-11-10" in r_cal.json()["holidays"]

    r_meta = client.get("/api/v1/metadata/methodology")
    assert r_meta.status_code == 200
    meta = r_meta.json()
    assert meta["engine_metadata"]["uses_ai_or_ml"] is False
    assert len(meta["strategies"]) == 12


def test_stock_search_and_universe_with_survivorship_metadata():
    r = client.get("/api/v1/stocks/search?q=RELIANCE")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1 and items[0]["symbol"] == "RELIANCE"

    r_univ = client.get("/api/v1/stocks/universe")
    assert r_univ.status_code == 200
    u = r_univ.json()
    assert u["total_count"] == 500
    assert u["universe_metadata"]["point_in_time_history_available"] is False
    assert "survivorship" in u["universe_metadata"]["survivorship_bias_disclosure"].lower()


def test_individual_stock_analysis_and_error_states(tmp_path, monkeypatch):
    # Verify explicit yfinance rollback replay works with isolated cached CSVs
    _mount_yfinance_replay_cache(tmp_path, monkeypatch)
    r = client.get("/api/v1/stocks/RELIANCE/analysis")
    assert r.status_code == 200
    data = r.json()
    assert data["symbol"] == "RELIANCE"
    assert 0.0 <= data["technical_setup_score"] <= 100.0
    assert data["score_breakdown"]["is_calibrated_probability"] is False
    assert data["is_investment_advice"] is False
    assert data["engine_metadata"]["uses_ai_or_ml"] is False
    assert data["signal_classification"] in ("BUY", "WAIT", "AVOID")
    assert len(data["strategy_evaluations"]) == 9

    # Malformed symbol -> structured 400 UNSUPPORTED_SYMBOL
    r_bad = client.get("/api/v1/stocks/---/analysis")
    assert r_bad.status_code == 400
    assert r_bad.json()["error_code"] == "UNSUPPORTED_SYMBOL"

    # Unknown symbol in offline mode -> structured 503 PROVIDER_UNAVAILABLE (never fabricated!)
    r_unavail = client.get("/api/v1/stocks/NONEXISTENTXYZ99/analysis")
    assert r_unavail.status_code == 503
    assert r_unavail.json()["error_code"] == "PROVIDER_UNAVAILABLE"


def test_swing_and_intraday_scanners_with_exact_coverage(tmp_path, monkeypatch):
    from app.data.cache import MarketDataCache
    from app.engine import scanner as sc_mod
    monkeypatch.setattr(sc_mod, "market_cache", MarketDataCache(cache_dir=str(tmp_path)))
    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "yfinance")
    monkeypatch.setattr(data_provider, "_provider", get_provider("yfinance"))
    monkeypatch.setattr(settings, "EDUCATIONAL_REPLAY_MODE", True)

    r_swing = client.get("/api/v1/scanner/swing?universe_limit=25&min_score=55&result_limit=10")
    assert r_swing.status_code == 200
    sw = r_swing.json()
    assert sw["scan_coverage"]["requested_universe_size"] == 25
    assert sw["scan_coverage"]["stocks_attempted"] == 25
    assert sw["scan_coverage"]["applied_result_limit"] == 10
    assert len(sw["signals"]) <= 10
    assert sw["engine_metadata"]["uses_ai_or_ml"] is False

    r_intra = client.get("/api/v1/scanner/intraday?universe_limit=20&result_limit=10")
    assert r_intra.status_code == 200
    intra = r_intra.json()
    assert intra["scan_coverage"]["requested_universe_size"] == 20
    assert intra["scan_coverage"]["stocks_attempted"] == 20
    assert len(intra["signals"]) <= 10


def test_backtest_report_validated_and_unvalidated_fallback(tmp_path, monkeypatch):
    cache = MarketDataCache(cache_dir=str(tmp_path))
    monkeypatch.setattr(artifact_store, "market_cache", cache)
    yf_report = run_universe_backtest(
        daily_dfs={"RELIANCE": _make_sample_daily_df(280)},
        intraday_dfs={},
        save_artifact=False,
        num_folds=4,
        is_synthetic_fixture=False,
        data_provider_id="yfinance",
    )
    cache.save_json_artifact("backtest_report", yf_report.model_dump())

    # Default active provider is upstox: must NOT serve legacy Yahoo backtest_report.json as Upstox!
    r_upstox = client.get("/api/v1/backtest/report")
    assert r_upstox.status_code == 200
    rep_up = r_upstox.json()
    assert rep_up["validation_status"] == "UNVALIDATED"
    assert rep_up["artifact_metadata"]["data_provider_id"] == "upstox"
    assert all(s["net_win_rate_oos_pct"] is None for s in rep_up["strategies"])

    # Explicit rollback to yfinance serves preserved compatible Yahoo walk-forward artifact
    monkeypatch.setattr(settings, "MARKET_DATA_PROVIDER", "yfinance")
    r = client.get("/api/v1/backtest/report")
    assert r.status_code == 200
    rep = r.json()
    assert rep["walk_forward_folds"] == 4
    assert len(rep["daily_folds"]) == 4
    assert len(rep["strategies"]) == 12
    assert rep["artifact_metadata"]["parameter_fitting_performed"] is False

    # Simulate missing/incompatible artifact -> honest UNVALIDATED with null metrics
    from app.api import routes as api_routes
    monkeypatch.setattr(api_routes, "get_validated_backtest_report", lambda: (None, "Incompatible schema"))
    r_unval = client.get("/api/v1/backtest/report")
    assert r_unval.status_code == 200
    unval = r_unval.json()
    assert unval["validation_status"] == "UNVALIDATED"
    assert all(s["net_win_rate_oos_pct"] is None for s in unval["strategies"])


def test_service_auth_entitlements_and_rate_limiting(tmp_path, monkeypatch):
    api_rate_limiter.reset()
    secret = "test-shared-secret-key-256"
    _mount_yfinance_replay_cache(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "AUTH_MODE", "service_token")
    monkeypatch.setattr(settings, "SERVICE_AUTH_SECRET", secret)

    # 1. Unsigned request with spoofed client tier header -> MUST fail 401 UNAUTHORIZED
    r_spoof = client.get(
        "/api/v1/stocks/RELIANCE/analysis",
        headers={"X-Subscription-Tier": "ADMIN"},
    )
    assert r_spoof.status_code == 401
    assert r_spoof.json()["error_code"] == "UNAUTHORIZED"

    # 2. Expired timestamp -> 401 UNAUTHORIZED
    exp_headers = _signed_headers(
        secret, "GET", "/api/v1/stocks/RELIANCE/analysis", {"user_id": "u1", "subscription_tier": "FREE"}, ts_offset=-600
    )
    assert client.get("/api/v1/stocks/RELIANCE/analysis", headers=exp_headers).status_code == 401

    # 3. Valid FREE user can access normal analysis (both padded and Node-style unpadded base64url)
    free_headers = _signed_headers(
        secret, "GET", "/api/v1/stocks/RELIANCE/analysis", {"user_id": "u1", "subscription_tier": "FREE"}
    )
    assert client.get("/api/v1/stocks/RELIANCE/analysis", headers=free_headers).status_code == 200

    for uid in ("u", "u1", "firebase-uid-28chars-example"):
        ts = str(int(time.time()))
        raw_ctx = {"user_id": uid, "subscription_tier": "FREE", "roles": ["user"]}
        unpadded_b64 = base64.urlsafe_b64encode(json.dumps(raw_ctx).encode("utf-8")).decode("utf-8").rstrip("=")
        sig = sign_service_request(secret, ts, "GET", "/api/v1/stocks/RELIANCE/analysis", unpadded_b64)
        r_unpadded = client.get(
            "/api/v1/stocks/RELIANCE/analysis",
            headers={"X-Service-Timestamp": ts, "X-Service-Signature": sig, "X-User-Context": unpadded_b64},
        )
        assert r_unpadded.status_code == 200

    # 4. FREE user denied on restricted force_refresh=true and POST /backtest/run -> 403 ENTITLEMENT_DENIED
    r_denied_refresh = client.get("/api/v1/stocks/RELIANCE/analysis?force_refresh=true", headers=free_headers)
    assert r_denied_refresh.status_code == 403
    assert r_denied_refresh.json()["error_code"] == "ENTITLEMENT_DENIED"

    bt_free_headers = _signed_headers(
        secret, "POST", "/api/v1/backtest/run", {"user_id": "u1", "subscription_tier": "FREE"}
    )
    r_denied_bt = client.post("/api/v1/backtest/run?sample_size=20", headers=bt_free_headers)
    assert r_denied_bt.status_code == 403
    assert r_denied_bt.json()["error_code"] == "ENTITLEMENT_DENIED"

    # 5. Rate limit enforcement -> 429 RATE_LIMIT_EXCEEDED
    monkeypatch.setattr(settings, "API_RATE_LIMIT_PER_MINUTE", 2)
    api_rate_limiter.reset()
    assert client.get("/api/v1/stocks/RELIANCE/analysis", headers=free_headers).status_code == 200
    assert client.get("/api/v1/stocks/RELIANCE/analysis", headers=free_headers).status_code == 200
    r_429 = client.get("/api/v1/stocks/RELIANCE/analysis", headers=free_headers)
    assert r_429.status_code == 429
    assert r_429.json()["error_code"] == "RATE_LIMIT_EXCEEDED"
