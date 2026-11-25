"""Market status, NSE calendar contract, stock universe, OHLCV, and financials schemas."""

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.models.common import MarketDataProvenance


class StockConstituent(BaseModel):
    symbol: str = Field(..., description="NSE ticker symbol without .NS suffix, e.g., RELIANCE")
    yf_ticker: str = Field(..., description="Yahoo Finance ticker with .NS suffix, e.g., RELIANCE.NS")
    name: str = Field(..., description="Full company name")
    sector: str = Field(..., description="NSE industry sector")
    index_tier: str = Field(
        default="NIFTY 500",
        description="Index membership tier (NIFTY 50 / NIFTY NEXT 50 / NIFTY 500 / NSE LISTED)",
    )
    isin: Optional[str] = Field(default=None, description="ISIN identifier from constituent registry")
    in_bundled_universe: bool = Field(
        default=True,
        description="True when present in the bundled NIFTY 500 constituent list",
    )


class MarketStatusResponse(BaseModel):
    current_time_ist: str
    current_date_ist: str
    timezone: str = "Asia/Kolkata"
    exchange: str = "NSE"
    calendar_version: str
    is_trading_day: bool
    is_market_open: bool
    session_phase: Literal[
        "PRE_OPEN",
        "LIVE_TRADING",
        "POST_CLOSE",
        "WEEKEND_CLOSED",
        "HOLIDAY_CLOSED",
    ]
    holiday_name: Optional[str] = None
    pre_open_start_time_ist: str = "09:00:00"
    pre_open_end_time_ist: str = "09:08:00"
    market_open_time_ist: str = "09:15:00"
    market_close_time_ist: str = "15:30:00"
    intraday_entry_cutoff_ist: str = "14:45:00"
    intraday_square_off_time_ist: str = "15:15:00"
    next_trading_session_open_ist: str
    last_trading_session_date: str
    last_completed_trading_session_date: str
    intraday_scanner_active: bool
    intraday_refresh_interval_seconds: int = 300
    status_message: str


class MarketCalendarContract(BaseModel):
    """Unified NSE calendar contract shared between FastAPI backend and Express/React clients."""

    exchange: str = "NSE"
    timezone: str = "Asia/Kolkata"
    calendar_version: str
    supported_years: List[int]
    pre_open_window_ist: str = "09:00:00-09:08:00"
    regular_session_ist: str = "09:15:00-15:30:00"
    intraday_entry_cutoff_ist: str = "14:45:00"
    intraday_square_off_ist: str = "15:15:00"
    holidays: Dict[str, str]
    current_status: MarketStatusResponse


class PriceBar(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    rsi_14: Optional[float] = None
    is_completed_candle: bool = True


class FinancialPeriodRow(BaseModel):
    period: str
    end_date: str
    revenue: Optional[float] = None
    net_profit: Optional[float] = None
    operating_profit: Optional[float] = None
    profit_margin_pct: Optional[float] = None


class StockFinancialsResponse(BaseModel):
    symbol: str
    currency: str = "INR"
    status: Literal["OK", "STALE_DATA", "UNAVAILABLE"]
    available: bool
    source: str
    fetched_at_ist: Optional[str] = None
    is_stale: bool = False
    yearly: List[FinancialPeriodRow] = Field(default_factory=list)
    quarterly: List[FinancialPeriodRow] = Field(default_factory=list)
    key_stats: Dict[str, Optional[float]] = Field(default_factory=dict)
    message: str = ""
    data_provenance: Optional[MarketDataProvenance] = None
