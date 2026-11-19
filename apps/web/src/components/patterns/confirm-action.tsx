import { useRef } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { AlertDialog } from 'radix-ui';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConfirmAction({
  title,
  description,
  pending,
  error,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  returnFocusId,
}: {
  title: string;
  description: string;
  pending: boolean;
  error?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  returnFocusId?: string;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  useBlocker({
    shouldBlockFn: () => pending,
    enableBeforeUnload: pending,
    disabled: !pending,
  });
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <AlertDialog.Content
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
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
          className="mcr-floating-surface fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6 shadow-2xl outline-none"
        >
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
          <AlertDialog.Title className="text-xl font-semibold tracking-tight">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </AlertDialog.Description>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" className="min-h-11" disabled={pending}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button className="min-h-11" disabled={pending} onClick={onConfirm}>
              {pending ? 'Procesando…' : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
