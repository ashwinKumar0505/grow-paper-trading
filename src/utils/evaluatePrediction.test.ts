import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateQuizPrediction } from '../features/quiz/utils/evaluatePrediction';
import { generateScenario } from '../features/quiz/utils/dataGenerator';

test('evaluateQuizPrediction scores bullish and bearish outcomes accurately', () => {
  const scenario = generateScenario();
  const entry = scenario.candles[scenario.setupCount - 1].close;
  const exit = scenario.candles[scenario.candles.length - 1].close;
  const isMarketUp = exit > entry;

  const buyEval = evaluateQuizPrediction(scenario, 'BUY', 1000);
  const sellEval = evaluateQuizPrediction(scenario, 'SELL', 1000);

  assert.equal(buyEval.entryPrice, entry);
  assert.equal(buyEval.exitPrice, exit);
  assert.equal(buyEval.isWin, isMarketUp);
  assert.equal(sellEval.isWin, exit < entry);
  assert.ok(Math.abs(buyEval.tradePnlPct + sellEval.tradePnlPct) < 1e-9);
});
