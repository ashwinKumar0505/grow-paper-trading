"""Shared pytest fixtures keeping the suite independent of the developer's local .env."""

import pytest


@pytest.fixture(autouse=True)
def _pin_price_adjustment_policy(monkeypatch):
    # Fixture-based tests (yfinance replay caches, Upstox fail-closed guard) were written against
    # SPLIT_AND_DIVIDEND_ADJUSTED. Pin it so a local .env (e.g. SPLIT_ADJUSTED_ONLY for Upstox)
    # does not change test behaviour. Individual tests may still override via monkeypatch.
    from app.config import settings

    monkeypatch.setattr(settings, "PRICE_ADJUSTMENT_POLICY", "SPLIT_AND_DIVIDEND_ADJUSTED")
