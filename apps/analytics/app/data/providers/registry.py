"""Provider registry and explicit licensed-vendor adapter stubs."""

from typing import Dict, List, Optional

from app.config import settings
from app.data.nifty500_constituents import get_stock_info
from app.data.providers.base import (
    DataUsagePolicy,
    FinancialsResult,
    MarketDataProvider,
    MarketDataResult,
    ProviderCapabilities,
    ProviderNotConfiguredError,
)
from app.models.market import StockConstituent


class LicensedProviderPlaceholder(MarketDataProvider):
    """
    Explicit placeholder adapter for licensed Indian market-data vendors.
    Fails closed rather than silently falling back to Yahoo Finance or bypassing vendor APIs.
    """

    def __init__(self, provider_id: str, display_name: str, required_env_vars: List[str]):
        self._required_env_vars = required_env_vars
        self._caps = ProviderCapabilities(
            provider_id=provider_id,
            display_name=display_name,
            supports_daily_ohlcv=True,
            supports_intraday_ohlcv=True,
            supported_intraday_intervals=("1m", "5m", "15m", "30m", "60m"),
            supports_stock_info=True,
            supports_constituents=False,
            supports_financials=False,
            supports_adjusted_prices=True,
            is_realtime=True,
            estimated_delay_minutes=0,
            licensing_tier="LICENSED_COMMERCIAL_VENDOR_INTEGRATION_REQUIRED",
            production_approved=False,
            limitations=(
                f"{display_name} adapter requires licensed vendor SDK/API credentials and "
                f"compliance sign-off ({', '.join(required_env_vars)}).",
            ),
        )

    @property
    def capabilities(self) -> ProviderCapabilities:
        return self._caps

    def _raise_unconfigured(self) -> None:
        raise ProviderNotConfiguredError(
            f"Provider '{self._caps.provider_id}' ({self._caps.display_name}) is registered as a "
            f"licensed integration point but is not yet enabled. Supply licensed credentials "
            f"({', '.join(self._required_env_vars)}) and implement the authorized vendor adapter."
        )

    def fetch_daily_ohlcv_result(self, symbol: str, period: str = "2y", force_refresh: bool = False, min_bars: int = 50, policy: Optional[DataUsagePolicy] = None) -> MarketDataResult:
        self._raise_unconfigured()

    def fetch_batch_daily_ohlcv_results(self, symbols: List[str], period: str = "2y", force_refresh: bool = False, min_bars: int = 50, policy: Optional[DataUsagePolicy] = None) -> Dict[str, MarketDataResult]:
        self._raise_unconfigured()

    def fetch_intraday_ohlcv_result(self, symbol: str, period: str = "5d", interval: str = "15m", force_refresh: bool = False, min_bars: int = 15, policy: Optional[DataUsagePolicy] = None) -> MarketDataResult:
        self._raise_unconfigured()

    def fetch_batch_intraday_ohlcv_results(self, symbols: List[str], period: str = "5d", interval: str = "15m", force_refresh: bool = False, min_bars: int = 15, policy: Optional[DataUsagePolicy] = None) -> Dict[str, MarketDataResult]:
        self._raise_unconfigured()

    def fetch_stock_info(self, symbol: str) -> Optional[StockConstituent]:
        return get_stock_info(symbol)

    def fetch_financials_result(self, symbol: str, force_refresh: bool = False) -> FinancialsResult:
        self._raise_unconfigured()


_LICENSED_STUBS = {
    "angel_one": ("Angel One SmartAPI", ["ANGEL_ONE_API_KEY", "ANGEL_ONE_CLIENT_ID"]),
    "fyers": ("FYERS Market Data API", ["FYERS_APP_ID", "FYERS_ACCESS_TOKEN"]),
    "truedata": ("TrueData Authorized NSE Feed", ["TRUEDATA_USERNAME", "TRUEDATA_PASSWORD"]),
    "kite": ("Zerodha Kite Connect", ["KITE_API_KEY", "KITE_ACCESS_TOKEN"]),
}


def get_provider(provider_id: Optional[str] = None) -> MarketDataProvider:
    """Instantiate the configured market-data provider lazily so unused vendor SDKs stay out of RAM."""
    pid = (provider_id or settings.MARKET_DATA_PROVIDER).strip().lower()
    if pid == "upstox":
        from app.data.providers.upstox_adapter import UpstoxMarketDataProvider

        return UpstoxMarketDataProvider()
    if pid == "yfinance":
        from app.data.providers.yfinance_adapter import YFinanceMarketDataProvider

        return YFinanceMarketDataProvider()
    if pid in _LICENSED_STUBS:
        display_name, env_vars = _LICENSED_STUBS[pid]
        return LicensedProviderPlaceholder(pid, display_name, env_vars)
    raise ProviderNotConfiguredError(
        f"Unknown MARKET_DATA_PROVIDER '{pid}'. Supported ids: {list_registered_providers()}."
    )


def list_registered_providers() -> List[str]:
    return ["upstox", "yfinance", *sorted(_LICENSED_STUBS.keys())]
