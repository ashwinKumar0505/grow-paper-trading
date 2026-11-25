"""Abstract Market-Data Provider contract, capabilities, data-usage policies, and result types."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional
import pandas as pd

from app.models.common import DataQualitySummary, MarketDataProvenance
from app.models.market import StockConstituent


class ProviderError(Exception):
    """Base error for market-data provider operations."""


class ProviderUnavailableError(ProviderError):
    """Raised when an upstream market-data provider cannot be reached or returns an error."""


class ProviderNotConfiguredError(ProviderError):
    """Raised when a licensed provider adapter lacks credentials or implementation."""


class ProviderPolicyViolationError(ProviderError):
    """Raised when configured data-usage policy disallows a provider for the requested operation."""


@dataclass(frozen=True)
class ExchangeMetadata:
    exchange_code: str = "NSE"
    exchange_name: str = "National Stock Exchange of India"
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"
    regular_open_ist: str = "09:15:00"
    regular_close_ist: str = "15:30:00"


@dataclass(frozen=True)
class ProviderCapabilities:
    provider_id: str
    display_name: str
    supports_daily_ohlcv: bool = True
    supports_intraday_ohlcv: bool = True
    supported_intraday_intervals: tuple = ("15m",)
    supports_stock_info: bool = True
    supports_constituents: bool = False
    supports_financials: bool = False
    supports_adjusted_prices: bool = True
    is_realtime: bool = False
    estimated_delay_minutes: Optional[int] = 15
    licensing_tier: str = "UNLICENSED_RESEARCH_DEV_ONLY"
    production_approved: bool = False
    limitations: tuple = ()


@dataclass(frozen=True)
class DataUsagePolicy:
    """Explicit operational policy governing which data sources/states are permitted."""

    purpose: Literal[
        "CURRENT_MARKET_SCREENING",
        "HISTORICAL_BACKTEST",
        "INDIVIDUAL_STOCK_ANALYSIS",
        "EDUCATIONAL_HISTORICAL_REPLAY",
    ]
    allow_delayed_data: bool = True
    allow_stale_cache_fallback: bool = True
    require_production_approved_provider: bool = False
    adjustment_policy: Literal[
        "SPLIT_AND_DIVIDEND_ADJUSTED", "SPLIT_ADJUSTED_ONLY", "UNADJUSTED_RAW"
    ] = "SPLIT_AND_DIVIDEND_ADJUSTED"


@dataclass
class MarketDataResult:
    """Structured result for any OHLCV request, carrying provenance, quality, and error status."""

    symbol: str
    interval: str
    status: Literal[
        "OK",
        "STALE_CACHE",
        "INSUFFICIENT_HISTORY",
        "INVALID_DATA",
        "PROVIDER_UNAVAILABLE",
        "UNSUPPORTED_SYMBOL",
    ]
    df: Optional[pd.DataFrame]
    partial_candle: Optional[pd.Series]
    provenance: MarketDataProvenance
    quality: DataQualitySummary
    error_message: Optional[str] = None


@dataclass
class FinancialsResult:
    """Structured company financial statement result with provenance and freshness."""

    symbol: str
    status: Literal["OK", "STALE_DATA", "UNAVAILABLE"]
    available: bool
    source: str
    currency: str = "INR"
    fetched_at_ist: Optional[str] = None
    is_stale: bool = False
    yearly: List[Dict[str, Any]] = field(default_factory=list)
    quarterly: List[Dict[str, Any]] = field(default_factory=list)
    key_stats: Dict[str, Optional[float]] = field(default_factory=dict)
    message: str = ""
    provenance: Optional[MarketDataProvenance] = None


@dataclass(frozen=True)
class LiveQuote:
    """Lightweight live market quote snapshot (LTP + IST timestamp)."""

    price: float
    timestamp_ist: Optional[str] = None


class MarketDataProvider(ABC):
    """Reusable market-data provider interface decoupling analytics from any single vendor."""

    @property
    @abstractmethod
    def capabilities(self) -> ProviderCapabilities:
        """Return provider capability, delay, and licensing metadata."""

    @property
    def exchange_metadata(self) -> ExchangeMetadata:
        return ExchangeMetadata()

    def enforce_policy(self, policy: DataUsagePolicy) -> None:
        caps = self.capabilities
        if policy.require_production_approved_provider and not caps.production_approved:
            raise ProviderPolicyViolationError(
                f"Provider '{caps.provider_id}' is not approved for production "
                f"({caps.licensing_tier}); configure a licensed NSE market-data provider."
            )
        if not policy.allow_delayed_data and not caps.is_realtime:
            raise ProviderPolicyViolationError(
                f"Provider '{caps.provider_id}' supplies delayed data (~{caps.estimated_delay_minutes}m) "
                "which is disallowed by active data-usage policy."
            )

    @abstractmethod
    def fetch_daily_ohlcv_result(
        self,
        symbol: str,
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        """Fetch validated daily OHLCV with provenance and quality metadata."""

    @abstractmethod
    def fetch_batch_daily_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "2y",
        force_refresh: bool = False,
        min_bars: int = 50,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        """Fetch validated daily OHLCV results for a batch of symbols."""

    @abstractmethod
    def fetch_intraday_ohlcv_result(
        self,
        symbol: str,
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> MarketDataResult:
        """Fetch validated intraday OHLCV with provenance and quality metadata."""

    @abstractmethod
    def fetch_batch_intraday_ohlcv_results(
        self,
        symbols: List[str],
        period: str = "5d",
        interval: str = "15m",
        force_refresh: bool = False,
        min_bars: int = 15,
        policy: Optional[DataUsagePolicy] = None,
    ) -> Dict[str, MarketDataResult]:
        """Fetch validated intraday OHLCV results for a batch of symbols."""

    @abstractmethod
    def fetch_stock_info(self, symbol: str) -> Optional[StockConstituent]:
        """Return stock metadata for a normalized NSE symbol."""

    def fetch_constituents(self) -> Optional[List[StockConstituent]]:
        """Optional live constituent list; returns None when unsupported by provider."""
        return None

    def fetch_live_quotes(
        self,
        symbols: List[str],
        timeout_seconds: float = 2.0,
    ) -> Dict[str, LiveQuote]:
        """Optional batched live quote lookup returning {SYMBOL: LiveQuote}. Returns {} when unsupported."""
        return {}

    @abstractmethod
    def fetch_financials_result(
        self,
        symbol: str,
        force_refresh: bool = False,
    ) -> FinancialsResult:
        """Fetch yearly and quarterly company financials with provenance."""
