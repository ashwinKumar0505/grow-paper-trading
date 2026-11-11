/**
 * Pure paper-trading order engine.
 *
 * Every fill (market order, triggered limit / stop-loss, AMO, auto square-off)
 * goes through `applyFill`, so Delivery (CNC) and Intraday (MIS) behave exactly
 * the same way no matter how the order reached the "exchange".
 *
 * The function is side-effect free: it takes the current wallet / holdings /
 * positions and returns the next state plus the executed order record.
 */
import {
  Exchange,
  Holding,
  IntradayPosition,
  Order,
  OrderAction,
  OrderProduct,
  OrderType,
} from '../types/market';
import { calculateCharges } from './charges';

export const INTRADAY_LEVERAGE = 5;

export interface EngineState {
  balance: number;
  holdings: Holding[];
  positions: IntradayPosition[];
}

export interface FillRequest {
  symbol: string;
  stockName: string;
  action: OrderAction;
  product: OrderProduct;
  orderType: OrderType;
  exchange: Exchange;
  quantity: number;
  fillPrice: number;
  limitPrice?: number;
  triggerPrice?: number;
  orderId?: string;
  timestamp?: number;
  /** Additional flat charge, e.g. ₹59 RMS auto square-off fee */
  extraCharge?: number;
  note?: string;
  isAmo?: boolean;
  isSim?: boolean;
}

