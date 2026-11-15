import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, unstyled = false, ...props }: ComponentProps<'div'> & { unstyled?: boolean }) {
  return <div data-slot="card" className={unstyled ? className : cn('rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-[#282C37] dark:bg-[#1A1D24]', className)} {...props} />;
}
