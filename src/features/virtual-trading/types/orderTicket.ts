import type { OrderAction,OrderProduct,Stock } from '../../../types/market';
export interface OrderPanelProps {
  stock: Stock;
  defaultAction?: OrderAction;
  defaultProduct?: OrderProduct;
  defaultQuantity?: number;
  onClose?: () => void;
  onPlaced?: () => void;
}

