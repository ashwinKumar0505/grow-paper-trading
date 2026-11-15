import {
BarChart3,
CheckCircle2,
LineChart
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { AnalysisAdvanced } from '../components/AnalysisAdvanced';
import { AnalysisOverview } from '../components/AnalysisOverview';
import { AnalysisSearch } from '../components/AnalysisSearch';
import { AnalysisViewControls } from '../components/AnalysisViewControls';
import DataLoader from '../components/DataLoader';
import FinancialsSection from '../components/FinancialsSection';
import { SearchIllustration } from '../components/Illustrations';
import MarketStatusBadge from '../components/MarketStatusBadge';
import PremiumFeatureGate from '../components/PremiumFeatureGate';
import PriceChart from '../components/PriceChart';
import ScreenerHeader from '../components/ScreenerHeader';
import ScreenerLayout from '../components/ScreenerLayout';
import { SectionCard } from '../components/ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');

import { useStockAnalysis } from '../hooks/useStockAnalysis';

export default function StockAnalysisPage({ marketStatus }) {
  const model = useStockAnalysis();
  const { selectStockBySymbol, subscriptionTier, planConfig, usageQuota, openUpgradeModal, query, setQuery, suggestions, showDropdown, setShowDropdown, activeIdx, setActiveIdx, analysis, loading, loadingSym, error, lastAttemptSym, mode, setMode, inputRef, load, onKeyDown, clear, a, rec, isAdvanced, B, A } = model;

  return (
    <ScreenerLayout
      header={
        <ScreenerHeader
          eyebrow="Deep-Dive Research · Nifty 500"
          title="Stock Analysis"
          description="Explore price charts, technical indicators, financial performance, and historical pattern insights for any Nifty 500 company."
          methodologyNote="Combines 2-year historical backtested patterns, multi-indicator chart analysis, and quarterly/annual financial trends."
        />
      }
      statusBar={
        <MarketStatusBadge
          marketStatus={marketStatus}
          lastUpdatedIso={a?.data_as_of_date}
          extra={
            planConfig.analysisDailyLimit < 999 ? (
              <Button variant="unstyled" size="unstyled"
                type="button"
                onClick={() =>
                  openUpgradeModal({
                    requiredTier: subscriptionTier === 'free' ? 'beginner' : 'advanced',
                    featureName: 'More Daily AI Stock Analyses',
                    featureDescription: `Upgrade to Beginner for ${B.analysisDailyLimit} analyses/day or Advanced for Unlimited daily analyses and 2-year strategy backtests.`,
                  })
                }
                className={`analysis-quota-pill ${
                  usageQuota.analysisSearchesCount >= planConfig.analysisDailyLimit ? 'is-exhausted' : ''
                }`}
                title="Click to upgrade your daily Stock Analysis quota"
              >
                <span className="quota-dot" />
                <span>
                  Daily Analysis:{' '}
                  <strong>
                    {usageQuota.analysisSearchesCount} / {planConfig.analysisDailyLimit}
                  </strong>{' '}
                  used
                </span>
                <span className="quota-tier-tag">{planConfig.name}</span>
              </Button>
            ) : null
          }
        />
      }
      alerts={
        error ? (
          <div className="alert alert-error sc-alert-retry">
            <span>{error}</span>
            {lastAttemptSym && (
              <Button variant="unstyled" size="unstyled" type="button" className="btn btn-outline btn-sm" onClick={() => load(lastAttemptSym, true)}>
                Retry
              </Button>
            )}
          </div>
        ) : null
      }
    >
      <AnalysisSearch {...model} />
      {loading ? (
        <section className="card">
          <DataLoader
            title={`Analysing ${loadingSym}…`}
            subtitle="Reading two years of price history and checking technical signals."
            stages={[
              'Loading price history',
              'Checking trends and averages',
              'Looking for chart patterns',
              'Building the buy / sell plan',
            ]}
          />
        </section>
      ) : !a ? (
        <section className="card sc-empty-analysis">
          <div className="sc-empty-illus">
            <SearchIllustration />
          </div>
          <div className="sc-empty-copy">
            <h3>Analyse Any Nifty 500 Stock</h3>
            <p>
              Search for a company to explore its chart, technical indicators, financial performance, and available
              trading insights.
            </p>
            <div className="placeholder-points">
              <span>
                <CheckCircle2 size={14} /> Technical Analysis
              </span>
              <span>
                <LineChart size={14} /> Price Charts
              </span>
              <span>
                <BarChart3 size={14} /> Financial Insights
              </span>
            </div>
            <div className="sc-empty-examples">
              <Button variant="unstyled" size="unstyled" type="button" className="btn btn-outline btn-sm" onClick={() => load('RELIANCE')}>
                Try RELIANCE
              </Button>
              <Button variant="unstyled" size="unstyled" type="button" className="btn btn-outline btn-sm" onClick={() => load('TCS')}>
                Try TCS
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
      <AnalysisViewControls {...model} />
      <AnalysisOverview {...model} />
          {/* 2. Chart & Technical Indicators */}
          <SectionCard
            title={
              <>
                <LineChart size={18} /> Price Chart & Indicators
              </>
            }
            subtitle="Daily prices with moving average lines. Hover over the chart to inspect each session."
          >
            <PriceChart
              bars={a.recent_price_bars}
              stopLoss={a.stop_loss}
              target1={a.projected_target_1}
              showMomentum={isAdvanced}
            />
          </SectionCard>

          {/* 3. Revenue & Profit */}
          {planConfig.analysisAllowFinancialsAndLevels ? (
            <FinancialsSection symbol={a.symbol} />
          ) : (
            <PremiumFeatureGate
              requiredTier="beginner"
              title={`Unlock ${a.symbol} Revenue, Profit & Fundamental Trends`}
              description="Quarterly & yearly revenue, net profit, margin trends, and support/resistance levels are unlocked on Beginner and Advanced plans."
              benefits={[
                `Full revenue & profit financials + support/resistance zones`,
                `${B.analysisDailyLimit} AI stock analyses per day`,
                `One-click paper trading from stock analysis`,
              ]}
            />
          )}

          {/* 4. Advanced Technical & Backtest Gate */}
          {isAdvanced && !planConfig.analysisAllowAdvancedMode && (
            <PremiumFeatureGate
              requiredTier="advanced"
              title={`Unlock Advanced Technical & 2-Year Backtest Suite for ${a.symbol}`}
              description="Inspect weighted indicator readings, automated chart pattern recognition, 2-year historical strategy win-rate, and the multi-strategy checklist."
              benefits={[
                'Weighted technical indicator readings (RSI, MACD, ADX, Bollinger)',
                `2-year historical backtest precision & return on ${a.symbol}`,
                `Unlimited daily analyses (${A.name})`,
              ]}
            />
          )}

      <AnalysisAdvanced {...model} />

        </>
      )}
    </ScreenerLayout>
  );
}
