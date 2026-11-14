/**
 * Pure paper-trading order engine.
 *
 * Every fill (market order, triggered limit / stop-loss, scheduled AMO, auto square-off)
 * goes through `applyFill`, so Delivery (CNC) and Intraday (MIS) behave consistently.
 *
 * All functions are side-effect free and deterministic.
 */
import {
  Exchange,
  Holding,
  IntradayPosition,
  Order,
  OrderAction,
  OrderProduct,
  OrderType,
  PlaceOrderInput,
  QuoteFreshness,
  Stock,
} from '../types/market';
import { calculateCharges } from './charges';
import {
  classifyQuoteFreshness,
  getIndianMarketStatus,
  isPastIntradayCutoff,
  isPastSessionClose,
  MarketCalendarConfig,
  MarketStatus,
} from './marketHours';

export const INTRADAY_LEVERAGE = 5;
export const MTF_LEVERAGE = 5;

export const SCHEDULED_ORDER_DISCLAIMER =
  'Your order will be submitted for virtual execution during the next eligible market session. The execution price may differ from the last available price.';

export interface EngineState {
  balance: number;
  holdings: Holding[];
  positions: IntradayPosition[];
}

export interface OrderBookState extends EngineState {
  orders: Order[];
  /** Set of idempotency keys that have already been executed to prevent duplicate fills */
  executedOrderKeys?: string[];
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
  placedAt?: number;
  executedAt?: number;
  /** Additional flat charge, e.g. ₹59 RMS auto square-off fee */
  extraCharge?: number;
  note?: string;
  isAmo?: boolean;
  scheduledForSession?: string;
  idempotencyKey?: string;
  quoteFreshness?: QuoteFreshness;
  filledQuantity?: number;
  remainingQuantity?: number;
}

export type FillResult =
  | {
      ok: true;
      state: EngineState;
      order: Order;
      toast: { title: string; description: string; type: 'success' | 'error' | 'info' };
    }
  | { ok: false; message: string };

export interface SubmitOrderContext {
  stock?: Stock;
  now?: number;
  marketStatus?: MarketStatus;
  calendar?: MarketCalendarConfig;
  /** Optional liquidity cap for partial-fill simulation in tests/execution */
  availableLiquidity?: number;
  idempotencyKey?: string;
}

export interface SubmitOrderResult {
  success: boolean;
  message: string;
  orderId?: string;
  order?: Order;
  state: OrderBookState;
  toast?: { title: string; description: string; type: 'success' | 'error' | 'info' };
}

export interface ProcessQueueContext {
  quotes: Record<string, Stock | undefined>;
  now?: number;
  marketStatus?: MarketStatus;
  calendar?: MarketCalendarConfig;
  /** Optional per-symbol liquidity limit for partial-fill support */
  liquidityBySymbol?: Record<string, number>;
}

