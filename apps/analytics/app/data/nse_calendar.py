"""NSE India Market Calendar, IST Timezone Handling, and Unified Session Contract."""

from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional
import pytz

from app.config import settings
from app.models.market import MarketCalendarContract, MarketStatusResponse

IST = pytz.timezone("Asia/Kolkata")
CALENDAR_VERSION = "NSE-EQ-2025-2026-v2"
SUPPORTED_CALENDAR_YEARS: List[int] = [2025, 2026]

PRE_OPEN_START_TIME = time(9, 0, 0)
PRE_OPEN_END_TIME = time(9, 8, 0)
MARKET_OPEN_TIME = time(9, 15, 0)
MARKET_CLOSE_TIME = time(15, 30, 0)
INTRADAY_ENTRY_CUTOFF_TIME = time(14, 45, 0)
INTRADAY_SQUARE_OFF_TIME = time(15, 15, 0)

# Official NSE Equity Trading Holidays (2025 & 2026)
NSE_HOLIDAYS: Dict[date, str] = {
    # 2025 NSE Holidays
    date(2025, 2, 26): "Mahashivratri",
    date(2025, 3, 14): "Holi",
    date(2025, 3, 31): "Id-Ul-Fitr (Ramzan Id)",
    date(2025, 4, 10): "Shri Mahavir Jayanti",
    date(2025, 4, 14): "Dr. Baba Saheb Ambedkar Jayanti",
    date(2025, 4, 18): "Good Friday",
    date(2025, 5, 1): "Maharashtra Day",
    date(2025, 8, 15): "Independence Day",
    date(2025, 8, 27): "Ganesh Chaturthi",
    date(2025, 10, 2): "Mahatma Gandhi Jayanti / Dussehra",
    date(2025, 10, 21): "Diwali Laxmi Pujan",
    date(2025, 10, 22): "Diwali-Balipratipada",
    date(2025, 11, 5): "Prakash Gurpurb Sri Guru Nanak Dev",
    date(2025, 12, 25): "Christmas",
    # 2026 NSE Holidays
    date(2026, 1, 26): "Republic Day",
    date(2026, 3, 3): "Holi",
    date(2026, 3, 20): "Id-Ul-Fitr (Ramzan Id)",
    date(2026, 3, 26): "Shri Ram Navami",
    date(2026, 3, 31): "Shri Mahavir Jayanti",
    date(2026, 4, 3): "Good Friday",
    date(2026, 4, 14): "Dr. Baba Saheb Ambedkar Jayanti",
    date(2026, 5, 1): "Maharashtra Day",
    date(2026, 5, 27): "Bakri Id (Eid ul-Adha)",
    date(2026, 6, 26): "Muharram",
    date(2026, 9, 14): "Ganesh Chaturthi",
    date(2026, 10, 2): "Mahatma Gandhi Jayanti",
    date(2026, 10, 20): "Dussehra",
    date(2026, 11, 10): "Diwali-Balipratipada",
    date(2026, 11, 24): "Prakash Gurpurb Sri Guru Nanak Dev",
    date(2026, 12, 25): "Christmas",
}


def get_now_ist() -> datetime:
    """Return current timezone-aware datetime in IST (Asia/Kolkata)."""
    return datetime.now(IST)


