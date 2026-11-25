"""Market-data service facade delegating to the configured MarketDataProvider adapter."""

from typing import Any, Dict, List, Optional
import pandas as pd

from app.config import settings
from app.data.providers.base import (
    DataUsagePolicy,
    FinancialsResult,
    LiveQuote,
    MarketDataProvider,
    MarketDataResult,
    ProviderCapabilities,
)
from app.data.providers.registry import get_provider
from app.models.market import StockConstituent


class NSEMarketDataProvider:
    """
    Facade over `MarketDataProvider` preserving backward-compatible helper methods
    while exposing full provenance, data quality, and policy-governed result objects.
    """

    def __init__(self, provider: Optional[MarketDataProvider] = None):
        self._provider = provider or get_provider(settings.MARKET_DATA_PROVIDER)

    @property
    def provider(self) -> MarketDataProvider:
        return self._provider

    @property
    def provider_name(self) -> str:
        return self._provider.capabilities.provider_id

    @property
    def capabilities(self) -> ProviderCapabilities:
        return self._provider.capabilities

    def set_provider(self, provider: MarketDataProvider) -> None:
        self._provider = provider

    def reload_provider(self, provider_id: Optional[str] = None) -> MarketDataProvider:
        self._provider = get_provider(provider_id or settings.MARKET_DATA_PROVIDER)
        return self._provider

    def fetch_daily_ohlcv_result(
        self,
        symbol: str,
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        return self._provider.fetch_daily_ohlcv_result(
            symbol=symbol, period=period, force_refresh=force_refresh, min_bars=min_bars, policy=policy
        )

    def fetch_batch_daily_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        return self._provider.fetch_batch_daily_ohlcv_results(
            symbols=symbols, period=period, force_refresh=force_refresh, min_bars=min_bars, policy=policy
        )

    def fetch_intraday_ohlcv_result(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        return self._provider.fetch_intraday_ohlcv_result(
            symbol=symbol,
            period=period,
            interval=interval,
            force_refresh=force_refresh,
            min_bars=min_bars,
            policy=policy,
        )

    def fetch_batch_intraday_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        return self._provider.fetch_batch_intraday_ohlcv_results(
            symbols=symbols,
            period=period,
            interval=interval,
            force_refresh=force_refresh,
            min_bars=min_bars,
            policy=policy,
        )

    def fetch_stock_info(self, symbol: str) -> Optional[StockConstituent]:
        return self._provider.fetch_stock_info(symbol)

    def fetch_live_quotes(
        self,
        symbols: List[str],
        timeout_seconds: float = 2.0,
    ) -> Dict[str, LiveQuote]:
        return self._provider.fetch_live_quotes(symbols=symbols, timeout_seconds=timeout_seconds)

    def fetch_financials_result(self, symbol: str, force_refresh: bool = False) -> FinancialsResult:
        return self._provider.fetch_financials_result(symbol=symbol, force_refresh=force_refresh)

    # Backward-compatible DataFrame-returning wrappers
    def fetch_daily_ohlcv(
        self,
        symbol: str,
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
    ) -> Optional[pd.DataFrame]:
        res = self.fetch_daily_ohlcv_result(symbol, period, force_refresh, min_bars)
        return res.df if res.status in ("OK", "STALE_CACHE") else None

    def fetch_batch_daily_ohlcv(
        self,
        symbols: List[str],
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        chunk_size: int = 40,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, pd.DataFrame]:
        res_map = self.fetch_batch_daily_ohlcv_results(symbols, period, force_refresh, min_bars, policy)
        return {
            sym: r.df
            for sym, r in res_map.items()
            if r.df is not None and r.status in ("OK", "STALE_CACHE")
        }

    def fetch_intraday_ohlcv(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
    ) -> Optional[pd.DataFrame]:
        res = self.fetch_intraday_ohlcv_result(symbol, period, interval, force_refresh)
        return res.df if res.status in ("OK", "STALE_CACHE") else None

    def fetch_batch_intraday_ohlcv(
        self,
        symbols: List[str],
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        chunk_size: int = 35,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, pd.DataFrame]:
        res_map = self.fetch_batch_intraday_ohlcv_results(
            symbols, period, interval, force_refresh, 15, policy
        )
        return {
            sym: r.df
            for sym, r in res_map.items()
            if r.df is not None and r.status in ("OK", "STALE_CACHE")
        }

    def fetch_financials(self, symbol: str, force_refresh: bool = False) -> Dict[str, Any]:
        res = self.fetch_financials_result(symbol, force_refresh)
        return {
            "symbol": res.symbol,
            "currency": res.currency,
            "status": res.status,
            "available": res.available,
            "source": res.source,
            "fetched_at_ist": res.fetched_at_ist,
            "is_stale": res.is_stale,
            "yearly": res.yearly,
            "quarterly": res.quarterly,
            "key_stats": res.key_stats,
            "message": res.message,
        }


data_provider = NSEMarketDataProvider()
