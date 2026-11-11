import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { Exchange, OrderAction, OrderProduct, OrderType, Stock } from '../types/market';
import { X, AlertCircle, Info, ShieldCheck, Zap } from 'lucide-react';

export const OrderModal: React.FC = () => {
  const {
    orderModalState,
    closeOrderModal,
    executeOrder,
    balance,
    holdings,
    intradayPositions,
  } = useTrading();

  const { isOpen, stock, defaultAction, defaultProduct, defaultQuantity } = orderModalState;

  const [action, setAction] = useState<OrderAction>('BUY');
  const [product, setProduct] = useState<OrderProduct>('DELIVERY');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen && stock) {
      setAction(defaultAction);
      setProduct(defaultProduct || 'DELIVERY');
      setQuantity(defaultQuantity && defaultQuantity > 0 ? defaultQuantity : 1);
      setLimitPrice(stock.price);
      setErrorMsg('');
    }
  }, [isOpen, stock, defaultAction, defaultProduct, defaultQuantity]);

  if (!isOpen || !stock) return null;

  const currentPrice = stock.price;
  const effectivePrice = orderType === 'MARKET' ? currentPrice : limitPrice;
  const totalValue = Number((effectivePrice * quantity).toFixed(2));
  const leverage = product === 'INTRADAY' ? 5 : 1;
  const marginRequired = Number((totalValue / leverage).toFixed(2));

  // Check how many shares user holds of this stock in Delivery
  const currentHolding = holdings.find((h) => h.symbol === stock.symbol);
  const userHeldQty = currentHolding ? currentHolding.quantity : 0;

  // Check active intraday positions for Groww-style position netting
  const existingIntradayPos = intradayPositions.find((p) => p.symbol === stock.symbol);
  const isOppositeSideIntraday = product === 'INTRADAY' && !!existingIntradayPos && existingIntradayPos.action !== action;
  const isClosingOrReducing = isOppositeSideIntraday && quantity <= (existingIntradayPos?.quantity || 0);

  // Cash required: If closing/reducing an existing intraday position, margin is RELEASED, not required!
  let requiredCash = 0;
  if (product === 'DELIVERY') {
    requiredCash = action === 'BUY' ? totalValue : 0;
  } else {
    // Intraday
    if (isClosingOrReducing) {
      requiredCash = 0;
    } else if (isOppositeSideIntraday && quantity > (existingIntradayPos?.quantity || 0)) {
      const reverseQty = quantity - existingIntradayPos!.quantity;
      requiredCash = Number(((reverseQty * effectivePrice) / 5).toFixed(2));
    } else {
      requiredCash = marginRequired;
    }
  }

  const handleQuantityChange = (val: number) => {
    const q = Math.max(1, Math.min(100000, Math.floor(val) || 1));
    setQuantity(q);
    setErrorMsg('');
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (quantity <= 0) {
      setErrorMsg('Please enter a valid quantity (minimum 1)');
      return;
    }

    if (orderType === 'LIMIT' && (!limitPrice || limitPrice <= 0)) {
      setErrorMsg('Please enter a valid limit price');
      return;
    }

    if (requiredCash > 0 && balance < requiredCash) {
      setErrorMsg(`Insufficient paper cash. Required: ₹${requiredCash.toLocaleString('en-IN')}, Available: ₹${balance.toLocaleString('en-IN')}`);
      return;
    }

    if (action === 'SELL' && product === 'DELIVERY' && userHeldQty < quantity) {
      setErrorMsg(`You only hold ${userHeldQty} shares in Delivery. Cannot sell ${quantity} shares.`);
      return;
    }

    const result = executeOrder({
      symbol: stock.symbol,
      action,
      product,
      orderType,
      exchange,
      quantity,
      limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
    });

    if (result.success) {
      closeOrderModal();
    } else {
      setErrorMsg(result.message);
    }
  };

  const isBuy = action === 'BUY';
  const themeColor = isBuy ? '#00D09C' : '#EB5B5B';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={closeOrderModal} />

      <div className="relative w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2B303C] overflow-hidden z-10">
        {/* Top Header: Stock Details & Close */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-[#282C37]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                  {stock.symbol}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-gray-100 dark:bg-[#282D3B] text-gray-600 dark:text-gray-300">
                  {exchange}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                {stock.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-mono tabular-nums font-bold text-base text-gray-900 dark:text-white">
                  ₹{stock.price.toFixed(2)}
                </div>
                <div
                  className={`font-mono tabular-nums text-xs font-semibold ${
                    stock.change >= 0 ? 'text-[#00D09C]' : 'text-[#EB5B5B]'
                  }`}
                >
                  {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </div>
              </div>
              <button
                onClick={closeOrderModal}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BUY / SELL Switcher Tabs (Consistent with Groww) */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-gray-100 dark:bg-[#232732] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAction('BUY');
                setErrorMsg('');
              }}
              className={`py-2 text-sm font-bold rounded-lg transition-all ${
                isBuy
                  ? 'bg-[#00D09C] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => {
                setAction('SELL');
                setErrorMsg('');
              }}
              className={`py-2 text-sm font-bold rounded-lg transition-all ${
                !isBuy
                  ? 'bg-[#EB5B5B] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Order Form */}
        <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
          {/* 1. Product Type Selector: Delivery (Normal) vs Intraday (MIS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Product Type
              </label>
              {product === 'INTRADAY' && (
                <span className="text-[11px] font-bold text-[#00D09C] flex items-center gap-1">
                  <Zap className="w-3 h-3" /> 5x Leverage Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProduct('DELIVERY')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                  product === 'DELIVERY'
                    ? 'border-[#00D09C] bg-emerald-50/50 dark:bg-[#152B24] ring-1 ring-[#00D09C]'
                    : 'border-gray-200 dark:border-[#2B303C] bg-white dark:bg-[#1E222D] hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Delivery (CNC)</span>
                  <span className="text-[10px] text-gray-400">Normal</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Hold for days/years
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProduct('INTRADAY')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                  product === 'INTRADAY'
                    ? 'border-[#00D09C] bg-emerald-50/50 dark:bg-[#152B24] ring-1 ring-[#00D09C]'
                    : 'border-gray-200 dark:border-[#2B303C] bg-white dark:bg-[#1E222D] hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Intraday (MIS)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-[#00D09C] font-semibold">5x Margin</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Valid for today
                </div>
              </button>
            </div>

            {/* Groww-style Intraday Position Netting Banner */}
            {product === 'INTRADAY' && existingIntradayPos && (
              <div className="mt-2.5 p-3 rounded-xl bg-gray-50 dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] text-xs space-y-1">
                {isOppositeSideIntraday ? (
                  <>
                    <div className="flex items-center gap-1.5 font-bold text-[#00D09C]">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Netting Position (Opposite Trade)</span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      You hold <strong>{existingIntradayPos.quantity} shares {existingIntradayPos.action}</strong>.
                      This <strong>{action}</strong> order will offset and {quantity >= existingIntradayPos.quantity ? 'close' : 'partially reduce'} your position, releasing blocked margin back to your cash.
                    </p>
                  </>
                ) : (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Existing Position: You already hold <strong>{existingIntradayPos.quantity} shares {existingIntradayPos.action}</strong>. This order will average into your position.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Exchange & Order Type Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Exchange */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Exchange
              </label>
              <div className="flex rounded-lg border border-gray-200 dark:border-[#2B303C] p-0.5 bg-gray-50 dark:bg-[#20242F]">
                {(['NSE', 'BSE'] as Exchange[]).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setExchange(ex)}
                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${
                      exchange === ex
                        ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Market vs Limit */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Type
              </label>
              <div className="flex rounded-lg border border-gray-200 dark:border-[#2B303C] p-0.5 bg-gray-50 dark:bg-[#20242F]">
                {(['MARKET', 'LIMIT'] as OrderType[]).map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOrderType(ot)}
                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${
                      orderType === ot
                        ? 'bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {ot === 'MARKET' ? 'Market' : 'Limit'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Quantity Input with Quick Steppers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Quantity (Shares)
              </label>
              {action === 'SELL' && product === 'DELIVERY' && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Available in holdings: <strong className="text-gray-900 dark:text-white font-mono">{userHeldQty}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] rounded-xl text-base font-bold font-mono text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00D09C]"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1">
                {[5, 10, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleQuantityChange(num)}
                    className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#2B303C] text-gray-700 dark:text-gray-300 hover:border-[#00D09C] transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Limit Price Input (if Limit order selected) */}
          {orderType === 'LIMIT' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Limit Price (₹)
                </label>
                <span className="text-xs text-gray-400 font-mono">
                  LTP: ₹{currentPrice.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242F] border border-gray-200 dark:border-[#2B303C] rounded-xl text-base font-bold font-mono text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00D09C]"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Balance & Margin Summary Box (Groww Style) */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#20242F] border border-gray-100 dark:border-[#2B303C] space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Paper Cash Balance:</span>
              <span className="font-mono tabular-nums font-semibold text-gray-900 dark:text-white">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>{isClosingOrReducing ? 'Margin Effect:' : 'Approx. Margin Required:'}</span>
              <div className="text-right">
                <span className="font-mono tabular-nums font-bold text-sm text-gray-900 dark:text-white">
                  {isClosingOrReducing ? (
                    <span className="text-[#00D09C]">₹0.00 (Releases Margin + P&L)</span>
                  ) : (
                    `₹${requiredCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  )}
                </span>
                {product === 'INTRADAY' && !isClosingOrReducing && (
                  <span className="block text-[10px] text-[#00D09C] font-semibold">
                    (₹{totalValue.toLocaleString('en-IN')} total / 5x)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
              <span>Brokerage & STT:</span>
              <span className="text-[#00D09C] font-medium">₹0.00 (Free Paper Trading)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-white text-base shadow-md transition-all active:scale-[0.99] cursor-pointer"
            style={{ backgroundColor: themeColor }}
          >
            {isClosingOrReducing
              ? quantity === existingIntradayPos!.quantity
                ? `Exit Position (${action} ${quantity} ${stock.symbol})`
                : `Reduce Position (${action} ${quantity} ${stock.symbol})`
              : `${action} ${stock.symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
};
