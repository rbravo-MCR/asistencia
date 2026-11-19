import { useRef, useState, type ReactNode } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/ui/side-panel';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { hasNativeFormChanges } from '@/lib/native-form-changes';

export function LocationEditor({
  title,
  pending,
  onClose,
  children,
  action,
  initialFocusId,
  returnFocusId,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
  action?: ReactNode;
  initialFocusId?: string;
  returnFocusId?: string;
}) {
  const controls = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const discard = useDiscardConfirm();
  const canLeave = async () =>
    !pending && (!dirty || (await discard.confirm()));
  useBlocker({
    shouldBlockFn: async () => !(await canLeave()),
    enableBeforeUnload: dirty || pending,
    disabled: !dirty && !pending,
  });
  return (
    <SidePanel
      open
      {...(initialFocusId ? { initialFocusId } : {})}
      {...(returnFocusId ? { returnFocusId } : {})}
      title={title}
      description="Los cambios se aplican al guardar y se conservan en el historial."
      onOpenChange={(open) => {
        if (!open)
          void (async () => {
            if (await canLeave()) onClose();
          })();
      }}
    >
      {discard.dialog}
      <div
        className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
        ref={controls}
        onChangeCapture={() => {
          if (controls.current)
            setDirty(hasNativeFormChanges(controls.current));
        }}
      >
        <fieldset disabled={pending} className="min-w-0 space-y-5">
          {children}
        </fieldset>
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap gap-3 border-t bg-card px-5 py-4 sm:px-6">
          {action}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              void (async () => {
                if (await canLeave()) onClose();
              })();
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
    </SidePanel>
  );
}