export interface ProcessQueueResult {
  state: OrderBookState;
  changed: boolean;
  executedOrders: Order[];
  rejectedOrders: Order[];
  expiredOrders: Order[];
  activatedOrders: Order[];
  toasts: Array<{ title: string; description: string; type: 'success' | 'error' | 'info' }>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
export const newOrderId = () =>
  `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000 + 1000)}`;
const newPosId = () => 'POS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

export const formatINR = (n: number, digits = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Round a price to the NSE tick size of ₹0.05 */
export const roundToTick = (price: number) => Math.round(price * 20) / 20;

/**
 * Returns total shares of `symbol` already reserved by active `PENDING` or `SCHEDULED`
 * Delivery SELL orders so users cannot double-commit the same holdings.
 */
export function getReservedSellQuantity(
  orders: Order[],
  symbol: string,
  exchange?: Exchange,
  excludeOrderId?: string
): number {
  return orders
    .filter(
      (o) =>
        o.id !== excludeOrderId &&
        (o.status === 'PENDING' || o.status === 'SCHEDULED') &&
        (o.product === 'DELIVERY' || o.product === 'MTF') &&
        o.action === 'SELL' &&
        o.symbol === symbol &&
        (!exchange || o.exchange === exchange)
    )
    .reduce((sum, o) => sum + (o.remainingQuantity ?? o.quantity), 0);
}

export function applyFill(state: EngineState, req: FillRequest): FillResult {
  const { symbol, stockName, action, product, exchange, quantity } = req;
  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(req.fillPrice) ||
    req.fillPrice <= 0 ||
    !Number.isFinite(state.balance) ||
    !Number.isFinite(req.extraCharge ?? 0) ||
    (req.extraCharge ?? 0) < 0 ||
    !Number.isFinite(quantity * req.fillPrice)
  ) {
    return { ok: false, message: 'Enter a valid whole quantity and positive, finite price.' };
  }
  const price = r2(req.fillPrice);
  if (price <= 0) return { ok: false, message: 'Price must be at least ₹0.01.' };
  const value = r2(price * quantity);
  const charges = r2(
    calculateCharges({ product, action, quantity, price, exchange }).total + (req.extraCharge || 0)
  );
  const nowTs = req.timestamp || Date.now();
  const orderId = req.orderId || newOrderId();

  const baseOrder: Order = {
    id: orderId,
    symbol,
    stockName,
    action,
    product,
    orderType: req.orderType,
    exchange,
    quantity,
    filledQuantity: req.filledQuantity ?? quantity,
    remainingQuantity: req.remainingQuantity ?? 0,
    price,
    avgPrice: price,
    executionPrice: price,
    limitPrice: req.limitPrice,
    triggerPrice: req.triggerPrice,
    status: 'EXECUTED',
    timestamp: nowTs,
    placedAt: req.placedAt ?? nowTs,
    executedAt: req.executedAt ?? nowTs,
    totalAmount: value,
    marginUsed: 0,
    charges,
    note: req.note,
    isAmo: req.isAmo,
    scheduledForSession: req.scheduledForSession,
    idempotencyKey: req.idempotencyKey ?? `${orderId}:${req.executedAt ?? nowTs}`,
    quoteFreshness: req.quoteFreshness,
  };

  // ------------------------------------------------------------------ DELIVERY & MTF (5x Delivery Margin)
  if (product === 'DELIVERY' || product === 'MTF') {
    const isMtf = product === 'MTF';
    if (action === 'BUY') {
      const margin = isMtf ? r2(value / MTF_LEVERAGE) : value;
      const loan = isMtf ? r2(value - margin) : 0;
      const need = r2(margin + charges);
      if (state.balance < need) {
        return {
          ok: false,
          message: `Insufficient funds. Required ${formatINR(need)} (${isMtf ? `${MTF_LEVERAGE}x MTF margin, ` : ''}incl. ${formatINR(charges)} charges), available ${formatINR(state.balance)}`,
        };
      }
      const existing = state.holdings.find((h) => h.symbol === symbol);
      const holdings = existing
        ? state.holdings.map((h) => {
            if (h.symbol !== symbol) return h;
            const q = h.quantity + quantity;
            const inv = h.totalInvested + value;
            return {
              ...h,
              quantity: q,
              totalInvested: inv,
              averagePrice: inv / q,
              mtfMarginBlocked: r2((h.mtfMarginBlocked ?? 0) + (isMtf ? margin : 0)),
              mtfLoanAmount: r2((h.mtfLoanAmount ?? 0) + loan),
            };
          })
        : [
            ...state.holdings,
            {
              symbol,
              stockName,
              quantity,
              averagePrice: price,
              totalInvested: value,
              exchange,
              mtfMarginBlocked: isMtf ? margin : 0,
              mtfLoanAmount: loan,
            },
          ];
      return {
        ok: true,
        state: { ...state, balance: r2(state.balance - need), holdings },
        order: { ...baseOrder, marginUsed: isMtf ? margin : need },
        toast: {
          title: `${isMtf ? 'MTF 5x buy' : 'Buy'} order executed`,
          description: `Bought ${quantity} ${symbol} @ ${formatINR(price)}${isMtf ? ` · Margin ${formatINR(margin)}` : ''}`,
          type: 'success',
        },
      };
    }

    // DELIVERY / MTF SELL
    const existing = state.holdings.find((h) => h.symbol === symbol);
    if (!existing || existing.quantity < quantity) {
      return {
        ok: false,
        message: `You can sell only shares you hold. Available quantity: ${existing?.quantity || 0}`,
      };
    }
    const gross = r2((price - existing.totalInvested / existing.quantity) * quantity);
    const realized = r2(gross - charges);
    const repaidLoan = r2(((existing.mtfLoanAmount ?? 0) * quantity) / existing.quantity);
    const releasedMtfMargin = r2(((existing.mtfMarginBlocked ?? 0) * quantity) / existing.quantity);
    const holdings = state.holdings
      .map((h) => {
        if (h.symbol !== symbol) return h;
        const q = h.quantity - quantity;
        return {
          ...h,
          quantity: q,
          totalInvested: q * (h.totalInvested / h.quantity),
          averagePrice: h.totalInvested / h.quantity,
          mtfMarginBlocked: Math.max(0, r2((h.mtfMarginBlocked ?? 0) - releasedMtfMargin)),
          mtfLoanAmount: Math.max(0, r2((h.mtfLoanAmount ?? 0) - repaidLoan)),
        };
      })
      .filter((h) => h.quantity > 0);
    return {
      ok: true,
      state: { ...state, balance: r2(state.balance + value - repaidLoan - charges), holdings },
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
            timestamp: nowTs,
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
      p.id === pos.id
        ? { ...p, quantity: p.quantity - quantity, marginBlocked: r2(p.marginBlocked - released) }
        : p
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
        timestamp: nowTs,
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
      title:
        excessQty > 0
          ? 'Position reversed'
          : quantity < pos.quantity
            ? 'Position partially closed'
            : 'Position closed',
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
  p: {
    symbol: string;
    action: OrderAction;
    product: OrderProduct;
    quantity: number;
    price: number;
    exchange: Exchange;
  }
): number {
  const value = p.price * p.quantity;
  const charges = calculateCharges({ ...p }).total;
  if (p.product === 'DELIVERY') {
    return p.action === 'BUY' ? r2(value + charges) : 0;
  }
  if (p.product === 'MTF') {
    return p.action === 'BUY' ? r2(value / MTF_LEVERAGE + charges) : 0;
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

/**
 * Places a virtual order during market hours (live execution or PENDING order book)
 * or outside market hours (queued as SCHEDULED / AMO for the next trading session).
 */
export function submitOrder(
  state: OrderBookState,
  input: PlaceOrderInput,
  context: SubmitOrderContext
): SubmitOrderResult {
  const now = context.now ?? Date.now();
  const marketStatus = context.marketStatus ?? getIndianMarketStatus(now, context.calendar);
  const stock = context.stock;
  const { symbol, stockName, action, product, orderType, quantity, exchange } = input;

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return {
      success: false,
      message: 'Quantity must be a positive whole number of shares.',
      state,
    };
  }

  if (!stock || !Number.isFinite(stock.price) || stock.price <= 0) {
    const rejected: Order = {
      id: newOrderId(),
      symbol,
      stockName,
      action,
      product,
      orderType,
      exchange,
      quantity,
      price: 0,
      status: 'REJECTED',
      timestamp: now,
      placedAt: now,
      totalAmount: 0,
      marginUsed: 0,
      charges: 0,
      rejectionReason: 'Market quote is unavailable for this symbol.',
    };
    return {
      success: false,
      message: rejected.rejectionReason!,
      orderId: rejected.id,
      order: rejected,
      state: { ...state, orders: [rejected, ...state.orders] },
      toast: { title: 'Order rejected', description: rejected.rejectionReason!, type: 'error' },
    };
  }

  const ltp = roundToTick(stock.price);
  const limitPrice = input.limitPrice !== undefined ? roundToTick(input.limitPrice) : undefined;
  const triggerPrice =
    input.triggerPrice !== undefined ? roundToTick(input.triggerPrice) : undefined;

  const reject = (reason: string): SubmitOrderResult => {
    const rej: Order = {
      id: newOrderId(),
      symbol,
      stockName,
      action,
      product,
      orderType,
      exchange,
      quantity,
      price: limitPrice || triggerPrice || ltp,
      limitPrice,
      triggerPrice,
      status: 'REJECTED',
      timestamp: now,
      placedAt: now,
      totalAmount: r2((limitPrice || ltp) * quantity),
      marginUsed: 0,
      charges: 0,
      rejectionReason: reason,
    };
    return {
      success: false,
      message: reason,
      orderId: rej.id,
      order: rej,
      state: { ...state, orders: [rej, ...state.orders] },
      toast: { title: 'Order rejected', description: reason, type: 'error' },
    };
  };

  if ((orderType === 'LIMIT' || orderType === 'SL') && (!limitPrice || !Number.isFinite(limitPrice) || limitPrice <= 0)) {
    return reject('Enter a valid limit price.');
  }
  if ((orderType === 'SL' || orderType === 'SL-M') && (!triggerPrice || !Number.isFinite(triggerPrice) || triggerPrice <= 0)) {
    return reject('Enter a valid trigger price.');
  }

  // Price-band (circuit limit) check
  const checkBandPrice = orderType === 'MARKET' || orderType === 'SL-M' ? ltp : limitPrice!;
  if (
    stock.lowerCircuit &&
    stock.lowerCircuit > 0 &&
    stock.upperCircuit &&
    stock.upperCircuit > 0 &&
    (checkBandPrice < stock.lowerCircuit || checkBandPrice > stock.upperCircuit)
  ) {
    return reject(
      `Price ${formatINR(checkBandPrice)} is outside today's circuit band (${formatINR(stock.lowerCircuit)} – ${formatINR(stock.upperCircuit)})`
    );
  }

  if (orderType === 'SL') {
    if (action === 'BUY' && limitPrice! < triggerPrice!) {
      return reject('For a Buy SL order, limit price must be ≥ trigger price.');
    }
    if (action === 'SELL' && limitPrice! > triggerPrice!) {
      return reject('For a Sell SL order, limit price must be ≤ trigger price.');
    }
  }

  // Check Delivery / MTF SELL holdings including shares already reserved by PENDING or SCHEDULED orders
  if ((product === 'DELIVERY' || product === 'MTF') && action === 'SELL') {
    const held = state.holdings.find((h) => h.symbol === symbol)?.quantity || 0;
    const reserved = getReservedSellQuantity(state.orders, symbol, exchange);
    const available = held - reserved;
    if (available < quantity) {
      return reject(
        `Insufficient holdings. Held: ${held}, reserved in open/scheduled orders: ${reserved}, available to sell: ${Math.max(0, available)}`
      );
    }
  }

  const refPrice = limitPrice || triggerPrice || ltp;
  const blockAmount = computeBlockAmount(state, {
    symbol,
    action,
    product,
    quantity,
    price: refPrice,
    exchange,
  });

  // ------------------------------------------------------------------ MARKET CLOSED -> SCHEDULED (AMO)
  if (!marketStatus.isOpen) {
    if (state.balance < blockAmount) {
      return reject(
        `Insufficient funds to schedule order. Required ${formatINR(blockAmount)}, available ${formatINR(state.balance)}`
      );
    }

    const orderId = newOrderId();
    const scheduledOrder: Order = {
      id: orderId,
      symbol,
      stockName,
      action,
      product,
      orderType,
      exchange,
      quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      price: refPrice,
      limitPrice,
      triggerPrice,
      status: 'SCHEDULED',
      timestamp: now,
      placedAt: now,
      totalAmount: r2(refPrice * quantity),
      marginUsed: blockAmount,
      blockedAmount: blockAmount,
      charges: r2(
        calculateCharges({ product, action, quantity, price: refPrice, exchange }).total
      ),
      isAmo: true,
      scheduledForSession: marketStatus.nextSessionDateKey,
      idempotencyKey: context.idempotencyKey ?? `sched:${orderId}:${marketStatus.nextSessionDateKey}`,
      quoteFreshness: 'LAST_AVAILABLE',
      note: SCHEDULED_ORDER_DISCLAIMER,
    };

    const nextState: OrderBookState = {
      ...state,
      balance: r2(state.balance - blockAmount),
      orders: [scheduledOrder, ...state.orders],
    };

    const msg = `Scheduled ${action} order for ${quantity} ${symbol} (${orderType}) queued for the next trading session (${marketStatus.nextSessionDateKey}).`;
    return {
      success: true,
      message: msg,
      orderId,
      order: scheduledOrder,
      state: nextState,
      toast: {
        title: `Order scheduled (${action === 'BUY' ? 'Schedule Buy' : 'Schedule Sell'})`,
        description: SCHEDULED_ORDER_DISCLAIMER,
        type: 'info',
      },
    };
  }

  // ------------------------------------------------------------------ MARKET OPEN -> LIVE / PENDING
  const freshnessInfo = classifyQuoteFreshness(stock, marketStatus, now);
  if (!freshnessInfo.isTradable) {
    return reject(
      freshnessInfo.reason ||
        'Live market quote is stale or unavailable. Order execution is paused until fresh quotes arrive.'
    );
  }

  if (product === 'INTRADAY' && isPastIntradayCutoff(now, now, context.calendar)) {
    const pos = state.positions.find((p) => p.symbol === symbol && p.exchange === exchange);
    const isClosingOnly = pos && pos.action !== action && quantity <= pos.quantity;
    if (!isClosingOnly) {
      return reject(
        'Intraday (MIS) fresh orders are blocked after 03:20 PM IST (auto square-off window). Use Delivery (CNC) or schedule for the next session after market close.'
      );
    }
  }

  const probeOrder: Order = {
    id: 'probe',
    symbol,
    stockName,
    action,
    product,
    orderType,
    exchange,
    quantity,
    price: refPrice,
    limitPrice,
    triggerPrice,
    status: 'PENDING',
    timestamp: now,
    placedAt: now,
    totalAmount: r2(refPrice * quantity),
    marginUsed: 0,
    charges: 0,
  };

  const evalRes = evaluatePending(probeOrder, ltp);
  const canFillNow = orderType === 'MARKET' || evalRes.fill;

  if (canFillNow) {
    const idempotencyKey = context.idempotencyKey ?? `exec:${symbol}:${action}:${now}:${quantity}`;
    if (state.executedOrderKeys?.includes(idempotencyKey)) {
      const existingOrder = state.orders.find((o) => o.idempotencyKey === idempotencyKey);
      return {
        success: true,
        message: 'Order already executed (idempotent).',
        orderId: existingOrder?.id,
        order: existingOrder,
        state,
      };
    }

    const maxFillQty =
      context.availableLiquidity !== undefined && context.availableLiquidity > 0
        ? Math.min(quantity, Math.floor(context.availableLiquidity))
        : quantity;

    const res = applyFill(state, {
      symbol,
      stockName,
      action,
      product,
      orderType,
      exchange,
      quantity: maxFillQty,
      filledQuantity: maxFillQty,
      remainingQuantity: quantity - maxFillQty,
      fillPrice: ltp,
      limitPrice,
      triggerPrice,
      timestamp: now,
      placedAt: now,
      executedAt: now,
      idempotencyKey,
      quoteFreshness: freshnessInfo.freshness,
      note:
        maxFillQty < quantity
          ? `Partially filled (${maxFillQty}/${quantity} shares); remaining ${quantity - maxFillQty} shares queued`
          : undefined,
    });

    if (!res.ok) {
      return reject(res.message);
    }

    let nextOrders = [res.order, ...state.orders];
    let nextBalance = res.state.balance;

    // If partially filled, create a PENDING order for the remaining quantity
    if (maxFillQty < quantity) {
      const remQty = quantity - maxFillQty;
      const remBlock = computeBlockAmount(res.state, {
        symbol,
        action,
        product,
        quantity: remQty,
        price: refPrice,
        exchange,
      });
      if (nextBalance >= remBlock) {
        nextBalance = r2(nextBalance - remBlock);
        const remainderOrder: Order = {
          id: newOrderId(),
          symbol,
          stockName,
          action,
          product,
          orderType: orderType === 'MARKET' ? 'LIMIT' : orderType,
          exchange,
          quantity: remQty,
          filledQuantity: 0,
          remainingQuantity: remQty,
          price: refPrice,
          limitPrice: limitPrice ?? ltp,
          triggerPrice,
          status: 'PENDING',
          timestamp: now,
          placedAt: now,
          totalAmount: r2(refPrice * remQty),
          marginUsed: remBlock,
          blockedAmount: remBlock,
          charges: r2(
            calculateCharges({ product, action, quantity: remQty, price: refPrice, exchange }).total
          ),
          quoteFreshness: freshnessInfo.freshness,
          note: `Remaining ${remQty} of ${quantity} shares from partial fill`,
        };
        nextOrders = [remainderOrder, ...nextOrders];
      }
    }

    const nextState: OrderBookState = {
      ...res.state,
      balance: nextBalance,
      orders: nextOrders,
      executedOrderKeys: [...(state.executedOrderKeys || []), res.order.idempotencyKey!],
    };

    return {
      success: true,
      message: `${res.toast.title}: ${res.toast.description}`,
      orderId: res.order.id,
      order: res.order,
      state: nextState,
      toast: res.toast,
    };
  }

  // Place into PENDING order book with blocked funds
  if (state.balance < blockAmount) {
    return reject(
      `Insufficient funds to place order. Required ${formatINR(blockAmount)}, available ${formatINR(state.balance)}`
    );
  }

  const pendingOrder: Order = {
    id: newOrderId(),
    symbol,
    stockName,
    action,
    product,
    orderType,
    exchange,
    quantity,
    filledQuantity: 0,
    remainingQuantity: quantity,
    price: refPrice,
    limitPrice,
    triggerPrice,
    status: 'PENDING',
    triggered: evalRes.triggerNow,
    timestamp: now,
    placedAt: now,
    totalAmount: r2(refPrice * quantity),
    marginUsed: blockAmount,
    blockedAmount: blockAmount,
    charges: r2(
      calculateCharges({ product, action, quantity, price: refPrice, exchange }).total
    ),
    quoteFreshness: freshnessInfo.freshness,
    note:
      orderType === 'LIMIT'
        ? `Waiting for ${action === 'BUY' ? '≤' : '≥'} ${formatINR(limitPrice!)}`
        : `Trigger at ${formatINR(triggerPrice!)}${orderType === 'SL' ? ` · Limit ${formatINR(limitPrice!)}` : ' · Market'}`,
  };

  const nextState: OrderBookState = {
    ...state,
    balance: r2(state.balance - blockAmount),
    orders: [pendingOrder, ...state.orders],
  };

  const msg = `${orderType} ${action} order placed for ${quantity} ${symbol} (Open/Pending)`;
  return {
    success: true,
    message: msg,
    orderId: pendingOrder.id,
    order: pendingOrder,
    state: nextState,
    toast: {
      title: 'Order placed (Open)',
      description: `${action} ${quantity} ${symbol} · ${pendingOrder.note}`,
      type: 'info',
    },
  };
}

/**
 * Cancels a SCHEDULED or PENDING order and releases any blocked funds / reserved shares.
 * Idempotent: cancelling an already cancelled/executed order is a safe no-op.
 */
export function cancelOrder(
  state: OrderBookState,
  orderId: string,
  now: number = Date.now()
): {
  cancelled: boolean;
  order?: Order;
  state: OrderBookState;
  toast?: { title: string; description: string; type: 'success' | 'error' | 'info' };
} {
  const target = state.orders.find((o) => o.id === orderId);
  if (!target || (target.status !== 'PENDING' && target.status !== 'SCHEDULED')) {
    return { cancelled: false, order: target, state };
  }

  const refund = target.blockedAmount || 0;
  const cancelledOrder: Order = {
    ...target,
    status: 'CANCELLED',
    blockedAmount: 0,
    note: `${target.status === 'SCHEDULED' ? 'Scheduled order' : 'Order'} cancelled by user`,
    timestamp: target.timestamp,
    placedAt: target.placedAt ?? target.timestamp,
  };

  const nextState: OrderBookState = {
    ...state,
    balance: r2(state.balance + refund),
    orders: state.orders.map((o) => (o.id === orderId ? cancelledOrder : o)),
  };

  return {
    cancelled: true,
    order: cancelledOrder,
    state: nextState,
    toast: {
      title: 'Order cancelled',
      description: `${target.action} ${target.quantity} ${target.symbol}${refund > 0 ? ` · Refunded ${formatINR(refund)}` : ''}`,
      type: 'info',
    },
  };
}

/**
 * Processes all SCHEDULED and PENDING orders against current market status and quotes.
 * - Executes eligible SCHEDULED orders when the market session opens and valid quotes exist.
 * - Transitions non-marketable SCHEDULED limit/SL orders into PENDING during the session.
 * - Executes triggered PENDING orders when prices match.
 * - Expires unexecuted day orders at session cutoff/close and refunds blocked funds.
 * - Enforces idempotency so no order can be filled twice.
 */
export function processOrderQueue(
  state: OrderBookState,
  context: ProcessQueueContext
): ProcessQueueResult {
  const now = context.now ?? Date.now();
  const marketStatus = context.marketStatus ?? getIndianMarketStatus(now, context.calendar);
  const executedKeys = new Set<string>(state.executedOrderKeys || []);

  let wallet: EngineState = {
    balance: state.balance,
    holdings: state.holdings,
    positions: state.positions,
  };
  let changed = false;
  const executedOrders: Order[] = [];
  const rejectedOrders: Order[] = [];
  const expiredOrders: Order[] = [];
  const activatedOrders: Order[] = [];
  const toasts: Array<{ title: string; description: string; type: 'success' | 'error' | 'info' }> =
    [];

  // Process oldest orders first (FIFO priority), then restore reverse-chronological order list
  const indexedOrders = state.orders.map((order, idx) => ({ order, idx }));
  const activeQueue = indexedOrders
    .filter((item) => item.order.status === 'SCHEDULED' || item.order.status === 'PENDING')
    .sort((a, b) => (a.order.placedAt ?? a.order.timestamp) - (b.order.placedAt ?? b.order.timestamp));

  const updatedById = new Map<string, Order>();
  const extraOrders: Order[] = [];

  for (const { order: ord } of activeQueue) {
    const idempKey = ord.idempotencyKey || `order:${ord.id}`;
    if (executedKeys.has(idempKey)) {
      continue;
    }

    // 1. Check expiry for PENDING orders (or SCHEDULED orders whose target session has already closed)
    if (ord.status === 'PENDING') {
      const sessionAnchorTs = ord.timestamp;
      const shouldExpire =
        ord.product === 'INTRADAY'
          ? isPastIntradayCutoff(sessionAnchorTs, now, context.calendar)
          : isPastSessionClose(sessionAnchorTs, now, context.calendar);

      if (shouldExpire) {
        const refund = ord.blockedAmount || 0;
        wallet = { ...wallet, balance: r2(wallet.balance + refund) };
        const expired: Order = {
          ...ord,
          status: 'EXPIRED',
          blockedAmount: 0,
          note:
            ord.product === 'INTRADAY'
              ? 'Expired at 03:20 PM IST intraday cutoff'
              : 'Day order expired at market close (03:30 PM IST)',
        };
        updatedById.set(ord.id, expired);
        expiredOrders.push(expired);
        changed = true;
        toasts.push({
          title: 'Order expired',
          description: `${ord.orderType} ${ord.action} ${ord.quantity} ${ord.symbol} expired at session close.`,
          type: 'info',
        });
        continue;
      }
    }

    if (ord.status === 'SCHEDULED' && ord.scheduledForSession) {
      // If the scheduled session date has strictly passed without execution, expire it
      if (
        ord.scheduledForSession < marketStatus.dateKey ||
        (ord.scheduledForSession === marketStatus.dateKey &&
          !marketStatus.isOpen &&
          marketStatus.sessionPhase === 'POST_CLOSE')
      ) {
        const refund = ord.blockedAmount || 0;
        wallet = { ...wallet, balance: r2(wallet.balance + refund) };
        const expired: Order = {
          ...ord,
          status: 'EXPIRED',
          blockedAmount: 0,
          note: `Scheduled order expired after session ${ord.scheduledForSession} closed without valid execution`,
        };
        updatedById.set(ord.id, expired);
        expiredOrders.push(expired);
        changed = true;
        toasts.push({
          title: 'Scheduled order expired',
          description: `${ord.action} ${ord.quantity} ${ord.symbol} expired after session ${ord.scheduledForSession}.`,
          type: 'info',
        });
        continue;
      }
    }

    // 2. If market is closed, SCHEDULED and PENDING orders do not execute
    if (!marketStatus.isOpen) {
      continue;
    }

    // For SCHEDULED orders, ensure today is on or after the target session date
    if (
      ord.status === 'SCHEDULED' &&
      ord.scheduledForSession &&
      ord.scheduledForSession > marketStatus.dateKey
    ) {
      continue;
    }

    // 3. Market is open -> check quote freshness
    const stock = context.quotes[ord.symbol];
    const freshnessInfo = classifyQuoteFreshness(stock, marketStatus, now);
    if (!stock || !freshnessInfo.isTradable) {
      // Hold in queue until a valid, fresh quote is available
      continue;
    }

    const fillLtp = roundToTick(stock.price);

    // Check circuit band at session execution time
    if (
      stock.lowerCircuit &&
      stock.lowerCircuit > 0 &&
      stock.upperCircuit &&
      stock.upperCircuit > 0 &&
      (fillLtp < stock.lowerCircuit || fillLtp > stock.upperCircuit)
    ) {
      const refund = ord.blockedAmount || 0;
      wallet = { ...wallet, balance: r2(wallet.balance + refund) };
      const rejected: Order = {
        ...ord,
        status: 'REJECTED',
        blockedAmount: 0,
        rejectionReason: `Execution price ${formatINR(fillLtp)} is outside circuit limits (${formatINR(stock.lowerCircuit)} – ${formatINR(stock.upperCircuit)})`,
      };
      updatedById.set(ord.id, rejected);
      rejectedOrders.push(rejected);
      changed = true;
      toasts.push({
        title: 'Order rejected at session open',
        description: rejected.rejectionReason!,
        type: 'error',
      });
      continue;
    }

    const evalRes = evaluatePending(ord, fillLtp);

    if (!evalRes.fill) {
      // If it was SCHEDULED, activate it into PENDING for the active market session
      if (ord.status === 'SCHEDULED') {
        const activated: Order = {
          ...ord,
          status: 'PENDING',
          triggered: evalRes.triggerNow || ord.triggered,
          timestamp: now,
          quoteFreshness: freshnessInfo.freshness,
          note:
            ord.orderType === 'LIMIT'
              ? `Active in market session · Waiting for ${ord.action === 'BUY' ? '≤' : '≥'} ${formatINR(ord.limitPrice ?? ord.price)}`
              : `Active in market session · Trigger at ${formatINR(ord.triggerPrice ?? ord.price)}`,
        };
        updatedById.set(ord.id, activated);
        activatedOrders.push(activated);
        changed = true;
      } else if (evalRes.triggerNow && !ord.triggered) {
        const triggeredOrd: Order = {
          ...ord,
          triggered: true,
          note: `Stop-loss triggered @ ${formatINR(fillLtp)} · Waiting for limit ${formatINR(ord.limitPrice!)}`,
        };
        updatedById.set(ord.id, triggeredOrd);
        changed = true;
        toasts.push({
          title: 'Stop-loss triggered',
          description: `${ord.symbol} hit ${formatINR(fillLtp)} — limit order now active`,
          type: 'info',
        });
      }
      continue;
    }

    // 4. Order is eligible to fill at `fillLtp`
    const refund = ord.blockedAmount || 0;
    const refundedWallet: EngineState = {
      ...wallet,
      balance: r2(wallet.balance + refund),
    };

    const totalQty = ord.remainingQuantity ?? ord.quantity;
    const maxLiq = context.liquidityBySymbol?.[ord.symbol];
    const fillQty =
      maxLiq !== undefined && maxLiq > 0 ? Math.min(totalQty, Math.floor(maxLiq)) : totalQty;

    const res = applyFill(refundedWallet, {
      symbol: ord.symbol,
      stockName: ord.stockName,
      action: ord.action,
      product: ord.product,
      orderType: ord.orderType,
      exchange: ord.exchange,
      quantity: fillQty,
      filledQuantity: fillQty,
      remainingQuantity: totalQty - fillQty,
      fillPrice: fillLtp,
      limitPrice: ord.limitPrice,
      triggerPrice: ord.triggerPrice,
      orderId: ord.id,
      timestamp: now,
      placedAt: ord.placedAt ?? ord.timestamp,
      executedAt: now,
      isAmo: ord.isAmo,
      scheduledForSession: ord.scheduledForSession,
      idempotencyKey: idempKey,
      quoteFreshness: freshnessInfo.freshness,
      note:
        ord.status === 'SCHEDULED'
          ? `Scheduled AMO executed at session price ${formatINR(fillLtp)}`
          : `${ord.orderType} triggered @ ${formatINR(fillLtp)}`,
    });

    if (res.ok) {
      wallet = res.state;
      executedKeys.add(idempKey);
      updatedById.set(ord.id, res.order);
      executedOrders.push(res.order);
      changed = true;
      toasts.push({
        title: ord.status === 'SCHEDULED' ? `Scheduled ${ord.action} executed` : `${ord.orderType} order executed`,
        description: res.toast.description,
        type: 'success',
      });

      // If partial fill, keep remaining quantity as an open PENDING order
      if (fillQty < totalQty) {
        const remQty = totalQty - fillQty;
        const refPrice = ord.limitPrice || ord.triggerPrice || fillLtp;
        const remBlock = computeBlockAmount(wallet, {
          symbol: ord.symbol,
          action: ord.action,
          product: ord.product,
          quantity: remQty,
          price: refPrice,
          exchange: ord.exchange,
        });
        if (wallet.balance >= remBlock) {
          wallet = { ...wallet, balance: r2(wallet.balance - remBlock) };
          extraOrders.push({
            ...ord,
            id: newOrderId(),
            quantity: remQty,
            filledQuantity: 0,
            remainingQuantity: remQty,
            status: 'PENDING',
            timestamp: now,
            placedAt: ord.placedAt ?? ord.timestamp,
            blockedAmount: remBlock,
            marginUsed: remBlock,
            idempotencyKey: `${idempKey}:rem:${remQty}`,
            note: `Remaining ${remQty} shares after partial fill of ${fillQty} shares`,
          });
        }
      }
    } else {
      wallet = refundedWallet;
      const rejected: Order = {
        ...ord,
        status: 'REJECTED',
        blockedAmount: 0,
        rejectionReason: res.message,
        note: res.message,
      };
      updatedById.set(ord.id, rejected);
      rejectedOrders.push(rejected);
      changed = true;
      toasts.push({
        title: `${ord.status === 'SCHEDULED' ? 'Scheduled' : ord.orderType} order rejected`,
        description: res.message,
        type: 'error',
      });
    }
  }

  if (!changed) {
    return {
      state,
      changed: false,
      executedOrders: [],
      rejectedOrders: [],
      expiredOrders: [],
      activatedOrders: [],
      toasts: [],
    };
  }

  const nextOrders = [
    ...extraOrders,
    ...state.orders.map((o) => updatedById.get(o.id) ?? o),
  ];

  return {
    state: {
      ...wallet,
      orders: nextOrders,
      executedOrderKeys: Array.from(executedKeys),
    },
    changed: true,
    executedOrders,
    rejectedOrders,
    expiredOrders,
    activatedOrders,
    toasts,
  };
}

/**
 * Safely migrates legacy persisted paper-trading state:
 * - Removes `isSim` and `isSimulating` flags
 * - Normalizes `placedAt` and `executionPrice` on existing orders
 * - Converts legacy `PENDING` AMO orders (`isAmo: true`) placed outside market hours to `SCHEDULED`
 */
export function migrateLegacyPaperState(
  raw: Record<string, unknown> | null | undefined,
  now: number = Date.now(),
  calendar?: MarketCalendarConfig
): {
  balance?: number;
  holdings?: Holding[];
  positions?: IntradayPosition[];
  orders?: Order[];
  executedOrderKeys?: string[];
  autoSquareOffEnabled?: boolean;
} {
  if (!raw || typeof raw !== 'object') return {};
  const marketStatus = getIndianMarketStatus(now, calendar);

  const rawOrders = Array.isArray(raw.orders) ? (raw.orders as Array<Record<string, unknown>>) : undefined;
  const migratedOrders: Order[] | undefined = rawOrders?.map((item) => {
    const rest = { ...item };
    delete rest.isSim;

    const status = String(rest.status || 'PENDING') as Order['status'];
    const ts = typeof rest.timestamp === 'number' ? rest.timestamp : now;
    const placedAt = typeof rest.placedAt === 'number' ? rest.placedAt : ts;
    const isAmo = Boolean(rest.isAmo);

    // Migrate legacy PENDING AMO order to SCHEDULED if market is closed
    let nextStatus = status;
    let scheduledForSession =
      typeof rest.scheduledForSession === 'string' ? rest.scheduledForSession : undefined;
    if (status === 'PENDING' && isAmo && !marketStatus.isOpen) {
      nextStatus = 'SCHEDULED';
      scheduledForSession = scheduledForSession || marketStatus.nextSessionDateKey;
    }

    const price = typeof rest.price === 'number' ? rest.price : 0;
    const avgPrice = typeof rest.avgPrice === 'number' ? rest.avgPrice : undefined;
    const executionPrice =
      typeof rest.executionPrice === 'number'
        ? rest.executionPrice
        : nextStatus === 'EXECUTED'
          ? avgPrice ?? price
          : undefined;

    return {
      ...(rest as unknown as Order),
      status: nextStatus,
      timestamp: ts,
      placedAt,
      executedAt:
        typeof rest.executedAt === 'number'
          ? rest.executedAt
          : nextStatus === 'EXECUTED'
            ? ts
            : undefined,
      executionPrice,
      scheduledForSession,
    };
  });

  return {
    balance: typeof raw.balance === 'number' ? raw.balance : undefined,
    holdings: Array.isArray(raw.holdings) ? (raw.holdings as Holding[]) : undefined,
    positions: Array.isArray(raw.positions) ? (raw.positions as IntradayPosition[]) : undefined,
    orders: migratedOrders,
    executedOrderKeys: Array.isArray(raw.executedOrderKeys)
      ? (raw.executedOrderKeys as string[])
      : undefined,
    autoSquareOffEnabled:
      typeof raw.autoSquareOffEnabled === 'boolean' ? raw.autoSquareOffEnabled : undefined,
  };
}
