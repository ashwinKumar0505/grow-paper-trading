import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSectors,
  filterSwingSignals,
  computeSwingCounts,
  filterIntradaySignals,
  computeIntradayCounts,
  formatIstTimestamp,
  type SwingSignal,
  type IntradaySignal,
} from '../features/screener/utils/screenerHelpers.ts';
import {
  formatElapsedMinutes,
  formatSwingEntrySubLabel,
  getIntradayLiveRiskReward,
  getIntradayRecencyMeta,
  getSwingLiveEntryDisplay,
  hasDifferentActionableSession,
  isIntradayLiveSession,
  isIntradaySignalOpen,
  resolveIntradayStatus,
} from '../features/screener/utils/signalPresentation.ts';
import { adaptIntradayResponse, adaptSwingResponse } from '../features/screener/api/adapters.js';

const SWING_FIXTURES: SwingSignal[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    sector: 'Oil & Gas',
    current_price: 2985,
    confidence_score: 92,
    signal_type: 'CONFIRMED_SIGNAL',
    suggested_buy_price: 2985,
    suggested_buy_date: '2026-11-14',
    target_sell_price: 3150,
    expected_gain_pct: 5.5,
    estimated_sell_date: '2026-11-22',
    stop_loss: 2910,
    stop_loss_risk_pct: 2.5,
    primary_strategy: 'Momentum Breakout',
    risk_reward_ratio: 2.2,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    sector: 'IT Services',
    current_price: 4120,
    confidence_score: 76,
    signal_type: 'PROJECTED_SETUP',
    suggested_buy_price: 4140,
    suggested_buy_date: '2026-11-15',
    target_sell_price: 4400,
    expected_gain_pct: 6.3,
    estimated_sell_date: '2026-11-24',
    stop_loss: 4030,
    stop_loss_risk_pct: 2.6,
    primary_strategy: 'EMA Pullback',
    risk_reward_ratio: 2.4,
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    sector: 'IT Services',
    current_price: 1845,
    confidence_score: 62,
    signal_type: 'CONFIRMED_SIGNAL',
    suggested_buy_price: 1845,
    suggested_buy_date: '2026-11-14',
    target_sell_price: 1930,
    expected_gain_pct: 4.6,
    estimated_sell_date: '2026-11-21',
    stop_loss: 1800,
    stop_loss_risk_pct: 2.4,
    primary_strategy: 'Double Bottom',
    risk_reward_ratio: 1.9,
  },
];

const INTRADAY_FIXTURES: IntradaySignal[] = [
  {
    id: 'i1',
    symbol: 'SBIN',
    name: 'State Bank of India',
    confidence_score: 88,
    entry_price: 830,
    entry_time_ist: '09:45 AM',
    target_exit_price: 845,
    estimated_exit_time_ist: '02:45 PM',
    stop_loss: 822,
    strategy_name: 'VWAP Breakout',
    risk_reward_ratio: 1.9,
    signal_status: 'LIVE_ACTIVE_ENTRY',
  },
  {
    id: 'i2',
    symbol: 'BEL',
    name: 'Bharat Electronics',
    confidence_score: 74,
    entry_price: 310,
    entry_time_ist: '10:00 AM',
    target_exit_price: 318,
    estimated_exit_time_ist: '02:30 PM',
    stop_loss: 306,
    strategy_name: 'Volume Surge',
    risk_reward_ratio: 2.0,
    signal_status: 'COMPLETED_TARGET_HIT',
    pnl_pct: 2.58,
  },
  {
    id: 'i3',
    symbol: 'ITC',
    name: 'ITC Ltd',
    confidence_score: 64,
    entry_price: 488,
    entry_time_ist: '10:15 AM',
    target_exit_price: 496,
    estimated_exit_time_ist: '02:45 PM',
    stop_loss: 484,
    strategy_name: 'EMA Pullback',
    risk_reward_ratio: 2.0,
    signal_status: 'COMPLETED_STOP_LOSS_HIT',
    pnl_pct: -0.82,
  },
];

test('extractSectors returns sorted unique sectors and ignores missing', () => {
  assert.deepEqual(extractSectors(SWING_FIXTURES), ['IT Services', 'Oil & Gas']);
  assert.deepEqual(extractSectors(INTRADAY_FIXTURES), []);
});

test('filterSwingSignals filters by confidence, status, sector, and sorts', () => {
  const highConf = filterSwingSignals(SWING_FIXTURES, { minConfidence: 70 });
  assert.deepEqual(
    highConf.map((s) => s.symbol),
    ['RELIANCE', 'TCS']
  );

  const itConfirmed = filterSwingSignals(SWING_FIXTURES, {
    minConfidence: 50,
    statusFilter: 'CONFIRMED_SIGNAL',
    sectorFilter: 'IT Services',
  });
  assert.deepEqual(
    itConfirmed.map((s) => s.symbol),
    ['INFY']
  );

  const sortedByGain = filterSwingSignals(SWING_FIXTURES, {
    minConfidence: 50,
    sortBy: 'expected_gain_pct',
    sortDir: 'desc',
  });
  assert.equal(sortedByGain[0].symbol, 'TCS');
});

