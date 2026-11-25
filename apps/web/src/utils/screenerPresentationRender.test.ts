import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MarketStatusBadge from '../features/screener/components/MarketStatusBadge.jsx';
import RecommendationTable from '../features/screener/components/RecommendationTable.jsx';
import { IntradayResultsSection } from '../features/screener/components/IntradayResultsSection.jsx';
import { DrawerTradePlan } from '../features/screener/components/DrawerTradePlan.jsx';
import { Hint } from '../features/screener/components/ui.jsx';
import { SWING_EOD_TOOLTIP } from '../features/screener/utils/signalPresentation.ts';

const MarketStatusBadgeCmp = MarketStatusBadge as unknown as React.ComponentType<Record<string, unknown>>;
const RecommendationTableCmp = RecommendationTable as unknown as React.ComponentType<Record<string, unknown>>;
const IntradayResultsSectionCmp = IntradayResultsSection as unknown as React.ComponentType<Record<string, unknown>>;
const DrawerTradePlanCmp = DrawerTradePlan as unknown as React.ComponentType<Record<string, unknown>>;
const HintCmp = Hint as unknown as React.ComponentType<Record<string, unknown>>;

const LEGACY_SWING_SIGNAL = {
  symbol: 'TCS',
  name: 'Tata Consultancy Services',
  sector: 'IT Services',
  current_price: 1571.7,
  confidence_score: 86,
  signal_type: 'CONFIRMED_SIGNAL',
  suggested_buy_price: 1571.7,
  suggested_buy_date: '2026-11-20',
  buy_date_is_confirmed: true,
  target_sell_price: 1680,
  expected_gain_pct: 6.9,
  estimated_sell_date: '2026-11-28',
  stop_loss: 1525,
  stop_loss_risk_pct: 3.0,
  primary_strategy: '20-Day Resistance Breakout',
  risk_reward_ratio: 2.3,
};

test('Swing RecommendationTable renders legacy payload cleanly without live fields and clarifies close date', () => {
  const html = renderToStaticMarkup(
    React.createElement(RecommendationTableCmp, {
      signals: [LEGACY_SWING_SIGNAL],
      mode: 'swing',
      onSelectSignal: () => {},
    })
  );

  assert.match(html, /20 Nov close/);
  assert.doesNotMatch(html, /From 20 Nov/);
  assert.doesNotMatch(html, /Now ₹/);
  assert.doesNotMatch(html, /In entry zone|Extended|Below stop/);
});

