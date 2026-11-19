import type { AttendancePunchResult } from '@asistencia/contracts';
import { InlineNotice } from '@/components/patterns/inline-notice';

export function AttendanceResult({
  result,
  message,
  rejectionLabel,
  timeZone = 'America/Merida',
}: {
  result: AttendancePunchResult;
  message: string;
  rejectionLabel?: string;
  timeZone?: string;
}) {
  const incidents = result.incidents.length > 0 || result.requiresReason;
  const accepted = result.attempt.accepted;
  return (
    <InlineNotice
      tone={accepted ? (incidents ? 'warning' : 'success') : 'danger'}
      role="status"
    >
      <p className="font-semibold">
        {accepted
          ? incidents
            ? 'Marcaje aceptado con incidencia'
            : 'Marcaje aceptado'
          : 'Marcaje rechazado'}
      </p>
      <p className="mt-1">{message}</p>
      {!accepted && rejectionLabel && (
        <p className="mt-1">Causa del rechazo: {rejectionLabel}</p>
      )}
      <p className="mt-3 text-xs font-medium">
        Hora confirmada por el servidor
      </p>
      <time
        dateTime={result.attempt.recordedAt}
        className="text-sm tabular-nums"
      >
        {new Intl.DateTimeFormat('es-MX', {
          timeZone,
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date(result.attempt.recordedAt))}
      </time>
    </InlineNotice>
  );
}
