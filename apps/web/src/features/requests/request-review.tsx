import type { Ref } from 'react';
import { CheckCheck, CalendarDays, Paperclip } from 'lucide-react';
import { label } from './common';

export type RequestReviewData = {
  body: Record<string, unknown>;
  files: string[];
  permissionName?: string | undefined;
  permissionPaid?: boolean | undefined;
  available?: number | undefined;
  incidentLabel?: string | undefined;
};

export function RequestReview({
  ref,
  body,
  files,
  permissionName,
  permissionPaid,
  available,
  incidentLabel,
  status,
}: {
  ref: Ref<HTMLHeadingElement>;
  body: Record<string, unknown>;
  files: string[];
  permissionName?: string | undefined;
  permissionPaid?: boolean | undefined;
  available?: number | undefined;
  incidentLabel?: string | undefined;
  status: 'ready' | 'pending' | 'submitted' | 'unknown' | 'rejected';
}) {
  const civilDate = (value: unknown) =>
    new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      dateStyle: 'long',
    }).format(new Date(`${String(value)}T12:00:00Z`));
  return (
    <section className="space-y-5" aria-labelledby="request-review-title">
      <div>
        <h2
          id="request-review-title"
          ref={ref}
          tabIndex={-1}
          className="rounded text-xl font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring"
        >
          Revisa tu solicitud
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {status === 'unknown'
            ? 'El resultado no está confirmado. Reintenta el mismo envío para evitar duplicados.'
            : status === 'submitted'
              ? 'Solicitud recibida. Estamos actualizando tus datos.'
              : status === 'pending'
                ? 'Enviando la solicitud. Espera la confirmación antes de salir.'
                : status === 'rejected'
                  ? 'El envío anterior fue rechazado. Revisa el error o edita los datos antes de intentar de nuevo.'
                  : 'Todavía no se ha enviado. Comprueba los datos y confirma cuando estén correctos.'}
        </p>
      </div>
      <div className="rounded-2xl border bg-secondary/40 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5" aria-hidden="true" />
          {label(String(body.kind))}
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {body.fromDate !== undefined && (
            <div>
              <dt className="text-muted-foreground">Desde</dt>
              <dd className="mt-1 font-medium">{civilDate(body.fromDate)}</dd>
            </div>
          )}
          {body.toDate !== undefined && (
            <div>
              <dt className="text-muted-foreground">Hasta</dt>
              <dd className="mt-1 font-medium">{civilDate(body.toDate)}</dd>
            </div>
          )}
          {body.vacationPeriodYear !== undefined && (
            <div>
              <dt className="text-muted-foreground">Período elegido</dt>
              <dd className="mt-1 font-medium">
                Año de servicio {String(body.vacationPeriodYear)}
              </dd>
            </div>
          )}
          {available !== undefined && (
            <div>
              <dt className="text-muted-foreground">Disponibles al revisar</dt>
              <dd className="mt-1 font-medium">{available} días</dd>
            </div>
          )}
          {permissionName && (
            <div>
              <dt className="text-muted-foreground">Tipo de permiso</dt>
              <dd className="mt-1 font-medium">
                {permissionName} · {permissionPaid ? 'Con goce' : 'Sin goce'}
              </dd>
            </div>
          )}
          {body.partialStartsAt !== undefined && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                Horario de ausencia ·{' '}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </dt>
              <dd className="mt-1 font-medium">
                {new Date(String(body.partialStartsAt)).toLocaleString('es-MX')}{' '}
                a {new Date(String(body.partialEndsAt)).toLocaleString('es-MX')}
              </dd>
            </div>
          )}
          {body.incidentId !== undefined && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Incidencia seleccionada</dt>
              <dd className="mt-1 break-all font-medium">
                {incidentLabel ?? 'Incidencia de tu asistencia'}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Motivo</h3>
        <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border p-4 text-sm leading-6">
          {String(body.reason)}
        </p>
      </div>
      <div className="text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <Paperclip className="size-4" aria-hidden="true" />
          Archivos adjuntos
        </h3>
        {files.length ? (
          <ul className="mt-2 space-y-1 break-words">
            {files.map((file, index) => (
              <li key={`${file}-${index}`}>{file}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted-foreground">Sin archivos adjuntos.</p>
        )}
      </div>
      <p className="flex gap-3 rounded-xl bg-secondary/60 p-4 text-sm leading-6">
        <CheckCheck className="mt-1 size-5 shrink-0" aria-hidden="true" />
        <span>
          Al enviar, la jefatura revisará tu solicitud.{' '}
          {body.kind === 'VACATION'
            ? 'Se calcularán los días laborables y se apartarán mientras esperas la decisión.'
            : 'La solicitud no queda aprobada al enviarla.'}
        </span>
      </p>
    </section>
  );
}
