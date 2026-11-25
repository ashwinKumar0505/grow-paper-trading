import { Slot } from '@radix-ui/react-slot';
import { cva,type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';

// shadcn's Slot/CVA contract, with the existing application palette.
// The unstyled variant lets migrated controls retain their exact CSS geometry.
export const buttonVariants = cva('', {
  variants: {
    variant: {
      default: 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#00B386] text-white font-semibold hover:bg-[#009b74] dark:bg-[#00D09C] dark:text-[#04261C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-50',
      outline: 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-[#20332a] bg-white dark:bg-[#111c17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-50',
      unstyled: '',
    },
    size: { default: 'h-10 px-4 py-2', sm: 'h-8 px-3 text-xs', icon: 'size-9', unstyled: '' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
};

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component data-slot="button" className={variant === "unstyled" && size === "unstyled" ? className : cn(buttonVariants({ variant, size }), className)} {...props} />;
}
