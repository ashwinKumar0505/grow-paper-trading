import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChartPoint, ChartType, Stock, Timeframe } from '../types/market';
import { generateChartData } from '../data/mockStocks';
import { useTrading } from '../context/TradingContext';
import { BarChart2, LineChart as LineChartIcon } from 'lucide-react';

interface StockChartProps {
  stock: Stock;
}

// Helper to convert timestamp or time string to elapsed minutes from 09:15 AM IST
function getMinutesFromMarketOpen(timestamp?: number, timeStr?: string): number {
  if (timestamp) {
    try {
      const d = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(d);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '9', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '15', 10);
      const totalMinutes = hour * 60 + minute;
      // 09:15 is 555 min, 15:30 is 930 min
      if (totalMinutes >= 555 && totalMinutes <= 930) {
        return totalMinutes - 555;
      }
    } catch {}
  }

  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const totalMin = h * 60 + m;
      if (totalMin >= 555 && totalMin <= 930) {
        return totalMin - 555;
      }
    }
  }

  return 0;
}

export const StockChart: React.FC<StockChartProps> = ({ stock }) => {
  const { fetchRealChart, marketStatus } = useTrading();
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [realPoints, setRealPoints] = useState<ChartPoint[] | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real market chart points when stock or timeframe changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingReal(true);
    fetchRealChart(stock.symbol, timeframe).then((pts) => {
      if (isMounted) {
        if (pts && pts.length > 0) {
          setRealPoints(pts);
        } else {
          setRealPoints(null);
        }
        setIsLoadingReal(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [stock.symbol, timeframe, fetchRealChart]);

  // Use real points if available, otherwise calibrated fallback
  const baseChartPoints = useMemo(() => {
    if (realPoints && realPoints.length > 0) {
      return realPoints;
    }
    return generateChartData(stock, timeframe);
  }, [realPoints, stock, timeframe]);

  // Real-time synchronization: for 1D chart, update the latest candle close and price with stock.price!
  const chartPoints = useMemo(() => {
    if (!baseChartPoints || baseChartPoints.length === 0) return baseChartPoints;
    if (timeframe !== '1D') return baseChartPoints;

    if (stock.price && stock.price > 0 && Math.abs(stock.price - 100) > 1) {
      const copy = [...baseChartPoints];
      const lastIdx = copy.length - 1;
      const last = copy[lastIdx];
      copy[lastIdx] = {
        ...last,
        close: stock.price,
        price: stock.price,
        high: Math.max(last.high, stock.price),
        low: Math.min(last.low, stock.price),
      };
      return copy;
    }
    return baseChartPoints;
  }, [baseChartPoints, stock.price, timeframe]);

  // Determine current active market price
  const latestPoint = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
  const currentMarketPrice = latestPoint
    ? (stock.price && stock.price > 0 && Math.abs(stock.price - 100) > 1 ? stock.price : latestPoint.close)
    : (stock.price || 0);

  const displayPrice = hoveredPoint ? hoveredPoint.price : currentMarketPrice;

  // Baseline price for returns:
  // For 1D: Groww always benchmarks against stock.previousClose
  // For other timeframes (1W, 1M, etc.): benchmarks against the start of that timeframe
  const baselinePrice = useMemo(() => {
    if (timeframe === '1D') {
      if (stock.previousClose && stock.previousClose > 0 && Math.abs(stock.previousClose - 100) > 1) {
        return stock.previousClose;
      }
      return chartPoints.length > 0 ? chartPoints[0].open : displayPrice;
    }
    return chartPoints.length > 0 ? chartPoints[0].close : displayPrice;
  }, [timeframe, stock.previousClose, chartPoints, displayPrice]);

  const periodChange = displayPrice - baselinePrice;
  const periodPercent = baselinePrice > 0 ? (periodChange / baselinePrice) * 100 : 0;
  const isPositive = periodChange >= 0;

  const strokeColor = isPositive ? '#00D09C' : '#EB5B5B';

  // Dimensions
  const width = 800;
  const height = 340;
  const paddingLeft = 12;
  const paddingRight = 72; // space for price labels & Prev pill
  const paddingTop = 24;
  const paddingBottom = 32;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const is1D = timeframe === '1D';

  // Calculate scales
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    chartPoints.forEach((p) => {
      if (p.low < min) min = p.low;
      if (p.high > max) max = p.high;
      if (p.volume > maxVol) maxVol = p.volume;
    });

    // In 1D, include previousClose in the scale range so the Prev baseline is always visible
    if (is1D && stock.previousClose && stock.previousClose > 0) {
      if (stock.previousClose < min) min = stock.previousClose;
      if (stock.previousClose > max) max = stock.previousClose;
    }

    if (min === Infinity || max === -Infinity) {
      min = displayPrice * 0.98;
      max = displayPrice * 1.02;
    }

    const padding = (max - min) * 0.12 || 1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol || 1,
    };
  }, [chartPoints, is1D, stock.previousClose, displayPrice]);

  // Map 1D point to session fraction (0 to 375 minutes: 09:15 to 15:30)
  const pointXCoords = useMemo(() => {
    if (!is1D || chartPoints.length === 0) {
      return chartPoints.map((_, i) => paddingLeft + (i / Math.max(1, chartPoints.length - 1)) * chartWidth);
    }

    // Check if points have valid timestamps in the 09:15..15:30 range
    const sessionMinutes = chartPoints.map((p, idx) => {
      const minFromOpen = getMinutesFromMarketOpen(p.timestamp, p.time);
      if (minFromOpen > 0) return minFromOpen;
      // Synthetic progression fallback:
      // If market is currently between 09:15 and 15:30 IST, end at current IST minute
      const now = new Date();
      const currentISTMins = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      let maxSpan = 375;
      if (currentISTMins >= 555 && currentISTMins < 930) {
        maxSpan = Math.max(20, currentISTMins - 555);
      }
      return (idx / Math.max(1, chartPoints.length - 1)) * maxSpan;
    });

    return sessionMinutes.map((mins) => paddingLeft + Math.min(chartWidth, (mins / 375) * chartWidth));
  }, [is1D, chartPoints, chartWidth]);

  const getX = (index: number) => {
    return pointXCoords[index] ?? paddingLeft;
  };

  const getY = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Build SVG path for line chart
  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.price).toFixed(1)}`)
      .join(' ');
  }, [chartPoints, pointXCoords, minPrice, maxPrice]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const bottomY = paddingTop + chartHeight;
    const startX = getX(0);
    const endX = getX(chartPoints.length - 1);
    return `${linePath} L ${endX.toFixed(1)} ${bottomY} L ${startX.toFixed(1)} ${bottomY} Z`;
  }, [linePath, chartPoints, pointXCoords]);

  // Last plotted point position (for pulsing dot)
  const lastX = chartPoints.length > 0 ? getX(chartPoints.length - 1) : null;
  const lastY = chartPoints.length > 0 ? getY(chartPoints[chartPoints.length - 1].price) : null;

  // Previous close Y position
  const prevCloseY = is1D && stock.previousClose ? getY(stock.previousClose) : null;

  // Mouse move handler for crosshair & inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || chartPoints.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    // Find closest point by X coordinate
    let closestIndex = 0;
    let minDistance = Infinity;

    pointXCoords.forEach((px, i) => {
      const dist = Math.abs(px - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    // Only inspect if within reasonable range of plotted data
    const maxPlottedX = pointXCoords[pointXCoords.length - 1] + 15;
    if (svgX > maxPlottedX) {
      setHoveredPoint(null);
      setHoverX(null);
      setHoverY(null);
      return;
    }

    const pt = chartPoints[closestIndex];
    setHoveredPoint(pt);
    setHoverX(pointXCoords[closestIndex]);
    setHoverY(getY(pt.price));
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverX(null);
    setHoverY(null);
  };

  // Price y-axis ticks (4 cleanly spaced ticks)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const price = minPrice + (i / count) * (maxPrice - minPrice);
      ticks.push(price);
    }
    return ticks;
  }, [minPrice, maxPrice]);

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '1Y', '5Y', 'ALL'];

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] p-3.5 sm:p-5 shadow-xs transition-colors w-full min-w-0 max-w-full overflow-hidden">
      {/* Chart Top Bar: Displaying active price / inspect info + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        {/* Dynamic Price readout */}
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              ₹{displayPrice.toFixed(2)}
            </span>
            <span
              className={`font-mono tabular-nums text-sm sm:text-base font-bold flex items-center gap-1 ${
                isPositive ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
              }`}
            >
              {isPositive ? '+' : ''}
              {periodChange.toFixed(2)} ({isPositive ? '+' : ''}
              {periodPercent.toFixed(2)}%)
              <span className="text-xs text-gray-400 font-normal ml-1">
                {timeframe}
              </span>
            </span>
          </div>

          {/* Candle Details if hovering */}
          {chartType === 'candlestick' && hoveredPoint && (
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400 mt-1">
              <span>O: <strong className="text-gray-800 dark:text-gray-200">₹{hoveredPoint.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-gray-800 dark:text-gray-200">₹{hoveredPoint.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-gray-800 dark:text-gray-200">₹{hoveredPoint.low.toFixed(2)}</strong></span>
              <span>C: <strong className="text-gray-800 dark:text-gray-200">₹{hoveredPoint.close.toFixed(2)}</strong></span>
              <span>Vol: <strong className="text-gray-800 dark:text-gray-200">{hoveredPoint.volume.toLocaleString('en-IN')}</strong></span>
            </div>
          )}
        </div>

        {/* View Switchers: Line vs Candle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-[#232732] rounded-lg">
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
                chartType === 'line'
                  ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Line Chart"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line</span>
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
                chartType === 'candlestick'
                  ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Candlestick Chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Candles</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[320px] sm:h-[350px] select-none mt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Price Labels */}
          {yTicks.map((price, i) => {
            const y = getY(price);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-100 dark:text-[#252A36]"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft + chartWidth + 10}
                  y={y + 4}
                  fill="currentColor"
                  className="text-gray-400 dark:text-gray-500 text-[10.5px] font-mono tabular-nums"
                >
                  ₹{price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 1D Previous Close Baseline (matches Groww screenshot) */}
          {is1D && prevCloseY !== null && (
            <g>
              <line
                x1={paddingLeft}
                y1={prevCloseY}
                x2={paddingLeft + chartWidth}
                y2={prevCloseY}
                stroke="#94A3B8"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.7"
              />
              {/* Prev Close Badge on the right */}
              <g transform={`translate(${paddingLeft + chartWidth - 84}, ${prevCloseY - 10})`}>
                <rect
                  width="84"
                  height="20"
                  rx="5"
                  fill="#545F71"
                  className="shadow-xs"
                />
                <text
                  x="42"
                  y="14"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  className="text-[10px] font-mono font-semibold"
                >
                  Prev: ₹{stock.previousClose.toFixed(2)}
                </text>
              </g>
            </g>
          )}

          {/* Volume histogram at bottom */}
          {chartPoints.map((p, i) => {
            const x = getX(i);
            const barWidth = Math.max(1.5, (chartWidth / Math.max(chartPoints.length, 50)) * 0.5);
            const volHeight = (p.volume / maxVolume) * 44;
            const y = paddingTop + chartHeight - volHeight;
            const isBarPositive = p.close >= p.open;

            return (
              <rect
                key={`vol-${i}`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={volHeight}
                fill={isBarPositive ? '#00D09C' : '#EB5B5B'}
                opacity={0.24}
              />
            );
          })}

          {/* Chart Line or Candles */}
          {chartType === 'line' ? (
            <>
              {/* Gradient Area fill */}
              <path d={areaPath} fill="url(#chartGradient)" />
              {/* Stroke line */}
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            // Candlesticks
            chartPoints.map((p, i) => {
              const x = getX(i);
              const candleWidth = Math.max(3, (chartWidth / Math.max(chartPoints.length, 50)) * 0.7);
              const isGreen = p.close >= p.open;
              const candleColor = isGreen ? '#00D09C' : '#EB5B5B';

              const topY = getY(Math.max(p.open, p.close));
              const botY = getY(Math.min(p.open, p.close));
              const bodyHeight = Math.max(2, botY - topY);

              const highY = getY(p.high);
              const lowY = getY(p.low);

              return (
                <g key={`candle-${i}`}>
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  <rect
                    x={x - candleWidth / 2}
                    y={topY}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={candleColor}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* Live pulsing dot at the very latest point */}
          {lastX !== null && lastY !== null && (
            <g>
              <circle
                cx={lastX}
                cy={lastY}
                r="7"
                fill={strokeColor}
                opacity="0.35"
                className="animate-ping"
              />
              <circle
                cx={lastX}
                cy={lastY}
                r="4.5"
                fill={strokeColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Interactive Hover Crosshair */}
          {hoverX !== null && hoveredPoint && hoverY !== null && (
            <g>
              {/* Vertical inspection dashed line */}
              <line
                x1={hoverX}
                y1={paddingTop}
                x2={hoverX}
                y2={paddingTop + chartHeight}
                stroke="#94A3B8"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.8"
              />

              {/* Point circle on line */}
              <circle
                cx={hoverX}
                cy={hoverY}
                r="5.5"
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth="2.5"
                className="shadow-md"
              />
            </g>
          )}
        </svg>

        {/* Floating Dark Card Tooltip matching Screenshot */}
        {hoverX !== null && hoveredPoint && hoverY !== null && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75"
            style={{
              left: `${Math.max(10, Math.min(width - 150, (hoverX / width) * 100))}%`,
              top: `${Math.min(height - 110, (hoverY / height) * 100 + 6)}%`,
            }}
          >
            <div className="bg-[#181C26] text-white p-3 rounded-xl shadow-2xl border border-gray-700/80 min-w-[135px]">
              <div className="font-mono tabular-nums text-sm font-extrabold text-white">
                ₹{hoveredPoint.price.toFixed(2)}
              </div>
              <div className="text-[10.5px] text-gray-400 mt-0.5">
                {hoveredPoint.time} IST
              </div>
              <div
                className={`text-[11px] font-mono font-bold mt-1 ${
                  hoveredPoint.price >= baselinePrice ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                }`}
              >
                {hoveredPoint.price >= baselinePrice ? '+' : ''}
                {(hoveredPoint.price - baselinePrice).toFixed(2)} (
                {hoveredPoint.price >= baselinePrice ? '+' : ''}
                {baselinePrice > 0
                  ? (((hoveredPoint.price - baselinePrice) / baselinePrice) * 100).toFixed(2)
                  : '0.00'}
                %)
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                Vol: {hoveredPoint.volume.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Time Markers */}
        <div className="absolute bottom-1 left-3 right-[72px] flex justify-between text-[11px] text-gray-400 dark:text-gray-500 font-medium select-none pointer-events-none">
          {is1D ? (
            <>
              <span>09:15 AM (Open)</span>
              <span className="hidden sm:inline">11:00 AM</span>
              <span className="hidden sm:inline">01:00 PM</span>
              <span>03:30 PM (Close)</span>
            </>
          ) : (
            <>
              <span>{chartPoints[0]?.time || 'Start'}</span>
              <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.time || 'Mid'}</span>
              <span>{chartPoints[chartPoints.length - 1]?.time || 'Latest'}</span>
            </>
          )}
        </div>
      </div>

      {/* Timeframe Selector Tabs (Groww signature: 1D 1W 1M 1Y 5Y ALL) */}
      <div className="flex items-center justify-between gap-1 pt-4 border-t border-gray-100 dark:border-[#282C37] mt-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2">
          {timeframes.map((tf) => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00D09C] text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#232732]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0" title={marketStatus.subText}>
          <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-[#00D09C] animate-pulse' : 'bg-amber-400'}`} />
          <span>{marketStatus.isOpen ? 'Live NSE Session · 09:15 - 15:30 IST' : 'NSE Closed · Official Session Candles'}</span>
        </div>
      </div>
    </div>
  );
};
