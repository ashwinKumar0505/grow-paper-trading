import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileQuizBar } from '../features/quiz/components/MobileQuizBar';
import { StockAnalysisBanner } from '../features/virtual-trading/components/StockAnalysisBanner';
import { StockDepth } from '../features/virtual-trading/components/StockDepth';
import { StockFundamentals } from '../features/virtual-trading/components/StockFundamentals';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import type { Stock } from '../types/market';
import type { ChartScenario } from '../features/quiz/types/trading';

const MOCK_SCENARIO: ChartScenario = {
  id: 'sc_1',
  assetSymbol: 'ITC',
  assetName: 'ITC Ltd.',
  assetType: 'Equities',
  timeframe: 'Daily candles',
  patternName: 'Double Bottom',
  patternCategory: 'Reversal',
  difficulty: 'Beginner',
  candles: [],
  setupCount: 80,
  outcomeCount: 20,
  supportLevel: 428.7,
  resistanceLevel: 442.85,
  explanation: 'Bullish reversal.',
  expectedDirection: 'BUY',
  keyObservation: 'Support bounce at double bottom.',
  proTip: 'Wait for neckline confirmation.',
};

const MOCK_STOCK: Stock = {
  symbol: 'INFY',
  name: 'Infosys Ltd.',
  sector: 'Information Technology',
  exchange: 'NSE',
  price: 1103.4,
  previousClose: 1098,
  change: 5.4,
  changePercent: 0.49,
  open: 1114.1,
  high: 1132.4,
  low: 1100,
  close: 1103.4,
  volume: 12339881,
  week52High: 1991.45,
  week52Low: 1100,
  fundamentals: {
    available: true,
    source: 'Upstox Company Fundamentals',
    marketCap: '₹4,44,951 Cr',
    peRatio: 14.45,
    pbRatio: 4.72,
    industryPe: 1.25,
    debtToEquity: null,
    roe: 31.03,
    roce: 38.29,
    roa: 18.83,
    divYield: 4.62,
    eps: 76.36,
    bookValue: 233.77,
  },
  about: 'Infosys Limited is an India-based IT consulting and services company.',
  sparkline: [1098, 1103.4],
};

test('MobileQuizBar keeps chart options collapsed by default and shows compact trade HUD', () => {
  const html = renderToStaticMarkup(
    React.createElement(MobileQuizBar, {
      mode: 'quiz',
      difficulty: 'Beginner',
      scenario: MOCK_SCENARIO,
      tradeNumber: 2,
      quizStats: { totalQuestions: 2, correctAnswers: 1, currentStreak: 1, bestStreak: 1, recentResults: [false, true] },
      survivalState: { lives: 3, maxLives: 3, streak: 0, bestStreak: 0, score: 0, isGameOver: false, roundsSurvived: 0 },
      tournamentState: { currentRound: 1, totalRounds: 10, balance: 10000, startingBalance: 10000, trades: [], isCompleted: false },
      indicatorSettings: { showEma20: true, showSma50: false, showVolume: true, showRsi: false, showLevels: true },
      onToggleIndicator: () => {},
      chartType: 'candle',
      onToggleChartType: () => {},
      onOpenModeSelect: () => {},
      onOpenHistory: () => {},
      onOpenGuide: () => {},
    })
  );

  assert.match(html, /#2 ITC/);
  assert.match(html, /1\/2/);
  assert.match(html, /Options/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /id="mobile-quiz-options-panel"/);
  assert.doesNotMatch(html, /Momentum \(RSI\)/);
});

test('StockDepth renders live 5-level bids/asks, handles empty post-session Upstox order book, and keeps unavailable fallback', () => {
  const liveHtml = renderToStaticMarkup(
    React.createElement(StockDepth, {
      planConfig: SUBSCRIPTION_PLANS.advanced,
      marketStatus: { isOpen: false } as never,
      marketDepth: {
        available: true,
        source: 'upstox',
        bids: [{ price: 0, orders: 0, quantity: 0 }],
        asks: [{ price: 1103.4, orders: 34, quantity: 6480 }],
        totalBuyQty: 0,
        totalSellQty: 6480,
      },
    })
  );
  assert.match(liveHtml, /Top 5 Bids &amp; Asks · Last Session/);
  assert.match(liveHtml, /₹1103\.40/);
  assert.match(liveHtml, /6,480/);
  assert.doesNotMatch(liveHtml, /₹0\.00/);

  const emptyUpstoxHtml = renderToStaticMarkup(
    React.createElement(StockDepth, {
      planConfig: SUBSCRIPTION_PLANS.advanced,
      marketStatus: { isOpen: false } as never,
      marketDepth: {
        available: false,
        source: 'upstox',
        reason: 'No active resting bids or asks in the NSE order book right now.',
        bids: [],
        asks: [],
        totalBuyQty: 0,
        totalSellQty: 0,
      },
    })
  );
  assert.match(emptyUpstoxHtml, /No Active Resting Orders/);
  assert.match(emptyUpstoxHtml, /Order Book Empty/);
});

test('StockFundamentals renders authentic Upstox ratios and hides unavailable notice', () => {
  const html = renderToStaticMarkup(
    React.createElement(StockFundamentals, {
      stock: MOCK_STOCK,
      fundamentals: MOCK_STOCK.fundamentals,
      aboutText: MOCK_STOCK.about,
    })
  );

  assert.match(html, /Upstox Company Fundamentals/);
  assert.match(html, /₹4,44,951 Cr/);
  assert.match(html, /14\.45/);
  assert.match(html, /31\.03%/);
  assert.match(html, /38\.29%/);
  assert.match(html, /18\.83%/);
  assert.match(html, /₹76\.36/);
  assert.match(html, /₹233\.77/);
  assert.match(html, /4\.62%/);
  assert.doesNotMatch(html, /Live fundamental ratios are not provided/);
});

test('StockAnalysisBanner renders backtested chart strategy CTA for the active stock', () => {
  const html = renderToStaticMarkup(React.createElement(StockAnalysisBanner, { stock: MOCK_STOCK }));

  assert.match(html, /Backtested Chart Strategies/);
  assert.match(html, /Analyse INFY using our backtested chart strategies/);
  assert.match(html, /AI Powered/);
  assert.match(html, /2-Year Strategy Backtests/);
  assert.match(html, /Open Stock Analysis/);
});
