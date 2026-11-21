import type { DataProvenanceKind, MarketDataMetadata, MarketDataStatus, QuoteFreshness } from '../types/market';
import {
  DELAYED_QUOTE_MAX_AGE_MS, formatMinuteOfDay, getISTParts, getSessionScheduleForDate,
  istDateMinuteToTimestamp, LIVE_QUOTE_MAX_AGE_MS, MARKET_CLOSE_MIN, MARKET_OPEN_MIN, type MarketCalendarConfig,
} from './marketCalendar';

export type MarketSessionPhase = 'LIVE_TRADING' | 'SPECIAL_SESSION' | 'PRE_OPEN' | 'POST_CLOSE' | 'WEEKEND_CLOSED' | 'HOLIDAY_CLOSED';

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
  status: MarketDataStatus;
  label: 'Live' | 'Delayed' | 'Historical' | 'Last Available' | 'Stale Quote' | 'Unavailable' | 'Synthetic Educational Data';
  isTradable: boolean;
  ageMs: number;
  delaySeconds: number | null;
  provenance: DataProvenanceKind;
  available: boolean;
  staleWarning?: string;
  reason?: string;
}

export function getNextTradingSession(nowInput: number | Date = Date.now(), calendar?: MarketCalendarConfig) {
  const nowTs = typeof nowInput === 'number' ? nowInput : nowInput.getTime();
  const cur = getISTParts(nowTs);
  const todaySchedule = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);

  if (todaySchedule.hasSession && cur.minutes < todaySchedule.openMinute) {
    return {
      dateKey: cur.dateKey, weekday: cur.weekday, openMinute: todaySchedule.openMinute, closeMinute: todaySchedule.closeMinute,
      openTimestamp: istDateMinuteToTimestamp(cur.dateKey, todaySchedule.openMinute),
      isSpecialSession: todaySchedule.isSpecialSession, specialSessionName: todaySchedule.specialSessionName,
      label: `Opens today at ${formatMinuteOfDay(todaySchedule.openMinute)}`,
    };
  }

  const baseMiddayTs = istDateMinuteToTimestamp(cur.dateKey, 12 * 60);
  for (let offset = 1; offset <= 14; offset++) {
    const probeParts = getISTParts(baseMiddayTs + offset * 24 * 60 * 60 * 1000);
    const sched = getSessionScheduleForDate(probeParts.dateKey, probeParts.weekday, calendar);
    if (sched.hasSession) {
      const dayLabel = offset === 1 ? 'tomorrow' : `${probeParts.weekday}, ${probeParts.dateKey}`;
      return {
        dateKey: probeParts.dateKey, weekday: probeParts.weekday, openMinute: sched.openMinute, closeMinute: sched.closeMinute,
        openTimestamp: istDateMinuteToTimestamp(probeParts.dateKey, sched.openMinute),
        isSpecialSession: sched.isSpecialSession, specialSessionName: sched.specialSessionName,
        label: `Opens ${dayLabel} at ${formatMinuteOfDay(sched.openMinute)}`,
      };
    }
  }

  const fallbackParts = getISTParts(baseMiddayTs + 24 * 60 * 60 * 1000);
  return {
    dateKey: fallbackParts.dateKey, weekday: fallbackParts.weekday, openMinute: MARKET_OPEN_MIN, closeMinute: MARKET_CLOSE_MIN,
    openTimestamp: istDateMinuteToTimestamp(fallbackParts.dateKey, MARKET_OPEN_MIN),
    isSpecialSession: false, label: `Opens ${fallbackParts.weekday} at 09:15 AM IST`,
  };
}

export function getIndianMarketStatus(nowInput: number | Date = Date.now(), calendar?: MarketCalendarConfig): MarketStatus {
  const nowTs = typeof nowInput === 'number' ? nowInput : nowInput.getTime();
  const cur = getISTParts(nowTs);
  const sched = getSessionScheduleForDate(cur.dateKey, cur.weekday, calendar);
  const nextSession = getNextTradingSession(nowTs, calendar);
  const isOpen = sched.hasSession && cur.minutes >= sched.openMinute && cur.minutes < sched.closeMinute;

  let sessionPhase: MarketSessionPhase = 'POST_CLOSE';
  const statusLabel: 'Market Open' | 'Market Closed' = isOpen ? 'Market Open' : 'Market Closed';
  let detailLabel = isOpen ? 'Market Open' : 'Market Closed';
  let subText = '';
  let nextOpenText = nextSession.label;

  if (isOpen) {
    sessionPhase = sched.isSpecialSession ? 'SPECIAL_SESSION' : 'LIVE_TRADING';
    detailLabel = sched.isSpecialSession ? `Market Open (${sched.specialSessionName})` : 'Market Open';
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
    isOpen, isWeekend: sched.isWeekend, isHoliday: sched.isHoliday, holidayName: sched.holidayName,
    isSpecialSession: sched.isSpecialSession, specialSessionName: sched.specialSessionName,
    sessionPhase, statusLabel, detailLabel, subText, istTimeString, dateKey: cur.dateKey,
    nextOpenText, nextSessionDateKey: isOpen ? cur.dateKey : nextSession.dateKey,
    nextSessionOpenTimestamp: isOpen ? istDateMinuteToTimestamp(cur.dateKey, sched.openMinute) : nextSession.openTimestamp,
    sessionOpenMinute: sched.openMinute, sessionCloseMinute: sched.closeMinute,
    intradaySquareOffMinute: sched.intradaySquareOffMinute,
  };
}

