import React, { useState } from 'react';
import { fmtPrice } from '../utils/format';

const C = {
  grid: { stroke: 'var(--chart-grid)' },
  axis: { fill: 'var(--text-faint)' },
  up: 'var(--up)',
  down: 'var(--down)',
};

export default function PriceChart({ bars = [], stopLoss, target1, showMomentum = true }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!bars || bars.length < 10) {
    return <div className="chart-empty">Not enough price history to draw a chart.</div>;
  }

  const width = 900;
  const height = 320;
  const pad = { top: 16, right: 64, bottom: 24, left: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const prices = [];
  bars.forEach((b) => {
    prices.push(b.high, b.low);
    ['ema_20', 'ema_50', 'ema_200'].forEach((k) => b[k] && prices.push(b[k]));
  });
  if (stopLoss) prices.push(stopLoss);
  if (target1) prices.push(target1);

  const minP = Math.min(...prices) * 0.992;
  const maxP = Math.max(...prices) * 1.008;
  const rangeP = Math.max(maxP - minP, 1);

  const xFor = (i) => pad.left + (i / Math.max(bars.length - 1, 1)) * plotW;
  const yFor = (p) => pad.top + (1 - (p - minP) / rangeP) * plotH;

  const linePath = (key) =>
    bars
      .map((b, i) => (b[key] != null ? `${xFor(i).toFixed(1)},${yFor(b[key]).toFixed(1)}` : null))
      .filter(Boolean)
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`)
      .join(' ');

  const rsiH = 80;
  const yRsi = (r) => 8 + (1 - Math.min(Math.max(r, 0), 100) / 100) * (rsiH - 16);
  const rsiPath = bars
    .map((b, i) => (b.rsi_14 != null ? `${xFor(i).toFixed(1)},${yRsi(b.rsi_14).toFixed(1)}` : null))
    .filter(Boolean)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`)
    .join(' ');

  const active = hoverIdx != null && bars[hoverIdx] ? bars[hoverIdx] : bars[bars.length - 1];
  const first = bars[0];
  const last = bars[bars.length - 1];
  const periodChange = ((last.close - first.close) / first.close) * 100;
  const candleW = Math.max(2, Math.min(7, (plotW / bars.length) * 0.62));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minP + t * rangeP);
  const dayChg = active.open ? ((active.close - active.open) / active.open) * 100 : 0;

  return (
    <div className="pchart">
      <div className="pchart-head">
        <div className="pchart-ohlc">
          <span className="pchart-date">{active.date}</span>
          <span>Open <b>{fmtPrice(active.open)}</b></span>
          <span>High <b>{fmtPrice(active.high)}</b></span>
          <span>Low <b>{fmtPrice(active.low)}</b></span>
          <span>Close <b className={dayChg >= 0 ? 'text-up' : 'text-down'}>{fmtPrice(active.close)}</b></span>
          {active.volume != null && (
            <span>Volume <b>{(active.volume / 1e5).toFixed(2)} L</b></span>
          )}
        </div>
        <div className={`pchart-period ${periodChange >= 0 ? 'text-up' : 'text-down'}`}>
          {periodChange >= 0 ? '▲' : '▼'} {Math.abs(periodChange).toFixed(1)}% in {bars.length} days
        </div>
      </div>

      <div className="pchart-legend">
        <span><i style={{ background: 'var(--line-1)' }} /> 20-day average</span>
        <span><i style={{ background: 'var(--line-2)' }} /> 50-day average</span>
        <span><i style={{ background: 'var(--line-3)' }} /> 200-day average</span>
        {target1 && <span><i className="dash" style={{ borderColor: 'var(--up)' }} /> Target</span>}
        {stopLoss && <span><i className="dash" style={{ borderColor: 'var(--down)' }} /> Stop loss</span>}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="pchart-svg" onMouseLeave={() => setHoverIdx(null)}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={yFor(v)} y2={yFor(v)} style={C.grid} strokeDasharray="3 4" />
            <text x={width - pad.right + 8} y={yFor(v) + 4} style={C.axis} fontSize="11">
              ₹{v.toFixed(0)}
            </text>
          </g>
        ))}

        {target1 && target1 >= minP && target1 <= maxP && (
          <g>
            <line x1={pad.left} x2={width - pad.right} y1={yFor(target1)} y2={yFor(target1)} style={{ stroke: C.up }} strokeWidth="1.4" strokeDasharray="6 4" />
            <text x={pad.left + 6} y={yFor(target1) - 6} style={{ fill: C.up }} fontSize="11" fontWeight="700">
              Target {fmtPrice(target1)}
            </text>
          </g>
        )}
        {stopLoss && stopLoss >= minP && stopLoss <= maxP && (
          <g>
            <line x1={pad.left} x2={width - pad.right} y1={yFor(stopLoss)} y2={yFor(stopLoss)} style={{ stroke: C.down }} strokeWidth="1.4" strokeDasharray="6 4" />
            <text x={pad.left + 6} y={yFor(stopLoss) + 14} style={{ fill: C.down }} fontSize="11" fontWeight="700">
              Stop loss {fmtPrice(stopLoss)}
            </text>
          </g>
        )}

        <path d={linePath('ema_200')} fill="none" style={{ stroke: 'var(--line-3)' }} strokeWidth="1.6" />
        <path d={linePath('ema_50')} fill="none" style={{ stroke: 'var(--line-2)' }} strokeWidth="1.6" />
        <path d={linePath('ema_20')} fill="none" style={{ stroke: 'var(--line-1)' }} strokeWidth="1.6" />

        {bars.map((b, i) => {
          const x = xFor(i);
          const color = b.close >= b.open ? C.up : C.down;
          const top = yFor(Math.max(b.open, b.close));
          const bot = yFor(Math.min(b.open, b.close));
          return (
            <g key={b.date} onMouseEnter={() => setHoverIdx(i)}>
              <line x1={x} x2={x} y1={yFor(b.high)} y2={yFor(b.low)} style={{ stroke: color }} strokeWidth="1.1" />
              <rect x={x - candleW / 2} y={top} width={candleW} height={Math.max(1.5, bot - top)} style={{ fill: color }} rx="1" />
              <rect x={x - plotW / bars.length / 2} y={pad.top} width={plotW / bars.length} height={plotH} fill="transparent" />
            </g>
          );
        })}

        {hoverIdx != null && (
          <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={pad.top} y2={height - pad.bottom} style={{ stroke: 'var(--text-faint)' }} strokeDasharray="2 3" />
        )}
      </svg>

      {showMomentum && (
        <div className="pchart-rsi">
          <div className="pchart-rsi-label">
            Momentum (RSI) {active.rsi_14 != null && <b>{active.rsi_14.toFixed(0)}</b>}
            <span>Above 70 = may be overbought · Below 30 = may be oversold</span>
          </div>
          <svg viewBox={`0 0 ${width} ${rsiH}`} className="pchart-svg">
            <rect x={pad.left} width={plotW} y={yRsi(70)} height={yRsi(30) - yRsi(70)} style={{ fill: 'var(--primary-soft)' }} />
            <line x1={pad.left} x2={width - pad.right} y1={yRsi(70)} y2={yRsi(70)} style={C.grid} strokeDasharray="3 3" />
            <line x1={pad.left} x2={width - pad.right} y1={yRsi(30)} y2={yRsi(30)} style={C.grid} strokeDasharray="3 3" />
            <text x={width - pad.right + 8} y={yRsi(70) + 4} style={C.axis} fontSize="10">70</text>
            <text x={width - pad.right + 8} y={yRsi(30) + 4} style={C.axis} fontSize="10">30</text>
            <path d={rsiPath} fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth="1.6" />
            {hoverIdx != null && (
              <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={0} y2={rsiH} style={{ stroke: 'var(--text-faint)' }} strokeDasharray="2 3" />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
