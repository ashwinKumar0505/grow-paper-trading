import type { ChartScenario, TradeDirection } from '../types/trading';

export interface PredictionEvaluation {
  entryPrice: number;
  exitPrice: number;
  rawPriceChangePct: number;
  tradePnlPct: number;
  tradePnl: number;
  isWin: boolean;
}

/** Shared prediction evaluation used by both the full Guess the Chart quiz and landing preview. */
export function evaluateQuizPrediction(
  scenario: ChartScenario,
  direction: TradeDirection,
  positionSize: number = 1000
): PredictionEvaluation {
  const entryPrice = scenario.candles[scenario.setupCount - 1].close;
  const exitPrice = scenario.candles[scenario.candles.length - 1].close;
  const rawPriceChangePct = ((exitPrice - entryPrice) / entryPrice) * 100;
  const isWin = direction === 'BUY' ? rawPriceChangePct > 0 : rawPriceChangePct < 0;
  const tradePnlPct = direction === 'BUY' ? rawPriceChangePct : -rawPriceChangePct;
  const tradePnl = positionSize * (tradePnlPct / 100);

  return {
    entryPrice,
    exitPrice,
    rawPriceChangePct,
    tradePnlPct,
    tradePnl,
    isWin,
  };
}