test('computeSwingCounts returns accurate counts per status', () => {
  assert.deepEqual(computeSwingCounts(SWING_FIXTURES, 70), {
    ALL: 2,
    CONFIRMED_SIGNAL: 1,
    PROJECTED_SETUP: 1,
  });
});

test('filterIntradaySignals and computeIntradayCounts filter open/closed/target accurately', () => {
  assert.deepEqual(computeIntradayCounts(INTRADAY_FIXTURES, 50), {
    ALL: 3,
    OPEN: 1,
    CLOSED: 2,
    TARGET: 1,
  });

  const openOnly = filterIntradaySignals(INTRADAY_FIXTURES, { statusFilter: 'OPEN' });
  assert.deepEqual(
    openOnly.map((s) => s.symbol),
    ['SBIN']
  );

  const targetOnly = filterIntradaySignals(INTRADAY_FIXTURES, { statusFilter: 'TARGET' });
  assert.deepEqual(
    targetOnly.map((s) => s.symbol),
    ['BEL']
  );
});

test('formatIstTimestamp formats ISO strings in IST and handles empty values', () => {
  assert.equal(formatIstTimestamp(null), '—');
  const formatted = formatIstTimestamp('2026-11-14T08:52:00Z');
  assert.ok(formatted.endsWith('IST'));
});

test('swing EOD session helpers detect actionable session difference and format close sub-labels', () => {
  assert.equal(hasDifferentActionableSession('2026-11-20', '2026-11-23'), true);
  assert.equal(hasDifferentActionableSession('2026-11-20T15:30:00+05:30', '2026-11-23'), true);
  assert.equal(hasDifferentActionableSession('2026-11-20', '2026-11-20'), false);
  assert.equal(hasDifferentActionableSession('2026-11-20', null), false);
  assert.equal(hasDifferentActionableSession('2026-11-20', undefined), false);

  assert.equal(
    formatSwingEntrySubLabel({
      suggested_buy_date: '2026-11-20 (Confirmed Trigger)',
      buy_date_is_confirmed: true,
      signal_type: 'CONFIRMED_SIGNAL',
    }),
    '20 Nov close'
  );
  assert.equal(
    formatSwingEntrySubLabel({
      suggested_buy_date: '2026-11-20',
      buy_date_is_confirmed: false,
      signal_type: 'PROJECTED_SETUP',
    }),
    'Wait till 20 Nov'
  );
  assert.equal(
    formatSwingEntrySubLabel({
      suggested_buy_date: '2026-11-20',
      signal_type: 'CONFIRMED_SIGNAL',
    }),
    '20 Nov close'
  );
});

test('getSwingLiveEntryDisplay gracefully handles missing live fields and maps all live entry statuses', () => {
  assert.equal(getSwingLiveEntryDisplay({}), null);
  assert.equal(getSwingLiveEntryDisplay({ live_price: null }), null);

  const inZone = getSwingLiveEntryDisplay({
    live_price: 1598.4,
    live_price_change_from_signal_pct: 1.7,
    live_entry_status: 'IN_ENTRY_ZONE',
  });
  assert.equal(inZone?.livePrice, 1598.4);
  assert.equal(inZone?.changePct, 1.7);
  assert.equal(inZone?.statusMeta?.label, 'In entry zone');
  assert.equal(inZone?.statusMeta?.tone, 'positive');

  const extended = getSwingLiveEntryDisplay({
    live_price: 1680,
    live_price_change_from_signal_pct: 6.2,
    live_entry_status: 'EXTENDED',
  });
  assert.equal(extended?.statusMeta?.label, 'Extended');
  assert.equal(extended?.statusMeta?.tone, 'warning');
  assert.match(extended?.statusMeta?.help || '', /avoid chasing/i);

  const targetHit = getSwingLiveEntryDisplay({
    live_price: 1750,
    live_entry_status: 'TARGET_HIT',
  });
  assert.equal(targetHit?.changePct, null);
  assert.equal(targetHit?.statusMeta?.label, 'Target reached');

  const stopBreached = getSwingLiveEntryDisplay({
    live_price: 1490,
    live_price_change_from_signal_pct: -3.2,
    live_entry_status: 'STOP_BREACHED',
  });
  assert.equal(stopBreached?.statusMeta?.label, 'Below stop');
  assert.equal(stopBreached?.statusMeta?.tone, 'negative');

  const unknownStatus = getSwingLiveEntryDisplay({
    live_price: 1600,
    live_entry_status: 'FUTURE_STATUS',
  });
  assert.equal(unknownStatus?.statusMeta, null);
});

test('isIntradayLiveSession respects scanner_state and falls back to market_status', () => {
  assert.equal(isIntradayLiveSession({ is_market_open: false }, { scanner_state: 'ACTIVE_SCANNING' }), true);
  assert.equal(
    isIntradayLiveSession({ is_market_open: true }, { scanner_state: 'PAUSED_MARKET_CLOSED' }),
    false
  );
  assert.equal(isIntradayLiveSession({ is_market_open: true }, null), true);
  assert.equal(isIntradayLiveSession(null, { market_status: { is_market_open: true } }), true);
  assert.equal(isIntradayLiveSession({ is_market_open: false }, {}), false);
});

