"""Unit tests for NSE market calendar, IST timezone handling, bar completion, and unified contract."""

from datetime import date, datetime
from app.data.nse_calendar import (
    IST,
    add_trading_days,
    get_last_completed_trading_day,
    get_market_calendar_contract,
    get_market_status,
    is_daily_bar_completed,
    is_intraday_bar_completed,
)


def test_live_market_hours_detection():
    dt_live = IST.localize(datetime(2026, 11, 9, 10, 30, 0))
    status = get_market_status(dt_live)
    assert status.is_trading_day is True
    assert status.is_market_open is True
    assert status.session_phase == "LIVE_TRADING"
    assert status.intraday_scanner_active is True
    assert status.last_completed_trading_session_date == "2026-11-06"


def test_post_close_and_pre_open_detection():
    dt_pre = IST.localize(datetime(2026, 11, 9, 8, 30, 0))
    s_pre = get_market_status(dt_pre)
    assert s_pre.is_market_open is False
    assert s_pre.session_phase == "PRE_OPEN"
    assert s_pre.intraday_scanner_active is False

    dt_post = IST.localize(datetime(2026, 11, 9, 16, 0, 0))
    s_post = get_market_status(dt_post)
    assert s_post.is_market_open is False
    assert s_post.session_phase == "POST_CLOSE"
    assert s_post.last_completed_trading_session_date == "2026-11-09"


def test_holiday_and_weekend_detection():
    dt_hol = IST.localize(datetime(2026, 11, 10, 11, 0, 0))
    s_hol = get_market_status(dt_hol)
    assert s_hol.is_trading_day is False
    assert s_hol.is_market_open is False
    assert s_hol.session_phase == "HOLIDAY_CLOSED"
    assert "Diwali" in (s_hol.holiday_name or "")

    dt_sun = IST.localize(datetime(2026, 11, 8, 11, 0, 0))
    s_sun = get_market_status(dt_sun)
    assert s_sun.is_market_open is False
    assert s_sun.session_phase == "WEEKEND_CLOSED"


def test_add_trading_days_and_candle_completion():
    assert add_trading_days(date(2026, 11, 9), 1) == date(2026, 11, 11)
    assert get_last_completed_trading_day(IST.localize(datetime(2026, 11, 9, 12, 0, 0))) == date(2026, 11, 6)
    assert is_daily_bar_completed(date(2026, 11, 9), IST.localize(datetime(2026, 11, 9, 14, 0, 0))) is False
    assert is_daily_bar_completed(date(2026, 11, 9), IST.localize(datetime(2026, 11, 9, 15, 35, 0))) is True
    assert is_intraday_bar_completed(
        IST.localize(datetime(2026, 11, 9, 10, 15, 0)),
        interval_minutes=15,
        now_ist=IST.localize(datetime(2026, 11, 9, 10, 25, 0)),
    ) is False
    assert is_intraday_bar_completed(
        IST.localize(datetime(2026, 11, 9, 10, 15, 0)),
        interval_minutes=15,
        now_ist=IST.localize(datetime(2026, 11, 9, 10, 30, 0)),
    ) is True

    contract = get_market_calendar_contract(IST.localize(datetime(2026, 11, 9, 10, 30, 0)))
    assert contract.exchange == "NSE"
    assert "2026-11-10" in contract.holidays
