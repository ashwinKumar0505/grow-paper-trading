// Plain-English translations for technical trading jargon.

const STRATEGY_LABELS = [
  [/Multi-Factor High-Conviction/i, 'Many signals agree', 'Several independent bullish checks are all positive at the same time.'],
  [/EMA 20\/50\/200 Golden/i, 'Steady uptrend, small dip', 'Price is above its short, medium and long-term averages and has dipped slightly — a common entry point.'],
  [/MACD Bullish Crossover/i, 'Momentum turning up', 'Buying momentum just turned positive and the trend is getting stronger.'],
  [/RSI Pullback Recovery/i, 'Bouncing back in an uptrend', 'The stock dipped inside a long-term uptrend and is now recovering.'],
  [/20-Day Resistance Breakout/i, 'Broke above recent high', 'Price closed above its highest level of the last 20 days with heavy buying.'],
  [/Bollinger Volatility Squeeze/i, 'Quiet period ending with a jump', 'After a calm, narrow price range, the stock has started moving up sharply.'],
  [/Breakout & 20-EMA Support Retest/i, 'Breakout holding strong', 'The stock broke out, came back to test that level, and held — a sign of strength.'],
  [/Institutional 20D-VWAP Accumulation/i, 'Big buyers stepping in', 'Large investors appear to be steadily buying — price stays above its average traded price.'],
  [/Confirmed Bullish Candlestick/i, 'Strong buying candle', 'Today\'s price candle shows strong buying, backed by higher-than-usual volume.'],
  [/Ascending Triangle/i, 'Pressing against a ceiling', 'Price keeps making higher lows under a fixed ceiling — a breakout may be near.'],
  [/Bullish Engulfing/i, 'Buyers took control', 'Today\'s gain fully covered yesterday\'s fall — buyers overpowered sellers.'],
  [/55-Day Multi-Month Range Breakout/i, 'Broke a 2–3 month high', 'Price moved above the highest level of the last 55 trading days.'],
  [/Bullish Marubozu/i, 'Strong up day', 'The stock rose almost all day with little selling pressure.'],
  [/Double Bottom/i, 'Bounced twice from support', 'Price fell to the same floor twice and bounced — sellers may be exhausted.'],
  [/Morning Star/i, '3-day reversal upward', 'A 3-day candle pattern that often marks the end of a fall.'],
  [/Opening Range & Session VWAP Breakout/i, 'Broke the morning range', 'Price moved above its first-30-minute high and above the day\'s average price.'],
  [/Session VWAP & EMA-9 Institutional Pullback/i, 'Dip to day\'s average, then bounce', 'Price dipped to the day\'s average traded price and bounced back up.'],
  [/Bollinger Expansion & Volume Ignition/i, 'Sudden burst with high volume', 'A sharp move up with a sudden surge in buying volume.'],
];

export function simplifyTerm(name = '') {
  for (const [re, label, help] of STRATEGY_LABELS) {
    if (re.test(name)) return { label, help, original: name };
  }
  const cleaned = String(name)
    .replace(/^Pattern Setup:\s*/i, '')
    .replace(/\s*\((CONFIRMED|FORMING_PROJECTED)\)\s*$/i, '');
  return { label: cleaned, help: name, original: name };
}

export const patternIsForming = (name = '') => /FORMING|PROJECTED/i.test(name);

export const SWING_STATUS = {
  CONFIRMED_SIGNAL: { label: 'Confirmed setup', tone: 'positive', help: 'All backtested pattern and chart analysis conditions are met on the latest daily close.' },
  PROJECTED_SETUP: { label: 'Watchlist setup', tone: 'warning', help: 'Promising chart structure, but wait for breakout confirmation before acting.' },
};

export const INTRADAY_STATUS = {
  LIVE_ACTIVE_ENTRY: { label: 'Active signal', tone: 'info', group: 'open' },
  PROJECTED_EXIT_PENDING: { label: 'Setup open', tone: 'warning', group: 'open' },
  COMPLETED_TARGET_HIT: { label: 'Target reached', tone: 'positive', group: 'closed' },
  COMPLETED_STOP_LOSS_HIT: { label: 'Stop loss hit', tone: 'negative', group: 'closed' },
  COMPLETED_SQUARE_OFF_320PM: { label: 'Closed at 3:20 PM', tone: 'neutral', group: 'closed' },
};

export const RECOMMENDATION = {
  BUY: { label: 'Bullish recommendation', tone: 'positive' },
  WAIT: { label: 'Wait and watch', tone: 'warning' },
  AVOID: { label: 'Avoid for now', tone: 'negative' },
};

export const OUTLOOK_LABEL = (v = '') =>
  ({
    STRONG_BULLISH: 'Strongly rising',
    BULLISH: 'Rising',
    NEUTRAL: 'Sideways',
    BEARISH: 'Falling',
    STRONG_BEARISH: 'Strongly falling',
  }[v] || v.replace(/_/g, ' ').toLowerCase());

export const SIGNAL_WORD = { BULLISH: 'Positive', BEARISH: 'Negative', NEUTRAL: 'Neutral' };