test('intraday recency, live R:R, and unrecognized status fallbacks handle old and enhanced payloads', () => {
  assert.equal(formatElapsedMinutes(45), '45m ago');
  assert.equal(formatElapsedMinutes(90), '1h 30m ago');
  assert.equal(formatElapsedMinutes(null), null);

  // Enhanced fresh setup
  const freshSig: IntradaySignal = {
    ...INTRADAY_FIXTURES[0],
    is_projected_exit: true,
    entry_freshness: 'FRESH',
    minutes_since_entry: 12,
    live_risk_reward_ratio: 1.4,
  };
  assert.deepEqual(getIntradayRecencyMeta(freshSig), {
    kind: 'fresh',
    label: 'Fresh',
    elapsed: '12m ago',
  });
  assert.equal(getIntradayLiveRiskReward(freshSig), 1.4);

  // Enhanced running setup
  const runningSig: IntradaySignal = {
    ...INTRADAY_FIXTURES[0],
    signal_status: 'PROJECTED_EXIT_PENDING',
    is_projected_exit: true,
    entry_freshness: 'IN_PROGRESS',
    minutes_since_entry: 45,
    live_risk_reward_ratio: 1.2,
  };
  assert.deepEqual(getIntradayRecencyMeta(runningSig), {
    kind: 'running',
    label: 'Running',
    elapsed: '45m ago',
  });
  assert.equal(getIntradayLiveRiskReward(runningSig), 1.2);

  // Older payload fallback without entry_freshness or is_projected_exit
  assert.equal(getIntradayRecencyMeta(INTRADAY_FIXTURES[0])?.kind, 'fresh');
  assert.equal(getIntradayRecencyMeta(INTRADAY_FIXTURES[1]), null);
  assert.equal(getIntradayLiveRiskReward(INTRADAY_FIXTURES[0]), null);

  // Unrecognized status safely falls back to status_badge_text and uses is_projected_exit
  const futureOpen: IntradaySignal = {
    ...INTRADAY_FIXTURES[0],
    id: 'future-1',
    signal_status: 'CUSTOM_TRAILING_HOLD',
    status_badge_text: 'Trailing hold',
    is_projected_exit: true,
  };
  const futureClosed: IntradaySignal = {
    ...INTRADAY_FIXTURES[1],
    id: 'future-2',
    signal_status: 'CUSTOM_MANUAL_CLOSE',
    status_badge_text: 'Manual close',
    is_projected_exit: false,
  };
  assert.equal(isIntradaySignalOpen(futureOpen), true);
  assert.equal(isIntradaySignalOpen(futureClosed), false);
  assert.equal(resolveIntradayStatus(futureOpen).label, 'Trailing hold');
  assert.equal(resolveIntradayStatus(futureOpen).group, 'open');
  assert.equal(resolveIntradayStatus(futureClosed).label, 'Manual close');
  assert.equal(resolveIntradayStatus(futureClosed).group, 'closed');

  const counts = computeIntradayCounts([futureOpen, futureClosed], 50);
  assert.deepEqual(counts, { ALL: 2, OPEN: 1, CLOSED: 1, TARGET: 0 });
  assert.deepEqual(
    filterIntradaySignals([futureOpen, futureClosed], { statusFilter: 'OPEN' }).map((s) => s.id),
    ['future-1']
  );
});

test('screener response adapters preserve optional enhanced fields without breaking legacy payloads', () => {
  const swing = adaptSwingResponse({
    total_scanned: 500,
    bullish_signals_found: 1,
    data_as_of_date: '2026-11-20',
    actionable_session_date: '2026-11-23',
    signals: [
      {
        ...SWING_FIXTURES[0],
        live_price: 3020.5,
        live_price_change_from_signal_pct: 1.2,
        live_entry_status: 'IN_ENTRY_ZONE',
      },
    ],
  });
  assert.equal(swing.actionable_session_date, '2026-11-23');
  assert.equal(swing.signals[0].live_price, 3020.5);
  assert.equal(swing.signals[0].live_entry_status, 'IN_ENTRY_ZONE');

  const intraday = adaptIntradayResponse({
    total_scanned: 100,
    session_date: '2026-11-23',
    scanner_state: 'ACTIVE_SCANNING',
    signals: [
      {
        ...INTRADAY_FIXTURES[0],
        signal_status: 'CUSTOM_OPEN_STATUS',
        status_badge_text: 'Custom Open',
        is_projected_exit: true,
        entry_freshness: 'FRESH',
        minutes_since_entry: 8,
        live_risk_reward_ratio: 1.6,
      },
      {
        ...INTRADAY_FIXTURES[1],
        is_projected_exit: false,
      },
    ],
  });
  assert.equal(intraday.scanner_state, 'ACTIVE_SCANNING');
  assert.equal(intraday.active_signals_count, 1);
  assert.equal(intraday.completed_trades_count, 1);
  assert.equal(intraday.signals[0].entry_freshness, 'FRESH');
  assert.equal(intraday.signals[0].live_risk_reward_ratio, 1.6);
});
