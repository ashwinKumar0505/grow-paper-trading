import React from 'react';
import { useTrading } from '../context/TradingContext';
import { OrderPanel } from './OrderPanel';

/**
 * Groww-style order pad shown as a modal (mobile, Holdings, Watchlist, etc.).
 * On the desktop stock page the same OrderPanel is rendered as a sticky side card.
 */
export const OrderModal: React.FC = () => {
  const { orderModalState, closeOrderModal, stocks } = useTrading();
  const { isOpen, stock, defaultAction, defaultProduct, defaultQuantity } = orderModalState;

  if (!isOpen || !stock) return null;

  // Always use the live-ticking quote for the selected stock
  const liveStock = stocks.find((s) => s.symbol === stock.symbol) || stock;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-fade-in">
      <div className="fixed inset-0" onClick={closeOrderModal} />
      <div className="relative w-full sm:max-w-sm z-10 max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl">
        <OrderPanel
          stock={liveStock}
          defaultAction={defaultAction}
          defaultProduct={defaultProduct || 'DELIVERY'}
          defaultQuantity={defaultQuantity && defaultQuantity > 0 ? defaultQuantity : 1}
          onClose={closeOrderModal}
          onPlaced={closeOrderModal}
        />
      </div>
    </div>
  );
};
