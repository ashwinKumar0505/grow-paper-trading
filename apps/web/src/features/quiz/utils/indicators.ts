import { Candle } from '../types/trading';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }

    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let previousEMA: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (previousEMA === null) {
      // First EMA is SMA of initial period
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[j].close;
      }
      previousEMA = sum / period;
      result.push(previousEMA);
    } else {
      const currentEMA: number = (close - previousEMA) * multiplier + previousEMA;
      result.push(currentEMA);
      previousEMA = currentEMA;
    }
  }

  return result;
}

/**
 * Calculates Relative Strength Index (RSI) - Wilder's smoothed method
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length <= period) {
    return candles.map(() => null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First values
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain += diff;
    } else {
      avgLoss += Math.abs(diff);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Add nulls for values before period
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  const initialRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const initialRSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + initialRS));
  result.push(initialRSI);

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }

  return result;
}

/**
 * Calculate key horizontal support and resistance levels from recent swing pivots
 */
export function detectKeyLevels(candles: Candle[], lookback: number = 40): { support: number; resistance: number } {
  const recent = candles.slice(-lookback);
  let highest = -Infinity;
  let lowest = Infinity;

  recent.forEach(c => {
    if (c.high > highest) highest = c.high;
    if (c.low < lowest) lowest = c.low;
  });

  return {
    support: lowest,
    resistance: highest,
  };
}
