import React, { useEffect, useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Exchange, OrderAction, OrderProduct, OrderType, Stock } from '../types/market';
import { calculateCharges } from '../utils/charges';
import {
  getReservedSellQuantity,
  INTRADAY_LEVERAGE,
  MTF_LEVERAGE,
  roundToTick,
  SCHEDULED_ORDER_DISCLAIMER,
} from '../utils/orderEngine';
import { getISTParts, INTRADAY_SQUARE_OFF_MIN } from '../utils/marketHours';
import { generateMarketDepth } from '../data/mockStocks';
import { AlertCircle, ChevronsUpDown, Info, Lock, Settings, X } from 'lucide-react';

const BUY = '#00B386';
const SELL = '#EB5B3C';

const inr = (n: number, digits = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface OrderPanelProps {
  stock: Stock;
  defaultAction?: OrderAction;
  defaultProduct?: OrderProduct;
  defaultQuantity?: number;
  onClose?: () => void;
  onPlaced?: () => void;
}

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  MARKET: 'Market',
  LIMIT: 'Limit',
  SL: 'SL',
  'SL-M': 'SL-M',
};

export const OrderPanel: React.FC<OrderPanelProps> = ({
  stock,
  defaultAction = 'BUY',
  defaultProduct = 'DELIVERY',
  defaultQuantity = 1,
  onClose,
  onPlaced,
}) => {
  const {
    executeOrder,
    balance,
    holdings,
    intradayPositions,
    orders,
    marketStatus,
    setIsWalletModalOpen,
    planConfig,
    openUpgradeModal,
  } = useTrading();

  const [action, setAction] = useState<OrderAction>(defaultAction);
  const [product, setProduct] = useState<OrderProduct>(defaultProduct);
  const [exchange, setExchange] = useState<Exchange>(stock.exchange);
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [qtyText, setQtyText] = useState<string>(defaultQuantity > 0 ? String(defaultQuantity) : '');
  const [priceText, setPriceText] = useState<string>(stock.price.toFixed(2));
  const [triggerText, setTriggerText] = useState<string>('');
  const [error, setError] = useState('');
  const [showCharges, setShowCharges] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showDepth, setShowDepth] = useState(false);

  // Sync defaults when stock or modal parameters change
  useEffect(() => {
    setExchange(stock.exchange);
    setAction(defaultAction);
    setProduct(defaultProduct);
    setQtyText(defaultQuantity && defaultQuantity > 0 ? String(defaultQuantity) : '1');
    setOrderType('MARKET');
    setPriceText(stock.price.toFixed(2));
    setTriggerText('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol, defaultAction, defaultProduct, defaultQuantity]);

  const nsePrice = stock.price;
  const bsePrice = stock.price;
  const ltp = exchange === 'NSE' ? nsePrice : bsePrice;

  const qty = Math.max(0, Number(qtyText) || 0);
  const limitPrice = Number(priceText) || 0;
  const triggerPrice = Number(triggerText) || 0;
  const isBuy = action === 'BUY';
  const accent = isBuy ? BUY : SELL;

  const needsPrice = orderType === 'LIMIT' || orderType === 'SL';
  const needsTrigger = orderType === 'SL' || orderType === 'SL-M';
  const effPrice =
    orderType === 'MARKET'
      ? ltp
      : orderType === 'SL-M'
      ? triggerPrice || ltp
      : limitPrice || ltp;

  const holding = holdings.find((h) => h.symbol === stock.symbol);
  const heldQty = holding?.quantity || 0;
  const reservedSell = getReservedSellQuantity(orders, stock.symbol, exchange);
  const sellableQty = Math.max(0, heldQty - reservedSell);

  const position = intradayPositions.find((p) => p.symbol === stock.symbol && p.exchange === exchange);
  const isExit = product === 'INTRADAY' && !!position && position.action !== action;
  const reverseQty = isExit ? Math.max(0, qty - position!.quantity) : 0;

  // Quick quantity chips (like Groww's floating "6 | 9 | 15" badge above the Qty input)
  const quickQuantities = useMemo(() => {
    if ((product === 'DELIVERY' || product === 'MTF') && !isBuy && sellableQty > 0) {
      const q1 = Math.max(1, Math.floor(sellableQty * 0.25));
      const q2 = Math.max(1, Math.floor(sellableQty * 0.5));
      return Array.from(new Set([q1, q2, sellableQty])).slice(0, 3);
    }
    if (isExit && position) {
      const half = Math.max(1, Math.floor(position.quantity / 2));
      return Array.from(new Set([half, position.quantity])).slice(0, 3);
    }
    // Suggest realistic share counts based on price (similar to Groww's 6 | 9 | 15)
    if (ltp >= 2000) return [6, 9, 15];
    if (ltp >= 500) return [10, 25, 50];
    return [25, 50, 100];
  }, [product, isBuy, sellableQty, isExit, position, ltp]);

  const charges = useMemo(
    () => calculateCharges({ product, action, quantity: qty, price: effPrice, exchange }),
    [product, action, qty, effPrice, exchange]
  );

  const value = qty * effPrice;
  let required = 0;
  if (qty > 0) {
    if (product === 'DELIVERY') required = isBuy ? value + charges.total : 0;
    else if (product === 'MTF') required = isBuy ? value / MTF_LEVERAGE + charges.total : 0;
    else if (isExit && position) {
      const closeQty = Math.min(qty, position.quantity);
      const released = position.marginBlocked * closeQty / position.quantity;
      const gross = (effPrice - position.entryPrice) * closeQty * (position.action === 'BUY' ? 1 : -1);
      // Full exits remain possible even if a loss takes the wallet negative.
      required = reverseQty > 0 ? Math.max(0, reverseQty * effPrice / INTRADAY_LEVERAGE + charges.total - released - gross) : 0;
    }
    else required = value / INTRADAY_LEVERAGE + charges.total;
  }

  const insufficient = required > balance;
  const tradable = marketStatus.isOpen;
  const istMin = getISTParts().minutes;
  const intradayBlocked =
    product === 'INTRADAY' &&
    marketStatus.isOpen &&
    istMin >= INTRADAY_SQUARE_OFF_MIN &&
    !(isExit && reverseQty === 0);

  const depth = useMemo(() => generateMarketDepth(ltp), [ltp]);

  const switchType = (t: OrderType) => {
    if (!planConfig.allowedOrderTypes.includes(t)) {
      const reqTier = t === 'LIMIT' ? 'beginner' : 'advanced';
      openUpgradeModal({
        requiredTier: reqTier,
        featureName: `${ORDER_TYPE_LABEL[t]} Order Type`,
        featureDescription:
          t === 'LIMIT'
            ? 'Limit orders are unlocked on the Beginner Package (₹299/mo) and Advanced Package (₹699/mo).'
            : 'Stop-Loss (SL) and Stop-Loss Market (SL-M) orders are exclusive to the Advanced Package (₹699/mo).',
      });
      setShowTypes(false);
      return;
    }
    setOrderType(t);
    setShowTypes(false);
    setError('');
    if (t === 'LIMIT' || t === 'SL') setPriceText(ltp.toFixed(2));
    if (t === 'SL' || t === 'SL-M') {
      const trig = roundToTick(isBuy ? ltp * 1.01 : ltp * 0.99);
      setTriggerText(trig.toFixed(2));
      if (t === 'SL') setPriceText(trig.toFixed(2));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number.isSafeInteger(qty) || qty <= 0) return setError('Enter a positive whole number of shares');
    const res = executeOrder({
      symbol: stock.symbol,
      action,
      product,
      orderType,
      exchange,
      quantity: qty,
      limitPrice: needsPrice ? limitPrice : undefined,
      triggerPrice: needsTrigger ? triggerPrice : undefined,
    });
    if (!res.success) return setError(res.message);
    onPlaced?.();
  };

  let submitLabel = tradable
    ? isBuy
      ? 'Buy'
      : 'Sell'
    : isBuy
      ? 'Schedule Buy'
      : 'Schedule Sell';
  if (tradable && isExit && reverseQty === 0 && qty > 0) {
    submitLabel = qty >= position!.quantity ? `Exit (${action} ${qty})` : `${submitLabel} · Reduce`;
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#2A2E39] shadow-xs overflow-hidden flex flex-col"
    >
      {/* 1. Stock Title & NSE/BSE Quote Strip + Depth Link */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
              {stock.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-[11.5px] text-gray-500 dark:text-gray-400 tabular-nums">
              <button
                type="button"
                disabled={stock.exchange !== 'NSE'}
                onClick={() => setExchange('NSE')}
                className={`cursor-pointer ${exchange === 'NSE' ? ' font-semibold text-gray-800 dark:text-gray-200' : ''}`}
              >
                NSE {stock.exchange === 'NSE' ? inr(nsePrice) : 'Unavailable'}
              </button>
              <span className={stock.change >= 0 ? 'text-[#00B386] font-medium' : 'text-[#EB5B3C] font-medium'}>
                ({stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
              <span>·</span>
              <button
                type="button"
                disabled={stock.exchange !== 'BSE'}
                onClick={() => setExchange('BSE')}
                className={`cursor-pointer ${exchange === 'BSE' ? 'font-semibold text-gray-800 dark:text-gray-200' : ''}`}
              >
                BSE {stock.exchange === 'BSE' ? inr(bsePrice) : 'Unavailable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!planConfig.allowMarketDepth) {
                    openUpgradeModal({
                      requiredTier: 'advanced',
                      featureName: '5-Level NSE Market Depth (Bids & Asks)',
                      featureDescription:
                        'Inspecting live 5-level Bid/Ask order book depth and click-to-fill limit prices is exclusive to the Advanced Package.',
                    });
                    return;
                  }
                  setShowDepth((prev) => !prev);
                }}
                className="ml-1 font-semibold text-gray-800 dark:text-gray-200 border-b border-dashed border-gray-500 hover:text-[#00B386] cursor-pointer inline-flex items-center gap-1"
              >
                {!planConfig.allowMarketDepth && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                <span>Depth</span>
              </button>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Inline Collapsible Market Depth Drawer */}
        {showDepth && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#2A2E39] grid grid-cols-2 gap-3 text-[11px] font-mono tabular-nums">
            <div>
              <div className="flex justify-between text-gray-400 font-sans mb-1">
                <span>Bid</span>
                <span>Qty</span>
              </div>
              {depth.bids.slice(0, 5).map((b, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setOrderType('LIMIT');
                    setPriceText(b.price.toFixed(2));
                  }}
                  className="flex justify-between py-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#232732] rounded px-1"
                  title="Click to use this Bid price as Limit price"
                >
                  <span className="text-[#00B386] font-medium">{b.price.toFixed(2)}</span>
                  <span className="text-gray-600 dark:text-gray-300">{b.quantity}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-gray-400 font-sans mb-1">
                <span>Ask</span>
                <span>Qty</span>
              </div>
              {depth.asks.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setOrderType('LIMIT');
                    setPriceText(a.price.toFixed(2));
                  }}
                  className="flex justify-between py-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#232732] rounded px-1"
                  title="Click to use this Ask price as Limit price"
                >
                  <span className="text-[#EB5B3C] font-medium">{a.price.toFixed(2)}</span>
                  <span className="text-gray-600 dark:text-gray-300">{a.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. BUY / SELL Tabs */}
      <div className="flex items-center gap-6 px-5 border-t border-b border-gray-100 dark:border-[#2A2E39]">
        {(['BUY', 'SELL'] as OrderAction[]).map((a) => {
          const active = action === a;
          const c = a === 'BUY' ? BUY : SELL;
          const tabLabel = tradable
            ? a === 'BUY'
              ? 'Buy'
              : 'Sell'
            : a === 'BUY'
              ? 'Schedule Buy'
              : 'Schedule Sell';
          return (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAction(a);
                setError('');
              }}
              className="py-2.5 text-xs font-bold tracking-wide transition-colors cursor-pointer relative"
              style={{ color: active ? c : undefined }}
            >
              <span className={active ? '' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}>
                {tabLabel}
              </span>
              {active && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2.5px] rounded-t"
                  style={{ backgroundColor: c }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Main Order Inputs */}
      <div className="px-5 pt-4 pb-6 space-y-5 flex-1">
        {/* Product Selector Pills + Order Type Settings Gear */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setProduct('DELIVERY');
                setError('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer border ${
                product === 'DELIVERY'
                  ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36] text-gray-900 dark:text-white font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
            >
              Delivery
            </button>

            <button
              type="button"
              onClick={() => {
                if (!planConfig.allowIntradayTrading) {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'Intraday (MIS) 5x Leverage Trading',
                    featureDescription:
                      'Free Starter accounts include Delivery (CNC) trading only. Upgrade to Beginner (₹299/mo) or Advanced (₹699/mo) to unlock Intraday (MIS) 5x margin leverage & short selling.',
                  });
                  return;
                }
                setProduct('INTRADAY');
                setError('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer border inline-flex items-center gap-1 ${
                product === 'INTRADAY'
                  ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36] text-gray-900 dark:text-white font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
            >
              {!planConfig.allowIntradayTrading && <Lock className="w-3 h-3 text-amber-500" />}
              <span>Intraday 5x</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!planConfig.allowIntradayTrading) {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'MTF 5.00x Delivery Leverage',
                    featureDescription:
                      'MTF 5.00x (Pay 20% margin, carry forward delivery holdings) is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                  });
                  return;
                }
                setProduct('MTF');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer border inline-flex items-center gap-1 ${
                product === 'MTF'
                  ? 'border-[#00B386] bg-[#00B386]/15 text-[#00B386] dark:text-[#00D09C] font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
              title="MTF 5.00x Delivery Margin (Pay 20%, Hold Delivery)"
            >
              {!planConfig.allowIntradayTrading && <Lock className="w-3 h-3 text-amber-500" />}
              <span>MTF 5.00x</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#2A2E39]">
            <button
              type="button"
              onClick={() => setShowTypes((s) => !s)}
              className="w-7 h-7 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
              title="Change Order Type (Market / Limit / SL / SL-M)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Qty Row with Floating Quick-Qty Chip (matching Groww screenshot) */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                disabled title="Only the quoted exchange is available"
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <span>Qty</span>
                <strong className="font-bold text-gray-900 dark:text-white">{exchange}</strong>
                <ChevronsUpDown className="w-3 h-3 text-gray-400" />
              </button>

              {(product === 'DELIVERY' || product === 'MTF') && !isBuy && (
                <button
                  type="button"
                  onClick={() => sellableQty > 0 && setQtyText(String(sellableQty))}
                  className="block text-[11px] text-gray-400 hover:text-[#00B386] mt-0.5 cursor-pointer"
                >
                  Held: {heldQty} {reservedSell > 0 ? `(${reservedSell} open)` : ''}
                </button>
              )}
              {isExit && position && (
                <button
                  type="button"
                  onClick={() => setQtyText(String(position.quantity))}
                  className="block text-[11px] text-[#00B386] mt-0.5 cursor-pointer font-medium"
                >
                  Open {position.action}: {position.quantity} shares
                </button>
              )}
            </div>

            {/* Input with floating quick-select tooltip pill above it */}
            <div className="relative">
              <div className="absolute -top-7 right-0 z-10 flex items-center bg-[#3E434C] text-white rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-sm select-none">
                {quickQuantities.map((q, idx) => (
                  <React.Fragment key={q}>
                    {idx > 0 && <span className="mx-1.5 text-gray-400 font-normal">|</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setQtyText(String(q));
                        setError('');
                      }}
                      className="hover:text-[#00D09C] transition-colors cursor-pointer tabular-nums"
                    >
                      {q}
                    </button>
                  </React.Fragment>
                ))}
                {/* Little down-pointing triangle */}
                <span className="absolute -bottom-1 right-4 w-2 h-2 bg-[#3E434C] rotate-45" />
              </div>

              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={qtyText}
                onChange={(e) => {
                  setQtyText(e.target.value.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
              />
            </div>
          </div>
        </div>

        {/* Price Row + Order Type Selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypes((s) => !s)}
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <span>Price</span>
              <strong className="font-bold text-gray-900 dark:text-white">
                {ORDER_TYPE_LABEL[orderType]}
              </strong>
              <ChevronsUpDown className="w-3 h-3 text-gray-400" />
            </button>

            {showTypes && (
              <div className="absolute left-0 z-30 mt-1.5 w-44 rounded-xl border border-gray-200 dark:border-[#2E3340] bg-white dark:bg-[#20242F] shadow-xl py-1">
                {([
                  { id: 'MARKET', label: 'Market', desc: 'Execute at best live price', tier: 'free' },
                  { id: 'LIMIT', label: 'Limit', desc: 'Buy/Sell at a target price', tier: 'beginner' },
                  { id: 'SL', label: 'Stop Loss (SL)', desc: 'Trigger + Limit price', tier: 'advanced' },
                  { id: 'SL-M', label: 'SL-Market', desc: 'Trigger at price, fill at market', tier: 'advanced' },
                ] as { id: OrderType; label: string; desc: string; tier: string }[]).map((item) => {
                  const locked = !planConfig.allowedOrderTypes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => switchType(item.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#282D3B] cursor-pointer ${
                        orderType === item.id ? 'bg-gray-50 dark:bg-[#282D3B]' : ''
                      }`}
                    >
                      <div
                        className="text-xs font-semibold flex items-center justify-between"
                        style={{ color: orderType === item.id ? accent : undefined }}
                      >
                        <span>{item.label}</span>
                        {locked && <Lock className="w-3 h-3 text-amber-500" />}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {locked ? `Requires ${item.tier === 'beginner' ? 'Beginner' : 'Advanced'}` : item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {needsPrice ? (
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={priceText}
              onChange={(e) => {
                setPriceText(e.target.value);
                setError('');
              }}
              className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
            />
          ) : (
            <div className="w-[148px] h-9 px-3 rounded-md bg-gray-100/90 dark:bg-[#232732] flex items-center justify-end text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
              At market
            </div>
          )}
        </div>

        {/* Trigger Price Row (for SL / SL-M orders) */}
        {needsTrigger && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Trigger price
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={triggerText}
              onChange={(e) => {
                setTriggerText(e.target.value);
                setError('');
              }}
              className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
            />
          </div>
        )}

        {/* Contextual Information Notices */}
        <div className="min-h-[84px] flex flex-col justify-end space-y-2 pt-2">
          {!tradable && (
            <Notice>
              {SCHEDULED_ORDER_DISCLAIMER}
            </Notice>
          )}
          {intradayBlocked && (
            <Notice warn>
              Intraday cut-off (3:20 PM) passed. Only position exits are permitted during the remainder of today's session.
            </Notice>
          )}
          {product === 'INTRADAY' && tradable && !intradayBlocked && !isExit && (
            <Notice>
              Intraday (MIS) gives <strong>5x leverage</strong> (20% margin). Open positions auto square-off at 3:20 PM (₹59 fee).
            </Notice>
          )}
          {product === 'MTF' && isBuy && (
            <Notice>
              <strong>MTF 5.00x</strong>: Pay <strong>20% ({inr(value / MTF_LEVERAGE)})</strong> margin now; broker funds <strong>80% ({inr(value - value / MTF_LEVERAGE)})</strong> so you can carry delivery holdings past today.
            </Notice>
          )}
          {isExit && position && (
            <Notice>
              Netting against your open <strong>{position.action} ({position.quantity} qty)</strong> position. Margin + P&L will be settled to your balance.
            </Notice>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#EB5B3C] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Footer: Balance, Approx Req & Buy/Sell Button */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2E39] space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          <span>
            Balance : <strong className="font-semibold text-gray-700 dark:text-gray-200">{inr(balance, 0)}</strong>
          </span>

          <button
            type="button"
            onClick={() => {
              if (!planConfig.allowDetailedChargesBreakdown) {
                openUpgradeModal({
                  requiredTier: 'beginner',
                  featureName: 'Full Statutory Charges Breakdown',
                  featureDescription:
                    'Inspecting exact Groww Brokerage, STT, Exchange Txn, SEBI, Stamp Duty, GST & DP charges is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                });
                return;
              }
              setShowCharges((s) => !s);
            }}
            className="cursor-pointer text-right inline-flex items-center gap-1"
            title="Click to view full Groww brokerage & statutory charges breakdown"
          >
            {!planConfig.allowDetailedChargesBreakdown && <Lock className="w-3 h-3 text-amber-500" />}
            <span className="border-b border-dashed border-gray-400">
              {(product === 'DELIVERY' || product === 'MTF') && !isBuy ? 'Est. charges' : 'Approx req.'}
            </span>{' '}
            :{' '}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">
              {(product === 'DELIVERY' || product === 'MTF') && !isBuy ? inr(charges.total, 0) : inr(required, 0)}
            </strong>
          </button>
        </div>

        {/* Expandable Statutory Charges Breakdown */}
        {showCharges && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#20242F] p-3 text-[11px] space-y-1 text-gray-600 dark:text-gray-300 tabular-nums border border-gray-100 dark:border-[#2E3340]">
            <Row label={`Turnover (${qty} × ${inr(effPrice)})`} value={inr(value)} />
            {product === 'INTRADAY' && !isExit && (
              <Row label={`Intraday margin (${INTRADAY_LEVERAGE}x · 20%)`} value={inr(value / INTRADAY_LEVERAGE)} />
            )}
            {product === 'MTF' && isBuy && (
              <>
                <Row label={`Your MTF margin (${MTF_LEVERAGE}.00x · 20%)`} value={inr(value / MTF_LEVERAGE)} />
                <Row label="Funded by broker (80%)" value={inr(value - value / MTF_LEVERAGE)} />
              </>
            )}
            <div className="border-t border-gray-200 dark:border-[#2E3340] my-1" />
            <Row label="Groww Brokerage" value={inr(charges.brokerage)} />
            <Row label="STT" value={inr(charges.stt)} />
            <Row label={`Exchange txn (${exchange})`} value={inr(charges.exchangeTxn)} />
            <Row label="SEBI turnover fee" value={inr(charges.sebi)} />
            <Row label="IPFT" value={inr(charges.ipft)} />
            <Row label="Stamp duty" value={inr(charges.stampDuty)} />
            <Row label="GST (18%)" value={inr(charges.gst)} />
            {charges.dp > 0 && <Row label="DP charges (incl. GST)" value={inr(charges.dp)} />}
            <div className="border-t border-gray-200 dark:border-[#2E3340] my-1" />
            <Row label="Total charges" value={inr(charges.total)} bold />
          </div>
        )}

        {insufficient && !intradayBlocked ? (
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-95"
            style={{ backgroundColor: BUY }}
          >
            Add money (+{inr(Math.ceil(required - balance), 0)})
          </button>
        ) : (
          <button
            type="submit"
            disabled={intradayBlocked || qty <= 0}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
            style={{ backgroundColor: accent }}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900 dark:text-white' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const Notice: React.FC<{ children: React.ReactNode; warn?: boolean }> = ({ children, warn }) => (
  <div
    className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] leading-relaxed ${
      warn
        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
        : 'bg-gray-50 text-gray-600 dark:bg-[#20242F] dark:text-gray-300'
    }`}
  >
    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);
