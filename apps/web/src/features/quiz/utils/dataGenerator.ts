import { Candle, ChartScenario, DifficultyLevel, PatternCategory, PatternFocus, TradeDirection } from '../types/trading';

export interface PatternTemplate {
  name: string;
  category: PatternCategory;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  expectedDirection: TradeDirection;
  simpleName: string;
  cheatSheetGroup: 'Reversal' | 'Continuation' | 'Bilateral' | 'Special';
  entryRule: string;
  stopLossRule: string;
  targetRule: string;
  explanation: string;
  keyObservation: string;
  proTip: string;
  generator: (basePrice: number, baseVol: number) => {
    setupCandles: Candle[];
    outcomeCandles: Candle[];
    supportLevel?: number;
    resistanceLevel?: number;
  };
}

// Reference prices are fixed simulation seeds, never live quotes.
export const ASSETS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'Equities' as const, basePrice: 1400 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'Equities' as const, basePrice: 3500 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'Equities' as const, basePrice: 1700 },
  { symbol: 'INFY', name: 'Infosys', type: 'Equities' as const, basePrice: 1600 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'Equities' as const, basePrice: 1200 },
  { symbol: 'SBIN', name: 'State Bank of India', type: 'Equities' as const, basePrice: 800 },
  { symbol: 'ITC', name: 'ITC', type: 'Equities' as const, basePrice: 400 },
  { symbol: 'LT', name: 'Larsen & Toubro', type: 'Equities' as const, basePrice: 3400 },
];

const TIMEFRAMES = ['5-minute candles', '15-minute candles', '1-hour candles', 'Daily candles'];

// Helper to create a single candle
function createCandle(
  time: number,
  open: number,
  close: number,
  volatility: number,
  volumeBase: number,
  directionBias: number = 0
): Candle {
  const change = close - open;
  
  // Create realistic wicks
  const upperExt = Math.abs(open * volatility * (Math.random() * 0.8 + 0.2));
  const lowerExt = Math.abs(open * volatility * (Math.random() * 0.8 + 0.2));

  const high = Math.max(open, close) + upperExt;
  const low = Math.min(open, close) - lowerExt;

  const barSize = Math.abs(change) / (open * volatility + 0.0001);
  const volumeMultiplier = Math.max(0.4, 0.7 + barSize * 0.6 + Math.random() * 0.5 + directionBias * 0.3);
  const volume = Math.round(volumeBase * volumeMultiplier);

  return {
    time,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume,
  };
}

// Helper to simulate a series of candles
function generateSegment(
  startPrice: number,
  count: number,
  driftPerCandle: number,
  volatility: number,
  baseVol: number,
  startTimeIndex: number,
  meanReversionTarget?: number
): { candles: Candle[]; endPrice: number } {
  const candles: Candle[] = [];
  let currentPrice = startPrice;

  for (let i = 0; i < count; i++) {
    const time = startTimeIndex + i;
    const open = currentPrice;
    
    let drift = driftPerCandle;
    if (meanReversionTarget !== undefined) {
      const distance = meanReversionTarget - open;
      // Drift is a percentage; normalize the absolute price distance first.
      drift += (distance / open) * 0.04;
    }

    const randomShock = (Math.random() - 0.48) * open * volatility;
    const close = Math.max(open * 0.2, open + open * drift + randomShock);

    const candle = createCandle(time, open, close, volatility, baseVol);
    candles.push(candle);
    currentPrice = close;
  }

  return { candles, endPrice: currentPrice };
}

