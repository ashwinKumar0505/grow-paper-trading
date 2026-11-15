import {
ArrowRight,
Lock,
RefreshCw
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { navigate } from '../../../lib/navigation';
import { ASSETS } from '../utils/dataGenerator';
import { ChartControls } from './ChartControls';
import { TradingCanvas } from './TradingCanvas';

import type { PatternLesson } from '../hooks/usePatternLesson';

type Props = Pick<PatternLesson, 'symbol' | 'setSymbol' | 'setVariation' | 'showOutcome' | 'setShowOutcome' | 'chartType' | 'setChartType' | 'indicators' | 'setIndicators' | 'planConfig' | 'openUpgradeModal' | 'pattern' | 'example'>;

export function PatternDemonstration({ symbol, setSymbol, setVariation, showOutcome, setShowOutcome, chartType, setChartType, indicators, setIndicators, planConfig, openUpgradeModal, pattern, example }: Props) {
  return <>
          {/* 4. INTERACTIVE CHART SECTION */}
          <section className="rounded-2xl border border-[#e2eae6] dark:border-[#20332a] bg-white dark:bg-[#111c17] overflow-hidden shadow-sm">
            {/* Chart Top Control Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2eae6] dark:border-[#20332a] px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-[#15241d] dark:text-white">
                    Interactive Chart Demonstration
                  </span>
                  <span className="rounded-md bg-[#00b386]/10 dark:bg-[#00d09c]/15 px-2 py-0.5 text-[11px] font-bold text-[#008f6b] dark:text-[#00d09c]">
                    NSE: {symbol}
                  </span>
                </div>
                <p className="text-xs text-[#5b7066] dark:text-[#9ab0a5] mt-0.5">
                  Inspect the setup candles before the dashed vertical line, then click &ldquo;Reveal Next Candles&rdquo; to see how the move unfolds.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#5b7066] dark:text-[#9ab0a5]">
                  <span>Stock:</span>
                  <select
                    aria-label="Example stock"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value);
                      setShowOutcome(false);
                    }}
                    className="rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-[#f6f9f7] dark:bg-[#16241e] px-3 py-1.5 text-xs font-bold text-[#15241d] dark:text-white focus:outline-none focus:border-[#00b386]"
                  >
                    {ASSETS.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} · {asset.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Button variant="unstyled" size="unstyled"
                  type="button"
                  onClick={() => {
                    if (!planConfig.patternLibraryAllowVariations) {
                      openUpgradeModal({
                        requiredTier: 'beginner',
                        featureName: 'Unlimited Chart Pattern Example Variations',
                        featureDescription:
                          'Generating unlimited randomized NSE stock chart variations for any pattern is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                      });
                      return;
                    }
                    setVariation((n) => n + 1);
                    setShowOutcome(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#cfdcd5] dark:border-[#2c4538] bg-[#f6f9f7] dark:bg-[#16241e] hover:border-[#00b386] px-3 py-1.5 text-xs font-bold text-[#15241d] dark:text-white transition-colors"
                >
                  {!planConfig.patternLibraryAllowVariations ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-[#00b386] dark:text-[#00d09c]" />
                  )}
                  <span>New Example</span>
                </Button>

                <Button variant="unstyled" size="unstyled"
                  type="button"
                  onClick={() => setShowOutcome((value) => !value)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00b386] hover:bg-[#009a73] dark:bg-[#00d09c] dark:hover:bg-[#00b386] px-3.5 py-1.5 text-xs font-extrabold text-white dark:text-[#04261c] transition-colors shadow-xs"
                >
                  <span>{showOutcome ? 'Hide Next Candles' : 'Reveal Next Candles'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Chart Type & Overlays Bar */}
            <ChartControls
              chartType={chartType}
              onChartType={setChartType}
              indicators={indicators}
              onIndicator={(key) => {
                if ((key === 'showSma50' || key === 'showRsi') && !planConfig.patternLibraryAllowAllIndicators) {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'SMA 50 & RSI Indicator Overlays',
                    featureDescription:
                      'Adding 50-Day SMA and Relative Strength Index (RSI) momentum sub-charts is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                  });
                  return;
                }
                setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
              }}
            />

            {/* Explicit Height Canvas Wrapper so TradingCanvas never collapses */}
            <div className="learning-chart relative h-[440px] sm:h-[480px] w-full bg-[#0a0e17]">
              <TradingCanvas
                candles={example.candles}
                setupCount={example.setupCount}
                revealedOutcomeCount={showOutcome ? example.outcomeCount : 0}
                indicatorSettings={indicators}
                chartType={chartType}
                hideChartTypeToggle
                supportLevel={example.supportLevel}
                resistanceLevel={example.resistanceLevel}
              />
            </div>

            {/* Bottom Chart Status Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2eae6] dark:border-[#20332a] bg-[#f6f9f7] dark:bg-[#16241e] px-5 py-3.5 sm:px-6">
              <p className="text-xs text-[#5b7066] dark:text-[#9ab0a5]">
                Simulated NSE chart for pattern education · Prices in ₹ · Hover or drag across candles to inspect OHLC values.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="unstyled" size="unstyled"
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#008f6b] dark:text-[#00d09c] hover:underline"
                >
                  <span>Ready to test your eye? Open Guess the Chart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </section>
  </>;
}
