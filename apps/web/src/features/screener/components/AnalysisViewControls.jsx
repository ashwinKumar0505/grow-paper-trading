import {
Eye,
Gauge,
Lock,
RefreshCw
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { buildTradeStockPath, navigate } from '../../../lib/navigation';
import { Segmented } from './ui';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisViewControls({ selectStockBySymbol, planConfig, openUpgradeModal, mode, setMode, load, a, isAdvanced }) {
  return <>
          <div className="view-switch">
            <Segmented
              value={mode}
              onChange={(nextMode) => {
                if (nextMode === 'advanced' && !planConfig.analysisAllowAdvancedMode) {
                  openUpgradeModal({
                    requiredTier: 'advanced',
                    featureName: 'Advanced Stock Analysis & 2-Year Strategy Backtest',
                    featureDescription:
                      'Advanced mode (Weighted Indicator Readings, Chart Pattern Detection, 2-Year Historical Strategy Backtest, and Active Strategy Checklist) is exclusive to the Advanced Package.',
                  });
                  setMode('advanced');
                  return;
                }
                setMode(nextMode);
              }}
              options={[
                { value: 'simple', label: 'Simple', icon: Eye },
                {
                  value: 'advanced',
                  label: planConfig.analysisAllowAdvancedMode ? 'Advanced' : 'Advanced 🔒',
                  icon: Gauge,
                },
              ]}
            />
            <span className="view-switch-hint">
              {isAdvanced
                ? planConfig.analysisAllowAdvancedMode
                  ? 'Showing all technical details.'
                  : 'Advanced technical breakdown requires the Advanced Package.'
                : 'Showing the essentials. Switch to Advanced for full details.'}
            </span>
            <Button variant="unstyled" size="unstyled"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (planConfig.allowOneClickTradeFromScreener === 'none') {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'One-Click Practice Trade from Stock Analysis',
                    featureDescription:
                      'Sending analysed stocks directly to the Paper Trading Desk is available on Beginner and Advanced plans.',
                  });
                  return;
                }
                selectStockBySymbol(a.symbol);
                navigate(buildTradeStockPath(a.symbol));
              }}
              title="Open this stock in Paper Trading Desk"
            >
              {planConfig.allowOneClickTradeFromScreener === 'none' && <Lock size={13} />}
              <span>Trade {a.symbol} in Paper Desk</span>
            </Button>
            <Button variant="unstyled" size="unstyled"
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => load(a.symbol, true)}
              title="Get latest prices"
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>


  </>;
}
