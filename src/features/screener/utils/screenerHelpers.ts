import { INTRADAY_STATUS } from './terms';

const INTRADAY_STATUS_MAP = INTRADAY_STATUS as Record<
  string,
  { label: string; tone: string; group?: string }
>;

export type ConfidencePreset = 'all' | '70' | '80' | '90';

export const CONFIDENCE_PRESETS: { value: ConfidencePreset; label: string; min: number }[] = [
  { value: 'all', label: 'All (50+)', min: 50 },
  { value: '70', label: '70+', min: 70 },
  { value: '80', label: '80+', min: 80 },
  { value: '90', label: '90+', min: 90 },
];

export interface SwingSignal {
  symbol: string;
  name: string;
  sector?: string;
  current_price: number;
  confidence_score: number;
  signal_type: string;
  suggested_buy_price: number;
  suggested_buy_date: string;
  buy_date_is_confirmed?: boolean;
  target_sell_price: number;
  expected_gain_pct: number;
  estimated_sell_date: string;
  stop_loss: number;
  stop_loss_risk_pct: number;
  primary_strategy: string;
  detected_patterns?: string[];
  matched_strategies?: string[];
  risk_reward_ratio: number;
  estimated_holding_days?: number;
  historical_strategy_precision_pct?: number;
  buy_price_note?: string;
  reasoning?: string[];
  risk_notes?: string[];
}

export interface IntradaySignal {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  confidence_score: number;
  entry_price: number;
  entry_time_ist: string;
  target_exit_price: number;
  estimated_exit_time_ist: string;
  actual_exit_price?: number | null;
  actual_exit_time_ist?: string | null;
  stop_loss: number;
  strategy_name: string;
  reasoning?: string;
  risk_reward_ratio: number;
  signal_status: string;
  status_badge_text?: string;
  pnl_pct?: number | null;
}

export function extractSectors(signals: Array<{ sector?: string }> = []): string[] {
  const set = new Set<string>();
  for (const s of signals) {
    if (s.sector && s.sector.trim()) {
      set.add(s.sector.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function filterSwingSignals(
  signals: SwingSignal[] = [],
  {
    minConfidence = 50,
    statusFilter = 'ALL',
    sectorFilter = 'ALL',
    sortBy = 'confidence_score',
    sortDir = 'desc',
  }: {
    minConfidence?: number;
    statusFilter?: string;
    sectorFilter?: string;
    sortBy?: keyof SwingSignal;
    sortDir?: 'asc' | 'desc';
  } = {}
): SwingSignal[] {
  let list = signals.filter((s) => s.confidence_score >= minConfidence);
  if (sectorFilter !== 'ALL') {
    list = list.filter((s) => s.sector === sectorFilter);
  }
  if (statusFilter !== 'ALL') {
    list = list.filter((s) => s.signal_type === statusFilter);
  }
  return [...list].sort((a, b) => {
    const vA = Number(a[sortBy] ?? 0);
    const vB = Number(b[sortBy] ?? 0);
    return sortDir === 'asc' ? vA - vB : vB - vA;
  });
}

export function computeSwingCounts(
  signals: SwingSignal[] = [],
  minConfidence = 50,
  sectorFilter = 'ALL'
): { ALL: number; CONFIRMED_SIGNAL: number; PROJECTED_SETUP: number } {
  const list = signals.filter(
    (s) => s.confidence_score >= minConfidence && (sectorFilter === 'ALL' || s.sector === sectorFilter)
  );
  return {
    ALL: list.length,
    CONFIRMED_SIGNAL: list.filter((s) => s.signal_type === 'CONFIRMED_SIGNAL').length,
    PROJECTED_SETUP: list.filter((s) => s.signal_type === 'PROJECTED_SETUP').length,
  };
}

export function filterIntradaySignals(
  signals: IntradaySignal[] = [],
  {
    minConfidence = 50,
    statusFilter = 'ALL',
    sectorFilter = 'ALL',
  }: {
    minConfidence?: number;
    statusFilter?: string;
    sectorFilter?: string;
  } = {}
): IntradaySignal[] {
  let list = signals.filter((s) => s.confidence_score >= minConfidence);
  if (sectorFilter !== 'ALL') {
    list = list.filter((s) => s.sector === sectorFilter);
  }
  if (statusFilter === 'OPEN') {
    list = list.filter((s) => INTRADAY_STATUS_MAP[s.signal_status]?.group === 'open');
  } else if (statusFilter === 'CLOSED') {
    list = list.filter((s) => INTRADAY_STATUS_MAP[s.signal_status]?.group === 'closed');
  } else if (statusFilter === 'TARGET') {
    list = list.filter((s) => s.signal_status === 'COMPLETED_TARGET_HIT');
  }
  return [...list].sort((a, b) => b.confidence_score - a.confidence_score);
}

export function computeIntradayCounts(
  signals: IntradaySignal[] = [],
  minConfidence = 50,
  sectorFilter = 'ALL'
): { ALL: number; OPEN: number; CLOSED: number; TARGET: number } {
  const list = signals.filter(
    (s) => s.confidence_score >= minConfidence && (sectorFilter === 'ALL' || s.sector === sectorFilter)
  );
  const grp = (s: IntradaySignal) => INTRADAY_STATUS_MAP[s.signal_status]?.group;
  return {
    ALL: list.length,
    OPEN: list.filter((s) => grp(s) === 'open').length,
    CLOSED: list.filter((s) => grp(s) === 'closed').length,
    TARGET: list.filter((s) => s.signal_status === 'COMPLETED_TARGET_HIT').length,
  };
}

export function formatIstTimestamp(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return (
    d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  );
}
