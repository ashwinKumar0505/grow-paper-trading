"""Application settings and configurable policies for Tradedia Analytics Backend."""

from pathlib import Path
from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables or .env."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Deployment environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "2.0.0"

    # Market-data provider settings
    MARKET_DATA_PROVIDER: str = "upstox"
    PRICE_ADJUSTMENT_POLICY: Literal[
        "SPLIT_AND_DIVIDEND_ADJUSTED", "SPLIT_ADJUSTED_ONLY", "UNADJUSTED_RAW"
    ] = "SPLIT_ADJUSTED_ONLY"  # Upstox candles are split/bonus-adjusted only (not dividend-adjusted)
    ALLOW_DELAYED_DATA: bool = True
    ALLOW_STALE_CACHE_FALLBACK: bool = True
    REQUIRE_PRODUCTION_APPROVED_PROVIDER: bool = False
    PROVIDER_PRODUCTION_APPROVED_OVERRIDE: bool = True
    PROVIDER_IS_REALTIME_OVERRIDE: bool = True
    PROVIDER_ESTIMATED_DELAY_MINUTES: int = 0
    EDUCATIONAL_REPLAY_MODE: bool = False

    # Upstox read-only Analytics Token integration (never substitute daily OAuth access tokens)
    UPSTOX_ANALYTICS_TOKEN: str = ""
    UPSTOX_BASE_URL: str = "https://api.upstox.com"
    UPSTOX_TIMEOUT_SECONDS: float = 10.0
    UPSTOX_MAX_CONCURRENCY: int = 12
    UPSTOX_RATE_LIMIT_PER_MINUTE: int = 450
    UPSTOX_COMMERCIAL_REDISTRIBUTION_APPROVED: bool = False

    # Legacy / other vendor credential placeholders (never commit real secrets)
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    UPSTOX_ACCESS_TOKEN: str = ""
    KITE_API_KEY: str = ""
    KITE_ACCESS_TOKEN: str = ""
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_ID: str = ""
    FYERS_APP_ID: str = ""
    FYERS_ACCESS_TOKEN: str = ""
    TRUEDATA_USERNAME: str = ""
    TRUEDATA_PASSWORD: str = ""

    # Scanner & scheduler policy
    SCANNER_MAX_WORKERS: int = 12
    SWING_SCANNER_DEFAULT_UNIVERSE_LIMIT: int = 500
    INTRADAY_SCANNER_DEFAULT_UNIVERSE_LIMIT: int = 100
    SCANNER_DEFAULT_UNIVERSE_LIMIT: int = 100
    SWING_SCANNER_DEFAULT_RESULT_LIMIT: int = 500
    INTRADAY_SCANNER_DEFAULT_RESULT_LIMIT: int = 60
    FULL_NIFTY500_ENABLED: bool = True
    SCANNER_SYMBOL_TIMEOUT_SECONDS: float = 15.0
    PROVIDER_RETRY_ATTEMPTS: int = 2
    PROVIDER_RETRY_BACKOFF_SECONDS: float = 0.5
    INTRADAY_REFRESH_SECONDS: int = 300
    ENABLE_BACKGROUND_SCHEDULER: bool = True

    # Caching & upstream rate limiting
    CACHE_DIR: str = str(Path(__file__).resolve().parent.parent / "data_cache")
    DAILY_DATA_TTL_SECONDS: int = 14400  # 4 hours
    INTRADAY_DATA_TTL_SECONDS: int = 240  # 4 minutes
    FINANCIALS_TTL_SECONDS: int = 86400  # 24 hours
    RATE_LIMIT_REQUESTS_PER_SECOND: float = 25.0

    # NSE Delivery (Swing) Transaction Cost Model (one-way & asymmetric components, %)
    SWING_SLIPPAGE_PCT: float = 0.10
    SWING_COMMISSION_PCT: float = 0.145
    SWING_BROKERAGE_PCT: float = 0.0
    SWING_STT_BUY_PCT: float = 0.10
    SWING_STT_SELL_PCT: float = 0.10
    SWING_STAMP_DUTY_BUY_PCT: float = 0.015
    SWING_EXCHANGE_SEBI_PCT: float = 0.00307
    SWING_GST_ON_CHARGES_PCT: float = 18.0

    # NSE Intraday (MIS) Transaction Cost Model (%)
    INTRADAY_SLIPPAGE_PCT: float = 0.05
    INTRADAY_COMMISSION_PCT: float = 0.085
    INTRADAY_BROKERAGE_PCT: float = 0.03
    INTRADAY_STT_BUY_PCT: float = 0.0
    INTRADAY_STT_SELL_PCT: float = 0.025
    INTRADAY_STAMP_DUTY_BUY_PCT: float = 0.003
    INTRADAY_EXCHANGE_SEBI_PCT: float = 0.00307
    INTRADAY_GST_ON_CHARGES_PCT: float = 18.0

    # Walk-Forward Backtesting Configuration
    WALK_FORWARD_DEFAULT_FOLDS: int = 4
    WALK_FORWARD_MODE: Literal["EXPANDING", "ROLLING"] = "EXPANDING"
    WALK_FORWARD_ROLLING_TRAIN_BARS: int = 120
    WALK_FORWARD_MIN_WARMUP_DAILY: int = 60
    WALK_FORWARD_MIN_WARMUP_INTRADAY: int = 20
    WALK_FORWARD_MIN_HISTORY_BARS_DAILY: int = 180
    WALK_FORWARD_MIN_OOS_BARS_PER_FOLD_DAILY: int = 25
    WALK_FORWARD_MIN_SESSIONS_INTRADAY: int = 20
    WALK_FORWARD_MIN_SAMPLE_SIZE_VALIDATED: int = 10
    BACKTEST_INITIAL_CAPITAL_INR: float = 1_000_000.0
    BACKTEST_POSITION_SIZE_PCT: float = 10.0
    BACKTEST_MAX_CONCURRENT_POSITIONS: int = 10
    BACKTEST_BREAKEVEN_STOP_ENABLED: bool = True
    BACKTEST_BREAKEVEN_TRIGGER_ATR: float = 0.95
    BACKTEST_BREAKEVEN_BUFFER_PCT: float = 0.15

    # Signal Governance & Compliance Controls
    ENABLE_PUBLIC_STOCK_SIGNALS: bool = True
    SIGNAL_CLASSIFICATION_MODE: Literal["FULL", "TECHNICAL_ONLY", "DISABLED"] = "FULL"
    ENABLE_LEGACY_FIELD_ALIASES: bool = True

    # Auth, Entitlements & API Rate Limiting
    AUTH_MODE: Literal["disabled_dev_only", "service_token", "firebase", "hybrid"] = (
        "disabled_dev_only"
    )
    SERVICE_AUTH_SECRET: str = ""
    SERVICE_AUTH_MAX_CLOCK_SKEW_SECONDS: int = 300
    FIREBASE_PROJECT_ID: str = ""
    API_RATE_LIMIT_PER_MINUTE: int = 120
    EXPENSIVE_ENDPOINT_RATE_LIMIT_PER_MINUTE: int = 10

    # Server & CORS
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.ENVIRONMENT == "production":
            origins = [o for o in origins if o != "*"]
        return origins

    @property
    def effective_require_production_approved_provider(self) -> bool:
        """Always enforce production-approved commercial data licensing in production."""
        if self.ENVIRONMENT == "production":
            return True
        return bool(self.REQUIRE_PRODUCTION_APPROVED_PROVIDER)

    @property
    def effective_auth_mode(self) -> str:
        """Fail closed in production if auth was left disabled."""
        if self.ENVIRONMENT == "production" and self.AUTH_MODE == "disabled_dev_only":
            return "service_token"
        return self.AUTH_MODE

    @property
    def swing_round_trip_commission_pct(self) -> float:
        """Asymmetric NSE delivery statutory + brokerage charges (%) round-trip."""
        buy_charges = self.SWING_BROKERAGE_PCT + self.SWING_EXCHANGE_SEBI_PCT
        sell_charges = self.SWING_BROKERAGE_PCT + self.SWING_EXCHANGE_SEBI_PCT
        gst = (buy_charges + sell_charges) * (self.SWING_GST_ON_CHARGES_PCT / 100.0)
        return round(
            buy_charges
            + sell_charges
            + gst
            + self.SWING_STT_BUY_PCT
            + self.SWING_STT_SELL_PCT
            + self.SWING_STAMP_DUTY_BUY_PCT,
            5,
        )

    @property
    def intraday_round_trip_commission_pct(self) -> float:
        """Asymmetric NSE MIS intraday statutory + brokerage charges (%) round-trip."""
        buy_charges = self.INTRADAY_BROKERAGE_PCT + self.INTRADAY_EXCHANGE_SEBI_PCT
        sell_charges = self.INTRADAY_BROKERAGE_PCT + self.INTRADAY_EXCHANGE_SEBI_PCT
        gst = (buy_charges + sell_charges) * (self.INTRADAY_GST_ON_CHARGES_PCT / 100.0)
        return round(
            buy_charges
            + sell_charges
            + gst
            + self.INTRADAY_STT_BUY_PCT
            + self.INTRADAY_STT_SELL_PCT
            + self.INTRADAY_STAMP_DUTY_BUY_PCT,
            5,
        )


settings = Settings()
