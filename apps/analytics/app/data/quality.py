"""Market-data validation, timezone normalization, session checks, and partial-candle handling."""

from dataclasses import dataclass
from datetime import datetime, time
from typing import List, Optional
import numpy as np
import pandas as pd

from app.data.nse_calendar import (
    IST,
    MARKET_CLOSE_TIME,
    MARKET_OPEN_TIME,
    count_trading_days_between,
    get_last_completed_trading_day,
    get_now_ist,
    is_daily_bar_completed,
    is_intraday_bar_completed,
    is_trading_day,
)
from app.models.common import DataQualitySummary

REQUIRED_OHLCV_COLS = ["Open", "High", "Low", "Close", "Volume"]
SUPPORTED_INTERVALS = {"1d", "5m", "15m", "30m", "60m", "1h"}
INTERVAL_MINUTES_MAP = {"5m": 5, "15m": 15, "30m": 30, "60m": 60, "1h": 60}


@dataclass
class ValidatedOHLCV:
    """Validated market-data payload separating completed candles from any in-progress candle."""

    df_completed: Optional[pd.DataFrame]
    partial_candle: Optional[pd.Series]
    quality: DataQualitySummary
    last_completed_ts: Optional[str]
    staleness_trading_days: Optional[int]
    is_stale: bool