// Complete Comprehensive Pattern Library covering ALL 15 Canonical Patterns from the Cheat Sheet
export const PATTERN_TEMPLATES: PatternTemplate[] = [
  // =========================================================================
  // 1. REVERSAL PATTERNS (Direct from Cheat Sheet: 6 Core Patterns)
  // =========================================================================
  {
    name: 'Double Top (Bearish Reversal)',
    simpleName: 'Double Top "M" (Goes DOWN)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Beginner',
    expectedDirection: 'SELL',
    entryRule: 'Sell on the candle close breaking beneath the horizontal neckline support.',
    stopLossRule: 'Place stop loss just above the neckline or right peak high.',
    targetRule: 'Target equals the vertical distance from peak to neckline, projected downwards.',
    explanation: 'Price surged up to a resistance ceiling, retreated to establish a neckline support, and then pushed back up to the same ceiling. For the second time, buyers were turned away at the identical resistance. Once the neckline breaks, the "M" pattern triggers a steep fall.',
    keyObservation: 'Notice tall upper rejection wicks on both peaks and declining trading volume on the second rally.',
    proTip: 'When price touches the same ceiling twice and gets pushed back down, sellers take over and the floor is next to snap.',
    generator: (basePrice, baseVol) => {
      const leg1 = generateSegment(basePrice, 28, 0.0028, 0.008, baseVol, 1);
      const firstHigh = leg1.endPrice;
      const valley = generateSegment(firstHigh, 20, -0.0024, 0.007, baseVol * 0.9, 29);
      const valleyLow = valley.endPrice;
      const leg2 = generateSegment(valleyLow, 22, 0.0022, 0.006, baseVol * 0.75, 49, firstHigh);
      const stall = generateSegment(leg2.endPrice, 10, -0.0018, 0.006, baseVol * 1.1, 71);

      const setupCandles = [...leg1.candles, ...valley.candles, ...leg2.candles, ...stall.candles];
      const outcome = generateSegment(stall.endPrice, 20, -0.0045, 0.009, baseVol * 2.2, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: valleyLow,
        resistanceLevel: firstHigh,
      };
    },
  },
  {
    name: 'Head and Shoulders (Bearish Reversal)',
    simpleName: 'Head and Shoulders (Goes DOWN)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Intermediate',
    expectedDirection: 'SELL',
    entryRule: 'Sell when price breaks and closes decisively below the neckline floor.',
    stopLossRule: 'Place stop loss directly above the high of the right shoulder.',
    targetRule: 'Measure the height from the highest point of the head to the neckline, projected down.',
    explanation: 'A climber reaches a first peak (left shoulder), powers up to a highest summit (the head), but on the third attempt can only reach a weaker peak (right shoulder). Buyers are exhausted, and once the neckline cracks, the bottom falls out.',
    keyObservation: 'The right shoulder is noticeably lower than the head summit, proving buyer momentum has dried up.',
    proTip: 'Head & Shoulders is one of the most reliable macro reversal structures across all financial markets.',
    generator: (basePrice, baseVol) => {
      const lsUp = generateSegment(basePrice, 14, 0.0025, 0.007, baseVol, 1);
      const lsDown = generateSegment(lsUp.endPrice, 12, -0.0022, 0.006, baseVol, 15);
      const headUp = generateSegment(lsDown.endPrice, 15, 0.0035, 0.008, baseVol * 1.3, 27);
      const headDown = generateSegment(headUp.endPrice, 14, -0.0034, 0.008, baseVol * 1.2, 42);
      const rsUp = generateSegment(headDown.endPrice, 12, 0.002, 0.006, baseVol * 0.7, 56);
      const rsDown = generateSegment(rsUp.endPrice, 14, -0.0025, 0.007, baseVol * 0.8, 68);

      const setupCandles = [...lsUp.candles, ...lsDown.candles, ...headUp.candles, ...headDown.candles, ...rsUp.candles, ...rsDown.candles];
      const neckline = Math.min(lsDown.endPrice, headDown.endPrice);
      const outcome = generateSegment(rsDown.endPrice, 20, -0.0042, 0.009, baseVol * 2.2, 82);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: neckline,
        resistanceLevel: headUp.endPrice,
      };
    },
  },
  {
    name: 'Rising Wedge - Reversal (Bearish)',
    simpleName: 'Rising Wedge Reversal (Goes DOWN)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Intermediate',
    expectedDirection: 'SELL',
    entryRule: 'Sell as soon as a candle closes under the lower ascending trendline.',
    stopLossRule: 'Place stop loss just above the highest peak inside the wedge.',
    targetRule: 'Target the opening low price where the wedge first originated.',
    explanation: 'After an extended uptrend, price continues to push to higher highs and higher lows, but inside narrowing ascending trendlines. The slope of the highs is slowing down while lows are rising faster. The upward momentum is suffocating until a steep drop breaks through.',
    keyObservation: 'Volume steadily dries up as price wedges higher, indicating diminishing buyer participation.',
    proTip: 'A rising wedge formed after an uptrend is a classic bearish reversal signal waiting to snap.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let curr = basePrice;
      const totalCandles = 80;

      for (let i = 0; i < totalCandles; i++) {
        const progress = i / totalCandles;
        // Upper line slopes up gently, lower line slopes up faster (converging)
        const upper = basePrice * (1.02 + progress * 0.05);
        const lower = basePrice * (0.98 + progress * 0.075);
        const open = curr;
        const target = (Math.sin(i * 0.38) > 0) ? upper * 0.998 : lower * 1.002;
        const step = (target - open) * 0.3 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.min(upper * 1.002, Math.max(lower * 0.998, open + step));
        const vol = baseVol * (1 - progress * 0.45);
        candles.push(createCandle(i + 1, open, close, 0.0055, vol));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, -0.0046, 0.009, baseVol * 2.4, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: basePrice * 1.035,
        resistanceLevel: basePrice * 1.065,
      };
    },
  },
  {
    name: 'Double Bottom (Bullish Reversal)',
    simpleName: 'Double Bottom "W" (Goes UP)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Beginner',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price breaks and closes above the central neckline resistance peak.',
    stopLossRule: 'Place stop loss below the neckline or under the lowest trough wicks.',
    targetRule: 'Target equals the vertical height from trough to neckline, projected upwards.',
    explanation: 'Price dropped to a low point, bounced to form a neckline peak, and dropped back down to the exact same price floor. Sellers tried twice to break lower and failed both times! Seeing the support hold firm, buyers rush in and complete a "W" recovery.',
    keyObservation: 'Long wicks sticking out of the bottom show buyers instantly defending that exact price level whenever it is tested.',
    proTip: 'A price floor that holds twice is twice as trustworthy as one tested only once.',
    generator: (basePrice, baseVol) => {
      const leg1 = generateSegment(basePrice, 30, -0.0025, 0.008, baseVol, 1);
      const firstLow = leg1.endPrice;
      const neckline = generateSegment(firstLow, 20, 0.0022, 0.007, baseVol * 1.1, 31);
      const neckPrice = neckline.endPrice;
      const leg2 = generateSegment(neckPrice, 25, -0.0018, 0.006, baseVol * 0.8, 51, firstLow);
      const push = generateSegment(leg2.endPrice, 10, 0.002, 0.006, baseVol * 1.2, 76);

      const setupCandles = [...leg1.candles, ...neckline.candles, ...leg2.candles, ...push.candles];
      const outcome = generateSegment(push.endPrice, 20, 0.0035, 0.008, baseVol * 1.9, 86);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: firstLow,
        resistanceLevel: neckPrice,
      };
    },
  },
  {
    name: 'Inverse Head and Shoulders (Bullish Reversal)',
    simpleName: 'Inverse Head & Shoulders (Goes UP)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Intermediate',
    expectedDirection: 'BUY',
    entryRule: 'Buy upon a candle close breaking out above the neckline resistance ceiling.',
    stopLossRule: 'Place stop loss just below the lowest wick of the right shoulder.',
    targetRule: 'Measure the distance from the head trough to the neckline, projected up from breakout.',
    explanation: 'The mirror image of Head & Shoulders: an initial drop forms the left shoulder, a deeper capitulation low forms the head, and a higher low forms the right shoulder. Sellers are unable to push price to new lows, handing control to eager bulls.',
    keyObservation: 'The right shoulder bottoms higher than the middle head, displaying an undeniable shift in market power.',
    proTip: 'Always wait for a candle body close above the neckline before entering—premature entries often get trapped.',
    generator: (basePrice, baseVol) => {
      const lsDown = generateSegment(basePrice, 14, -0.0025, 0.007, baseVol, 1);
      const lsUp = generateSegment(lsDown.endPrice, 12, 0.0022, 0.006, baseVol, 15);
      const headDown = generateSegment(lsUp.endPrice, 15, -0.0035, 0.008, baseVol * 1.4, 27);
      const headUp = generateSegment(headDown.endPrice, 14, 0.0034, 0.008, baseVol * 1.3, 42);
      const rsDown = generateSegment(headUp.endPrice, 12, -0.0018, 0.006, baseVol * 0.7, 56);
      const rsUp = generateSegment(rsDown.endPrice, 14, 0.0026, 0.007, baseVol * 0.9, 68);

      const setupCandles = [...lsDown.candles, ...lsUp.candles, ...headDown.candles, ...headUp.candles, ...rsDown.candles, ...rsUp.candles];
      const neckline = Math.max(lsUp.endPrice, headUp.endPrice);
      const outcome = generateSegment(rsUp.endPrice, 20, 0.0042, 0.009, baseVol * 2.3, 82);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: headDown.endPrice,
        resistanceLevel: neckline,
      };
    },
  },
  {
    name: 'Falling Wedge - Reversal (Bullish)',
    simpleName: 'Falling Wedge Reversal (Goes UP)',
    cheatSheetGroup: 'Reversal',
    category: 'Reversal',
    difficulty: 'Intermediate',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price breaks and closes above the descending resistance trendline.',
    stopLossRule: 'Place stop loss just below the lowest wick of the wedge structure.',
    targetRule: 'Target the opening top price where the falling wedge pattern began.',
    explanation: 'In a persistent downtrend, price slopes down between converging trendlines. Lower highs and lower lows continue, but the lower boundary is flattening out while upper highs collapse faster. Sellers lose momentum until buyers explosively break free upwards.',
    keyObservation: 'Notice how each downward wave produces less downside progress, signaling seller exhaustion.',
    proTip: 'Look for a surge in green volume on the breakout candle to confirm institutional accumulation.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let curr = basePrice;
      const totalCandles = 80;

      for (let i = 0; i < totalCandles; i++) {
        const progress = i / totalCandles;
        // Upper line drops faster, lower line drops slower (converging downwards)
        const upper = basePrice * (1.02 - progress * 0.07);
        const lower = basePrice * (0.97 - progress * 0.045);
        const open = curr;
        const target = (Math.sin(i * 0.38) > 0) ? upper * 0.998 : lower * 1.002;
        const step = (target - open) * 0.3 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.max(lower * 0.998, Math.min(upper * 1.002, open + step));
        const vol = baseVol * (1 - progress * 0.45);
        candles.push(createCandle(i + 1, open, close, 0.0055, vol));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0045, 0.009, baseVol * 2.4, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: basePrice * 0.93,
        resistanceLevel: basePrice * 0.97,
      };
    },
  },

  // =========================================================================
  // 2. CONTINUATION PATTERNS (Direct from Cheat Sheet: 6 Core Patterns)
  // =========================================================================
  {
    name: 'Falling Wedge - Continuation (Bullish)',
    simpleName: 'Falling Wedge Continuation (Goes UP)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Intermediate',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price breaks out above the upper descending trendline.',
    stopLossRule: 'Place stop loss just below the lower trendline of the wedge.',
    targetRule: 'Measure the prior uptrend flagpole and project it upward from the breakout point.',
    explanation: 'A strong uptrend takes a breather in a gentle, downward-sloping converging wedge. This represents orderly profit taking rather than aggressive selling. Once the pullback finishes coiling, the original uptrend powerfully resumes.',
    keyObservation: 'The wedge slopes against the prevailing uptrend, and volume steadily declines during the consolidation.',
    proTip: 'When a falling wedge appears inside an established bull trend, it has one of the highest continuation win-rates in technical analysis.',
    generator: (basePrice, baseVol) => {
      const pole = generateSegment(basePrice, 25, 0.0042, 0.009, baseVol * 1.8, 1);
      const wedgeStart = pole.endPrice;
      const candles: Candle[] = [...pole.candles];
      let curr = wedgeStart;

      for (let i = 0; i < 55; i++) {
        const progress = i / 55;
        const upper = wedgeStart * (1.00 - progress * 0.045);
        const lower = wedgeStart * (0.97 - progress * 0.03);
        const open = curr;
        const target = (Math.sin(i * 0.4) > 0) ? upper : lower;
        const step = (target - open) * 0.28 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.max(lower * 0.998, Math.min(upper * 1.002, open + step));
        candles.push(createCandle(26 + i, open, close, 0.005, baseVol * 0.7));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0042, 0.008, baseVol * 2.2, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: wedgeStart * 0.945,
        resistanceLevel: wedgeStart * 0.98,
      };
    },
  },
  {
    name: 'Bullish Rectangle Consolidation',
    simpleName: 'Bullish Rectangle (Goes UP)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Beginner',
    expectedDirection: 'BUY',
    entryRule: 'Buy on a candle close breaking out above the horizontal resistance ceiling.',
    stopLossRule: 'Place stop loss beneath the horizontal support floor of the rectangle.',
    targetRule: 'Target equals the vertical height of the rectangular consolidation box projected up.',
    explanation: 'After a decisive upward rally, price pauses in a well-defined horizontal trading box bounded by parallel support and resistance lines. Buyers absorb all sellers at the floor while continually knocking on the ceiling until a breakout occurs.',
    keyObservation: 'Clear horizontal boundary touches on both floor and ceiling without violating either level.',
    proTip: 'Wait for a clean breakout candle above the resistance box to avoid getting chopped inside the range.',
    generator: (basePrice, baseVol) => {
      const pole = generateSegment(basePrice, 20, 0.0045, 0.008, baseVol * 1.7, 1);
      const boxCeiling = pole.endPrice;
      const boxFloor = pole.endPrice * 0.97;
      const candles: Candle[] = [...pole.candles];
      let curr = boxCeiling;

      for (let i = 0; i < 60; i++) {
        const open = curr;
        const target = (Math.sin(i * 0.32) > 0) ? boxCeiling * 0.998 : boxFloor * 1.002;
        const step = (target - open) * 0.28 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.max(boxFloor * 0.998, Math.min(boxCeiling * 1.002, open + step));
        candles.push(createCandle(21 + i, open, close, 0.005, baseVol * 0.8));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0044, 0.008, baseVol * 2.3, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: boxFloor,
        resistanceLevel: boxCeiling,
      };
    },
  },
  {
    name: 'Bullish Pennant (Rocket & Pennant)',
    simpleName: 'Bullish Pennant (Goes UP)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Beginner',
    expectedDirection: 'BUY',
    entryRule: 'Buy upon breakout above the upper converging trendline of the pennant.',
    stopLossRule: 'Place stop loss just below the lowest wick of the pennant apex.',
    targetRule: 'Project the full vertical length of the preceding flagpole upward from breakout.',
    explanation: 'A vertical, rocket-like surge forms the flagpole, followed by an ultra-tight symmetrical converging triangle (the pennant). Volatility contracts dramatically as both sides pause, before buyers detonate another explosive leg up.',
    keyObservation: 'The pennant forms very quickly (typically under 20-30 bars) with dramatic volume shrinkage.',
    proTip: 'The sharper the flagpole surge, the more explosive the pennant breakout tends to be.',
    generator: (basePrice, baseVol) => {
      const base = generateSegment(basePrice, 20, 0.0004, 0.006, baseVol, 1);
      const pole = generateSegment(base.endPrice, 20, 0.0055, 0.01, baseVol * 2.2, 21);
      const apexCenter = pole.endPrice;
      const candles: Candle[] = [...base.candles, ...pole.candles];
      let curr = apexCenter;

      for (let i = 0; i < 40; i++) {
        const progress = i / 40;
        const halfWidth = apexCenter * 0.025 * (1 - progress * 0.85);
        const upper = apexCenter + halfWidth;
        const lower = apexCenter - halfWidth;
        const open = curr;
        const target = (Math.sin(i * 0.55) > 0) ? upper : lower;
        const step = (target - open) * 0.35 + (Math.random() - 0.48) * open * 0.003;
        const close = Math.max(lower, Math.min(upper, open + step));
        candles.push(createCandle(41 + i, open, close, 0.0035, baseVol * (0.8 - progress * 0.5)));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0048, 0.009, baseVol * 2.6, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: apexCenter * 0.985,
        resistanceLevel: apexCenter * 1.015,
      };
    },
  },
  {
    name: 'Rising Wedge - Continuation (Bearish)',
    simpleName: 'Rising Wedge Continuation (Goes DOWN)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Intermediate',
    expectedDirection: 'SELL',
    entryRule: 'Sell as price breaks down through the lower ascending trendline.',
    stopLossRule: 'Place stop loss just above the upper ascending trendline of the wedge.',
    targetRule: 'Measure prior downward waterfall drop and project downwards from breakdown point.',
    explanation: 'Following an aggressive market drop, price slowly grinds upward inside an ascending converging wedge. This sluggish bounce is merely a bear-market rally where trapped buyers are lured in before sellers slam the price down into another drop.',
    keyObservation: 'The upward slope is slow and fragile compared to the steep dump preceding it.',
    proTip: 'Slow upward crawls after massive crashes are almost always bear flags or rising wedges that fail hard.',
    generator: (basePrice, baseVol) => {
      const dump = generateSegment(basePrice, 25, -0.0045, 0.01, baseVol * 2.0, 1);
      const wedgeStart = dump.endPrice;
      const candles: Candle[] = [...dump.candles];
      let curr = wedgeStart;

      for (let i = 0; i < 55; i++) {
        const progress = i / 55;
        const lower = wedgeStart * (1.00 + progress * 0.035);
        const upper = wedgeStart * (1.035 + progress * 0.015);
        const open = curr;
        const target = (Math.sin(i * 0.4) > 0) ? upper : lower;
        const step = (target - open) * 0.28 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.min(upper * 1.002, Math.max(lower * 0.998, open + step));
        candles.push(createCandle(26 + i, open, close, 0.005, baseVol * 0.7));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, -0.0048, 0.009, baseVol * 2.3, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: wedgeStart * 1.015,
        resistanceLevel: wedgeStart * 1.05,
      };
    },
  },
  {
    name: 'Bearish Rectangle Consolidation',
    simpleName: 'Bearish Rectangle (Goes DOWN)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Beginner',
    expectedDirection: 'SELL',
    entryRule: 'Sell on a candle close breaking decisively beneath the horizontal support floor.',
    stopLossRule: 'Place stop loss above the horizontal ceiling resistance of the rectangle.',
    targetRule: 'Target equals the vertical height of the rectangular consolidation box projected down.',
    explanation: 'After a steep sell-off, price enters a horizontal pause between parallel floor and ceiling levels. Bulls fail to stage any real recovery, and as soon as buyers at the floor are exhausted, sellers plunge the price to lower depths.',
    keyObservation: 'Repeated bounces off the floor get progressively weaker while the ceiling holds firm.',
    proTip: 'Never buy the floor of a rectangle after a massive crash without clear reversal confirmation.',
    generator: (basePrice, baseVol) => {
      const dump = generateSegment(basePrice, 20, -0.0048, 0.009, baseVol * 1.8, 1);
      const boxFloor = dump.endPrice;
      const boxCeiling = dump.endPrice * 1.03;
      const candles: Candle[] = [...dump.candles];
      let curr = boxFloor;

      for (let i = 0; i < 60; i++) {
        const open = curr;
        const target = (Math.sin(i * 0.32) > 0) ? boxCeiling * 0.998 : boxFloor * 1.002;
        const step = (target - open) * 0.28 + (Math.random() - 0.48) * open * 0.005;
        const close = Math.max(boxFloor * 0.998, Math.min(boxCeiling * 1.002, open + step));
        candles.push(createCandle(21 + i, open, close, 0.005, baseVol * 0.8));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, -0.0045, 0.009, baseVol * 2.4, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: boxFloor,
        resistanceLevel: boxCeiling,
      };
    },
  },
  {
    name: 'Bearish Pennant (Waterfall & Pennant)',
    simpleName: 'Bearish Pennant (Goes DOWN)',
    cheatSheetGroup: 'Continuation',
    category: 'Continuation',
    difficulty: 'Beginner',
    expectedDirection: 'SELL',
    entryRule: 'Sell when price breaches below the lower converging trendline of the pennant.',
    stopLossRule: 'Place stop loss just above the highest wick of the pennant consolidation.',
    targetRule: 'Project the full vertical drop length of the initial flagpole downward.',
    explanation: 'A violent waterfall drop forms the mast, followed by a brief, tight converging triangular pause where trading volume dries up. When sellers resume their blitz, the floor gives way into a severe continuation collapse.',
    keyObservation: 'The consolidation is very brief and tiny compared to the monstrous red drop before it.',
    proTip: 'Look for an expanding volume spike as price slices beneath the pennant floor.',
    generator: (basePrice, baseVol) => {
      const base = generateSegment(basePrice, 20, -0.0003, 0.006, baseVol, 1);
      const pole = generateSegment(base.endPrice, 20, -0.0058, 0.011, baseVol * 2.3, 21);
      const apexCenter = pole.endPrice;
      const candles: Candle[] = [...base.candles, ...pole.candles];
      let curr = apexCenter;

      for (let i = 0; i < 40; i++) {
        const progress = i / 40;
        const halfWidth = apexCenter * 0.025 * (1 - progress * 0.85);
        const upper = apexCenter + halfWidth;
        const lower = apexCenter - halfWidth;
        const open = curr;
        const target = (Math.sin(i * 0.55) > 0) ? upper : lower;
        const step = (target - open) * 0.35 + (Math.random() - 0.48) * open * 0.003;
        const close = Math.max(lower, Math.min(upper, open + step));
        candles.push(createCandle(41 + i, open, close, 0.0035, baseVol * (0.8 - progress * 0.5)));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, -0.005, 0.01, baseVol * 2.7, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: apexCenter * 0.985,
        resistanceLevel: apexCenter * 1.015,
      };
    },
  },

  // =========================================================================
  // 3. BILATERAL PATTERNS (Direct from Cheat Sheet: 3 Core Patterns)
  // =========================================================================
  {
    name: 'Ascending Triangle (Bilateral - Bullish Bias)',
    simpleName: 'Ascending Triangle (Goes UP)',
    cheatSheetGroup: 'Bilateral',
    category: 'Bilateral',
    difficulty: 'Intermediate',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price breaches the flat horizontal ceiling; or Sell if the rising support line breaks.',
    stopLossRule: 'Place stop loss beneath the rising support trendline.',
    targetRule: 'Target equals the widest vertical opening of the triangle projected from breakout.',
    explanation: 'Picture a bouncing tennis ball hitting a flat ceiling. Each time it bounces back down, it lands higher and higher off the floor. Buyers are getting more and more eager until the ceiling finally cracks open and price jumps higher!',
    keyObservation: 'Every dip was shallower than the previous one, showing buyers stepping in earlier at higher prices.',
    proTip: 'While bilateral, ascending triangles break upward roughly 70% of the time due to the higher lows.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let curr = basePrice;
      const res = basePrice * 1.04;
      
      for (let i = 0; i < 80; i++) {
        const t = i / 80;
        const lowBound = basePrice * (0.98 + t * 0.05);
        const open = curr;
        const target = (Math.sin(i * 0.35) > 0) ? res * 0.995 : lowBound;
        const step = (target - open) * 0.25 + (Math.random() - 0.48) * open * 0.006;
        const close = Math.min(res * 1.002, Math.max(lowBound * 0.995, open + step));
        candles.push(createCandle(i + 1, open, close, 0.006, baseVol));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0038, 0.008, baseVol * 2.4, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: basePrice * 1.01,
        resistanceLevel: res,
      };
    },
  },
  {
    name: 'Descending Triangle (Bilateral - Bearish Bias)',
    simpleName: 'Descending Triangle (Goes DOWN)',
    cheatSheetGroup: 'Bilateral',
    category: 'Bilateral',
    difficulty: 'Intermediate',
    expectedDirection: 'SELL',
    entryRule: 'Sell when price caves through the flat support floor; or Buy if descending ceiling breaks.',
    stopLossRule: 'Place stop loss above the descending resistance trendline.',
    targetRule: 'Target equals the widest vertical opening of the triangle projected from breakdown.',
    explanation: 'A flat horizontal support floor keeps getting hammered from above. Each bounce is weaker and reaches a lower ceiling than before. Sellers press down with heavier weight until the floor caves in.',
    keyObservation: 'Lower swing highs pushing right into a flat horizontal floor. Space runs out and selling pressure prevails.',
    proTip: 'When bounces get progressively weaker against the exact same floor, the floor usually gives way.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      const floor = basePrice * 0.96;
      let curr = basePrice * 1.05;

      for (let i = 0; i < 80; i++) {
        const t = i / 80;
        const highBound = basePrice * (1.05 - t * 0.075);
        const open = curr;
        const target = (Math.sin(i * 0.35) > 0) ? highBound : floor * 1.003;
        const step = (target - open) * 0.25 + (Math.random() - 0.48) * open * 0.006;
        const close = Math.max(floor * 0.998, Math.min(highBound * 1.005, open + step));
        candles.push(createCandle(i + 1, open, close, 0.006, baseVol));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, -0.0042, 0.009, baseVol * 2.5, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: floor,
        resistanceLevel: basePrice * 1.05,
      };
    },
  },
  {
    name: 'Symmetrical Triangle (Bilateral Breakout)',
    simpleName: 'Symmetrical Triangle (Goes UP)',
    cheatSheetGroup: 'Bilateral',
    category: 'Bilateral',
    difficulty: 'Intermediate',
    expectedDirection: 'BUY',
    entryRule: 'Buy if price breaks out above upper trendline; or Sell if price breaks below lower trendline.',
    stopLossRule: 'Place stop loss just outside the opposite boundary trendline.',
    targetRule: 'Measure the widest vertical distance of the triangle base and project in breakout direction.',
    explanation: 'Price action coils between a downward-sloping resistance line and an upward-sloping support line converging toward an apex. Volatility shrinks dramatically as neither bulls nor bears dominate until a breakout fires.',
    keyObservation: 'Both lower highs and higher lows converging together on steadily shrinking volume.',
    proTip: 'Symmetrical triangles are purely neutral until the breakout occurs—wait for the breakout candle to choose your side.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let curr = basePrice;
      const center = basePrice;
      const totalCandles = 80;

      for (let i = 0; i < totalCandles; i++) {
        const progress = i / totalCandles;
        const halfWidth = basePrice * 0.045 * (1 - progress * 0.85);
        const upper = center + halfWidth;
        const lower = center - halfWidth;
        const open = curr;
        const target = (Math.sin(i * 0.42) > 0) ? upper : lower;
        const step = (target - open) * 0.3 + (Math.random() - 0.48) * open * 0.004;
        const close = Math.max(lower, Math.min(upper, open + step));
        candles.push(createCandle(i + 1, open, close, 0.0045, baseVol * (1 - progress * 0.6)));
        curr = close;
      }

      const outcome = generateSegment(curr, 20, 0.0045, 0.008, baseVol * 2.5, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
        supportLevel: center * 0.985,
        resistanceLevel: center * 1.015,
      };
    },
  },

  // =========================================================================
  // 4. INSTITUTIONAL & ADVANCED SETUPS (Traps, Liquidity & Exhaustion)
  // =========================================================================
  {
    name: 'The Fake Dip Trap (Wyckoff Spring)',
    simpleName: 'Bear Trap Spring (Goes UP)',
    cheatSheetGroup: 'Special',
    category: 'Fakeout / Liquidity',
    difficulty: 'Advanced',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price violently reclaims the broken support level.',
    stopLossRule: 'Place stop loss just beneath the low of the sweep wick.',
    targetRule: 'Target the opposite range resistance ceiling.',
    explanation: 'Price briefly dipped under an obvious floor just to trigger retail panic stop-losses. But immediately, large institutional buyers stepped in, bought everything at a discount, and rocketed the price straight back up into the sky!',
    keyObservation: 'The drop below the floor lasted only 1 or 2 candles and was quickly swallowed up with huge trading volume.',
    proTip: 'If a breakdown fails to drop further within 2 candles and quickly jumps back up, it is a bear trap that launches a huge rally.',
    generator: (basePrice, baseVol) => {
      const range = generateSegment(basePrice, 60, 0.0001, 0.006, baseVol, 1);
      const floor = Math.min(...range.candles.map(c => c.low));
      const grind = generateSegment(range.endPrice, 15, -0.0015, 0.005, baseVol * 0.8, 61, floor);
      
      const trapCandles: Candle[] = [];
      let cPrice = grind.endPrice;
      for (let i = 0; i < 5; i++) {
        const isSpike = i === 2;
        const open = cPrice;
        const close = isSpike ? floor * 0.985 : (i > 2 ? floor * 0.998 : open * 0.996);
        trapCandles.push(createCandle(76 + i, open, close, isSpike ? 0.015 : 0.007, baseVol * (isSpike ? 3.0 : 1.2)));
        cPrice = close;
      }

      const setupCandles = [...range.candles, ...grind.candles, ...trapCandles];
      const outcome = generateSegment(cPrice, 20, 0.0045, 0.008, baseVol * 2.5, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: floor,
        resistanceLevel: Math.max(...range.candles.map(c => c.high)),
      };
    },
  },
  {
    name: 'The Bull Trap Upthrust (UTAD False Sweep)',
    simpleName: 'Bull Trap Sweep (Goes DOWN)',
    cheatSheetGroup: 'Special',
    category: 'Fakeout / Liquidity',
    difficulty: 'Advanced',
    expectedDirection: 'SELL',
    entryRule: 'Sell as price falls back beneath the pierced resistance ceiling.',
    stopLossRule: 'Place stop loss just above the tip of the false breakout wick.',
    targetRule: 'Target the bottom support floor of the trading range.',
    explanation: 'Price aggressively stabbed above a well-established ceiling, baiting retail breakout traders and triggering short stop-losses. But large institutions used that burst of buyer liquidity to dump massive sell orders, slamming the door shut and causing an immediate collapse.',
    keyObservation: 'A tall upper wick piercing above resistance that immediately failed to sustain, printing an engulfing red candle back below the level on surging volume.',
    proTip: 'A breakout above resistance that cannot close outside the range is the most dangerous bull trap in financial markets.',
    generator: (basePrice, baseVol) => {
      const range = generateSegment(basePrice, 60, 0.0002, 0.007, baseVol, 1);
      const resistance = Math.max(...range.candles.map(c => c.high));
      const support = Math.min(...range.candles.map(c => c.low));
      const runUp = generateSegment(range.endPrice, 14, 0.0018, 0.006, baseVol * 1.2, 61, resistance);

      const trapCandles: Candle[] = [];
      let cPrice = runUp.endPrice;
      for (let i = 0; i < 6; i++) {
        const isUpthrust = i === 2;
        const open = cPrice;
        let close: number;
        if (i < 2) {
          close = open * 1.004;
        } else if (isUpthrust) {
          close = resistance * 1.018;
        } else {
          close = resistance * (1 - (i - 2) * 0.008);
        }
        const candle = createCandle(
          75 + i,
          open,
          close,
          isUpthrust ? 0.016 : 0.007,
          baseVol * (isUpthrust ? 3.4 : 1.5)
        );
        if (isUpthrust) {
          candle.high = resistance * 1.032;
        }
        trapCandles.push(candle);
        cPrice = close;
      }

      const setupCandles = [...range.candles, ...runUp.candles, ...trapCandles];
      const outcome = generateSegment(cPrice, 20, -0.0055, 0.01, baseVol * 2.6, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: support,
        resistanceLevel: resistance,
      };
    },
  },
  {
    name: 'The Parabolic Blow-Off Climax',
    simpleName: 'Blow-Off Climax (Goes DOWN)',
    cheatSheetGroup: 'Special',
    category: 'Reversal',
    difficulty: 'Advanced',
    expectedDirection: 'SELL',
    entryRule: 'Sell on the first red engulfing candle that breaks the steep vertical trend.',
    stopLossRule: 'Place stop loss at the absolute high of the climax candle.',
    targetRule: 'Target the baseline consolidation before the vertical move started.',
    explanation: 'An insane vertical price surge lured in extreme retail euphoria. But the sudden gigantic volume spike marked the final transfer of coins from smart money to late buyers. The buying momentum instantly evaporated, causing an elevator drop.',
    keyObservation: 'Unnaturally large green candles followed by an immediate massive red engulfing candle with record high volume.',
    proTip: 'When a chart goes vertical and everyone thinks it can never drop, the climax top is already in.',
    generator: (basePrice, baseVol) => {
      const steady = generateSegment(basePrice, 50, 0.0015, 0.007, baseVol, 1);
      const vertical = generateSegment(steady.endPrice, 20, 0.0075, 0.014, baseVol * 2.8, 51);
      const peakPrice = vertical.endPrice;
      const climaxCandles: Candle[] = [];
      let cPrice = peakPrice;
      for (let i = 0; i < 10; i++) {
        const open = cPrice;
        const drift = i < 3 ? 0.002 : -0.004;
        const close = open * (1 + drift);
        const candle = createCandle(71 + i, open, close, 0.012, baseVol * (i < 3 ? 3.5 : 2.0));
        if (i === 2) {
          candle.high = open * 1.03;
        }
        climaxCandles.push(candle);
        cPrice = close;
      }

      const setupCandles = [...steady.candles, ...vertical.candles, ...climaxCandles];
      const outcome = generateSegment(cPrice, 20, -0.0062, 0.012, baseVol * 2.9, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: steady.endPrice,
        resistanceLevel: Math.max(...climaxCandles.map(c => c.high)),
      };
    },
  },
  {
    name: 'The Institutional Absorption (Wyckoff Markup)',
    simpleName: 'Institutional Absorption (Goes UP)',
    cheatSheetGroup: 'Special',
    category: 'Breakout',
    difficulty: 'Advanced',
    expectedDirection: 'BUY',
    entryRule: 'Buy when price breaks and holds above the ceiling after drying absorption.',
    stopLossRule: 'Stop loss placed beneath the most recent shallow pullback low.',
    targetRule: 'Project 2x the height of the absorption accumulation band.',
    explanation: 'Smart institutional money systematically absorbs all selling supply right under a key resistance ceiling. Every pullback gets eaten up faster than the last, building immense structural pressure until an uncontainable expansion upward occurs.',
    keyObservation: 'Aggressive volume spikes on upward green candles followed by tiny volume on red pullbacks. Supply is drying up.',
    proTip: 'When large volume enters at the ceiling without price falling back down, large institutions are preparing to mark the price up.',
    generator: (basePrice, baseVol) => {
      const accumulation = generateSegment(basePrice, 50, 0.0006, 0.008, baseVol * 1.1, 1);
      const ceiling = Math.max(...accumulation.candles.map(c => c.high));
      const test = generateSegment(accumulation.endPrice, 15, -0.001, 0.004, baseVol * 0.5, 51);
      const absorption = generateSegment(test.endPrice, 15, 0.002, 0.005, baseVol * 1.8, 66, ceiling);

      const setupCandles = [...accumulation.candles, ...test.candles, ...absorption.candles];
      const outcome = generateSegment(absorption.endPrice, 20, 0.0055, 0.009, baseVol * 2.8, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
        supportLevel: Math.min(...test.candles.map(c => c.low)),
        resistanceLevel: ceiling,
      };
    },
  },
  {
    name: 'The Trampoline Bounce (Trend Line)',
    simpleName: 'Trend Line Trampoline (Goes UP)',
    cheatSheetGroup: 'Special',
    category: 'Trend Following',
    difficulty: 'Beginner',
    expectedDirection: 'BUY',
    entryRule: 'Buy on a green rejection candle tapping the ascending 20 EMA trendline.',
    stopLossRule: 'Place stop loss 1-2% below the moving average line.',
    targetRule: 'Target a retest of the most recent swing high and beyond.',
    explanation: 'In a steady upward trend, the moving trend line (the yellow line) acts like a trampoline. Every time price dips to touch this line, buyers happily jump on it to bounce higher!',
    keyObservation: 'Price tapped the yellow line, printed a green candle with a bottom wick, and immediately started climbing.',
    proTip: 'In an uptrend, buying when price touches the yellow average line offers the safest entry.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let price = basePrice;
      for (let i = 0; i < 80; i++) {
        const trendDrift = 0.0018;
        const isPullback = i >= 68 && i < 78;
        const drift = isPullback ? -0.0015 : trendDrift;
        const open = price;
        const close = open * (1 + drift + (Math.random() - 0.48) * 0.008);
        candles.push(createCandle(i + 1, open, close, 0.006, baseVol * (isPullback ? 0.6 : 1.1)));
        price = close;
      }

      const last = candles[79];
      last.low = last.open * 0.988;
      last.close = Number((last.open * 1.004).toFixed(2));
      last.high = Math.max(last.high, last.close);

      const outcome = generateSegment(last.close, 20, 0.004, 0.007, baseVol * 1.8, 81);

      return {
        setupCandles: candles,
        outcomeCandles: outcome.candles,
      };
    },
  },
  {
    name: 'The Broken Floor Slip (Trendline Breakdown)',
    simpleName: 'Trendline Floor Break (Goes DOWN)',
    cheatSheetGroup: 'Special',
    category: 'Trend Following',
    difficulty: 'Beginner',
    expectedDirection: 'SELL',
    entryRule: 'Sell when a candle closes firmly underneath the diagonal trendline.',
    stopLossRule: 'Place stop loss back above the snapped trendline.',
    targetRule: 'Target prior swing low support levels.',
    explanation: 'Price was comfortably riding along an upward sloping floor. Suddenly, buyers stepped away and a fat red candle crashed straight through the diagonal floor line. What was once support now breaks, triggering a slide.',
    keyObservation: 'The breakdown candle closed clearly below the upward diagonal trendline on expanding red volume.',
    proTip: 'When an uptrend line snaps decisively, do not hope for a quick recovery—sellers usually push the price down to retest major low levels.',
    generator: (basePrice, baseVol) => {
      const candles: Candle[] = [];
      let price = basePrice;
      for (let i = 0; i < 70; i++) {
        const drift = 0.0016;
        const open = price;
        const close = open * (1 + drift + (Math.random() - 0.47) * 0.007);
        candles.push(createCandle(i + 1, open, close, 0.006, baseVol));
        price = close;
      }
      const breakSegment = generateSegment(price, 10, -0.0035, 0.009, baseVol * 1.6, 71);
      const setupCandles = [...candles, ...breakSegment.candles];
      const outcome = generateSegment(breakSegment.endPrice, 20, -0.0042, 0.008, baseVol * 2.1, 81);

      return {
        setupCandles,
        outcomeCandles: outcome.candles,
      };
    },
  },
];

