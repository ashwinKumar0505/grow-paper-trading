import {
OrderAction,
OrderProduct,
Stock
} from '../../../types/market';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setOrderModalState'>;

export function useOrderModalState({ setOrderModalState }: Options) {
  // Order Modal Helpers
  const openOrderModal = (
    stock: Stock,
    action: OrderAction = 'BUY',
    product: OrderProduct = 'DELIVERY',
    quantity: number = 1
  ) => {
    setOrderModalState({
      isOpen: true,
      stock,
      defaultAction: action,
      defaultProduct: product,
      defaultQuantity: quantity,
    });
  };

  const closeOrderModal = () => {
    setOrderModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return { openOrderModal, closeOrderModal };
}