def to_ist(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware in IST."""
    if dt.tzinfo is None:
        return IST.localize(dt)
    return dt.astimezone(IST)


def is_nse_holiday(d: date) -> Optional[str]:
    """Return holiday name if `d` is a configured NSE holiday, else None."""
    return NSE_HOLIDAYS.get(d)


def is_trading_day(d: date) -> bool:
    """Return True if `d` is Mon-Fri and not an NSE holiday."""
    return d.weekday() < 5 and d not in NSE_HOLIDAYS


def get_next_trading_day(from_date: date) -> date:
    """Return the next valid NSE trading day strictly after `from_date`."""
    candidate = from_date + timedelta(days=1)
    while not is_trading_day(candidate):
        candidate += timedelta(days=1)
    return candidate


def get_last_trading_day(from_dt: Optional[datetime] = None) -> date:
    """Return the most recent NSE trading session date as of `from_dt` (includes live session)."""
    dt = to_ist(from_dt) if from_dt else get_now_ist()
    d = dt.date()
    if is_trading_day(d) and dt.time() >= MARKET_OPEN_TIME:
        return d
    candidate = d - timedelta(days=1)
    while not is_trading_day(candidate):
        candidate -= timedelta(days=1)
    return candidate


def get_last_completed_trading_day(from_dt: Optional[datetime] = None) -> date:
    """Return the most recent NSE trading session whose 15:30 IST close has already completed."""
    dt = to_ist(from_dt) if from_dt else get_now_ist()
    d = dt.date()
    if is_trading_day(d) and dt.time() >= MARKET_CLOSE_TIME:
        return d
    candidate = d - timedelta(days=1)
    while not is_trading_day(candidate):
        candidate -= timedelta(days=1)
    return candidate


def count_trading_days_between(start_date: date, end_date: date) -> int:
    """Count NSE trading days strictly after `start_date` up to and including `end_date`."""
    if end_date <= start_date:
        return 0
    count = 0
    cur = start_date + timedelta(days=1)
    while cur <= end_date:
        if is_trading_day(cur):
            count += 1
        cur += timedelta(days=1)
    return count


def add_trading_days(start_date: date, num_days: int) -> date:
    """Advance `start_date` by `num_days` NSE trading days (skipping weekends & holidays)."""
    current = start_date
    remaining = max(1, int(num_days))
    while remaining > 0:
        current += timedelta(days=1)
        if is_trading_day(current):
            remaining -= 1
    return current


def is_daily_bar_completed(bar_date: date, now_ist: Optional[datetime] = None) -> bool:
    """Return True if the daily bar for `bar_date` has fully closed (>= 15:30 IST)."""
    now = to_ist(now_ist) if now_ist else get_now_ist()
    if bar_date < now.date():
        return True
    if bar_date > now.date():
        return False
    return now.time() >= MARKET_CLOSE_TIME


def is_intraday_bar_completed(
    bar_start_ist: datetime,
    interval_minutes: int = 15,
    now_ist: Optional[datetime] = None,
) -> bool:
    """Return True if an intraday candle starting at `bar_start_ist` has closed by `now_ist`."""
    now = to_ist(now_ist) if now_ist else get_now_ist()
    start = to_ist(bar_start_ist)
    bar_end = start + timedelta(minutes=interval_minutes)
    session_close = IST.localize(datetime.combine(start.date(), MARKET_CLOSE_TIME))
    effective_end = min(bar_end, session_close)
    return now >= effective_end


def get_market_status(now_override: Optional[datetime] = None) -> MarketStatusResponse:
    """Evaluate NSE market open/close status and intraday scanner scheduling state."""
    now = to_ist(now_override) if now_override else get_now_ist()
    today = now.date()
    current_time = now.time()

    holiday_name = is_nse_holiday(today)
    trading_day = is_trading_day(today)
    last_session = get_last_trading_day(now)
    last_completed = get_last_completed_trading_day(now)

    if today.weekday() >= 5:
        phase = "WEEKEND_CLOSED"
        market_open = False
        next_day = get_next_trading_day(today)
        next_open_dt = IST.localize(datetime.combine(next_day, MARKET_OPEN_TIME))
        msg = (
            f"NSE Market Closed (Weekend). Intraday auto-scanner is paused. "
            f"Next regular session starts {next_day.strftime('%a, %d %b %Y')} at 09:15 IST."
        )
    elif holiday_name:
        phase = "HOLIDAY_CLOSED"
        market_open = False
        next_day = get_next_trading_day(today)
        next_open_dt = IST.localize(datetime.combine(next_day, MARKET_OPEN_TIME))
        msg = (
            f"NSE Market Closed for {holiday_name}. Intraday auto-scanner is paused. "
            f"Next regular session starts {next_day.strftime('%a, %d %b %Y')} at 09:15 IST."
        )
    elif current_time < MARKET_OPEN_TIME:
        phase = "PRE_OPEN"
        market_open = False
        next_open_dt = IST.localize(datetime.combine(today, MARKET_OPEN_TIME))
        msg = (
            f"Pre-Market Phase (Current IST: {now.strftime('%H:%M:%S')}). "
            f"Intraday scanner activates automatically at 09:15 IST."
        )
    elif MARKET_OPEN_TIME <= current_time <= MARKET_CLOSE_TIME:
        phase = "LIVE_TRADING"
        market_open = True
        next_day = get_next_trading_day(today)
        next_open_dt = IST.localize(datetime.combine(next_day, MARKET_OPEN_TIME))
        msg = (
            f"NSE Market LIVE (09:15 - 15:30 IST). Intraday scanner active with "
            f"{settings.INTRADAY_REFRESH_SECONDS // 60}-minute refresh cadence."
        )
    else:
        phase = "POST_CLOSE"
        market_open = False
        next_day = get_next_trading_day(today)
        next_open_dt = IST.localize(datetime.combine(next_day, MARKET_OPEN_TIME))
        msg = (
            f"NSE Market Closed for today (closed at 15:30 IST). Intraday auto-scanner is paused. "
            f"Next regular session: {next_day.strftime('%a, %d %b %Y')} at 09:15 IST."
        )

    return MarketStatusResponse(
        current_time_ist=now.strftime("%Y-%m-%d %H:%M:%S IST"),
        current_date_ist=today.isoformat(),
        calendar_version=CALENDAR_VERSION,
        is_trading_day=trading_day,
        is_market_open=market_open,
        session_phase=phase,
        holiday_name=holiday_name,
        next_trading_session_open_ist=next_open_dt.strftime("%Y-%m-%d %H:%M:%S IST"),
        last_trading_session_date=last_session.isoformat(),
        last_completed_trading_session_date=last_completed.isoformat(),
        intraday_scanner_active=market_open,
        intraday_refresh_interval_seconds=settings.INTRADAY_REFRESH_SECONDS,
        status_message=msg,
    )


def get_market_calendar_contract(now_override: Optional[datetime] = None) -> MarketCalendarContract:
    """Return the unified NSE market calendar contract for Express/React synchronization."""
    return MarketCalendarContract(
        calendar_version=CALENDAR_VERSION,
        supported_years=SUPPORTED_CALENDAR_YEARS,
        holidays={d.isoformat(): name for d, name in sorted(NSE_HOLIDAYS.items())},
        current_status=get_market_status(now_override),
    )