// Anti-streak and 50/50 balanced history tracking
const recentDirections: TradeDirection[] = [];

function chooseBalancedDirection(availableDirections: TradeDirection[]): TradeDirection {
  if (availableDirections.length === 1) {
    return availableDirections[0];
  }

  // Count recent BUYs and SELLs (look at last 6 generated calls)
  const window = recentDirections.slice(-6);
  const buyCount = window.filter(d => d === 'BUY').length;
  const sellCount = window.filter(d => d === 'SELL').length;

  // Strict anti-streak rule: If last 2 were identical, force the opposite direction
  if (window.length >= 2) {
    const last1 = window[window.length - 1];
    const last2 = window[window.length - 2];
    if (last1 === last2 && availableDirections.includes(last1 === 'BUY' ? 'SELL' : 'BUY')) {
      const forced = last1 === 'BUY' ? 'SELL' : 'BUY';
      recentDirections.push(forced);
      return forced;
    }
  }

  // If one direction has been favored in recent history, balance it
  let chosen: TradeDirection;
  if (buyCount > sellCount && availableDirections.includes('SELL')) {
    chosen = 'SELL';
  } else if (sellCount > buyCount && availableDirections.includes('BUY')) {
    chosen = 'BUY';
  } else {
    // Exact 50/50 coin toss
    chosen = Math.random() < 0.5 ? 'BUY' : 'SELL';
  }

  recentDirections.push(chosen);
  if (recentDirections.length > 30) {
    recentDirections.shift();
  }
  return chosen;
}