def _extract_standard_columns(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """Flatten MultiIndex columns if present and normalize OHLCV column names."""
    out = df.copy()
    if isinstance(out.columns, pd.MultiIndex):
        lvl0 = [str(c) for c in out.columns.get_level_values(0)]
        if "Close" in lvl0 or "Open" in lvl0:
            out.columns = out.columns.get_level_values(0)
        else:
            out.columns = out.columns.get_level_values(-1)

    col_map = {}
    for col in out.columns:
        normalized = str(col).strip().capitalize()
        if normalized in REQUIRED_OHLCV_COLS and normalized not in col_map.values():
            col_map[col] = normalized
    out = out.rename(columns=col_map)
    if not all(c in out.columns for c in REQUIRED_OHLCV_COLS):
        return None
    return out[REQUIRED_OHLCV_COLS].copy()


def _normalize_ist_index(df: pd.DataFrame, issues: List[str]) -> pd.DataFrame:
    """Normalize index to timezone-naive IST (Asia/Kolkata) timestamps."""
    out = df.copy()
    idx = pd.to_datetime(out.index, errors="coerce", utc=False)
    valid_ts_mask = ~pd.isna(idx)
    if not valid_ts_mask.all():
        dropped = int((~valid_ts_mask).sum())
        issues.append(f"Dropped {dropped} row(s) with unparseable timestamps.")
        out = out.loc[valid_ts_mask].copy()
        idx = idx[valid_ts_mask]

    if isinstance(idx, pd.DatetimeIndex) and idx.tz is not None:
        idx = idx.tz_convert(IST).tz_localize(None)
    out.index = idx
    return out


def validate_and_normalize_ohlcv(
    raw_df: Optional[pd.DataFrame],
    interval: str = "1d",
    min_bars: int = 1,
    now_ist: Optional[datetime] = None,
    exclude_partial_candle: bool = True,
) -> ValidatedOHLCV:
    """
    Validate raw OHLCV data for missing values, duplicate timestamps, OHLC integrity,
    negative volume, session boundaries, missing trading sessions, incomplete candles,
    and staleness against the NSE calendar.
    """
    now = now_ist.astimezone(IST) if now_ist else get_now_ist()
    issues: List[str] = []

    if interval not in SUPPORTED_INTERVALS:
        issues.append(f"Unsupported interval '{interval}'.")
        return ValidatedOHLCV(
            df_completed=None,
            partial_candle=None,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=0,
                completed_rows_usable=0,
                issues=issues,
            ),
            last_completed_ts=None,
            staleness_trading_days=None,
            is_stale=True,
        )

    if raw_df is None or raw_df.empty:
        issues.append("Empty or missing OHLCV dataset.")
        return ValidatedOHLCV(
            df_completed=None,
            partial_candle=None,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=0,
                completed_rows_usable=0,
                issues=issues,
            ),
            last_completed_ts=None,
            staleness_trading_days=None,
            is_stale=True,
        )

    total_raw = len(raw_df)
    out = _extract_standard_columns(raw_df)
    if out is None:
        issues.append("Missing required OHLCV columns.")
        return ValidatedOHLCV(
            df_completed=None,
            partial_candle=None,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=total_raw,
                completed_rows_usable=0,
                issues=issues,
            ),
            last_completed_ts=None,
            staleness_trading_days=None,
            is_stale=True,
        )

    out = _normalize_ist_index(out, issues)

    # Deduplicate timestamps (keep latest observation) and enforce chronological order
    dup_count = int(out.index.duplicated(keep="last").sum())
    if dup_count > 0:
        issues.append(f"Removed {dup_count} duplicate timestamp row(s).")
        out = out[~out.index.duplicated(keep="last")]
    out = out.sort_index()

    # Coerce numeric types & drop missing/non-positive prices
    for col in REQUIRED_OHLCV_COLS:
        out[col] = pd.to_numeric(out[col], errors="coerce")

    before_na = len(out)
    out = out.dropna(subset=["Open", "High", "Low", "Close", "Volume"])
    dropped_na = before_na - len(out)
    if dropped_na > 0:
        issues.append(f"Dropped {dropped_na} row(s) containing NaN OHLCV values.")

    # Validate volume >= 0
    neg_vol_mask = out["Volume"] < 0
    neg_vol_count = int(neg_vol_mask.sum())
    if neg_vol_count > 0:
        issues.append(f"Removed {neg_vol_count} row(s) with negative volume.")
        out = out.loc[~neg_vol_mask]

    # Validate strict OHLC relationships and positive prices
    eps = 1e-6
    invalid_ohlc_mask = (
        (out["Open"] <= 0)
        | (out["High"] <= 0)
        | (out["Low"] <= 0)
        | (out["Close"] <= 0)
        | (out["High"] + eps < out["Low"])
        | (out["High"] + eps < out[["Open", "Close"]].max(axis=1))
        | (out["Low"] - eps > out[["Open", "Close"]].min(axis=1))
    )
    invalid_ohlc_count = int(invalid_ohlc_mask.sum())
    if invalid_ohlc_count > 0:
        issues.append(f"Removed {invalid_ohlc_count} row(s) with invalid OHLC relationships.")
        out = out.loc[~invalid_ohlc_mask]

    if out.empty:
        issues.append("No valid OHLCV rows remain after data-quality filtering.")
        return ValidatedOHLCV(
            df_completed=None,
            partial_candle=None,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=total_raw,
                completed_rows_usable=0,
                dropped_invalid_rows=total_raw,
                duplicate_timestamps_removed=dup_count,
                invalid_ohlc_rows_removed=invalid_ohlc_count,
                negative_volume_rows_removed=neg_vol_count,
                issues=issues,
            ),
            last_completed_ts=None,
            staleness_trading_days=None,
            is_stale=True,
        )

    out["Volume"] = out["Volume"].round().astype(np.int64)

    # Check session boundaries (weekends/holidays and intraday regular hours)
    is_intraday = interval != "1d"
    unexpected_sessions = 0
    if is_intraday:
        # Filter timestamps outside regular NSE session [09:15, 15:30)
        valid_session_mask = []
        for ts in out.index:
            t_val: time = ts.time()
            in_hours = MARKET_OPEN_TIME <= t_val < MARKET_CLOSE_TIME
            valid_day = is_trading_day(ts.date())
            if not (in_hours and valid_day):
                unexpected_sessions += 1
            valid_session_mask.append(in_hours and valid_day)
        if unexpected_sessions > 0:
            issues.append(
                f"Removed {unexpected_sessions} intraday bar(s) outside NSE regular session hours/days."
            )
            out = out.loc[valid_session_mask]
    else:
        if isinstance(out.index, pd.DatetimeIndex):
            for d_val in out.index.date:
                if not is_trading_day(d_val):
                    unexpected_sessions += 1
        else:
            for ts in out.index:
                if not is_trading_day(ts.date()):
                    unexpected_sessions += 1
        if unexpected_sessions > 0:
            issues.append(
                f"Detected {unexpected_sessions} daily bar(s) on weekend/configured NSE holiday dates "
                "(retained if special Muhurat/exchange session, flagged for awareness)."
            )

    if out.empty:
        return ValidatedOHLCV(
            df_completed=None,
            partial_candle=None,
            quality=DataQualitySummary(
                is_valid=False,
                total_rows_raw=total_raw,
                completed_rows_usable=0,
                dropped_invalid_rows=total_raw,
                duplicate_timestamps_removed=dup_count,
                invalid_ohlc_rows_removed=invalid_ohlc_count,
                negative_volume_rows_removed=neg_vol_count,
                unexpected_session_dates_count=unexpected_sessions,
                issues=issues,
            ),
            last_completed_ts=None,
            staleness_trading_days=None,
            is_stale=True,
        )

    # Detect and separate any in-progress / incomplete final candle
    partial_candle: Optional[pd.Series] = None
    partial_excluded = False
    if exclude_partial_candle and len(out) > 0:
        last_ts = out.index[-1]
        if is_intraday:
            interval_mins = INTERVAL_MINUTES_MAP.get(interval, 15)
            completed = is_intraday_bar_completed(last_ts.to_pydatetime(), interval_mins, now)
        else:
            completed = is_daily_bar_completed(last_ts.date(), now)
        if not completed:
            partial_candle = out.iloc[-1].copy()
            out = out.iloc[:-1].copy()
            partial_excluded = True
            issues.append(
                f"Excluded in-progress candle ({str(last_ts)[:19]} IST) from confirmed analysis."
            )

    # Estimate missing NSE trading sessions across the observed date span (daily only)
    missing_sessions = 0
    if not is_intraday and len(out) >= 2:
        start_d = out.index[0].date()
        end_d = out.index[-1].date()
        expected = count_trading_days_between(start_d, end_d) + (1 if is_trading_day(start_d) else 0)
        missing_sessions = max(0, expected - len(out))
        if missing_sessions > 5:
            issues.append(
                f"Detected approximately {missing_sessions} missing NSE trading session(s) across history."
            )

    if len(out) < min_bars:
        issues.append(f"Insufficient completed history: {len(out)} bars < required {min_bars}.")

    last_completed_ts = None
    staleness_days: Optional[int] = None
    is_stale = True
    if not out.empty:
        last_ts = out.index[-1]
        last_completed_ts = (
            last_ts.strftime("%Y-%m-%d %H:%M:%S IST")
            if is_intraday
            else last_ts.strftime("%Y-%m-%d")
        )
        last_expected_completed = get_last_completed_trading_day(now)
        staleness_days = count_trading_days_between(last_ts.date(), last_expected_completed)
        if is_intraday:
            # Stale if latest completed intraday candle is from a prior trading day while market is open,
            # or behind the last completed session date when closed
            if staleness_days > 0:
                is_stale = True
            else:
                age_mins = (now - IST.localize(last_ts.to_pydatetime())).total_seconds() / 60.0
                interval_mins = INTERVAL_MINUTES_MAP.get(interval, 15)
                is_stale = age_mins > (interval_mins * 2 + 20) and (
                    MARKET_OPEN_TIME <= now.time() <= MARKET_CLOSE_TIME and is_trading_day(now.date())
                )
        else:
            is_stale = staleness_days >= 1

    dropped_total = max(0, total_raw - len(out) - (1 if partial_excluded else 0))
    quality = DataQualitySummary(
        is_valid=len(out) >= min_bars,
        total_rows_raw=total_raw,
        completed_rows_usable=len(out),
        dropped_invalid_rows=dropped_total,
        duplicate_timestamps_removed=dup_count,
        invalid_ohlc_rows_removed=invalid_ohlc_count,
        negative_volume_rows_removed=neg_vol_count,
        unexpected_session_dates_count=unexpected_sessions,
        missing_trading_sessions_estimate=missing_sessions,
        partial_candle_excluded=partial_excluded,
        issues=issues,
    )

    return ValidatedOHLCV(
        df_completed=out if not out.empty else None,
        partial_candle=partial_candle,
        quality=quality,
        last_completed_ts=last_completed_ts,
        staleness_trading_days=staleness_days,
        is_stale=is_stale,
    )
