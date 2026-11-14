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
