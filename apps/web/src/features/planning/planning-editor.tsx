import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { useBlocker } from '@tanstack/react-router';
import { SidePanel } from '@/components/ui/side-panel';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { hasNativeFormChanges } from '@/lib/native-form-changes';

const CloseEditor = createContext<() => void>(() => {});
export function PlanningCancel({ children }: { children: ReactNode }) {
  const close = useContext(CloseEditor);
  return (
    <Button type="button" variant="outline" onClick={close}>
      {children}
    </Button>
  );
}

/** Keeps native form values mounted through validation, mutation and refetch. */
export function PlanningEditor({
  title,
  description = 'Conserva los datos hasta completar el guardado.',
  pending,
  onClose,
  children,
  initialFocusId,
  returnFocusId,
}: {
  title: string;
  description?: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
  initialFocusId: string;
  returnFocusId: string;
}) {
  const controls = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const submitting = useRef(false);
  const blocked = () => pending || submitting.current;
  const discard = useDiscardConfirm();
  useBlocker({
    shouldBlockFn: async () =>
      blocked() || (dirty && !(await discard.confirm())),
    enableBeforeUnload: dirty || pending,
    disabled: !dirty && !pending,
  });
  const close = async () => {
    if (!blocked() && (!dirty || (await discard.confirm()))) onClose();
  };
  return (
    <SidePanel
      open
      initialFocusId={initialFocusId}
      returnFocusId={returnFocusId}
      title={title}
      description={description}
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      {discard.dialog}
      <div
        className="mcr-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        ref={controls}
        onChangeCapture={() => {
          if (controls.current)
            setDirty(hasNativeFormChanges(controls.current));
        }}
        onSubmitCapture={() => {
          submitting.current = true;
          queueMicrotask(() => {
            submitting.current = false;
          });
        }}
      >
        <fieldset disabled={pending} className="min-w-0">
          <CloseEditor.Provider value={close}>{children}</CloseEditor.Provider>
        </fieldset>
      </div>
    </SidePanel>
  );
}
