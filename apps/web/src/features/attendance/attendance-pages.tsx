import { Link, useBlocker, useSearch } from '@tanstack/react-router';
import { AttendancePolicy } from './attendance-policy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AttendanceMeSchema,
  AttendancePunchResultSchema,
  AttendanceSummarySchema,
  AttendanceIncidentSchema,
  AttendanceEvaluateResultSchema,
  type AttendancePunchInput,
  type AttendancePunchResult,
  type AttendanceIncidentView,
  type AttendanceSummaryItem,
  type SessionView,
} from '@asistencia/contracts';
import { request, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import {
  Page,
  panelClass,
  selectClass,
  FormError,
} from '../identity/form-fields';
import { TextField } from '../planning/controls';
import { QueryFeedback } from '../employees/query-feedback';
import { AttendanceResult } from './attendance-result';
import {
  Clock3,
  LogIn,
  LogOut,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';

const labels: Record<string, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Salida',
  LATE: 'Retardo',
  LATE_ENTRY: 'Retardo',
  LATE_ABSENCE: 'Falta por llegada tardía (justificable)',
  EARLY_EXIT: 'Salida anticipada',
  ABSENCE: 'Falta',
  AUTHORIZED_ABSENCE: 'Ausencia autorizada',
  MISSING_ENTRY: 'Omisión de entrada',
  MISSING_EXIT: 'Omisión de salida',
  OUTSIDE_GEOFENCE: 'Fuera del centro autorizado',
  LOCATION_REQUIRED: 'Se requiere ubicación',
  LOW_ACCURACY: 'Precisión GPS insuficiente',
  ACCURACY_INSUFFICIENT: 'Precisión GPS insuficiente',
  NO_AUTHORIZED_LOCATION: 'Sin centro autorizado',
  DUPLICATE_DIRECTION: 'Este marcaje ya existe',
  OUT_OF_ORDER: 'Orden de marcaje inválido',
  REJECTED: 'Intento rechazado',
  OUTSIDE_WINDOW: 'Fuera de la ventana de marcaje',
  PENDING: 'Pendiente',
  COMPLETE: 'Entrada y salida registradas',
  OPEN: 'En curso',
  NOT_STARTED: 'Sin marcajes',
  PUBLISHED: 'Publicado',
};
const label = (value: string) => labels[value] ?? value;
function instant(value: string, timeZone = 'America/Merida') {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}
async function gps(): Promise<
  Pick<AttendancePunchInput, 'latitude' | 'longitude' | 'accuracy'>
> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
export function AttendancePage() {
  return (
    <ProtectedPage>
      {(session) => <AttendanceContent session={session} />}
    </ProtectedPage>
  );
}
export function IncidentsPage() {
  return (
    <ProtectedPage>
      {(session) => (
        <Page
          title="Incidencias"
          eyebrow="Seguimiento de asistencia"
          description="Consulta las incidencias originales y sus resoluciones. Capturar un motivo no equivale a una aprobación."
        >
          <History session={session} incidents />
        </Page>
      )}
    </ProtectedPage>
  );
}
function AttendanceContent({ session }: { session: SessionView }) {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: ({ signal }) =>
      request('/attendance/me', AttendanceMeSchema, { signal }),
    retry: false,
  });
  const [selected, setSelected] = useState('');
  const [confirmation, setConfirmation] =
    useState<AttendancePunchResult | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [attempt, setAttempt] = useState<AttendancePunchInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resultIncidents, setResultIncidents] = useState<
    AttendanceIncidentView[]
  >([]);
  const slot = me.data?.items.find((item) => item.assignmentId === selected);
  const unresolved = [
    ...(me.data?.pendingIncidents ?? []),
    ...resultIncidents,
  ].filter((item) => item.requiresReason);
  const blocked = unresolved.length > 0;
  useBlocker({
    shouldBlockFn: () =>
      pending ||
      Boolean(
        attempt &&
        !window.confirm(
          'Hay un marcaje sin confirmar. Si sales, tendrás que revisar el historial antes de crear otro intento. ¿Quieres salir?',
        ),
      ),
    enableBeforeUnload: pending || Boolean(attempt),
    disabled: !pending && !attempt,
  });
  async function punch(direction: 'ENTRY' | 'EXIT', retry = false) {
    if (busy.current || (!retry && (!slot || blocked))) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    setConfirmation(null);
    try {
      const payload =
        retry && attempt
          ? attempt
          : {
              assignmentId: selected,
              direction,
              idempotencyKey: crypto.randomUUID(),
              ...(slot?.modality === 'ONSITE' ? await gps() : {}),
            };
      setAttempt(payload);
      const result = await request(
        '/attendance/punches',
        AttendancePunchResultSchema,
        { method: 'POST', csrfToken: session.csrfToken, body: payload },
      );
      setAttempt(null);
      setResultIncidents(result.incidents);
      setConfirmation(result);
      setMessage(
        result.requiresReason || result.incidents.length
          ? 'Intento conservado con incidencia pendiente de revisión. Captura el motivo requerido.'
          : result.attempt.accepted
            ? `${direction === 'ENTRY' ? 'Entrada' : 'Salida'} registrada`
            : `Intento rechazado: ${label(result.attempt.rejectionCode ?? 'REJECTED')}`,
      );
      await client.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) {
        setAttempt(null);
        setError(e.message);
        await client.invalidateQueries({ queryKey: ['attendance'] });
      } else
        setError(
          'Resultado desconocido: la conexión no confirmó si se registró. Reintenta el mismo intento para evitar duplicados.',
        );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Page
      title="Asistencia"
      eyebrow="Mi jornada"
      description="Registra tu entrada y salida en el turno asignado. Para turnos presenciales se solicita tu ubicación al marcar."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className={panelClass}>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">Mi entrada y salida</h2>
          </div>
          <QueryFeedback query={me} />
          {me.data && (
            <>
              <p>
                Hora del servidor: {instant(me.data.serverTime)} ·
                America/Merida
              </p>
              {me.data.employee?.status !== 'ACTIVE' ? (
                <p>Tu cuenta no tiene un empleado activo vinculado.</p>
              ) : (
                <>
                  <label className="block space-y-2">
                    Turno publicado
                    <select
                      className={selectClass}
                      value={selected}
                      disabled={pending || !!attempt}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        setMessage(null);
                        setConfirmation(null);
                      }}
                    >
                      <option value="">Selecciona un turno</option>
                      {me.data.items
                        .filter((item) => item.status === 'PUBLISHED')
                        .map((item) => (
                          <option
                            key={item.assignmentId}
                            value={item.assignmentId}
                          >
                            {item.workDate} ·{' '}
                            {instant(item.startsAt, item.timeZone)} ·{' '}
                            {item.modality === 'ONSITE'
                              ? 'Presencial'
                              : 'Home office'}
                          </option>
                        ))}
                    </select>
                  </label>
                  {!me.data.items.length && (
                    <p>No tienes turnos publicados disponibles.</p>
                  )}
                  {slot && (
                    <>
                      <Slot
                        item={{
                          ...slot,
                          policy: slot.policy ?? me.data.policy,
                        }}
                      />
                      <p className="text-sm">
                        {slot.modality === 'ONSITE'
                          ? 'Al marcar se solicitará GPS una vez. Si lo rechazas, se conserva el intento sin ubicación como excepción.'
                          : 'Home office: no se solicita ni envía GPS.'}
                      </p>
                    </>
                  )}
                  {blocked && (
                    <p role="alert">
                      Captura los motivos pendientes antes del siguiente
                      marcaje.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={!slot || pending || blocked || !!attempt}
                      className="min-h-12 flex-1 sm:flex-none sm:px-8"
                      onClick={() => void punch('ENTRY')}
                    >
                      <LogIn className="size-4" aria-hidden="true" />
                      Registrar entrada
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!slot || pending || blocked || !!attempt}
                      className="min-h-12 flex-1 sm:flex-none sm:px-8"
                      onClick={() => void punch('EXIT')}
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      Registrar salida
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          {pending && <p role="status">Registrando intento…</p>}
          <FormError message={error ?? undefined} />
          {message &&
            (confirmation ? (
              <AttendanceResult
                result={confirmation}
                message={message}
                rejectionLabel={label(
                  confirmation.attempt.rejectionCode ?? 'REJECTED',
                )}
                timeZone={slot?.timeZone ?? 'America/Merida'}
              />
            ) : (
              <p role="status">{message}</p>
            ))}
          {attempt && !pending && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void punch(attempt.direction, true)}>
                Reintentar mismo intento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAttempt(null);
                  setError(null);
                  setMessage(
                    'Nuevo intento seleccionado. El anterior puede existir; revisa el historial antes de marcar.',
                  );
                }}
              >
                Preparar otro intento
              </Button>
            </div>
          )}
          {Array.from(
            new Map(unresolved.map((item) => [item.id, item])).values(),
          ).map((item) => (
            <Incident
              key={item.id}
              item={item}
              session={session}
              onSaved={() => setResultIncidents([])}
            />
          ))}
        </section>
        <aside className={`${panelClass} text-sm leading-6`}>
          <h2 className="font-semibold">Antes de marcar</h2>
          <ol className="space-y-4 text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                1
              </span>
              Revisa la fecha, el horario y la modalidad del turno seleccionado.
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                2
              </span>
              En presencial, permite la ubicación al marcar. Home office no
              solicita GPS.
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                3
              </span>
              Espera el resultado del servidor. Si la conexión falla, usa el
              mismo intento para evitar duplicados.
            </li>
          </ol>
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Link
              to="/calendario"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-link underline underline-offset-4"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Ver calendario
            </Link>
            <Link
              to="/incidencias"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-link underline underline-offset-4"
            >
              <ClipboardList className="size-4" aria-hidden="true" />
              Ver incidencias
            </Link>
          </div>
        </aside>
      </div>
      <History session={session} />
      {session.permissions.manageOrganization && (
        <details className="rounded-2xl border bg-card p-5">
          <summary className="cursor-pointer text-sm font-medium">
            Administrar política de asistencia
          </summary>
          <div className="mt-5">
            <AttendancePolicy session={session} />
          </div>
        </details>
      )}
    </Page>
  );
}
function Slot({ item }: { item: AttendanceSummaryItem }) {
  return (
    <article className="min-w-0 space-y-3 break-words rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm leading-6">
      <h3 className="font-semibold">
        {item.employeeName} · {item.workDate}
      </h3>
      <p>
        {instant(item.startsAt, item.timeZone)} –{' '}
        {instant(item.endsAt, item.timeZone)} · {item.timeZone}
      </p>
      <p>
        {item.modality === 'ONSITE' ? 'Presencial' : 'Home office'} ·{' '}
        {label(item.summary)}
      </p>
      {item.policy && (
        <p className="text-sm">
          Política v{item.policy.version}: tolerancia{' '}
          {item.policy.lateToleranceMinutes} min; entrada desde{' '}
          {instant(
            new Date(
              new Date(item.startsAt).getTime() -
                item.policy.earlyEntryMinutes * 60000,
            ).toISOString(),
            item.timeZone,
          )}
          ; cierre{' '}
          {instant(
            new Date(
              new Date(item.endsAt).getTime() +
                item.policy.lateExitMinutes * 60000,
            ).toISOString(),
            item.timeZone,
          )}
          .
        </p>
      )}
      <ul className="space-y-2">
        {item.attempts.map((a) => (
          <li key={a.id}>
            {label(a.direction)} · {instant(a.recordedAt, item.timeZone)} ·{' '}
            {a.accepted
              ? 'Registrada'
              : `Rechazada: ${label(a.rejectionCode ?? 'REJECTED')}`}
          </li>
        ))}
      </ul>
      {!item.attempts.length && <p>Sin intentos registrados.</p>}
      {item.evaluations.map((e) => (
        <p key={e.id}>
          Evaluación: {label(e.result)} ·{' '}
          {instant(e.evaluatedAt, item.timeZone)}
        </p>
      ))}
      {item.incidents.map((i) => (
        <p key={i.id}>
          {label(i.kind)} ·{' '}
          {i.resolution
            ? 'Resuelta por solicitud aprobada'
            : 'Pendiente de revisión'}
        </p>
      ))}
    </article>
  );
}
type IncidentDraftState = { dirty: boolean; pending: boolean };
function Incident({
  item,
  session,
  onSaved,
  onEditingStateChange,
}: {
  item: AttendanceIncidentView;
  session: SessionView;
  onSaved?: () => void;
  onEditingStateChange?: (id: string, state: IncidentDraftState | null) => void;
}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reason, setReason] = useState('');
  const submitting = useRef(false);
  const dirty = item.requiresReason && !saved && reason !== '';
  useBlocker({
    shouldBlockFn: () =>
      pending ||
      (dirty &&
        !window.confirm('Tienes un motivo sin guardar. ¿Quieres descartarlo?')),
    enableBeforeUnload: !onEditingStateChange && (dirty || pending),
    disabled: Boolean(onEditingStateChange) || (!dirty && !pending),
  });
  useEffect(() => {
    onEditingStateChange?.(
      item.id,
      dirty || pending ? { dirty, pending } : null,
    );
    return () => onEditingStateChange?.(item.id, null);
  }, [item.id, dirty, pending, onEditingStateChange]);
  return (
    <li className="min-w-0 list-none space-y-3 break-words rounded-xl border border-border/70 bg-card p-4 text-sm leading-6">
      <p className="font-semibold">
        {label(item.kind)} ·{' '}
        {item.resolution
          ? 'Resuelta por solicitud aprobada'
          : 'Pendiente de revisión'}
      </p>
      <p>{instant(item.createdAt)}</p>
      {item.resolution && (
        <p>
          Resolución aprobada: {instant(item.resolution.decidedAt)}. El registro
          original se conserva.
        </p>
      )}
      {item.reasons.map((r) => (
        <p key={r.id}>
          {r.reason} · {instant(r.createdAt)}
        </p>
      ))}
      {item.requiresReason && <p>Motivo requerido</p>}
      {item.employeeId === session.employeeId &&
        item.requiresReason &&
        !saved && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending || submitting.current) return;
              const form = e.currentTarget;
              const reasonText = String(
                new FormData(form).get('reason') ?? '',
              ).trim();
              if (!reasonText) {
                setError('Escribe un motivo.');
                return;
              }
              submitting.current = true;
              setPending(true);
              setError(null);
              try {
                await request(
                  `/attendance/incidents/${item.id}/reason`,
                  AttendanceIncidentSchema,
                  {
                    method: 'POST',
                    csrfToken: session.csrfToken,
                    body: { reason: reasonText },
                  },
                );
                await client.invalidateQueries({ queryKey: ['attendance'] });
                setSaved(true);
                setReason('');
                onSaved?.();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'No se pudo guardar el motivo.',
                );
              } finally {
                submitting.current = false;
                setPending(false);
              }
            }}
          >
            <label className="block space-y-2">
              Motivo
              <textarea
                name="reason"
                value={reason}
                disabled={pending}
                onChange={(event) => setReason(event.target.value)}
                required
                maxLength={2000}
                className="block min-h-24 w-full rounded-md border p-2"
              />
            </label>
            <Button disabled={pending}>Guardar motivo</Button>
          </form>
        )}
      {saved && (
        <p role="status">
          Motivo conservado. La incidencia sigue pendiente de revisión.
        </p>
      )}
      <FormError message={error ?? undefined} />
    </li>
  );
}
function History({
  session,
  incidents = false,
}: {
  session: SessionView;
  incidents?: boolean;
}) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const search = useSearch({ strict: false }) as { from?: string; to?: string };
  const [range, setRange] = useState({
    from: search.from ?? today,
    to: search.to ?? today,
  });
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, IncidentDraftState>>({});
  const onEditingStateChange = useCallback(
    (id: string, state: IncidentDraftState | null) => {
      setDrafts((previous) => {
        if (!state) {
          if (!(id in previous)) return previous;
          const next = { ...previous };
          delete next[id];
          return next;
        }
        if (
          previous[id]?.dirty === state.dirty &&
          previous[id]?.pending === state.pending
        )
          return previous;
        return { ...previous, [id]: state };
      });
    },
    [],
  );
  const hasPendingDraft = Object.values(drafts).some((draft) => draft.pending);
  const hasDirtyDraft = Object.values(drafts).some((draft) => draft.dirty);
  const canChangeContext = () =>
    !hasPendingDraft &&
    (!hasDirtyDraft ||
      window.confirm('Tienes motivos sin guardar. ¿Quieres descartarlos?'));
  useBlocker({
    shouldBlockFn: () => !canChangeContext(),
    enableBeforeUnload: hasPendingDraft || hasDirtyDraft,
    disabled: !hasPendingDraft && !hasDirtyDraft,
  });
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const client = useQueryClient();
  const summary = useQuery({
    queryKey: ['attendance', incidents ? 'incidents' : 'summary', range],
    queryFn: ({ signal }) =>
      request(
        `/attendance/summary?${new URLSearchParams(range)}`,
        AttendanceSummarySchema,
        { signal },
      ),
    retry: false,
  });
  return (
    <section className={panelClass}>
      <h2 className="text-xl font-semibold">
        {incidents ? 'Incidencias en tu alcance' : 'Historial en tu alcance'}
      </h2>
      <p>
        Fechas civiles del turno, incluso si termina al día siguiente. Máximo 93
        días.
      </p>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-secondary/30 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const from = String(d.get('from'));
          const to = String(d.get('to'));
          const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
          if (days < 1 || days > 93) {
            setError('Selecciona un período de 1 a 93 días.');
            return;
          }
          if (!canChangeContext()) return;
          setError(null);
          setRange({ from, to });
        }}
      >
        <TextField name="from" label="Desde" type="date" value={range.from} />
        <TextField name="to" label="Hasta" type="date" value={range.to} />
        <Button disabled={hasPendingDraft}>Consultar</Button>
      </form>
      <FormError message={error ?? undefined} />
      <QueryFeedback
        query={summary}
        empty={
          summary.data?.items.filter(
            (item) => !incidents || item.incidents.length,
          ).length === 0
        }
      />
      {summary.data && (
        <ul className="space-y-4">
          {summary.data.items
            .filter((item) => !incidents || item.incidents.length)
            .map((item) =>
              incidents ? (
                <li key={item.assignmentId} className="space-y-3">
                  <h3 className="font-semibold">
                    {item.employeeName} · {item.workDate}
                  </h3>
                  <p>
                    {instant(item.startsAt, item.timeZone)} –{' '}
                    {instant(item.endsAt, item.timeZone)} · {item.timeZone}
                  </p>
                  <ul className="space-y-3">
                    {item.incidents.map((incident) => (
                      <Incident
                        key={incident.id}
                        item={incident}
                        session={session}
                        onEditingStateChange={onEditingStateChange}
                      />
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.assignmentId}>
                  <Slot item={item} />
                </li>
              ),
            )}
        </ul>
      )}
      {!incidents && session.permissions.manageOrganization && (
        <Button
          variant="outline"
          disabled={evaluating || !!error}
          onClick={async () => {
            setEvaluating(true);
            setMessage(null);
            try {
              const result = await request(
                '/attendance/evaluate',
                AttendanceEvaluateResultSchema,
                { method: 'POST', csrfToken: session.csrfToken, body: range },
              );
              setMessage(
                `${result.evaluated} turnos evaluados con hora del servidor.`,
              );
              await client.invalidateQueries({ queryKey: ['attendance'] });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo evaluar.');
            } finally {
              setEvaluating(false);
            }
          }}
        >
          Evaluar período
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
