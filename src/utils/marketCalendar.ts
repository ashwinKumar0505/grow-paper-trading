export const MARKET_OPEN_MIN = 9 * 60 + 15; // 09:15 IST
export const INTRADAY_SQUARE_OFF_MIN = 15 * 60 + 20; // 15:20 IST
export const MARKET_CLOSE_MIN = 15 * 60 + 30; // 15:30 IST

export const LIVE_QUOTE_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes
export const DELAYED_QUOTE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export interface SpecialTradingSession {
  dateKey: string;
  name: string;
  openMinute: number;
  closeMinute: number;
  intradaySquareOffMinute?: number;
}

export interface MarketCalendarConfig {
  holidays?: Record<string, string>;
  specialSessions?: Record<string, SpecialTradingSession>;
}

export const DEFAULT_NSE_HOLIDAYS: Record<string, string> = {
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
  '2027-01-26': 'Republic Day',
  '2027-03-22': 'Holi',
  '2027-03-26': 'Good Friday',
  '2027-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2027-08-15': 'Independence Day',
  '2027-10-02': 'Mahatma Gandhi Jayanti',
  '2027-12-25': 'Christmas',
};

export const DEFAULT_NSE_SPECIAL_SESSIONS: Record<string, SpecialTradingSession> = {
  '2025-10-21': {
    dateKey: '2025-10-21',
    name: 'Diwali Muhurat Trading Session',
    openMinute: 13 * 60 + 45,
    closeMinute: 14 * 60 + 45,
    intradaySquareOffMinute: 14 * 60 + 35,
  },
  '2026-11-08': {
    dateKey: '2026-11-08',
    name: 'Diwali Muhurat Trading Session',
    openMinute: 18 * 60,
    closeMinute: 19 * 60,
    intradaySquareOffMinute: 18 * 60 + 50,
  },
};

export function formatMinuteOfDay(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const hours12 = hours24 % 12 || 12;
  const amPm = hours24 >= 12 ? 'PM' : 'AM';
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${amPm} IST`;
}

function resolveCalendar(calendar?: MarketCalendarConfig) {
  return {
    holidays: { ...DEFAULT_NSE_HOLIDAYS, ...(calendar?.holidays || {}) },
    specialSessions: { ...DEFAULT_NSE_SPECIAL_SESSIONS, ...(calendar?.specialSessions || {}) },
  };
}

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

export function istDateMinuteToTimestamp(dateKey: string, minuteOfDay: number): number {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const hours = Math.floor(minuteOfDay / 60);
  const mins = minuteOfDay % 60;
  return Date.UTC(y, m - 1, d, hours, mins, 0, 0) - 330 * 60 * 1000;
}

export function getSessionScheduleForDate(
  dateKey: string,
  weekday: string,
  calendar?: MarketCalendarConfig
) {
  const { holidays, specialSessions } = resolveCalendar(calendar);
  const special = specialSessions[dateKey];
  const holidayName = holidays[dateKey];
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  if (special) {
    return {
      hasSession: true, isWeekend, isHoliday: Boolean(holidayName), holidayName,
      isSpecialSession: true, specialSessionName: special.name,
      openMinute: special.openMinute, closeMinute: special.closeMinute,
      intradaySquareOffMinute: special.intradaySquareOffMinute ?? Math.max(special.openMinute, special.closeMinute - 10),
    };
  }
  if (holidayName) {
    return {
      hasSession: false, isWeekend, isHoliday: true, holidayName, isSpecialSession: false,
      openMinute: MARKET_OPEN_MIN, closeMinute: MARKET_CLOSE_MIN, intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
    };
  }
  if (isWeekend) {
    return {
      hasSession: false, isWeekend: true, isHoliday: false, isSpecialSession: false,
      openMinute: MARKET_OPEN_MIN, closeMinute: MARKET_CLOSE_MIN, intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
    };
  }
  return {
    hasSession: true, isWeekend: false, isHoliday: false, isSpecialSession: false,
    openMinute: MARKET_OPEN_MIN, closeMinute: MARKET_CLOSE_MIN, intradaySquareOffMinute: INTRADAY_SQUARE_OFF_MIN,
  };
}

export function isPastIntradayCutoff(ts: number, now: number = Date.now(), calendar?: MarketCalendarConfig): boolean {
  const placed = getISTParts(ts);
  const cur = getISTParts(now);
  if (cur.dateKey !== placed.dateKey) return true;
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  return cur.minutes >= sched.intradaySquareOffMinute;
}

export function isPastSessionClose(ts: number, now: number = Date.now(), calendar?: MarketCalendarConfig): boolean {
  const placed = getISTParts(ts);
  const cur = getISTParts(now);
  if (cur.dateKey !== placed.dateKey) return true;
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  return cur.minutes >= sched.closeMinute;
}
