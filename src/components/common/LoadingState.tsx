import type { ComponentProps } from 'react';

export function LoadingState({ children, ...props }: ComponentProps<'div'>) {
  return <div role="status" aria-live="polite" {...props}>{children}</div>;
}
