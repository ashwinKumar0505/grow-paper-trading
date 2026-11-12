import { ChartType, IndicatorSettings } from '../types/trading';

interface Props {
  chartType: ChartType;
  onChartType: (type: ChartType) => void;
  indicators: IndicatorSettings;
  onIndicator: (key: keyof IndicatorSettings) => void;
}

/** Secondary tools stay out of the way until the learner needs them. */
export function ChartControls({ chartType, onChartType, indicators, onIndicator }: Props) {
  return <details className="learning-tools">
    <summary>Chart options</summary>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-4">
      <label className="flex items-center gap-2 text-sm">Chart style
        <select aria-label="Chart style" value={chartType} onChange={e => onChartType(e.target.value as ChartType)} className="learning-select">
          <option value="candle">Candlesticks</option><option value="line">Line</option>
        </select>
      </label>
      {([['showEma20', '20-period average'], ['showSma50', '50-period average'], ['showLevels', 'Support & resistance'], ['showVolume', 'Volume'], ['showRsi', 'RSI']] as const).map(([key,label]) =>
        <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={indicators[key]} onChange={() => onIndicator(key)} className="accent-emerald-600" />{label}</label>
      )}
    </div>
  </details>;
}
