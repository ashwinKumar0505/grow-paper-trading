import { shortDate } from './format';
import { INTRADAY_STATUS, SWING_LIVE_ENTRY_STATUS } from './terms';

export const SWING_EOD_TOOLTIP =
  'Swing setups confirm on completed NSE daily candles (3:30 PM close) to avoid mid-day repainting. Setups confirmed on the last close are actionable in the next trading session.';

export type BadgeTone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

export interface LiveEntryStatusMeta {
  label: string;
  tone: BadgeTone;
  help: string;
}

export interface SwingLiveEntryDisplay {
  livePrice: number;
  changePct: number | null;
  statusMeta: LiveEntryStatusMeta | null;
}

export interface IntradayStatusMeta {
  label: string;
  tone: BadgeTone;
  group: 'open' | 'closed';
  help?: string;
}

export interface IntradayRecencyMeta {
  kind: 'fresh' | 'running';
  label: string;
  elapsed: string | null;
}

const INTRADAY_STATUS_MAP = INTRADAY_STATUS as Record<
  string,
  { label: string; tone: BadgeTone; group?: 'open' | 'closed'; help?: string }
>;

const LIVE_ENTRY_STATUS_MAP = SWING_LIVE_ENTRY_STATUS as Record<string, LiveEntryStatusMeta>;

export function extractDateKey(value?: string | null): string | null {
  if (!value) return null;
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(value).trim() || null;
}

export function hasDifferentActionableSession(
  dataAsOfDate?: string | null,
  actionableSessionDate?: string | null
): boolean {
  const asOfKey = extractDateKey(dataAsOfDate);
  const actionableKey = extractDateKey(actionableSessionDate);
  if (!asOfKey || !actionableKey) return false;
  return asOfKey !== actionableKey;
}

export function formatSwingEntrySubLabel(signal: {
  suggested_buy_date?: string | null;
  buy_date_is_confirmed?: boolean;
  signal_type?: string;
}): string {
  const dateLabel = shortDate(signal.suggested_buy_date);
  if (!dateLabel || dateLabel === '—') return 'Ref. close';
  const isProjectedUnconfirmed =
    signal.buy_date_is_confirmed === false ||
    (signal.buy_date_is_confirmed == null && signal.signal_type === 'PROJECTED_SETUP');
  return isProjectedUnconfirmed ? `Wait till ${dateLabel}` : `${dateLabel} close`;
}

export function getSwingLiveEntryDisplay(signal: {
  live_price?: number | null;
  live_price_change_from_signal_pct?: number | null;
  live_entry_status?: string | null;
}): SwingLiveEntryDisplay | null {
  if (signal.live_price == null || signal.live_price === ('' as unknown as number)) return null;
  const livePrice = Number(signal.live_price);
  if (!Number.isFinite(livePrice) || livePrice <= 0) return null;

  const rawPct = signal.live_price_change_from_signal_pct;
  const parsedPct = rawPct != null && rawPct !== ('' as unknown as number) ? Number(rawPct) : NaN;
  const changePct = Number.isFinite(parsedPct) ? parsedPct : null;

  const statusKey = signal.live_entry_status ? String(signal.live_entry_status).trim() : '';
  const statusMeta = statusKey ? LIVE_ENTRY_STATUS_MAP[statusKey] || null : null;

  return { livePrice, changePct, statusMeta };
}

export function isIntradayLiveSession(
  marketStatus?: { is_market_open?: boolean } | null,
  data?: { scanner_state?: string | null; market_status?: { is_market_open?: boolean } | null } | null
): boolean {
  if (data?.scanner_state === 'PAUSED_MARKET_CLOSED') return false;
  if (data?.scanner_state === 'ACTIVE_SCANNING') return true;
  const effectiveStatus = marketStatus ?? data?.market_status;
  return effectiveStatus?.is_market_open === true;
}

