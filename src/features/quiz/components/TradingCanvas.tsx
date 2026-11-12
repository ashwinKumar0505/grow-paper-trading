import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Candle, IndicatorSettings, TradeDirection, ChartType } from '../types/trading';
import { calculateEMA, calculateSMA, calculateRSI } from '../utils/indicators';
import { ZoomIn, ZoomOut, RotateCcw, LineChart, CandlestickChart, Move } from 'lucide-react';

interface TradingCanvasProps {
  candles: Candle[];
  setupCount: number;
  revealedOutcomeCount: number; // 0 during decision, up to outcomeCount during/after reveal
  indicatorSettings: IndicatorSettings;
  tradeDirection?: TradeDirection | null;
  entryPrice?: number | null;
  isRevealing?: boolean;
  supportLevel?: number;
  resistanceLevel?: number;
  chartType?: ChartType;
  onToggleChartType?: (type: ChartType) => void;
  hideChartTypeToggle?: boolean;
}

export const TradingCanvas: React.FC<TradingCanvasProps> = ({
  candles,
  setupCount,
  revealedOutcomeCount,
  indicatorSettings,
  tradeDirection,
  entryPrice,
  isRevealing,
  supportLevel,
  resistanceLevel,
  chartType: externalChartType,
  onToggleChartType,
  hideChartTypeToggle = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chart Type State (Internal fallback if not controlled externally)
  const [internalChartType, setInternalChartType] = useState<ChartType>(() => {
    const saved = localStorage.getItem('tradepulse_chart_type');
    return (saved as ChartType) || 'candle';
  });

  const effectiveChartType = externalChartType ?? internalChartType;

  const handleSetChartType = (type: ChartType) => {
    setInternalChartType(type);
    localStorage.setItem('tradepulse_chart_type', type);
    if (onToggleChartType) {
      onToggleChartType(type);
    }
  };

  // Viewport navigation state (zoom / 2D pan: left-right and top-down)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0); // Horizontal offset in candle units
  const [pricePanOffset, setPricePanOffset] = useState<number>(0); // Vertical offset in price units
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // 2D Drag-to-pan state refs for smooth, persistent pointer capture
  const isDraggingRef = useRef<boolean>(false);
  const hasMovedRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const dragStartPanRef = useRef<number>(0);
  const dragStartPricePanRef = useRef<number>(0);
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false);

  // Geometry tracking refs for 1:1 drag math
  const candleWidthRef = useRef<number>(10);
  const pricePerPixelRef = useRef<number>(0.1);
  const startIndexRef = useRef<number>(0);
  const visibleCountRef = useRef<number>(80);

  // Total candles currently visible to canvas
  const visibleCandleCount = setupCount + revealedOutcomeCount;
  const currentCandles = useMemo(() => candles.slice(0, visibleCandleCount), [candles, visibleCandleCount]);

  // Indicators calculation
  const ema20 = useMemo(() => calculateEMA(currentCandles, 20), [currentCandles]);
  const sma50 = useMemo(() => calculateSMA(currentCandles, 50), [currentCandles]);
  const rsiValues = useMemo(() => calculateRSI(currentCandles, 14), [currentCandles]);

  // Reset zoom & pan when scenario changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset(0);
    setPricePanOffset(0);
    setCrosshairPos(null);
    setHoveredCandle(null);
  }, [candles]);

  // Wheel zoom handler on the canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Scroll up -> Zoom In
        setZoomLevel((prev) => Math.min(3.5, Math.round((prev + 0.2) * 10) / 10));
      } else if (e.deltaY > 0) {
        // Scroll down -> Zoom Out
        setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.2) * 10) / 10));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Main rendering loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Color definitions (Fintech Dark Slate aesthetic)
    const BG_COLOR = '#0B0E14';
    const GRID_COLOR = 'rgba(255, 255, 255, 0.04)';
    const BORDER_COLOR = '#1E293B';
    const TEXT_COLOR = '#64748B';
    const GREEN_COLOR = '#10B981';
    const RED_COLOR = '#EF4444';
    const EMA_COLOR = '#F59E0B'; // Amber
    const SMA_COLOR = '#06B6D4'; // Cyan
    const RSI_COLOR = '#A855F7'; // Purple
    const CUTOFF_COLOR = '#3B82F6'; // Blue

    // Clear background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Layout configuration
    const RIGHT_AXIS_WIDTH = 68;
    const BOTTOM_AXIS_HEIGHT = 28;
    const chartWidth = width - RIGHT_AXIS_WIDTH;

    // Subpane heights
    const hasRsi = indicatorSettings.showRsi;
    const hasVolume = indicatorSettings.showVolume;
    
    const rsiHeight = hasRsi ? Math.min(100, height * 0.22) : 0;
    const volumeHeight = hasVolume ? (hasRsi ? 45 : 65) : 0;
    const mainChartHeight = height - BOTTOM_AXIS_HEIGHT - rsiHeight;

    const priceChartBottom = mainChartHeight;
    const rsiTop = height - BOTTOM_AXIS_HEIGHT - rsiHeight;

    // Viewport calculation with 2D Zoom & Pan
    const totalSetupAndOutcome = candles.length;
    // Base visible count at zoomLevel = 1 provides ample space for setup and outcome
    const baseCount = totalSetupAndOutcome + 8;

    // Visible count based on zoom level:
    // Higher zoom = fewer candles = wider candles (Zoom In)
    // Lower zoom = more candles = narrower candles (Zoom Out)
    const visibleCount = Math.max(12, Math.min(totalSetupAndOutcome + 30, Math.round(baseCount / zoomLevel)));

    // Default right-anchored start index keeping setup and outcome buffer in comfortable view
    const defaultEndIndex = Math.min(totalSetupAndOutcome + 4, visibleCandleCount + Math.max(4, Math.round(visibleCount * 0.18)));
    const defaultStartIndex = Math.max(0, defaultEndIndex - visibleCount);

    // Apply horizontal pan offset: user can freely drag left or right across historical time
    const startIndex = Math.round(defaultStartIndex + panOffset);
    const endIndex = startIndex + visibleCount;

    const candleWidth = chartWidth / visibleCount;
    const barWidth = Math.max(1, candleWidth * 0.72);

    // Record geometry for dragging handlers
    candleWidthRef.current = candleWidth;
    startIndexRef.current = startIndex;
    visibleCountRef.current = visibleCount;

    // Calculate Price Min & Max for the visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 1;

    for (let i = startIndex; i < endIndex; i++) {
      if (i < 0 || i >= visibleCandleCount) continue;
      const c = candles[i];
      if (!c) continue;
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }

    // Fallback if user panned away from candles
    if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice === maxPrice) {
      for (let i = 0; i < visibleCandleCount; i++) {
        const c = candles[i];
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
      }
      if (!isFinite(minPrice) || !isFinite(maxPrice)) {
        minPrice = 100;
        maxPrice = 110;
      }
    }

    // Include indicators & levels in scale if active
    if (indicatorSettings.showLevels) {
      if (supportLevel && supportLevel < minPrice) minPrice = supportLevel;
      if (resistanceLevel && resistanceLevel > maxPrice) maxPrice = resistanceLevel;
    }
    if (entryPrice) {
      if (entryPrice < minPrice) minPrice = entryPrice;
      if (entryPrice > maxPrice) maxPrice = entryPrice;
    }

    // Add 8% padding to price boundaries
    const priceRange = maxPrice - minPrice;
    const basePaddedMin = minPrice - priceRange * 0.08;
    const basePaddedMax = maxPrice + priceRange * 0.08;

    // Apply vertical pan offset (top/down movement):
    // Dragging DOWN increases pricePanOffset, which shifts prices down on canvas
    // Dragging UP decreases pricePanOffset, which shifts prices up on canvas
    const paddedMin = basePaddedMin + pricePanOffset;
    const paddedMax = basePaddedMax + pricePanOffset;
    const effectiveRange = paddedMax - paddedMin;

    // Record price per pixel for vertical 1:1 dragging
    pricePerPixelRef.current = effectiveRange / Math.max(1, priceChartBottom);

    // Coordinate mapping helpers
    const getX = (index: number) => (index - startIndex) * candleWidth + candleWidth / 2;
    const getY = (price: number) => priceChartBottom - ((price - paddedMin) / effectiveRange) * priceChartBottom;
    const getPriceFromY = (y: number) => paddedMin + (1 - y / priceChartBottom) * effectiveRange;

    // 1. Draw Grid Lines (Horizontal Price)
    const gridSteps = 6;
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let s = 0; s <= gridSteps; s++) {
      const y = (priceChartBottom / gridSteps) * s;
      const priceVal = getPriceFromY(y);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Axis label
      ctx.fillText(priceVal.toFixed(2), chartWidth + 6, y);
    }

    // 2. Draw Support & Resistance Levels (if enabled)
    if (indicatorSettings.showLevels) {
      if (resistanceLevel) {
        const resY = getY(resistanceLevel);
        if (resY >= 0 && resY <= priceChartBottom) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, resY);
          ctx.lineTo(chartWidth, resY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#EF4444';
          ctx.fillText(`Ceiling: ${resistanceLevel.toFixed(2)}`, 6, Math.max(10, resY - 8));
        }
      }
      if (supportLevel) {
        const supY = getY(supportLevel);
        if (supY >= 0 && supY <= priceChartBottom) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, supY);
          ctx.lineTo(chartWidth, supY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#10B981';
          ctx.fillText(`Floor: ${supportLevel.toFixed(2)}`, 6, Math.max(10, supY - 8));
        }
      }
    }

    // 3. Draw Cutoff Dividing Line between Setup & Outcome
    const cutoffIndex = setupCount - 1;
    const cutoffX = getX(cutoffIndex) + candleWidth / 2;

    if (cutoffX >= 0 && cutoffX <= chartWidth) {
      // Shaded background zone for the outcome region (if hidden)
      if (revealedOutcomeCount < candles.length - setupCount) {
        const revealEndX = getX(visibleCandleCount - 1) + candleWidth / 2;
        const unrevealedStartX = Math.max(cutoffX, revealEndX);
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(unrevealedStartX, 0, chartWidth - unrevealedStartX, priceChartBottom);

        // Subtle pattern hatching for unrevealed mystery zone
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        const hatchStep = 18;
        for (let h = unrevealedStartX; h < chartWidth + priceChartBottom; h += hatchStep) {
          ctx.beginPath();
          ctx.moveTo(h, 0);
          ctx.lineTo(h - priceChartBottom, priceChartBottom);
          ctx.stroke();
        }
      }

      // Vertical Entry Cutoff Line
      ctx.strokeStyle = CUTOFF_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(cutoffX, 0);
      ctx.lineTo(cutoffX, height - BOTTOM_AXIS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cutoff Badge
      ctx.fillStyle = CUTOFF_COLOR;
      ctx.beginPath();
      ctx.roundRect(cutoffX - 42, 8, 84, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENTRY POINT', cutoffX, 17);
    }

    // 4. Draw Volume Bars in bottom portion of price chart (if enabled)
    if (hasVolume && maxVolume > 0) {
      const volBaseY = priceChartBottom - 4;
      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const c = candles[i];
        if (!c) continue;
        const cx = getX(i);
        const barH = (c.volume / maxVolume) * volumeHeight;
        const isUp = c.close >= c.open;

        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(cx - barWidth / 2, volBaseY - barH, barWidth, barH);
      }
    }

    // 5. Draw 20 EMA and 50 SMA Lines
    const drawLineIndicator = (values: (number | null)[], color: string, widthLine: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthLine;
      ctx.beginPath();
      let started = false;

      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const val = values[i];
        if (val !== null && val !== undefined) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    if (indicatorSettings.showEma20) {
      drawLineIndicator(ema20, EMA_COLOR, 1.5);
    }
    if (indicatorSettings.showSma50) {
      drawLineIndicator(sma50, SMA_COLOR, 1.5);
    }

    // 6. Draw Main Price Action: Line (Normal) vs Japanese Candlesticks
    if (effectiveChartType === 'line') {
      // --- NORMAL / LINE CHART (Apple Stocks / Robinhood clean style) ---
      const validFirstIdx = Math.max(0, Math.min(candles.length - 1, startIndex));
      const validLastIdx = Math.max(0, Math.min(candles.length - 1, Math.min(endIndex - 1, visibleCandleCount - 1)));
      const firstCandle = candles[validFirstIdx] || candles[0];
      const lastVisibleCandle = candles[validLastIdx] || firstCandle;
      const isNetUp = lastVisibleCandle.close >= firstCandle.close;
      const mainLineColor = isNetUp ? GREEN_COLOR : RED_COLOR;

      // 6a. Shaded translucent gradient under the line
      const grad = ctx.createLinearGradient(0, 0, 0, priceChartBottom);
      grad.addColorStop(0, isNetUp ? 'rgba(16, 185, 129, 0.24)' : 'rgba(239, 68, 68, 0.24)');
      grad.addColorStop(0.7, isNetUp ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)');
      grad.addColorStop(1, 'rgba(11, 14, 20, 0)');

      ctx.beginPath();
      let firstPoint = true;
      let firstX = 0;
      let lastX = 0;

      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const c = candles[i];
        if (!c) continue;
        const x = getX(i);
        const y = getY(c.close);

        if (firstPoint) {
          ctx.moveTo(x, priceChartBottom);
          ctx.lineTo(x, y);
          firstX = x;
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
      }

      if (!firstPoint) {
        ctx.lineTo(lastX, priceChartBottom);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 6b. Smooth glow line
      ctx.save();
      ctx.strokeStyle = mainLineColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = mainLineColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      firstPoint = true;

      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const c = candles[i];
        if (!c) continue;
        const x = getX(i);
        const y = getY(c.close);

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // 6c. Glowing pulsing dot at the latest candle
      if (visibleCandleCount > 0) {
        const latestIdx = visibleCandleCount - 1;
        if (latestIdx >= startIndex && latestIdx < endIndex) {
          const lx = getX(latestIdx);
          const ly = getY(candles[latestIdx].close);

          // Outer halo
          ctx.fillStyle = isNetUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
          ctx.beginPath();
          ctx.arc(lx, ly, 8, 0, Math.PI * 2);
          ctx.fill();

          // Inner solid bead
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // --- CANDLESTICK CHART ---
      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const c = candles[i];
        if (!c) continue;
        const cx = getX(i);
        const isUp = c.close >= c.open;
        const candleColor = isUp ? GREEN_COLOR : RED_COLOR;

        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        // Wick
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = Math.max(1, barWidth > 8 ? 1.5 : 1);
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

        ctx.fillStyle = candleColor;
        ctx.fillRect(cx - barWidth / 2, bodyTop, barWidth, bodyHeight);

        // Special highlight for active animated outcome candle
        if (isRevealing && i === visibleCandleCount - 1 && i >= setupCount) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - barWidth / 2 - 2, bodyTop - 2, barWidth + 4, bodyHeight + 4);
        }
      }
    }

    // 7. Draw Entry Horizontal Price Line if trade was executed
    if (entryPrice) {
      const entryY = getY(entryPrice);
      if (entryY >= 0 && entryY <= priceChartBottom) {
        ctx.strokeStyle = tradeDirection === 'BUY' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(cutoffX, entryY);
        ctx.lineTo(chartWidth, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Entry tag
        ctx.fillStyle = tradeDirection === 'BUY' ? GREEN_COLOR : RED_COLOR;
        ctx.fillRect(chartWidth + 1, entryY - 9, RIGHT_AXIS_WIDTH - 2, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${entryPrice.toFixed(2)}`, chartWidth + RIGHT_AXIS_WIDTH / 2, entryY);
      }
    }

    // 8. Draw RSI Sub-chart (if enabled)
    if (hasRsi && rsiHeight > 0) {
      ctx.strokeStyle = BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rsiTop);
      ctx.lineTo(width, rsiTop);
      ctx.stroke();

      const getRsiY = (rsiVal: number) => rsiTop + rsiHeight - (rsiVal / 100) * rsiHeight;

      const y70 = getRsiY(70);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartWidth, y70);
      ctx.stroke();

      const y30 = getRsiY(30);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(chartWidth, y30);
      ctx.stroke();

      const y50 = getRsiY(50);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, y50);
      ctx.lineTo(chartWidth, y50);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'left';
      ctx.fillText('70', chartWidth + 6, y70);
      ctx.fillText('30', chartWidth + 6, y30);
      ctx.fillText('RSI (14)', 8, rsiTop + 14);

      ctx.strokeStyle = RSI_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let rsiStarted = false;

      for (let i = startIndex; i < endIndex; i++) {
        if (i < 0 || i >= visibleCandleCount) continue;
        const val = rsiValues[i];
        if (val !== null && val !== undefined) {
          const x = getX(i);
          const y = getRsiY(val);
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // 9. Draw Axis Borders
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height - BOTTOM_AXIS_HEIGHT);
    ctx.lineTo(width, height - BOTTOM_AXIS_HEIGHT);
    ctx.stroke();

    // 10. Draw Bottom Axis (Time markers)
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const timeStep = Math.max(1, Math.floor(visibleCount / 8));
    for (let i = startIndex; i < endIndex; i += timeStep) {
      if (i < 0 || i >= candles.length) continue;
      const x = getX(i);
      if (x > 15 && x < chartWidth - 15) {
        const candleNum = i + 1;
        ctx.fillText(`T+${candleNum}`, x, height - BOTTOM_AXIS_HEIGHT / 2);
      }
    }

    // 11. Crosshair rendering (if hovering and not dragging)
    if (!isDraggingRef.current && crosshairPos && crosshairPos.x < chartWidth && crosshairPos.y < height - BOTTOM_AXIS_HEIGHT) {
      const { x, y } = crosshairPos;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - BOTTOM_AXIS_HEIGHT);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis price badge
      if (y <= priceChartBottom) {
        const hoverPrice = getPriceFromY(y);
        ctx.fillStyle = '#334155';
        ctx.fillRect(chartWidth + 1, y - 9, RIGHT_AXIS_WIDTH - 2, 18);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hoverPrice.toFixed(2), chartWidth + RIGHT_AXIS_WIDTH / 2, y);
      }

      // Bottom axis candle index badge
      const hoveredIndex = Math.min(
        candles.length - 1,
        Math.max(0, Math.floor(startIndex + (x / chartWidth) * visibleCount))
      );
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 24, height - BOTTOM_AXIS_HEIGHT + 3, 48, 18);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`C#${hoveredIndex + 1}`, x, height - BOTTOM_AXIS_HEIGHT + 12);
    }
  }, [
    candles,
    setupCount,
    revealedOutcomeCount,
    indicatorSettings,
    tradeDirection,
    entryPrice,
    isRevealing,
    supportLevel,
    resistanceLevel,
    zoomLevel,
    panOffset,
    pricePanOffset,
    crosshairPos,
    visibleCandleCount,
    ema20,
    sma50,
    rsiValues,
    effectiveChartType,
  ]);

  // Handle Container & Window Resize
  useEffect(() => {
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;

    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        render();
      });
      observer.observe(container);
    }

    const handleResize = () => {
      render();
    };
    window.addEventListener('resize', handleResize);
    render();

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [render]);

  // Pointer Down for 2D Drag-to-pan (Mouse or Touchscreen)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only primary button / touch
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    dragStartPanRef.current = panOffset;
    dragStartPricePanRef.current = pricePanOffset;
    setIsDraggingState(true);
  };

  // Pointer Move for 2D Drag-to-pan or Crosshair
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartWidth = canvas.clientWidth - 68;
    const chartHeight = canvas.clientHeight - 28;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaY = e.clientY - dragStartYRef.current;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasMovedRef.current = true;
      }

      // 1. Horizontal Left-Right Drag:
      // Dragging right (deltaX > 0) pulls earlier candles into view (panOffset decreases)
      const deltaCandles = deltaX / Math.max(1, candleWidthRef.current);
      setPanOffset(dragStartPanRef.current - deltaCandles);

      // 2. Vertical Top-Down Drag:
      // Dragging down (deltaY > 0) pulls the price chart down (pricePanOffset increases)
      const deltaPrice = deltaY * pricePerPixelRef.current;
      setPricePanOffset(dragStartPricePanRef.current + deltaPrice);

      setCrosshairPos(null);
      setHoveredCandle(null);
      return;
    }

    if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
      setCrosshairPos({ x, y });
      const idx = Math.floor(startIndexRef.current + (x / chartWidth) * visibleCountRef.current);
      if (idx >= 0 && idx < visibleCandleCount) {
        setHoveredCandle(candles[idx]);
      } else {
        setHoveredCandle(null);
      }
    } else {
      setCrosshairPos(null);
      setHoveredCandle(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    setIsDraggingState(false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    setIsDraggingState(false);
    setCrosshairPos(null);
    setHoveredCandle(null);
  };

  const handleDoubleClick = () => {
    handleResetZoom();
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3.5, Math.round((prev + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset(0);
    setPricePanOffset(0);
  };

  // Has the user shifted the view away from default?
  const isPannedOrZoomed = zoomLevel !== 1 || panOffset !== 0 || pricePanOffset !== 0;

  // Get current active candle (hovered or latest revealed)
  const displayCandle = hoveredCandle || currentCandles[currentCandles.length - 1];
  const candleChange = displayCandle ? displayCandle.close - displayCandle.open : 0;
  const candleChangePct = displayCandle ? (candleChange / displayCandle.open) * 100 : 0;
  const isUp = candleChange >= 0;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0B0E14] select-none overflow-hidden">
      {/* Top Floating Bar: Telemetry, Legend & Chart Mode Switcher */}
      <div className="relative shrink-0 px-3 py-2 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Beginner-friendly Price & Candle info */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {displayCandle && (
            <div className="flex items-center gap-2.5 bg-[#121824]/95 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md shadow-md text-xs font-mono">
              {effectiveChartType === 'line' ? (
                // Simplified Line View for beginners
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-sans font-medium">Price:</span>
                  <span className="text-slate-100 font-bold font-mono text-sm">
                    ${displayCandle.close.toFixed(2)}
                  </span>
                  <span
                    className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                      isUp ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                    }`}
                  >
                    {isUp ? '▲ +' : '▼ '}
                    {candleChangePct.toFixed(2)}%
                  </span>
                </div>
              ) : (
                // Candlestick OHLC View
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-slate-400 font-medium">C#{displayCandle.time}:</span>
                  <span>
                    <span className="text-slate-500">O:</span> <span className="text-slate-200">{displayCandle.open.toFixed(2)}</span>
                  </span>
                  <span>
                    <span className="text-slate-500">H:</span> <span className="text-emerald-400">{displayCandle.high.toFixed(2)}</span>
                  </span>
                  <span>
                    <span className="text-slate-500">L:</span> <span className="text-rose-400">{displayCandle.low.toFixed(2)}</span>
                  </span>
                  <span>
                    <span className="text-slate-500">C:</span>{' '}
                    <span className={isUp ? 'text-emerald-400' : 'text-rose-400'}>{displayCandle.close.toFixed(2)}</span>
                  </span>
                  <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}
                    {candleChangePct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Active indicators pill tags */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px]">
            {indicatorSettings.showEma20 && (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40 font-mono">
                <span className="w-2 h-0.5 bg-amber-400 inline-block"></span>
                Trend
              </span>
            )}
            {indicatorSettings.showLevels && (
              <span className="flex items-center gap-1 text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40 font-mono">
                <span className="w-2 h-0.5 bg-blue-400 inline-block"></span>
                Floor & Ceiling
              </span>
            )}
          </div>
        </div>

        {/* Right: Chart Type Switcher & Zoom Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Chart Type Toggle: Normal Line vs Candlesticks */}
          {!hideChartTypeToggle && (
            <div className="flex items-center bg-[#121824]/95 p-1 rounded-lg border border-slate-800 shadow-md backdrop-blur-md">
              <button
                onClick={() => handleSetChartType('line')}
                title="Normal Chart: Simple, clean line like Apple Stocks or Robinhood (great for beginners!)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium transition-all cursor-pointer ${
                  effectiveChartType === 'line'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Normal Chart</span>
              </button>
              <button
                onClick={() => handleSetChartType('candle')}
                title="Candle Chart: Classic trading candlesticks showing high, low, open, and close"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium transition-all cursor-pointer ${
                  effectiveChartType === 'candle'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5" />
                <span>Candles</span>
              </button>
            </div>
          )}

          {/* Zoom & Pan Controls */}
          <div className="flex items-center gap-0.5 bg-[#121824]/95 p-1 rounded-lg border border-slate-800 shadow-md backdrop-blur-md">
            <button
              onClick={handleZoomIn}
              title="Zoom In (+ or scroll wheel up)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span
              className="text-[11px] font-mono text-slate-300 px-1 font-semibold min-w-[34px] text-center"
              title="Current Zoom Level"
            >
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={handleZoomOut}
              title="Zoom Out (- or scroll wheel down)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
            <button
              onClick={handleResetZoom}
              title="Reset Zoom & Pan View (or double-click chart)"
              className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                isPannedOrZoomed
                  ? 'text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Surface */}
      <div
        ref={containerRef}
        className={`w-full flex-1 relative select-none ${
          isDraggingState ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onDoubleClick={handleDoubleClick}
          className="absolute inset-0 block w-full h-full touch-none"
        />

        {/* Floating Pan/Recenter Badge when panned or zoomed */}
        {isPannedOrZoomed && (
          <button
            onClick={handleResetZoom}
            title="Click to center chart back to normal view"
            className="absolute bottom-9 left-3 z-10 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-full text-[11px] font-sans border border-slate-700/80 shadow-md backdrop-blur-sm transition-all cursor-pointer pointer-events-auto"
          >
            <Move className="w-3 h-3 text-blue-400" />
            <span>Chart moved • Click to re-center</span>
          </button>
        )}
      </div>
    </div>
  );
};