export type FillResult =
  | {
      ok: true;
      state: EngineState;
      order: Order;
      toast: { title: string; description: string; type: 'success' | 'error' | 'info' };
    }
  | { ok: false; message: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
export const newOrderId = () =>
  `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000 + 1000)}`;
const newPosId = () => 'POS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

export const formatINR = (n: number, digits = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Round a price to the NSE tick size of ₹0.05 */
export const roundToTick = (price: number) => Math.round(price * 20) / 20;

export function applyFill(state: EngineState, req: FillRequest): FillResult {
  const { symbol, stockName, action, product, exchange, quantity } = req;
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isFinite(req.fillPrice) || req.fillPrice <= 0 ||
      !Number.isFinite(state.balance) || !Number.isFinite(req.extraCharge ?? 0) || (req.extraCharge ?? 0) < 0 ||
      !Number.isFinite(quantity * req.fillPrice)) {
    return { ok: false, message: 'Enter a valid whole quantity and positive, finite price.' };
  }
  const price = r2(req.fillPrice);
  if (price <= 0) return { ok: false, message: 'Price must be at least ₹0.01.' };
  const value = r2(price * quantity);
  const charges = r2(
    calculateCharges({ product, action, quantity, price, exchange }).total + (req.extraCharge || 0)
  );

  const baseOrder: Order = {
    id: req.orderId || newOrderId(),
    symbol,
    stockName,
    action,
    product,
    orderType: req.orderType,
    exchange,
    quantity,
    price,
    avgPrice: price,
    limitPrice: req.limitPrice,
    triggerPrice: req.triggerPrice,
    status: 'EXECUTED',
    timestamp: req.timestamp || Date.now(),
    totalAmount: value,
    marginUsed: 0,
    charges,
    note: req.note,
    isAmo: req.isAmo,
    isSim: req.isSim,
  };

  // ------------------------------------------------------------------ DELIVERY
  if (product === 'DELIVERY') {
    if (action === 'BUY') {
      const need = r2(value + charges);
      if (state.balance < need) {
        return {
          ok: false,
          message: `Insufficient funds. Required ${formatINR(need)} (incl. ${formatINR(charges)} charges), available ${formatINR(state.balance)}`,
        };
      }
      const existing = state.holdings.find((h) => h.symbol === symbol);
      const holdings = existing
        ? state.holdings.map((h) => {
            if (h.symbol !== symbol) return h;
            const q = h.quantity + quantity;
            const inv = h.totalInvested + value;
            return { ...h, quantity: q, totalInvested: inv, averagePrice: inv / q };
          })
        : [
            ...state.holdings,
            { symbol, stockName, quantity, averagePrice: price, totalInvested: value, exchange },
          ];
      return {
        ok: true,
        state: { ...state, balance: r2(state.balance - need), holdings },
        order: { ...baseOrder, marginUsed: need },
        toast: {
          title: 'Buy order executed',
          description: `Bought ${quantity} ${symbol} @ ${formatINR(price)}`,
          type: 'success',
        },
      };
    }

    // DELIVERY SELL
    const existing = state.holdings.find((h) => h.symbol === symbol);
    if (!existing || existing.quantity < quantity) {
      return {
        ok: false,
        message: `You can sell only shares you hold. Available quantity: ${existing?.quantity || 0}`,
      };
    }
    const gross = r2((price - existing.totalInvested / existing.quantity) * quantity);
    const realized = r2(gross - charges);
    const holdings = state.holdings
      .map((h) => {
        if (h.symbol !== symbol) return h;
        const q = h.quantity - quantity;
        return { ...h, quantity: q, totalInvested: q * (h.totalInvested / h.quantity), averagePrice: h.totalInvested / h.quantity };
      })
      .filter((h) => h.quantity > 0);
    return {
      ok: true,
      state: { ...state, balance: r2(state.balance + value - charges), holdings },
      order: { ...baseOrder, realizedPnl: realized, grossRealizedPnl: gross },
      toast: {
        title: 'Sell order executed',
        description: `Sold ${quantity} ${symbol} @ ${formatINR(price)} · P&L ${realized >= 0 ? '+' : '-'}${formatINR(Math.abs(realized))}`,
        type: realized >= 0 ? 'success' : 'info',
      },
    };
  }

  // ------------------------------------------------------------------ INTRADAY (MIS)
  const pos = state.positions.find((p) => p.symbol === symbol && p.exchange === exchange);

  // Fresh position or adding to the same side
  if (!pos || pos.action === action) {
    const margin = r2(value / INTRADAY_LEVERAGE);
    const need = r2(margin + charges);
    if (state.balance < need) {
      return {
        ok: false,
        message: `Insufficient margin. Required ${formatINR(need)} (${INTRADAY_LEVERAGE}x leverage, incl. charges), available ${formatINR(state.balance)}`,
      };
    }
    const positions = pos
      ? state.positions.map((p) => {
          if (p.id !== pos.id) return p;
          const q = p.quantity + quantity;
          return {
            ...p,
            quantity: q,
            entryPrice: (p.entryPrice * p.quantity + price * quantity) / q,
            marginBlocked: r2(p.marginBlocked + margin),
          };
        })
      : [
          {
            id: newPosId(),
            symbol,
            stockName,
            action,
            quantity,
            entryPrice: price,
            marginBlocked: margin,
            leverage: INTRADAY_LEVERAGE,
            timestamp: Date.now(),
            exchange,
          },
          ...state.positions,
        ];
    return {
      ok: true,
      state: { ...state, balance: r2(state.balance - need), positions },
      order: { ...baseOrder, marginUsed: margin },
      toast: {
        title: `Intraday ${action === 'BUY' ? 'buy' : 'sell'} executed`,
        description: `${action} ${quantity} ${symbol} @ ${formatINR(price)} · Margin ${formatINR(margin)}`,
        type: 'success',
      },
    };
  }

  // Opposite side → reduce / close / reverse
  const closeQty = Math.min(pos.quantity, quantity);
  const perShare = pos.action === 'BUY' ? price - pos.entryPrice : pos.entryPrice - price;
  const gross = r2(perShare * closeQty);
  const released = r2((pos.marginBlocked * closeQty) / pos.quantity);
  const excessQty = quantity - closeQty;
  const excessMargin = r2((price * excessQty) / INTRADAY_LEVERAGE);
  const afterClose = r2(state.balance + released + gross - charges);

  if (excessQty > 0 && afterClose < excessMargin) {
    return {
      ok: false,
      message: `Insufficient margin to reverse position. Required ${formatINR(excessMargin)}, available after exit ${formatINR(afterClose)}`,
    };
  }

  let positions = state.positions;
  if (quantity < pos.quantity) {
    positions = state.positions.map((p) =>
      p.id === pos.id ? { ...p, quantity: p.quantity - quantity, marginBlocked: r2(p.marginBlocked - released) } : p
    );
  } else if (excessQty === 0) {
    positions = state.positions.filter((p) => p.id !== pos.id);
  } else {
    positions = [
      {
        id: newPosId(),
        symbol,
        stockName,
        action,
        quantity: excessQty,
        entryPrice: price,
        marginBlocked: excessMargin,
        leverage: INTRADAY_LEVERAGE,
        timestamp: Date.now(),
        exchange,
      },
      ...state.positions.filter((p) => p.id !== pos.id),
    ];
  }

  const realized = r2(gross - charges);
  return {
    ok: true,
    state: { ...state, balance: r2(afterClose - excessMargin), positions },
    order: {
      ...baseOrder,
      marginUsed: excessMargin,
      realizedPnl: realized,
      grossRealizedPnl: gross,
      note: req.note || `Squared off ${closeQty} qty`,
    },
    toast: {
      title: excessQty > 0 ? 'Position reversed' : quantity < pos.quantity ? 'Position partially closed' : 'Position closed',
      description: `${action} ${closeQty} ${symbol} @ ${formatINR(price)} · P&L ${realized >= 0 ? '+' : '-'}${formatINR(Math.abs(realized))}`,
      type: realized >= 0 ? 'success' : 'info',
    },
  };
}

/**
 * Funds that must be blocked while an order is waiting in the order book.
 * Mirrors the broker behaviour: buy orders block value + charges, intraday
 * orders block margin, exit orders block nothing.
 */
export function computeBlockAmount(
  state: EngineState,
  p: { symbol: string; action: OrderAction; product: OrderProduct; quantity: number; price: number; exchange: Exchange }
): number {
  const value = p.price * p.quantity;
  const charges = calculateCharges({ ...p }).total;
  if (p.product === 'DELIVERY') {
    return p.action === 'BUY' ? r2(value + charges) : 0;
  }
  const pos = state.positions.find((x) => x.symbol === p.symbol && x.exchange === p.exchange);
  if (pos && pos.action !== p.action) {
    const excess = Math.max(0, p.quantity - pos.quantity);
    return excess > 0 ? r2((excess * p.price) / INTRADAY_LEVERAGE + charges) : 0;
  }
  return r2(value / INTRADAY_LEVERAGE + charges);
}

/** Decides whether a pending order should fill at the given LTP. */
export function evaluatePending(
  order: Order,
  ltp: number
): { fill: boolean; triggerNow: boolean } {
  if (!Number.isFinite(ltp) || ltp <= 0) return { fill: false, triggerNow: false };
  const lim = order.limitPrice ?? order.price;
  const isBuy = order.action === 'BUY';

  if (order.orderType === 'SL' || order.orderType === 'SL-M') {
    const trig = order.triggerPrice ?? lim;
    const hit = order.triggered || (isBuy ? ltp >= trig : ltp <= trig);
    if (!hit) return { fill: false, triggerNow: false };
    if (order.orderType === 'SL-M') return { fill: true, triggerNow: !order.triggered };
    const limitOk = isBuy ? ltp <= lim : ltp >= lim;
    return { fill: limitOk, triggerNow: !order.triggered };
  }

  if (order.orderType === 'MARKET') return { fill: true, triggerNow: false };
  return { fill: isBuy ? ltp <= lim : ltp >= lim, triggerNow: false };
}