/**
 * Public Scenario Generator with Guaranteed 50/50 BUY/SELL Balance & Anti-Streak Shuffling
 * Supports filtering by Difficulty and Pattern Focus (all, cheat-sheet, reversals, continuations, bilaterals)
 */
export function generateScenario(
  difficulty?: DifficultyLevel,
  patternFocus: PatternFocus = 'all'
): ChartScenario {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const timeframe = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];
  const baseVol = 15000 + Math.floor(Math.random() * 85000);

  // 1. Filter by Pattern Focus (Cheat Sheet groups)
  let poolByFocus = PATTERN_TEMPLATES;
  if (patternFocus === 'cheat-sheet') {
    // Exactly the 15 canonical patterns from the user's cheat sheet
    poolByFocus = PATTERN_TEMPLATES.filter((p) => p.cheatSheetGroup !== 'Special');
  } else if (patternFocus === 'reversals') {
    poolByFocus = PATTERN_TEMPLATES.filter((p) => p.cheatSheetGroup === 'Reversal');
  } else if (patternFocus === 'continuations') {
    poolByFocus = PATTERN_TEMPLATES.filter((p) => p.cheatSheetGroup === 'Continuation');
  } else if (patternFocus === 'bilaterals') {
    poolByFocus = PATTERN_TEMPLATES.filter((p) => p.cheatSheetGroup === 'Bilateral');
  }

  // 2. Filter templates by difficulty if specified and applicable
  let poolByDifficulty = poolByFocus;
  if (difficulty && difficulty !== 'All') {
    const matched = poolByFocus.filter((p) => p.difficulty === difficulty);
    // If strict filter leaves at least 2 patterns, use it; otherwise fallback to full focus pool
    if (matched.length >= 2) {
      poolByDifficulty = matched;
    }
  }

  const validPool = poolByDifficulty.length > 0 ? poolByDifficulty : PATTERN_TEMPLATES;

  // 3. Extract available directions in this pool
  const directionsInPool = Array.from(new Set(validPool.map((p) => p.expectedDirection))) as TradeDirection[];

  // 4. Select target direction using balanced 50/50 anti-streak algorithm
  const targetDirection = chooseBalancedDirection(directionsInPool);

  // 5. Filter pool to target direction
  const directionalPool = validPool.filter((p) => p.expectedDirection === targetDirection);
  const finalPool = directionalPool.length > 0 ? directionalPool : validPool;

  // 6. Pick random template from the balanced directional subset
  const template = finalPool[Math.floor(Math.random() * finalPool.length)];
  const generated = template.generator(asset.basePrice, baseVol);
  const fullCandles = [...generated.setupCandles, ...generated.outcomeCandles];

  return {
    id: `scen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    assetName: asset.name,
    assetSymbol: asset.symbol,
    assetType: asset.type,
    timeframe,
    candles: fullCandles,
    setupCount: generated.setupCandles.length,
    outcomeCount: generated.outcomeCandles.length,
    expectedDirection: template.expectedDirection,
    patternName: template.name,
    patternCategory: template.category,
    cheatSheetGroup: template.cheatSheetGroup,
    entryRule: template.entryRule,
    stopLossRule: template.stopLossRule,
    targetRule: template.targetRule,
    difficulty: template.difficulty,
    explanation: template.explanation,
    keyObservation: template.keyObservation,
    proTip: template.proTip,
    supportLevel: generated.supportLevel,
    resistanceLevel: generated.resistanceLevel,
  };
}

export interface PatternExampleData {
  template: PatternTemplate;
  asset: { symbol: string; name: string; type: string; basePrice: number };
  candles: Candle[];
  setupCount: number;
  outcomeCount: number;
  supportLevel?: number;
  resistanceLevel?: number;
}

/**
 * Generate a standalone interactive pattern demonstration for Learn Charts
 */
export function generatePatternExample(patternName: string, assetSymbol?: string): PatternExampleData {
  const template =
    PATTERN_TEMPLATES.find((p) => p.name === patternName || p.simpleName === patternName) ||
    PATTERN_TEMPLATES[0];

  const asset =
    (assetSymbol && ASSETS.find((a) => a.symbol === assetSymbol)) ||
    ASSETS[Math.floor(Math.random() * ASSETS.length)];

  const baseVol = 25000 + Math.floor(Math.random() * 45000);
  const generated = template.generator(asset.basePrice, baseVol);
  const candles = [...generated.setupCandles, ...generated.outcomeCandles];

  return {
    template,
    asset,
    candles,
    setupCount: generated.setupCandles.length,
    outcomeCount: generated.outcomeCandles.length,
    supportLevel: generated.supportLevel,
    resistanceLevel: generated.resistanceLevel,
  };
}
