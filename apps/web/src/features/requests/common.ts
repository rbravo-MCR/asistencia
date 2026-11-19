import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, requestVoid } from '@/lib/api';

export const requestLabels: Record<string, string> = {
  VACATION: 'Vacaciones',
  PERMISSION: 'Permiso',
  JUSTIFICATION: 'Justificación',
  CANCELLATION: 'Cancelación',
  PENDING_HEAD: 'Pendiente de autorización del jefe',
  PENDING_DIRECTOR: 'Pendiente del visto bueno del director',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  WITHDRAWN: 'Retirada',
  CANCELLED: 'Cancelada',
  HEAD: 'Jefatura',
  DIRECTOR: 'Dirección',
  APPROVE: 'Aprobación',
  REJECT: 'Rechazo',
  GRANT: 'Concesión',
  ADJUSTMENT: 'Ajuste',
  RESERVE: 'Reserva',
  RELEASE: 'Liberación de reserva',
  CONSUME: 'Consumo aprobado',
  REFUND: 'Devolución',
  LATE_ENTRY: 'Retardo',
  LATE_ABSENCE: 'Falta por llegada tardía (justificable)',
  EARLY_EXIT: 'Salida anticipada',
  ABSENCE: 'Falta',
  MISSING_ENTRY: 'Omisión de entrada',
  MISSING_EXIT: 'Omisión de salida',
};
export const label = (value: string) => requestLabels[value] ?? value;
export function instant(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Merida',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function civilToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
interface Operation {
  path: string;
  body: object;
  method: string;
  message: string;
  onSuccess?: () => void;
}
export function useRequestWrite(csrfToken: string) {
  const client = useQueryClient();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unknown, setUnknown] = useState<Operation | null>(null);
  async function send(operation: Operation) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await requestVoid(operation.path, {
        method: operation.method,
        csrfToken,
        body: operation.body,
      });
      setUnknown(null);
      setMessage(operation.message);
      await Promise.all(
        ['requests', 'vacation', 'leave-config', 'attendance'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      operation.onSuccess?.();
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) {
        setUnknown(null);
        setError(e.message);
      } else {
        setUnknown(operation);
        setError(
          'Resultado desconocido: la conexión no confirmó el envío. Reintenta el mismo envío para evitar duplicados.',
        );
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return {
    pending,
    error,
    message,
    unknown: !!unknown,
    blocked: pending || !!unknown,
    resetFeedback: () => {
      if (busy.current || unknown) return;
      setError(null);
      setMessage(null);
    },
    run: (
      path: string,
      body: object,
      options: {
        method?: string;
        message?: string;
        onSuccess?: () => void;
      } = {},
    ) => {
      if (unknown) return;
      return send({
        path,
        body: { ...body, idempotencyKey: crypto.randomUUID() },
        method: options.method ?? 'POST',
        message: options.message ?? 'Cambios guardados.',
        ...(options.onSuccess ? { onSuccess: options.onSuccess } : {}),
      });
    },
    retry: () => (unknown ? send(unknown) : undefined),
  };
}
export type RequestWrite = ReturnType<typeof useRequestWrite>;
