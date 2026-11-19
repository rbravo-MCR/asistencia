import { useRef, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  side = 'right',
  className,
  initialFocusId,
  returnFocusId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: ReactNode;
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
  initialFocusId?: string;
  returnFocusId?: string;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            opener.current = document.activeElement as HTMLElement | null;
            if (initialFocusId) {
              const target = document.getElementById(initialFocusId);
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }
          }}
          onCloseAutoFocus={(event) => {
            const target = opener.current?.isConnected
              ? opener.current
              : returnFocusId
                ? document.getElementById(returnFocusId)
                : null;
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            'fixed inset-y-0 z-50 flex w-full max-w-xl flex-col border-border bg-card text-foreground shadow-2xl outline-none',
            side === 'left' ? 'left-0 max-w-80 border-r' : 'right-0 border-l',
            className,
          )}
        >
          <div className="shrink-0 border-b px-6 py-5 pr-16">
            <Dialog.Title className="text-xl font-semibold tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Description
              data-panel-description
              className="mt-1 text-sm text-muted-foreground"
            >
              {description}
            </Dialog.Description>
            <Dialog.Close
              aria-label="Cerrar panel"
              className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-lg hover:bg-secondary"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
