import { cva,type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva('', {
  variants: { variant: {
    default: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    unstyled: '',
  } },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={variant === "unstyled" ? className : cn(badgeVariants({ variant }), className)} {...props} />;
}
