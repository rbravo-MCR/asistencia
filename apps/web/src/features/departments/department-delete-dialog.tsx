import { useRef } from 'react';
import { AlertDialog } from 'radix-ui';
import { LoaderCircle, Trash2 } from 'lucide-react';
import type { DepartmentResponse } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';

export function DepartmentDeleteDialog({
  department,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  department: DepartmentResponse;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  const confirmed = useRef(false);
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) {
          confirmed.current = false;
          onCancel();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            const target = confirmed.current
              ? document.getElementById('departments-search')
              : opener.current?.isConnected
                ? opener.current
                : document.getElementById('departments-search');
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className="mcr-floating-surface fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-2xl outline-none"
        >
          <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="size-5" aria-hidden="true" />
          </span>
          <AlertDialog.Title className="break-words text-xl font-semibold tracking-tight">
            ¿Eliminar {department.name}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            Esta acción no se puede deshacer. Solo se pueden eliminar
            departamentos sin empleados ni responsabilidades vinculadas.
          </AlertDialog.Description>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive"
            >
              {error}
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" className="min-h-11" disabled={pending}>
                Cancelar eliminación
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={pending}
              onClick={() => {
                confirmed.current = true;
                onConfirm();
              }}
            >
              {pending && (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? 'Eliminando…' : 'Confirmar eliminación'}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
