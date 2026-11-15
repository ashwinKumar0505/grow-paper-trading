import React,{ useEffect,useMemo,useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { generateMarketDepth } from '../../../data/mockStocks';
import { Exchange,OrderAction,OrderProduct,OrderType } from '../../../types/market';
import { calculateCharges } from '../../../utils/charges';
import { getISTParts,INTRADAY_SQUARE_OFF_MIN } from '../../../utils/marketHours';
import {
getReservedSellQuantity,
INTRADAY_LEVERAGE,
MTF_LEVERAGE,
roundToTick
} from '../../../utils/orderEngine';

import type { OrderPanelProps } from '../types/orderTicket';
import { BUY,ORDER_TYPE_LABEL,SELL } from '../utils/orderTicket';

export function useOrderTicket({
  stock,
  defaultAction = 'BUY',
  defaultProduct = 'DELIVERY',
  defaultQuantity = 1,
  onClose,
  onPlaced,
}: OrderPanelProps) {
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

  return { balance, holdings, orders, setIsWalletModalOpen, planConfig, openUpgradeModal, action, setAction, product, setProduct, exchange, setExchange, orderType, setOrderType, qtyText, setQtyText, priceText, setPriceText, triggerText, setTriggerText, error, setError, showCharges, setShowCharges, showTypes, setShowTypes, showDepth, setShowDepth, nsePrice, bsePrice, qty, isBuy, accent, needsPrice, needsTrigger, effPrice, heldQty, reservedSell, sellableQty, position, isExit, quickQuantities, charges, value, required, insufficient, tradable, intradayBlocked, depth, switchType, submit, submitLabel };
}

export type OrderTicket = ReturnType<typeof useOrderTicket>;
