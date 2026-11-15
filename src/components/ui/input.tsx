import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, unstyled = false, ...props }: ComponentProps<'input'> & { unstyled?: boolean }) {
  return <input data-slot="input" className={unstyled ? className : cn( 'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#20332a] dark:bg-[#111c17] focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-50', className)} {...props} />;
}
