import type { QuoteFreshness } from '../types/market';

/**
 * Centralized Indian Stock Market (NSE / BSE) Calendar & Quote Freshness Utility
 *
 * Standard Trading Session:
 * - Days: Monday to Friday (excluding official NSE holidays, unless a special session is scheduled)
 * - Trading Hours: 09:15 AM to 03:30 PM IST (Indian Standard Time, UTC +5:30)
 * - Intraday RMS Auto Square-off: 03:20 PM IST (10 minutes before session close)
 */

export const MARKET_OPEN_MIN = 9 * 60 + 15; // 09:15 IST
export const INTRADAY_SQUARE_OFF_MIN = 15 * 60 + 20; // 15:20 IST
export const MARKET_CLOSE_MIN = 15 * 60 + 30; // 15:30 IST

export const LIVE_QUOTE_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes
export const DELAYED_QUOTE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export interface SpecialTradingSession {
  dateKey: string; // YYYY-MM-DD in IST
  name: string;
  openMinute: number; // minutes from 00:00 IST
  closeMinute: number; // minutes from 00:00 IST
  intradaySquareOffMinute?: number;
}

export interface MarketCalendarConfig {
  /** Map of YYYY-MM-DD -> holiday name (merges with default NSE holidays; pass null/empty string to clear a default holiday) */
  holidays?: Record<string, string>;
  /** Map or list of special trading sessions (e.g., Muhurat trading or Union Budget special session) */
  specialSessions?: Record<string, SpecialTradingSession>;
}

/**
 * Official NSE Equity Holiday Calendar (2025 - 2027)
 */
export const DEFAULT_NSE_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-02-26': 'Mahashivratri',
  '2025-03-14': 'Holi',
  '2025-03-31': 'Id-Ul-Fitr (Ramzan Id)',
  '2025-04-10': 'Shri Mahavir Jayanti',
  '2025-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2025-04-18': 'Good Friday',
  '2025-05-01': 'Maharashtra Day',
  '2025-08-15': 'Independence Day',
  '2025-08-27': 'Ganesh Chaturthi',
  '2025-10-02': 'Mahatma Gandhi Jayanti / Dussehra',
  '2025-10-21': 'Diwali Laxmi Pujan',
  '2025-10-22': 'Diwali-Balipratipada',
  '2025-11-05': 'Prakash Gurpurb Sri Guru Nanak Dev',
  '2025-12-25': 'Christmas',

  // 2026
  '2026-01-26': 'Republic Day',
  '2026-03-03': 'Holi',
  '2026-03-26': 'Shri Ram Navami',
  '2026-03-31': 'Shri Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-10': 'Diwali-Balipratipada',
  '2026-11-24': 'Prakash Gurpurb Sri Guru Nanak Dev',
  '2026-12-25': 'Christmas',

  // 2027
  '2027-01-26': 'Republic Day',
  '2027-03-22': 'Holi',
  '2027-03-26': 'Good Friday',
  '2027-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2027-08-15': 'Independence Day',
  '2027-10-02': 'Mahatma Gandhi Jayanti',
  '2027-12-25': 'Christmas',
};

/**
 * Default NSE Special Sessions (e.g., Diwali Muhurat Trading)
 */
export const DEFAULT_NSE_SPECIAL_SESSIONS: Record<string, SpecialTradingSession> = {
  '2025-10-21': {
    dateKey: '2025-10-21',
    name: 'Diwali Muhurat Trading Session',
    openMinute: 13 * 60 + 45, // 01:45 PM IST
    closeMinute: 14 * 60 + 45, // 02:45 PM IST
    intradaySquareOffMinute: 14 * 60 + 35,
  },
  '2026-11-08': {
    dateKey: '2026-11-08',
    name: 'Diwali Muhurat Trading Session',
    openMinute: 18 * 60, // 06:00 PM IST
    closeMinute: 19 * 60, // 07:00 PM IST
    intradaySquareOffMinute: 18 * 60 + 50,
  },
};

export type MarketSessionPhase =
  | 'LIVE_TRADING'
  | 'SPECIAL_SESSION'
  | 'PRE_OPEN'
  | 'POST_CLOSE'
  | 'WEEKEND_CLOSED'
  | 'HOLIDAY_CLOSED';

export interface MarketStatus {
  isOpen: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isSpecialSession: boolean;
  specialSessionName?: string;
  sessionPhase: MarketSessionPhase;
  statusLabel: 'Market Open' | 'Market Closed';
  detailLabel: string;
  subText: string;
  istTimeString: string;
  dateKey: string;
  nextOpenText: string;
  nextSessionDateKey: string;
  nextSessionOpenTimestamp: number;
  sessionOpenMinute: number;
  sessionCloseMinute: number;
  intradaySquareOffMinute: number;
}

