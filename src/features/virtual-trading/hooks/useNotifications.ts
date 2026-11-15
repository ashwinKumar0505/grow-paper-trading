import { useCallback } from 'react';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setToasts'>;

export function useNotifications({ setToasts }: Options) {
  const addToast = useCallback((title: string, description: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { addToast, removeToast };
}