export function classifyQuoteFreshness(
  quote: { price?: number; quoteTimestamp?: number; fetchedAt?: number; freshness?: QuoteFreshness; isStale?: boolean; providerAvailable?: boolean; source?: string } | null | undefined,
  marketStatus: Pick<MarketStatus, 'isOpen'>,
  now: number = Date.now()
): QuoteFreshnessInfo {
  if (quote?.freshness === 'SYNTHETIC_EDUCATIONAL') {
    return { freshness: 'SYNTHETIC_EDUCATIONAL', status: 'SYNTHETIC_EDUCATIONAL', label: 'Synthetic Educational Data', isTradable: false, ageMs: 0, delaySeconds: null, provenance: 'synthetic_educational', available: true, reason: 'Synthetic educational scenario cannot be used for financial order execution.' };
  }
  if (!quote || quote.freshness === 'UNAVAILABLE' || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0) {
    return { freshness: quote?.freshness === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'STALE', status: 'UNAVAILABLE', label: quote?.freshness === 'UNAVAILABLE' ? 'Unavailable' : 'Stale Quote', isTradable: false, ageMs: Number.POSITIVE_INFINITY, delaySeconds: null, provenance: 'unavailable', available: false, reason: 'Market quote is unavailable or invalid.' };
  }
  const refTs = quote.quoteTimestamp ?? quote.fetchedAt ?? now;
  const ageMs = Math.max(0, now - refTs);
  const delaySeconds = Math.round(ageMs / 1000);

  if (quote.providerAvailable === false || quote.isStale === true || quote.freshness === 'STALE') {
    return { freshness: 'STALE', status: 'STALE', label: 'Stale Quote', isTradable: false, ageMs, delaySeconds, provenance: 'cached_authentic', available: true, staleWarning: `Market data feed is currently unreachable or stale. Showing last authentic quote from ${new Date(refTs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`, reason: 'Market data provider quote is stale or unavailable.' };
  }
  if (quote.freshness === 'HISTORICAL') {
    return { freshness: 'HISTORICAL', status: 'HISTORICAL', label: 'Historical', isTradable: false, ageMs, delaySeconds, provenance: 'provider_historical', available: true, reason: 'Historical market data cannot be used for live session execution.' };
  }
  if (!marketStatus.isOpen) {
    return { freshness: 'LAST_AVAILABLE', status: 'HISTORICAL', label: 'Last Available', isTradable: false, ageMs, delaySeconds, provenance: 'provider_historical', available: true };
  }
  if (ageMs > DELAYED_QUOTE_MAX_AGE_MS || quote.freshness === 'LAST_AVAILABLE') {
    return { freshness: 'STALE', status: 'STALE', label: 'Stale Quote', isTradable: false, ageMs, delaySeconds, provenance: 'cached_authentic', available: true, staleWarning: `Quote is ${Math.round(ageMs / 60000)} minutes old and exceeds the 15-minute execution threshold.`, reason: 'Market quote is older than 15 minutes and cannot be used for live execution.' };
  }
  if (ageMs <= LIVE_QUOTE_MAX_AGE_MS && quote.freshness !== 'DELAYED') {
    return { freshness: 'LIVE', status: 'LIVE', label: 'Live', isTradable: true, ageMs, delaySeconds, provenance: 'provider_live', available: true };
  }
  return { freshness: 'DELAYED', status: 'DELAYED', label: 'Delayed', isTradable: true, ageMs, delaySeconds, provenance: 'provider_delayed', available: true };
}

export function buildMarketDataMetadata(params: {
  source: string; price?: number; quoteTimestamp?: number | null; fetchedAt?: number | null;
  freshness?: QuoteFreshness; isStale?: boolean; providerAvailable?: boolean;
  marketStatus?: Pick<MarketStatus, 'isOpen'>; now?: number;
}): MarketDataMetadata {
  const now = params.now ?? Date.now();
  const marketStatus = params.marketStatus ?? getIndianMarketStatus(now);
  const info = classifyQuoteFreshness({
    price: params.price, quoteTimestamp: params.quoteTimestamp ?? undefined, fetchedAt: params.fetchedAt ?? undefined,
    freshness: params.freshness, isStale: params.isStale, providerAvailable: params.providerAvailable, source: params.source,
  }, marketStatus, now);
  return {
    source: params.source, timestamp: params.quoteTimestamp ?? null, fetchedAt: params.fetchedAt ?? now,
    freshness: info.freshness, status: info.status, delaySeconds: info.delaySeconds,
    provenance: info.provenance, available: info.available, isStale: info.status === 'STALE', staleWarning: info.staleWarning,
  };
}
