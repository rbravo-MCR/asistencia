import { useCallback, useRef, useState } from 'react';
import { ConfirmAction } from './confirm-action';

type DiscardOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
};

export function useDiscardConfirm(options: DiscardOptions = {}) {
  const {
    title = '¿Descartar cambios?',
    description = 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
    confirmLabel = 'Descartar cambios',
  } = options;
  const [open, setOpen] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const confirm = useCallback(() => {
    if (pending.current) return pending.current;
    const promise = new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpen(true);
    });
    pending.current = promise;
    return promise;
  }, []);
  const settle = (value: boolean) => {
    setOpen(false);
    const resolve = resolver.current;
    resolver.current = null;
    pending.current = null;
    resolve?.(value);
  };
  const dialog = open ? (
    <ConfirmAction
      title={title}
      description={description}
      pending={false}
      confirmLabel={confirmLabel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;
  return { confirm, dialog };
}
