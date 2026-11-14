import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartPoint, ChartType, Stock, Timeframe } from '../types/market';
import { generateChartData } from '../data/mockStocks';
import { useTrading } from '../context/TradingContext';

interface StockChartProps {
  stock: Stock;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];
const SESSION_MINUTES = 375; // 09:15 AM → 03:30 PM IST
const UP = '#00B386';
const DOWN = '#EB5B3C';

const toMs = (ts: number) => (ts > 1e11 ? ts : ts * 1000);

/** Minutes elapsed since 09:15 IST for a timestamp, or null if outside 09:15–15:30. */
function sessionMinute(ts: number): number | null {
  if (!ts) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date(toMs(ts)));
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const mins = h * 60 + m - 555;
  return mins >= 0 && mins <= SESSION_MINUTES ? mins : null;
}

function formatHoverTimestamp(ts: number, tf: Timeframe, fallback: string): string {
  if (!ts) return fallback;
  const d = new Date(toMs(ts));
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };
  if (tf === '1D') {
    const time = d.toLocaleTimeString('en-IN', { ...opts, hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    const date = d.toLocaleDateString('en-IN', { ...opts, day: '2-digit', month: 'short' });
    return `${time} · ${date}`;
  }
  if (tf === '1W') {
    const date = d.toLocaleDateString('en-IN', { ...opts, day: '2-digit', month: 'short' });
    const time = d.toLocaleTimeString('en-IN', { ...opts, hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    return `${date}, ${time}`;
  }
  if (tf === '3Y' || tf === '5Y' || tf === 'ALL') {
    return d.toLocaleDateString('en-IN', { ...opts, day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('en-IN', { ...opts, day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAxisLabel(ts: number, tf: Timeframe, fallback: string): string {
  if (!ts) return fallback;
  const d = new Date(toMs(ts));
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };
  if (tf === '1D') {
    return d.toLocaleTimeString('en-IN', { ...opts, hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  }
  if (tf === '1W' || tf === '1M' || tf === '3M') {
    return d.toLocaleDateString('en-IN', { ...opts, day: '2-digit', month: 'short' });
  }
  if (tf === '6M' || tf === '1Y') {
    return d.toLocaleDateString('en-IN', { ...opts, month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { ...opts, month: 'short', year: 'numeric' });
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const StockChart: React.FC<StockChartProps> = ({ stock }) => {
  const { fetchRealChart, marketStatus } = useTrading();
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isTerminalMode, setIsTerminalMode] = useState<boolean>(false);
  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const height = isTerminalMode ? 370 : 300;

  const is1D = timeframe === '1D';
  const isLive = marketStatus.isOpen;
  const validPrice = stock.price > 0;

  // Measure container width so SVG renders at crisp 1:1 pixel ratio
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load candles for the selected stock & timeframe
  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setHoverIdx(null);
    fetchRealChart(stock.symbol, timeframe).then((pts: ChartPoint[] | null) => {
      if (!alive) return;
      if (pts && pts.length >= 2) {
        setPoints(pts);
      } else {
        setPoints(generateChartData(stock, timeframe));
      }
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol, timeframe, fetchRealChart]);

  // Synchronize latest point with live market quote during trading hours
  useEffect(() => {
    if (!is1D || !validPrice) return;
    setPoints((prev) => {
      if (!prev || prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const price = stock.price;
      const now = Date.now();
      const bucket = Math.floor(now / 120000) * 120000; // 2-min bar
      const lastTs = toMs(last.timestamp);
      if (isLive && sessionMinute(now) !== null && bucket > lastTs && sessionMinute(lastTs) !== null) {
        return [
          ...prev,
          {
            time: new Date(bucket)
              .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
              .toUpperCase(),
            timestamp: bucket,
            open: last.close,
            high: Math.max(last.close, price),
            low: Math.min(last.close, price),
            close: price,
            price,
            volume: last.volume || Math.round((stock.volume || 0) / Math.max(1, prev.length)),
          },
        ];
      }
      if (last.close === price) return prev;
      const copy = prev.slice();
      copy[copy.length - 1] = {
        ...last,
        close: price,
        price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
      };
      return copy;
    });
  }, [stock.price, stock.volume, is1D, isLive, validPrice]);

  const data = points || [];
  const prevClose = stock.previousClose > 0 ? stock.previousClose : data[0]?.open || 0;
  const currentPrice = validPrice ? stock.price : data[data.length - 1]?.close || 0;
  const baseline = is1D ? prevClose : data[0]?.close || currentPrice;

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const displayPrice = hovered ? hovered.close : currentPrice;
  const change = displayPrice - baseline;
  const changePct = baseline > 0 ? (change / baseline) * 100 : 0;
  const periodUp = currentPrice - baseline >= 0;
  const lineColor = periodUp ? UP : DOWN;

  // Chart padding
  const rightAxisWidth = isTerminalMode || chartType === 'candlestick' || hoverIdx !== null ? 58 : 8;
  const padTop = 24;
  const padBottom = 14;
  const padLeft = 4;
  const plotW = Math.max(100, width - padLeft - rightAxisWidth);
  const plotH = height - padTop - padBottom;

  // X positions — for 1D, map onto the 09:15–15:30 session timeline like Groww
  const xs = useMemo(() => {
    if (data.length === 0) return [] as number[];
    if (is1D) {
      const mins = data.map((p) => sessionMinute(p.timestamp));
      const validCount = mins.filter((m) => m !== null).length;
      if (validCount >= data.length * 0.7) {
        let lastKnown = 0;
        return mins.map((m, idx) => {
          if (m !== null) lastKnown = m;
          else lastKnown = Math.min(SESSION_MINUTES, (idx / Math.max(1, data.length - 1)) * SESSION_MINUTES);
          return padLeft + (lastKnown / SESSION_MINUTES) * plotW;
        });
      }
    }
    const n = Math.max(1, data.length - 1);
    return data.map((_, i) => padLeft + (i / n) * plotW);
  }, [data, is1D, plotW]);

  const { minP, maxP, maxVol } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let mv = 0;
    for (const p of data) {
      const l = chartType === 'candlestick' ? p.low : p.close;
      const h = chartType === 'candlestick' ? p.high : p.close;
      if (l < lo) lo = l;
      if (h > hi) hi = h;
      if (p.volume > mv) mv = p.volume;
    }
    if (is1D && prevClose > 0) {
      lo = Math.min(lo, prevClose);
      hi = Math.max(hi, prevClose);
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      lo = currentPrice * 0.99;
      hi = currentPrice * 1.01;
    }
    const pad = (hi - lo) * 0.1 || hi * 0.005 || 1;
    return { minP: lo - pad, maxP: hi + pad, maxVol: mv || 1 };
  }, [data, chartType, is1D, prevClose, currentPrice]);

  const y = (price: number) => padTop + plotH - ((price - minP) / (maxP - minP || 1)) * plotH;

  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    return data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, xs, minP, maxP, plotH]);

  const areaPath = useMemo(() => {
    if (data.length === 0 || xs.length === 0) return '';
    const bot = padTop + plotH;
    return `${linePath} L${xs[xs.length - 1].toFixed(1)},${bot} L${xs[0].toFixed(1)},${bot} Z`;
  }, [linePath, data.length, xs, plotH]);

  // 20-period Simple Moving Average for Terminal mode
  const smaPath = useMemo(() => {
    if (!isTerminalMode || data.length < 10) return '';
    const period = Math.min(20, Math.floor(data.length / 3));
    const pts: string[] = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      const avg = sum / period;
      pts.push(`${pts.length === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${y(avg).toFixed(1)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalMode, data, xs, minP, maxP, plotH]);

  // Y-axis price ticks (4 levels)
  const yTicks = useMemo(() => {
    const count = 4;
    const arr: number[] = [];
    for (let i = 0; i <= count; i++) {
      arr.push(minP + (i / count) * (maxP - minP));
    }
    return arr;
  }, [minP, maxP]);

  // X-axis time / date ticks shown below the chart
  const xTicks = useMemo(() => {
    if (is1D) {
      // Standard NSE session markers from 09:15 AM to 03:30 PM
      const markers = [
        { min: 0, label: '09:15 AM' },
        { min: 75, label: '10:30 AM' },
        { min: 165, label: '12:00 PM' },
        { min: 255, label: '01:30 PM' },
        { min: 375, label: '03:30 PM' },
      ];
      return markers.map((m) => ({
        x: padLeft + (m.min / SESSION_MINUTES) * plotW,
        label: m.label,
      }));
    }
    if (data.length < 2) return [];
    const tickCount = 5;
    const items: { x: number; label: string }[] = [];
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.min(data.length - 1, Math.round((i / (tickCount - 1)) * (data.length - 1)));
      const pt = data[idx];
      items.push({
        x: xs[idx] ?? padLeft,
        label: formatAxisLabel(pt.timestamp, timeframe, pt.time),
      });
    }
    return items;
  }, [is1D, data, xs, plotW, timeframe]);

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length === 0 || xs.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (px > xs[xs.length - 1] + 28) {
      setHoverIdx(null);
      return;
    }
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] < px) lo = mid;
      else hi = mid;
    }
    setHoverIdx(Math.abs(xs[lo] - px) <= Math.abs(xs[hi] - px) ? lo : hi);
  };

  const lastX = xs.length ? xs[xs.length - 1] : 0;
  const lastY = data.length ? y(data[data.length - 1].close) : 0;
  const prevY = is1D && prevClose > 0 ? y(prevClose) : null;
  const hoverX = hoverIdx !== null ? xs[hoverIdx] : null;
  const hoverY = hovered ? y(hovered.close) : null;
  const hoverLabel = hovered ? formatHoverTimestamp(hovered.timestamp, timeframe, hovered.time) : '';
  const pillW = Math.max(96, hoverLabel.length * 6.5 + 16);
  const pillX = hoverX !== null ? Math.min(Math.max(hoverX, pillW / 2 + 4), padLeft + plotW - pillW / 2 - 4) : 0;

  const step = data.length > 1 ? plotW / (is1D ? Math.max(data.length, 95) : data.length) : plotW;
  const candleW = Math.max(2, Math.min(10, step * 0.68));

  const tfLabel: Record<Timeframe, string> = {
    '1D': '1D',
    '1W': '1W',
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '1Y': '1Y',
    '3Y': '3Y',
    '5Y': '5Y',
    ALL: 'All',
  };

  const activePoint = hovered || data[data.length - 1];

  return (
    <div className="w-full min-w-0">
      {/* Groww Price & Return Readout */}
      <div className="min-h-[60px]">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="font-bold tabular-nums text-[28px] sm:text-[30px] leading-tight text-gray-900 dark:text-white tracking-tight">
            ₹{fmt(displayPrice)}
          </span>
          <span className={`font-semibold tabular-nums text-sm ${change >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
            {change >= 0 ? '+' : ''}
            {fmt(change)} ({change >= 0 ? '+' : ''}
            {changePct.toFixed(2)}%)
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {hovered ? hoverLabel : tfLabel[timeframe]}
          </span>
        </div>

        {/* OHLCV Inspection Bar (shown on hover or in Candlestick / Terminal mode) */}
        {(hovered || chartType === 'candlestick' || isTerminalMode) && activePoint && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-gray-500 dark:text-gray-400 mt-1">
            <span>
              O <strong className="text-gray-800 dark:text-gray-200">₹{fmt(activePoint.open)}</strong>
            </span>
            <span>
              H <strong className="text-[#00B386]">₹{fmt(activePoint.high)}</strong>
            </span>
            <span>
              L <strong className="text-[#EB5B3C]">₹{fmt(activePoint.low)}</strong>
            </span>
            <span>
              C <strong className="text-gray-800 dark:text-gray-200">₹{fmt(activePoint.close)}</strong>
            </span>
            {activePoint.volume > 0 && (
              <span>
                Vol <strong className="text-gray-800 dark:text-gray-200">{activePoint.volume.toLocaleString('en-IN')}</strong>
              </span>
            )}
            {isTerminalMode && (
              <span className="text-[#5367FF] font-sans font-semibold">· SMA (20)</span>
            )}
          </div>
        )}
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div ref={wrapRef} className="relative w-full mt-2 select-none" style={{ height }}>
        {isLoading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Loading chart…
          </div>
        ) : (
          <svg
            width={width}
            height={height}
            className={`block overflow-visible ${isLoading ? 'opacity-60' : ''}`}
            style={{ touchAction: 'pan-y' }}
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={`growwArea-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={isTerminalMode ? 0.14 : 0.08} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Right Y-Axis Price Scale (visible in Terminal, Candlestick, or Hover) */}
            {(isTerminalMode || chartType === 'candlestick' || hoverIdx !== null) &&
              yTicks.map((p, i) => {
                const py = y(p);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={padLeft}
                      x2={padLeft + plotW}
                      y1={py}
                      y2={py}
                      stroke="currentColor"
                      className="text-gray-100 dark:text-[#232732]"
                      strokeWidth={1}
                    />
                    <text
                      x={padLeft + plotW + 6}
                      y={py + 3.5}
                      className="fill-gray-400 dark:fill-gray-500 font-mono tabular-nums"
                      style={{ fontSize: 10 }}
                    >
                      {p.toFixed(1)}
                    </text>
                  </g>
                );
              })}

            {/* 1D Previous Close Dotted Reference Line */}
            {prevY !== null && (
              <g>
                <line
                  x1={padLeft}
                  x2={padLeft + plotW}
                  y1={prevY}
                  y2={prevY}
                  stroke="currentColor"
                  className="text-gray-300 dark:text-gray-600"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              </g>
            )}

            {/* Bottom Dashed Baseline (matches Groww reference screenshot) */}
            <line
              x1={padLeft}
              x2={padLeft + plotW}
              y1={padTop + plotH}
              y2={padTop + plotH}
              stroke="currentColor"
              className="text-gray-200 dark:text-[#2B303C]"
              strokeWidth={1}
              strokeDasharray="4 3"
            />

            {/* Volume Histogram Bars (shown in Candlestick or Terminal mode) */}
            {(chartType === 'candlestick' || isTerminalMode) &&
              data.map((p, i) => {
                const vh = (p.volume / maxVol) * plotH * 0.18;
                return (
                  <rect
                    key={`v-${i}`}
                    x={xs[i] - candleW / 2}
                    y={padTop + plotH - vh}
                    width={candleW}
                    height={vh}
                    fill={p.close >= p.open ? UP : DOWN}
                    opacity={0.2}
                  />
                );
              })}

            {/* Main Series: Line vs Candlesticks */}
            {chartType === 'line' ? (
              <>
                <path d={areaPath} fill={`url(#growwArea-${stock.symbol})`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={1.85}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <g>
                {data.map((p, i) => {
                  const up = p.close >= p.open;
                  const c = up ? UP : DOWN;
                  const top = y(Math.max(p.open, p.close));
                  const bot = y(Math.min(p.open, p.close));
                  return (
                    <g key={`c-${i}`}>
                      <line x1={xs[i]} x2={xs[i]} y1={y(p.high)} y2={y(p.low)} stroke={c} strokeWidth={1.1} />
                      <rect
                        x={xs[i] - candleW / 2}
                        y={top}
                        width={candleW}
                        height={Math.max(1.5, bot - top)}
                        fill={c}
                        rx={0.5}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* 20-SMA Overlay in Terminal Mode */}
            {isTerminalMode && smaPath && (
              <path
                d={smaPath}
                fill="none"
                stroke="#5367FF"
                strokeWidth={1.3}
                strokeDasharray="3 2"
                opacity={0.85}
              />
            )}

            {/* Static Solid Endpoint Dot on Line Chart (No moving/drifting animation!) */}
            {hoverX === null && data.length > 0 && chartType === 'line' && (
              <circle cx={lastX} cy={lastY} r={4} fill={lineColor} />
            )}

            {/* Interactive Hover Crosshair + Timestamp Pill + Price Tag */}
            {hoverX !== null && hovered && hoverY !== null && (
              <g pointerEvents="none">
                {/* Vertical crosshair line */}
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke="currentColor"
                  className="text-gray-400 dark:text-gray-500"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Horizontal crosshair line */}
                <line
                  x1={padLeft}
                  x2={padLeft + plotW}
                  y1={hoverY}
                  y2={hoverY}
                  stroke="currentColor"
                  className="text-gray-300 dark:text-gray-600"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />

                {/* Top timestamp/date pill */}
                <g transform={`translate(${pillX - pillW / 2}, 2)`}>
                  <rect
                    width={pillW}
                    height={19}
                    rx={4}
                    className="fill-gray-800 dark:fill-gray-100"
                  />
                  <text
                    x={pillW / 2}
                    y={13}
                    textAnchor="middle"
                    className="fill-white dark:fill-gray-900 font-medium tabular-nums"
                    style={{ fontSize: 10.5 }}
                  >
                    {hoverLabel}
                  </text>
                </g>

                {/* Right-axis hovered price badge */}
                <g transform={`translate(${padLeft + plotW + 2}, ${Math.max(padTop, Math.min(padTop + plotH - 18, hoverY - 9))})`}>
                  <rect width={54} height={18} rx={3} fill={lineColor} />
                  <text
                    x={27}
                    y={12.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="font-mono font-semibold tabular-nums"
                    style={{ fontSize: 9.5 }}
                  >
                    {hovered.close.toFixed(1)}
                  </text>
                </g>

                {/* Active point circle */}
                <circle
                  cx={hoverX}
                  cy={hoverY}
                  r={4.5}
                  className="fill-white dark:fill-[#121212]"
                  stroke={lineColor}
                  strokeWidth={2.2}
                />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* X-Axis Time & Date Labels Below the Chart */}
      <div className="relative h-6 w-full select-none mt-1" style={{ paddingRight: rightAxisWidth }}>
        {xTicks.map((tick, i) => {
          const isFirst = i === 0;
          const isLast = i === xTicks.length - 1;
          const pct = (tick.x / Math.max(1, padLeft + plotW)) * 100;
          return (
            <span
              key={`xtick-${i}`}
              className="absolute top-0.5 text-[11px] font-medium tabular-nums text-gray-400 dark:text-gray-500 whitespace-nowrap"
              style={{
                left: `${Math.min(100, Math.max(0, pct))}%`,
                transform: isFirst ? 'translateX(0%)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {tick.label}
            </span>
          );
        })}
      </div>

      {/* Groww Timeframe Pills + Candlestick Toggle + Terminal Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-1 border-t border-gray-100 dark:border-[#242834]">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {TIMEFRAMES.map((tf) => {
            const active = tf === timeframe;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border ${
                  active
                    ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36] text-gray-900 dark:text-white font-semibold'
                    : 'border-gray-200 dark:border-[#2A2E39] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 font-medium'
                }`}
              >
                {tfLabel[tf]}
              </button>
            );
          })}

          {/* Groww Candlestick / Line Icon Pill (right next to 'All', matching reference screenshot) */}
          <button
            type="button"
            onClick={() => setChartType((prev) => (prev === 'line' ? 'candlestick' : 'line'))}
            title={chartType === 'line' ? 'Switch to Candlestick chart' : 'Switch to Line chart'}
            className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              chartType === 'candlestick'
                ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36]'
                : 'border-gray-200 dark:border-[#2A2E39] hover:border-gray-300'
            }`}
          >
            {/* Dual Green/Red Candlestick SVG Icon matching Groww */}
            <svg className="w-4 h-3.5" viewBox="0 0 16 14" fill="none">
              <line x1="4.5" y1="1" x2="4.5" y2="13" stroke="#EB5B3C" strokeWidth="1.3" strokeLinecap="round" />
              <rect x="3" y="4" width="3" height="5" rx="0.5" fill="#EB5B3C" />
              <line x1="11.5" y1="1" x2="11.5" y2="13" stroke="#00B386" strokeWidth="1.3" strokeLinecap="round" />
              <rect x="10" y="3" width="3" height="6" rx="0.5" fill="#00B386" />
            </svg>
          </button>
        </div>

        {/* Groww 'Terminal' Button on the right */}
        <button
          type="button"
          onClick={() => {
            setIsTerminalMode((prev) => {
              const next = !prev;
              if (next) setChartType('candlestick');
              return next;
            });
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            isTerminalMode
              ? 'border-[#00B386] bg-[#00B386]/10 text-[#00B386]'
              : 'border-gray-200 dark:border-[#2A2E39] text-gray-700 dark:text-gray-300 hover:border-gray-300'
          }`}
          title="Toggle full Trading Terminal indicators (Candles, Volume, SMA-20 & Price Scale)"
        >
          <span>Terminal</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 14" fill="none">
            <line x1="5" y1="1.5" x2="5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="3.5" y="4" width="3" height="5" rx="0.5" fill="currentColor" />
            <line x1="11" y1="1.5" x2="11" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="9.5" y="3" width="3" height="5.5" rx="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
};