export interface QuoteFreshnessInfo {
  freshness: QuoteFreshness;
  label: 'Live' | 'Delayed' | 'Last Available' | 'Stale Quote';
  isTradable: boolean;
  ageMs: number;
  reason?: string;
}

function formatMinuteOfDay(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const hours12 = hours24 % 12 || 12;
  const amPm = hours24 >= 12 ? 'PM' : 'AM';
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${amPm} IST`;
}

function resolveCalendar(calendar?: MarketCalendarConfig) {
  const holidays: Record<string, string> = {
    ...DEFAULT_NSE_HOLIDAYS,
    ...(calendar?.holidays || {}),
  };
  const specialSessions: Record<string, SpecialTradingSession> = {
    ...DEFAULT_NSE_SPECIAL_SESSIONS,
    ...(calendar?.specialSessions || {}),
  };
  return { holidays, specialSessions };
}

/** Returns the IST calendar date key (YYYY-MM-DD), minute-of-day, and weekday for a timestamp. */
export function getISTParts(ts: number = Date.now()): {
  dateKey: string;
  minutes: number;
  weekday: string;
  hours: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ts));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hours = parseInt(map.hour || '0', 10) % 24;
  const minute = parseInt(map.minute || '0', 10);
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    minutes: hours * 60 + minute,
    weekday: map.weekday,
    hours,
    minute,
  };
}

/** Converts an IST YYYY-MM-DD dateKey and minute-of-day into a UTC epoch timestamp (ms). */
export function istDateMinuteToTimestamp(dateKey: string, minuteOfDay: number): number {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const hours = Math.floor(minuteOfDay / 60);
  const mins = minuteOfDay % 60;
  // IST is UTC +05:30 (330 minutes ahead of UTC)
  return Date.UTC(y, m - 1, d, hours, mins, 0, 0) - 330 * 60 * 1000;
}

function getSessionScheduleForDate(
  dateKey: string,
  weekday: string,
  calendar?: MarketCalendarConfig
): {
  hasSession: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isSpecialSession: boolean;
  specialSessionName?: string;
  openMinute: number;
  closeMinute: number;
  intradaySquareOffMinute: number;
} {
  const { holidays, specialSessions } = resolveCalendar(calendar);
  const special = specialSessions[dateKey];
  const holidayName = holidays[dateKey];
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  if (special) {
    return {
      hasSession: true,
      isWeekend,
      isHoliday: Boolean(holidayName),
      holidayName,
      isSpecialSession: true,
      specialSessionName: special.name,
      openMinute: special.openMinute,
      closeMinute: special.closeMinute,
      intradaySquareOffMinute:
        special.intradaySquareOffMinute ?? Math.max(special.openMinute, special.closeMinute - 10),
    };
  }

  if (holidayName) {
    return {
      hasSession: false,
      isWeekend,
      isHoliday: true,
      holidayName,
      isSpecialSession: false,
      openMinute: MARKET_OPEN_MIN,
      closeMinute: MARKET_CLOSE_MIN,
      intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
    };
  }

  if (isWeekend) {
    return {
      hasSession: false,
      isWeekend: true,
      isHoliday: false,
      isSpecialSession: false,
      openMinute: MARKET_OPEN_MIN,
      closeMinute: MARKET_CLOSE_MIN,
      intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
    };
  }

  return {
    hasSession: true,
    isWeekend: false,
    isHoliday: false,
    isSpecialSession: false,
    openMinute: MARKET_OPEN_MIN,
    closeMinute: MARKET_CLOSE_MIN,
    intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
  };
}

/**
 * Finds the next eligible NSE trading session starting at or after `now`.
 * If a session is currently open, returns the next upcoming session after today's close
 * when `includeTodayBeforeOpen` is false, or today's session if it has not opened yet.
 */
export function getNextTradingSession(
  nowInput: number | Date = Date.now(),
  calendar?: MarketCalendarConfig
): {
  dateKey: string;
  weekday: string;
  openMinute: number;
  closeMinute: number;
  openTimestamp: number;
  isSpecialSession: boolean;
  specialSessionName?: string;
  label: string;
} {
  const nowTs = typeof nowInput === 'number' ? nowInput : nowInput.getTime();
  const cur = getISTParts(nowTs);
  const todaySchedule = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);

  if (todaySchedule.hasSession && cur.minutes < todaySchedule.openMinute) {
    const openTimestamp = istDateMinuteToTimestamp(cur.dateKey, todaySchedule.openMinute);
    return {
      dateKey: cur.dateKey,
      weekday: cur.weekday,
      openMinute: todaySchedule.openMinute,
      closeMinute: todaySchedule.closeMinute,
      openTimestamp,
      isSpecialSession: todaySchedule.isSpecialSession,
      specialSessionName: todaySchedule.specialSessionName,
      label: `Opens today at ${formatMinuteOfDay(todaySchedule.openMinute)}`,
    };
  }

  // Search forward up to 14 calendar days in IST
  const baseMiddayTs = istDateMinuteToTimestamp(cur.dateKey, 12 * 60);
  for (let offset = 1; offset <= 14; offset++) {
    const probeTs = baseMiddayTs + offset * 24 * 60 * 60 * 1000;
    const probeParts = getISTParts(probeTs);
    const sched = getSessionScheduleForDate(probeParts.dateKey, probeParts.weekday, calendar);
    if (sched.hasSession) {
      const openTimestamp = istDateMinuteToTimestamp(probeParts.dateKey, sched.openMinute);
      const dayLabel = offset === 1 ? 'tomorrow' : `${probeParts.weekday}, ${probeParts.dateKey}`;
      return {
        dateKey: probeParts.dateKey,
        weekday: probeParts.weekday,
        openMinute: sched.openMinute,
        closeMinute: sched.closeMinute,
        openTimestamp,
        isSpecialSession: sched.isSpecialSession,
        specialSessionName: sched.specialSessionName,
        label: `Opens ${dayLabel} at ${formatMinuteOfDay(sched.openMinute)}`,
      };
    }
  }

  // Fallback
  const fallbackOpenTs = baseMiddayTs + 24 * 60 * 60 * 1000;
  const fallbackParts = getISTParts(fallbackOpenTs);
  return {
    dateKey: fallbackParts.dateKey,
    weekday: fallbackParts.weekday,
    openMinute: MARKET_OPEN_MIN,
    closeMinute: MARKET_CLOSE_MIN,
    openTimestamp: istDateMinuteToTimestamp(fallbackParts.dateKey, MARKET_OPEN_MIN),
    isSpecialSession: false,
    label: `Opens ${fallbackParts.weekday} at 09:15 AM IST`,
  };
}

export function getIndianMarketStatus(
  nowInput: number | Date = Date.now(),
  calendar?: MarketCalendarConfig
): MarketStatus {
  const nowTs = typeof nowInput === 'number' ? nowInput : nowInput.getTime();
  const cur = getISTParts(nowTs);
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  const nextSession = getNextTradingSession(nowTs, calendar);

  const isOpen =
    sched.hasSession && cur.minutes >= sched.openMinute && cur.minutes < sched.closeMinute;

  let sessionPhase: MarketSessionPhase = 'POST_CLOSE';
  let statusLabel: 'Market Open' | 'Market Closed' = isOpen ? 'Market Open' : 'Market Closed';
  let detailLabel = isOpen ? 'Market Open' : 'Market Closed';
  let subText = '';
  let nextOpenText = nextSession.label;

  if (isOpen) {
    sessionPhase = sched.isSpecialSession ? 'SPECIAL_SESSION' : 'LIVE_TRADING';
    detailLabel = sched.isSpecialSession
      ? `Market Open (${sched.specialSessionName})`
      : 'Market Open';
    subText = `${sched.isSpecialSession ? sched.specialSessionName : 'NSE / BSE Live session'} · Closes at ${formatMinuteOfDay(sched.closeMinute)}`;
    nextOpenText = 'Session in progress';
  } else if (sched.isHoliday && !sched.hasSession) {
    sessionPhase = 'HOLIDAY_CLOSED';
    detailLabel = `Market Closed (${sched.holidayName})`;
    subText = `NSE Holiday (${sched.holidayName}) · ${nextSession.label}`;
  } else if (sched.isWeekend && !sched.hasSession) {
    sessionPhase = 'WEEKEND_CLOSED';
    detailLabel = 'Market Closed (Weekend)';
    subText = `NSE & BSE closed · ${nextSession.label}`;
  } else if (sched.hasSession && cur.minutes < sched.openMinute) {
    sessionPhase = 'PRE_OPEN';
    detailLabel = 'Market Closed (Pre-Open)';
    subText = `${sched.isSpecialSession ? sched.specialSessionName + ' · ' : ''}Session opens today at ${formatMinuteOfDay(sched.openMinute)}`;
  } else {
    sessionPhase = 'POST_CLOSE';
    detailLabel = 'Market Closed';
    subText = `After market hours · ${nextSession.label}`;
  }

  const istHours12 = cur.hours % 12 || 12;
  const istAmPm = cur.hours >= 12 ? 'PM' : 'AM';
  const istTimeString = `${String(istHours12).padStart(2, '0')}:${String(cur.minute).padStart(2, '0')} ${istAmPm} IST`;

  return {
    isOpen,
    isWeekend: sched.isWeekend,
    isHoliday: sched.isHoliday,
    holidayName: sched.holidayName,
    isSpecialSession: sched.isSpecialSession,
    specialSessionName: sched.specialSessionName,
    sessionPhase,
    statusLabel,
    detailLabel,
    subText,
    istTimeString,
    dateKey: cur.dateKey,
    nextOpenText,
    nextSessionDateKey: isOpen ? cur.dateKey : nextSession.dateKey,
    nextSessionOpenTimestamp: isOpen
      ? istDateMinuteToTimestamp(cur.dateKey, sched.openMinute)
      : nextSession.openTimestamp,
    sessionOpenMinute: sched.openMinute,
    sessionCloseMinute: sched.closeMinute,
    intradaySquareOffMinute: sched.intradaySquareOffMinute,
  };
}

/**
 * Classifies a market quote as LIVE, DELAYED, LAST_AVAILABLE, or STALE and determines
 * whether it is eligible for immediate regular-session execution.
 */
export function classifyQuoteFreshness(
  quote:
    | {
        price?: number;
        quoteTimestamp?: number;
        fetchedAt?: number;
        freshness?: QuoteFreshness;
        isStale?: boolean;
        providerAvailable?: boolean;
      }
    | null
    | undefined,
  marketStatus: Pick<MarketStatus, 'isOpen'>,
  now: number = Date.now()
): QuoteFreshnessInfo {
  if (!quote || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0) {
    return {
      freshness: 'STALE',
      label: 'Stale Quote',
      isTradable: false,
      ageMs: Number.POSITIVE_INFINITY,
      reason: 'Market quote is unavailable or invalid.',
    };
  }

  if (quote.providerAvailable === false || quote.isStale === true || quote.freshness === 'STALE') {
    return {
      freshness: 'STALE',
      label: 'Stale Quote',
      isTradable: false,
      ageMs: Number.POSITIVE_INFINITY,
      reason: 'Market data provider quote is stale or unavailable.',
    };
  }

  const refTs = quote.quoteTimestamp ?? quote.fetchedAt ?? now;
  const ageMs = Math.max(0, now - refTs);

  if (!marketStatus.isOpen) {
    return {
      freshness: 'LAST_AVAILABLE',
      label: 'Last Available',
      isTradable: false,
      ageMs,
    };
  }

  // Market is open: enforce quote freshness
  if (ageMs > DELAYED_QUOTE_MAX_AGE_MS || quote.freshness === 'LAST_AVAILABLE') {
    return {
      freshness: 'STALE',
      label: 'Stale Quote',
      isTradable: false,
      ageMs,
      reason: 'Market quote is older than 15 minutes and cannot be used for live execution.',
    };
  }

  if (ageMs <= LIVE_QUOTE_MAX_AGE_MS && quote.freshness !== 'DELAYED') {
    return {
      freshness: 'LIVE',
      label: 'Live',
      isTradable: true,
      ageMs,
    };
  }

  return {
    freshness: 'DELAYED',
    label: 'Delayed',
    isTradable: true,
    ageMs,
  };
}

/** True once the intraday square-off window (default 15:20 IST) has been reached for the trading day of `ts`. */
export function isPastIntradayCutoff(
  ts: number,
  now: number = Date.now(),
  calendar?: MarketCalendarConfig
): boolean {
  const placed = getISTParts(ts);
  const cur = getISTParts(now);
  if (cur.dateKey !== placed.dateKey) return true;
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  return cur.minutes >= sched.intradaySquareOffMinute;
}

/** True once the trading session (default 15:30 IST) of the trading day of `ts` is over. */
export function isPastSessionClose(
  ts: number,
  now: number = Date.now(),
  calendar?: MarketCalendarConfig
): boolean {
  const placed = getISTParts(ts);
  const cur = getISTParts(now);
  if (cur.dateKey !== placed.dateKey) return true;
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  return cur.minutes >= sched.closeMinute;
}
