import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useBlocker } from '@tanstack/react-router';
import { SidePanel } from '@/components/ui/side-panel';
import { Button } from '@/components/ui/button';
import { FormError } from '../identity/form-fields';
import type { RequestWrite } from './common';
import { requestDraftSnapshot } from './draft';

export function WriteStatus({ write }: { write: RequestWrite }) {
  return (
    <div className="space-y-3" aria-live="polite">
      {write.pending && <p role="status">Guardando…</p>}
      <FormError message={write.error ?? undefined} />
      {write.message && <p role="status">{write.message}</p>}
      {write.unknown && (
        <Button
          variant="outline"
          disabled={write.pending}
          onClick={() => void write.retry()}
        >
          Reintentar el mismo envío
        </Button>
      )}
    </div>
  );
}
export function ReasonField({
  name,
  label: title,
}: {
  name: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {title}
      </label>
      <textarea
        id={name}
        name={name}
        className="block min-h-28 w-full rounded-xl border border-input bg-card p-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
        required
        maxLength={2000}
      />
    </div>
  );
}

const PanelActionsContext = createContext<HTMLDivElement | null>(null);

export function PanelActions({ children }: { children: ReactNode }) {
  const target = useContext(PanelActionsContext);
  return target ? createPortal(children, target) : null;
}

/** Keeps private drafts in place while the server result or refreshed data is pending. */
export function RequestPanel({
  title,
  description,
  write,
  onClose,
  children,
  busy = false,
  initialFocusId,
  returnFocusId,
}: {
  busy?: boolean;
  initialFocusId?: string;
  returnFocusId: string;
  title: string;
  description: string;
  write: RequestWrite;
  onClose: () => void;
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const baseline = useRef<string | null>(null);
  const [actions, setActions] = useState<HTMLDivElement | null>(null);
  const blocked = write.blocked || busy;
  const close = () => {
    if (
      !blocked &&
      (!dirty ||
        window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?'))
    )
      onClose();
  };
  useBlocker({
    shouldBlockFn: () =>
      blocked ||
      (dirty &&
        !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')),
    enableBeforeUnload: dirty || blocked,
    disabled: !dirty && !blocked,
  });
  return (
    <SidePanel
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={title}
      description={description}
      {...(initialFocusId ? { initialFocusId } : {})}
      returnFocusId={returnFocusId}
    >
      <PanelActionsContext.Provider value={actions}>
        <div
          ref={(node) => {
            if (node && baseline.current === null)
              baseline.current = requestDraftSnapshot(node, true);
          }}
          className="mcr-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          onChangeCapture={(event) => {
            const container = event.currentTarget;
            queueMicrotask(() =>
              setDirty(requestDraftSnapshot(container) !== baseline.current),
            );
          }}
          onResetCapture={() => setDirty(false)}
        >
          <WriteStatus write={write} />
          {children}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t bg-card px-4 py-4 sm:px-6">
          <div ref={setActions} className="contents" />
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            onClick={close}
          >
            Volver al listado
          </Button>
        </div>
      </PanelActionsContext.Provider>
    </SidePanel>
  );
}
