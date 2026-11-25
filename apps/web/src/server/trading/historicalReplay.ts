import type { ChartPoint, Exchange, PlaceOrderInput, Stock } from '../../types/market';
import { getIndianMarketStatus, type MarketCalendarConfig } from '../../utils/marketHours';
import { processOrderQueue, roundToTick, submitOrder, type OrderBookState } from '../../utils/orderEngine';

export interface HistoricalReplaySession {
  sessionId: string;
  userId: string;
  symbol: string;
  exchange: Exchange;
  stockName: string;
  /** Complete historical candle series sorted chronologically */
  allCandles: ChartPoint[];
  /** Current simulation clock timestamp (ms). Only candles with timestamp <= simulationClockMs are visible/eligible! */
  simulationClockMs: number;
  /** Isolated replay order book — never mixed with current-market paper trading ledger */
  orderBook: OrderBookState;
  calendar?: MarketCalendarConfig;
}

export function createHistoricalReplaySession(params: {
  sessionId: string;
  userId: string;
  symbol: string;
  stockName?: string;
  exchange?: Exchange;
  candles: ChartPoint[];
  initialClockMs: number;
  startingCash?: number;
  calendar?: MarketCalendarConfig;
}): HistoricalReplaySession {
  const sorted = [...params.candles]
    .filter((c) => Number.isFinite(c.timestamp) && Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    sessionId: params.sessionId,
    userId: params.userId,
    symbol: params.symbol.toUpperCase(),
    exchange: params.exchange || 'NSE',
    stockName: params.stockName || params.symbol.toUpperCase(),
    allCandles: sorted,
    simulationClockMs: params.initialClockMs,
    orderBook: {
      balance: params.startingCash ?? 100000,
      holdings: [],
      positions: [],
      orders: [],
      executedOrderKeys: [],
    },
    calendar: params.calendar,
  };
}

/**
 * Returns only historical candles up to and including `session.simulationClockMs`.
 * Strictly prevents look-ahead bias: future candles after `simulationClockMs` are never accessible.
 */
export function getVisibleReplayCandles(session: HistoricalReplaySession): ChartPoint[] {
  return session.allCandles.filter((c) => c.timestamp <= session.simulationClockMs);
}

/**
 * Builds an eligible synthetic replay quote strictly from the latest historical candle at `simulationClockMs`.
 * Never mixes current live market prices with historical replay execution prices.
 */
export function buildReplayQuoteAtClock(session: HistoricalReplaySession): Stock | null {
  const visible = getVisibleReplayCandles(session);
  if (visible.length === 0) return null;

  const latest = visible[visible.length - 1];
  const first = visible[0];
  const prevClose = first.open > 0 ? first.open : latest.open;
  const price = latest.close;
  const change = Number((price - prevClose).toFixed(2));
  const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

  return {
    symbol: session.symbol,
    name: session.stockName,
    sector: 'Historical Replay',
    exchange: session.exchange,
    price: Number(price.toFixed(2)),
    previousClose: Number(prevClose.toFixed(2)),
    change,
    changePercent,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    volume: latest.volume,
    week52High: Math.max(...visible.map((c) => c.high)),
    week52Low: Math.min(...visible.map((c) => c.low)),
    lowerCircuit: roundToTick(prevClose * 0.8),
    upperCircuit: roundToTick(prevClose * 1.2),
    fundamentals: {
      available: false, source: 'historical_replay', marketCap: null, peRatio: null, pbRatio: null,
      industryPe: null, debtToEquity: null, roe: null, divYield: null, eps: null, bookValue: null,
    },
    about: 'Historical replay simulation instrument',
    sparkline: visible.slice(-10).map((c) => c.close),
    quoteTimestamp: latest.timestamp,
    fetchedAt: session.simulationClockMs,
    freshness: 'LIVE',
    isTradableQuote: true,
    isStale: false,
    providerAvailable: true,
  };
}

export function submitHistoricalReplayOrder(
  session: HistoricalReplaySession,
  input: Omit<PlaceOrderInput, 'symbol' | 'stockName' | 'exchange'> & {
    symbol?: string;
    stockName?: string;
    exchange?: Exchange;
  }
) {
  const symbol = (input.symbol || session.symbol).toUpperCase();
  if (symbol !== session.symbol) {
    return {
      success: false,
      message: `Historical replay session is scoped to ${session.symbol}; cannot mix ${symbol}.`,
      session,
    };
  }

  const replayQuote = buildReplayQuoteAtClock(session);
  if (!replayQuote) {
    return {
      success: false,
      message: 'No historical candle is available at or before the current replay simulation clock.',
      session,
    };
  }

  const replayMarketStatus = {
    ...getIndianMarketStatus(session.simulationClockMs, session.calendar),
    isOpen: true,
  };

  const res = submitOrder(
    session.orderBook,
    { ...input, symbol: session.symbol, stockName: session.stockName, exchange: session.exchange },
    { stock: replayQuote, now: session.simulationClockMs, marketStatus: replayMarketStatus, calendar: session.calendar }
  );

  return { ...res, session: { ...session, orderBook: res.state } };
}

/**
 * Advances the historical replay clock to `nextClockMs`, stepping chronologically through each
 * newly revealed historical candle in order so limit/stop orders trigger at the exact historical bar.
 */
export function advanceHistoricalReplayClock(
  session: HistoricalReplaySession,
  nextClockMs: number
): HistoricalReplaySession {
  if (nextClockMs <= session.simulationClockMs) return session;

  const steppingCandles = session.allCandles.filter(
    (c) => c.timestamp > session.simulationClockMs && c.timestamp <= nextClockMs
  );

  let currentSession: HistoricalReplaySession = { ...session };
  for (const bar of steppingCandles) {
    currentSession = { ...currentSession, simulationClockMs: bar.timestamp };
    const quoteAtBar = buildReplayQuoteAtClock(currentSession);
    if (!quoteAtBar) continue;

    const replayMarketStatus = {
      ...getIndianMarketStatus(bar.timestamp, currentSession.calendar),
      isOpen: true,
    };
    const queueRes = processOrderQueue(currentSession.orderBook, {
      quotes: { [currentSession.symbol]: quoteAtBar },
      now: bar.timestamp,
      marketStatus: replayMarketStatus,
      calendar: currentSession.calendar,
    });
    if (queueRes.changed) {
      currentSession = { ...currentSession, orderBook: queueRes.state };
    }
  }

  return { ...currentSession, simulationClockMs: nextClockMs };
}