export function isIntradaySignalOpen(signal: {
  signal_status?: string | null;
  is_projected_exit?: boolean | null;
  actual_exit_price?: number | null;
}): boolean {
  if (typeof signal.is_projected_exit === 'boolean') {
    return signal.is_projected_exit;
  }
  const status = signal.signal_status || '';
  const knownGroup = INTRADAY_STATUS_MAP[status]?.group;
  if (knownGroup === 'open') return true;
  if (knownGroup === 'closed') return false;
  return signal.actual_exit_price == null && !/^COMPLETED_/i.test(status);
}

export function resolveIntradayStatus(signal: {
  signal_status?: string | null;
  status_badge_text?: string | null;
  is_projected_exit?: boolean | null;
  actual_exit_price?: number | null;
}): IntradayStatusMeta {
  const status = signal.signal_status || '';
  const isOpen = isIntradaySignalOpen(signal);
  const known = INTRADAY_STATUS_MAP[status];
  if (known) {
    return {
      label: known.label,
      tone: known.tone,
      group: isOpen ? 'open' : 'closed',
      help: known.help,
    };
  }
  const badgeText = signal.status_badge_text?.trim();
  const formattedFallback = status
    ? status
        .replace(/^COMPLETED_/i, '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase())
    : '';
  return {
    label: badgeText || formattedFallback || 'Signal',
    tone: isOpen ? 'info' : 'neutral',
    group: isOpen ? 'open' : 'closed',
  };
}

export function formatElapsedMinutes(minutes?: number | null): string | null {
  if (minutes == null || minutes === ('' as unknown as number)) return null;
  const n = Number(minutes);
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.round(n);
  if (rounded < 1) return 'just now';
  if (rounded < 60) return `${rounded}m ago`;
  const hrs = Math.floor(rounded / 60);
  const rem = rounded % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

function parseIstEntryElapsedMinutes(entryTimeIst?: string | null, nowMs = Date.now()): number | null {
  if (!entryTimeIst) return null;
  const match = String(entryTimeIst).match(/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, datePart, hh, mm] = match;
  const iso = `${datePart}T${hh.padStart(2, '0')}:${mm}:00+05:30`;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const diffMins = (nowMs - ts) / 60000;
  return diffMins >= 0 && diffMins <= 480 ? diffMins : null;
}

export function getIntradayRecencyMeta(
  signal: {
    signal_status?: string | null;
    is_projected_exit?: boolean | null;
    actual_exit_price?: number | null;
    entry_freshness?: string | null;
    minutes_since_entry?: number | null;
    entry_time_ist?: string | null;
  },
  nowMs = Date.now()
): IntradayRecencyMeta | null {
  if (!isIntradaySignalOpen(signal)) return null;

  const elapsed = formatElapsedMinutes(signal.minutes_since_entry);
  const freshness = signal.entry_freshness ? String(signal.entry_freshness).trim().toUpperCase() : '';

  if (freshness === 'FRESH') {
    return { kind: 'fresh', label: 'Fresh', elapsed };
  }
  if (freshness === 'IN_PROGRESS') {
    return { kind: 'running', label: 'Running', elapsed };
  }

  if (signal.signal_status === 'LIVE_ACTIVE_ENTRY') {
    return { kind: 'fresh', label: 'Fresh', elapsed };
  }

  const mins =
    signal.minutes_since_entry != null && Number.isFinite(Number(signal.minutes_since_entry))
      ? Number(signal.minutes_since_entry)
      : parseIstEntryElapsedMinutes(signal.entry_time_ist, nowMs);

  if ((mins != null && mins > 30) || signal.signal_status === 'PROJECTED_EXIT_PENDING') {
    return { kind: 'running', label: 'Running', elapsed };
  }

  return null;
}

export function getIntradayLiveRiskReward(signal: {
  signal_status?: string | null;
  is_projected_exit?: boolean | null;
  actual_exit_price?: number | null;
  live_risk_reward_ratio?: number | null;
}): number | null {
  if (!isIntradaySignalOpen(signal)) return null;
  if (signal.live_risk_reward_ratio == null || signal.live_risk_reward_ratio === ('' as unknown as number)) {
    return null;
  }
  const value = Number(signal.live_risk_reward_ratio);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
