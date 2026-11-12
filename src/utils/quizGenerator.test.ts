import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSETS, PATTERN_TEMPLATES, generatePatternExample } from '../features/quiz/utils/dataGenerator';

test('all pattern examples have finite, bounded OHLC prices across every asset', () => {
  const originalRandom = Math.random;
  let seed = 42;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    for (const pattern of PATTERN_TEMPLATES) {
      for (const asset of ASSETS) {
        const example = generatePatternExample(pattern.name, asset.symbol);
        assert.equal(example.candles.length, example.setupCount + example.outcomeCount);
        assert(example.setupCount > 0 && example.outcomeCount > 0);
        for (const candle of example.candles) {
          const message = `${pattern.name}, ${asset.symbol}, candle ${candle.time}`;
          assert([candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite), message);
          assert(candle.low > asset.basePrice * 0.1 && candle.high < asset.basePrice * 3, message);
          assert(candle.low <= Math.min(candle.open, candle.close), message);
          assert(candle.high >= Math.max(candle.open, candle.close), message);
          assert(candle.volume >= 0, message);
        }
      }
    }
  } finally {
    Math.random = originalRandom;
  }
});
