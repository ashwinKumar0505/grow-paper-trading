import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, overlayClassName, onCloseAutoFocus, ...props }:
  React.ComponentProps<typeof DialogPrimitive.Content> & { overlayClassName?: string }) {
  const returnFocus = React.useRef(typeof document === "undefined" ? null : document.activeElement);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/50', overlayClassName)} />
      <DialogPrimitive.Content data-slot="dialog-content" className={cn('fixed z-50', className)} onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (!event.defaultPrevented && returnFocus.current instanceof HTMLElement && returnFocus.current.isConnected) {
          event.preventDefault();
          returnFocus.current.focus();
        }
      }} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