test('Swing RecommendationTable and DrawerTradePlan render live price and status pills when present', () => {
  const enhancedSignals = [
    {
      ...LEGACY_SWING_SIGNAL,
      symbol: 'INFY',
      live_price: 1598.4,
      live_price_change_from_signal_pct: 1.7,
      live_entry_status: 'IN_ENTRY_ZONE',
    },
    {
      ...LEGACY_SWING_SIGNAL,
      symbol: 'RELIANCE',
      live_price: 1675.0,
      live_price_change_from_signal_pct: 6.6,
      live_entry_status: 'EXTENDED',
    },
    {
      ...LEGACY_SWING_SIGNAL,
      symbol: 'SBIN',
      live_price: 1705.0,
      live_price_change_from_signal_pct: 8.5,
      live_entry_status: 'TARGET_HIT',
    },
    {
      ...LEGACY_SWING_SIGNAL,
      symbol: 'ITC',
      live_price: 1510.0,
      live_price_change_from_signal_pct: -3.9,
      live_entry_status: 'STOP_BREACHED',
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(RecommendationTableCmp, {
      signals: enhancedSignals,
      mode: 'swing',
      onSelectSignal: () => {},
    })
  );

  assert.match(html, /20 Nov close/);
  assert.match(html, /Now <strong>₹1,598\.40<\/strong>/);
  assert.match(html, /\(\+1\.7%\)/);
  assert.match(html, /In entry zone/);
  assert.match(html, /Extended/);
  assert.match(html, /Moved significantly above signal close; avoid chasing/);
  assert.match(html, /Target reached/);
  assert.match(html, /Below stop/);

  const drawerHtml = renderToStaticMarkup(
    React.createElement(DrawerTradePlanCmp, {
      isSwing: true,
      signal: enhancedSignals[0],
      entryPrice: enhancedSignals[0].suggested_buy_price,
      targetPrice: enhancedSignals[0].target_sell_price,
      stopLoss: enhancedSignals[0].stop_loss,
      targetPct: enhancedSignals[0].expected_gain_pct,
      slPct: -enhancedSignals[0].stop_loss_risk_pct,
      rr: enhancedSignals[0].risk_reward_ratio,
    })
  );
  assert.match(drawerHtml, /20 Nov close/);
  assert.match(drawerHtml, /In entry zone/);
});

test('MarketStatusBadge displays EOD session context note and swing EOD tooltip', () => {
  const html = renderToStaticMarkup(
    React.createElement(MarketStatusBadgeCmp, {
      marketStatus: { is_market_open: true, session_phase: 'LIVE_TRADING' },
      lastUpdatedIso: '2026-11-23T08:00:00Z',
      contextNote: React.createElement(
        React.Fragment,
        null,
        'EOD signals from ',
        React.createElement('strong', null, '20 Nov'),
        ' · Valid for ',
        React.createElement('strong', null, '23 Nov'),
        ' session'
      ),
      extra: React.createElement(
        'span',
        { className: 'sc-freshness-tag sc-freshness-with-hint' },
        React.createElement('span', null, 'Prices as of ', React.createElement('strong', null, '20 Nov')),
        React.createElement(HintCmp, { text: SWING_EOD_TOOLTIP, align: 'right' })
      ),
    })
  );

  assert.match(html, /EOD signals from <strong>20 Nov<\/strong> · Valid for <strong>23 Nov<\/strong> session/);
  assert.match(html, /Prices as of <strong>20 Nov<\/strong>/);
  assert.match(html, /completed NSE daily candles \(3:30 PM close\) to avoid mid-day repainting/);
});

test('IntradayResultsSection renders empty-open CTA, recency pills, live R:R, muted completed rows, and status_badge_text fallback', () => {
  const emptyOpenHtml = renderToStaticMarkup(
    React.createElement(IntradayResultsSectionCmp, {
      isMarketOpen: true,
      data: { session_date: '2026-11-23', signals: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] },
      rows: [],
      visibleRows: [],
      loading: false,
      minConfidence: 50,
      setMinConfidence: () => {},
      statusFilter: 'OPEN',
      setStatusFilter: () => {},
      counts: { ALL: 3, OPEN: 0, CLOSED: 3, TARGET: 2 },
      sectors: [],
      sectorFilter: 'ALL',
      setSectorFilter: () => {},
      fetchSignals: () => {},
      resetFilters: () => {},
      selectedSignal: null,
      setSelectedSignal: () => {},
    })
  );
  assert.match(emptyOpenHtml, /No active setups right now — View 3 earlier session outcomes/);

  const mixedSignals = [
    {
      id: 'open-fresh',
      symbol: 'SBIN',
      name: 'State Bank of India',
      confidence_score: 88,
      entry_price: 830,
      entry_time_ist: '2026-11-23 13:15 IST',
      target_exit_price: 845,
      estimated_exit_time_ist: '15:00 IST',
      stop_loss: 822,
      strategy_name: 'VWAP Breakout',
      risk_reward_ratio: 1.7,
      live_risk_reward_ratio: 1.4,
      signal_status: 'LIVE_ACTIVE_ENTRY',
      is_projected_exit: true,
      entry_freshness: 'FRESH',
      minutes_since_entry: 10,
    },
    {
      id: 'open-running',
      symbol: 'BEL',
      name: 'Bharat Electronics',
      confidence_score: 81,
      entry_price: 310,
      entry_time_ist: '2026-11-23 12:45 IST',
      target_exit_price: 318,
      estimated_exit_time_ist: '15:00 IST',
      stop_loss: 306,
      strategy_name: 'Volume Surge',
      risk_reward_ratio: 2.0,
      signal_status: 'FUTURE_OPEN_STATUS',
      status_badge_text: 'Trailing Active',
      is_projected_exit: true,
      entry_freshness: 'IN_PROGRESS',
      minutes_since_entry: 45,
    },
    {
      id: 'closed-morning',
      symbol: 'ITC',
      name: 'ITC Ltd',
      confidence_score: 76,
      entry_price: 488,
      entry_time_ist: '2026-11-23 09:45 IST',
      target_exit_price: 496,
      estimated_exit_time_ist: '14:45 IST',
      actual_exit_price: 496,
      actual_exit_time_ist: '10:30 IST',
      stop_loss: 484,
      strategy_name: 'EMA Pullback',
      risk_reward_ratio: 2.0,
      signal_status: 'COMPLETED_TARGET_HIT',
      is_projected_exit: false,
      pnl_pct: 1.64,
    },
  ];

  const allTabHtml = renderToStaticMarkup(
    React.createElement(IntradayResultsSectionCmp, {
      isMarketOpen: true,
      data: { session_date: '2026-11-23', signals: mixedSignals },
      rows: mixedSignals,
      visibleRows: mixedSignals,
      loading: false,
      minConfidence: 50,
      setMinConfidence: () => {},
      statusFilter: 'ALL',
      setStatusFilter: () => {},
      counts: { ALL: 3, OPEN: 2, CLOSED: 1, TARGET: 1 },
      sectors: [],
      sectorFilter: 'ALL',
      setSectorFilter: () => {},
      fetchSignals: () => {},
      resetFilters: () => {},
      selectedSignal: null,
      setSelectedSignal: () => {},
    })
  );

  assert.match(allTabHtml, /Tracks all 15-min setups triggered since 9:15 AM today/);
  assert.match(allTabHtml, /at 1:15 PM/);
  assert.match(allTabHtml, /sc-recency-pill is-fresh[^>]*>Fresh</);
  assert.match(allTabHtml, /at 12:45 PM/);
  assert.match(allTabHtml, /sc-recency-pill is-running[^>]*>Running · 45m ago</);
  assert.match(allTabHtml, /Now 1\.4x/);
  assert.match(allTabHtml, /Trailing Active/);
  assert.match(allTabHtml, /is-completed-row/);
  // Only the 1 completed row should get is-completed-row (not the 2 open rows)
  assert.equal((allTabHtml.match(/is-completed-row/g) || []).length, 1);
});
