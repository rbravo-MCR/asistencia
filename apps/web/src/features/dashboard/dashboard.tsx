import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardSchema,
  type DashboardShift,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { ArrowUpRight, RefreshCw, Clock3, Bell } from 'lucide-react';
const labels: Record<string, string> = {
  UPCOMING: 'Por iniciar',
  IN_PROGRESS: 'En curso / ventana de marcaje',
  AWAITING_EVALUATION: 'Pendiente de evaluación',
  HISTORICAL: 'Anterior a la activación de asistencia',
  EVALUATED: 'Evaluado',
  COMPLETE: 'Entrada y salida completas',
  ABSENCE: 'Falta evaluada',
  AUTHORIZED_ABSENCE: 'Ausencia autorizada',
  MISSING_ENTRY: 'Omisión de entrada',
  MISSING_EXIT: 'Omisión de salida',
  VACATION: 'Vacaciones',
  PERMISSION: 'Permiso',
  JUSTIFICATION: 'Justificación',
  CANCELLATION: 'Cancelación',
  PENDING_HEAD: 'Pendiente del jefe',
  PENDING_DIRECTOR: 'Pendiente del director',
  LATE_ENTRY: 'Retardo',
  LATE_ABSENCE: 'Falta por llegada tardía (justificable)',
  EARLY_EXIT: 'Salida anticipada',
  LOCATION_REQUIRED: 'Se requiere ubicación',
  OUTSIDE_GEOFENCE: 'Fuera del centro autorizado',
  ACCURACY_INSUFFICIENT: 'Precisión GPS insuficiente',
  LOW_ACCURACY: 'Precisión GPS insuficiente',
  NO_AUTHORIZED_LOCATION: 'Sin centro autorizado',
  OUTSIDE_WINDOW: 'Fuera de la ventana de marcaje',
  DUPLICATE_DIRECTION: 'Marcaje duplicado',
  OUT_OF_ORDER: 'Orden de marcaje inválido',
};
const label = (s: string) => labels[s] ?? s;
const linkClass = 'font-medium text-link underline underline-offset-4';
const timeIn = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone,
    timeStyle: 'short',
  }).format(new Date(value));
function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-xl bg-secondary/55 p-4">
      <p className="min-w-0 text-sm leading-5 text-muted-foreground">{title}</p>
      <p className="shrink-0 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Shift({ shift }: { shift: DashboardShift }) {
  const time = (s: string) =>
    new Intl.DateTimeFormat('es-MX', {
      timeZone: shift.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(s));
  return (
    <article className="min-w-0 space-y-2 break-words border-l-2 border-primary py-1 pl-4 text-sm leading-6">
      <p className="font-semibold">
        {shift.employeeName} · {shift.workDate}
      </p>
      <p>
        {time(shift.startsAt)} – {time(shift.endsAt)} · {shift.timeZone}
      </p>
      <p>{shift.modality === 'ONSITE' ? 'Presencial' : 'Home office'}</p>
      <p>
        Entrada: {shift.entry ? 'registrada' : 'sin registro aceptado'} ·
        Salida: {shift.exit ? 'registrada' : 'sin registro aceptado'}
      </p>
      <p>
        {label(shift.phase)}
        {shift.evaluation ? ` · ${label(shift.evaluation)}` : ''}
      </p>
      {shift.authorizedAbsence && (
        <p>Cuenta con ausencia aprobada que cubre el turno.</p>
      )}
      <a
        className={linkClass}
        href={`/asistencia?from=${shift.workDate}&to=${shift.workDate}`}
      >
        Consultar marcajes
      </a>
    </article>
  );
}
export function Dashboard({ session }: { session: SessionView }) {
  const query = useQuery({
    queryKey: [
      'dashboard',
      session.user.id,
      session.permissions,
      session.managedDepartmentIds,
    ],
    queryFn: ({ signal }) => request('/dashboard', DashboardSchema, { signal }),
    retry: false,
    staleTime: 0,
  });
  const data = query.data;
  const ownIncidents =
    data?.attendance.incidents.filter(
      (i) => i.employeeId === session.employeeId,
    ) ?? [];
  const ownRequests =
    data?.pendingRequests.filter((r) => r.employeeId === session.employeeId) ??
    [];
  const decisions = data?.pendingRequests.filter((r) => r.canDecide) ?? [];
  const personalShift = data?.personal?.shift ?? null;
  const personalState = personalShift
    ? personalShift.authorizedAbsence
      ? 'Ausencia autorizada'
      : personalShift.entry && personalShift.exit
        ? 'Jornada completa'
        : personalShift.entry
          ? 'Salida pendiente'
          : personalShift.phase === 'IN_PROGRESS'
            ? 'Entrada pendiente'
            : label(personalShift.phase)
    : null;
  return (
    <Page
      title={`Hola, ${session.user.name}`}
      description="Tu jornada y los pendientes que requieren atención."
      eyebrow="Resumen de trabajo"
      actions={
        <Button
          variant="outline"
          className="min-h-11"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Actualizar resumen
        </Button>
      }
    >
      {query.isPending && <DashboardSkeleton />}
      {query.isError && <QueryFeedback query={query} />}
      {data && !query.isError && (
        <>
          {data.personal && (
            <section
              className="mcr-dashboard-hero rounded-2xl p-5 sm:p-6"
              aria-labelledby="dashboard-today"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Tu jornada de hoy
                  </p>
                  <h2
                    id="dashboard-today"
                    className="text-2xl font-semibold tracking-tight"
                  >
                    {personalShift
                      ? `${timeIn(personalShift.startsAt, personalShift.timeZone)} – ${timeIn(personalShift.endsAt, personalShift.timeZone)}`
                      : 'Sin turno publicado'}
                  </h2>
                  <p className="text-sm text-white/70">
                    {data.date} · {data.timeZone}
                  </p>
                  {personalShift ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium">
                        {personalState}
                      </span>
                      <span className="text-white/70">
                        {personalShift.modality === 'ONSITE'
                          ? 'Presencial'
                          : 'Home office'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/70">
                      No tienes un turno actual o próximo publicado.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="min-h-11">
                    <Link
                      to="/asistencia"
                      {...(personalShift
                        ? { search: { shift: personalShift.id } }
                        : {})}
                    >
                      Abrir mi jornada
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  {decisions.length > 0 && (
                    <Button
                      asChild
                      variant="outline"
                      className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link to="/aprobaciones">
                        Revisar {decisions.length} pendientes
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              {decisions.length > 0 && (
                <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/70">
                  Hay {decisions.length} solicitudes esperando tu decisión.
                </p>
              )}
            </section>
          )}
          <section className={panelClass} aria-labelledby="dashboard-tasks">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="dashboard-tasks" className="text-xl font-semibold">
                  ¿Qué necesitas hacer?
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-muted-foreground">
                  <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                  Fecha de trabajo: {data.date} · {data.timeZone}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Actualizado{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  timeZone: data.timeZone,
                  timeStyle: 'short',
                }).format(new Date(data.generatedAt))}
              </p>
            </div>
            <div
              className={`grid gap-3 sm:grid-cols-2 ${session.permissions.manageOrganization ? 'xl:grid-cols-4' : ''}`}
            >
              <div className="min-w-0 rounded-xl border p-4">
                <Link
                  to="/solicitudes"
                  search={{ create: 'VACATION' }}
                  className={`${linkClass} inline-flex min-h-11 items-center gap-2`}
                >
                  Solicitar vacaciones{' '}
                  <ArrowUpRight
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
                <p className="text-sm leading-6 text-muted-foreground">
                  Elige tu período y las fechas; revisa la solicitud antes de
                  enviarla.
                </p>
              </div>
              <div className="min-w-0 rounded-xl border p-4">
                <Link
                  to="/calendario"
                  className={`${linkClass} inline-flex min-h-11 items-center gap-2`}
                >
                  {session.permissions.manageOrganization
                    ? 'Consultar horarios'
                    : 'Mi horario'}{' '}
                  <ArrowUpRight
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
                <p className="text-sm leading-6 text-muted-foreground">
                  {session.permissions.manageOrganization
                    ? 'Revisa las jornadas publicadas en tu alcance.'
                    : 'Consulta tus turnos publicados y las horas de tu jornada.'}
                </p>
              </div>
              {session.permissions.manageOrganization && (
                <>
                  <div className="min-w-0 rounded-xl border p-4">
                    <Link
                      to="/calendario"
                      className={`${linkClass} inline-flex min-h-11 items-center gap-2`}
                    >
                      Asignar turnos{' '}
                      <ArrowUpRight
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Selecciona empleado y plantilla. Guarda el borrador y
                      publícalo para que sea visible.
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border p-4">
                    <Link
                      to="/vacaciones"
                      search={{ view: 'team' }}
                      className={`${linkClass} inline-flex min-h-11 items-center gap-2`}
                    >
                      Administrar días{' '}
                      <ArrowUpRight
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Consulta los períodos del equipo, concede días o registra
                      un ajuste con motivo.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm">
              <Link
                className={`${linkClass} inline-flex min-h-11 items-center`}
                to={decisions.length ? '/aprobaciones' : '/asistencia'}
              >
                {decisions.length
                  ? 'Revisar solicitudes pendientes'
                  : 'Registrar entrada o salida'}
              </Link>
              <Link
                className={`${linkClass} inline-flex min-h-11 items-center`}
                to="/solicitudes"
              >
                Mis solicitudes
              </Link>
              {session.permissions.manageOrganization && (
                <Link
                  className={`${linkClass} inline-flex min-h-11 items-center`}
                  to="/configuracion"
                >
                  Abrir configuración
                </Link>
              )}
            </div>
          </section>
          <div className="grid items-start gap-6 xl:grid-cols-2">
            {decisions.length > 0 && (
              <section
                className={`${panelClass} xl:col-span-2 border-primary/50`}
              >
                <h2 className="text-xl font-semibold">Requieren tu decisión</h2>
                <p>
                  {decisions.length} solicitudes autorizadas para tu paso
                  vigente.
                </p>
                <ul className="space-y-2">
                  {decisions.map((r) => (
                    <li key={r.id}>
                      {r.employeeName} · {label(r.kind)} · {r.fromDate} a{' '}
                      {r.toDate} · {label(r.status)}
                    </li>
                  ))}
                </ul>
                <a className={linkClass} href="/aprobaciones">
                  Abrir aprobaciones
                </a>
              </section>
            )}
            {data.personal ? (
              <section className={panelClass}>
                <h2 className="text-xl font-semibold">Mi jornada</h2>
                {data.personal.shift ? (
                  <Shift shift={data.personal.shift} />
                ) : (
                  <p>No tienes turno actual o próximo publicado.</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric
                    title="Mis incidencias sin resolver · todo el historial"
                    value={ownIncidents.length}
                  />
                  <Metric
                    title="Mis solicitudes pendientes · todo el historial"
                    value={ownRequests.length}
                  />
                </div>
                <h3 className="font-semibold">Mis vacaciones</h3>
                {data.personal.balances.length ? (
                  <ul className="space-y-2">
                    {data.personal.balances.map((b) => (
                      <li key={b.anniversaryYear}>
                        Período {b.anniversaryYear}: {b.available} días
                        disponibles · {b.reserved} reservados
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sin períodos concedidos</p>
                )}
                <a className={linkClass} href="/vacaciones">
                  Consultar períodos y movimientos
                </a>
              </section>
            ) : (
              <section className={panelClass}>
                <h2 className="text-xl font-semibold">Mi jornada</h2>
                <p>
                  Tu cuenta no tiene un empleado activo vinculado.{' '}
                  {session.permissions.manageOrganization
                    ? 'Revisa la vinculación de tu usuario en Empleados para registrar asistencia y presentar solicitudes propias. Puedes continuar con la gestión de tu equipo.'
                    : 'Solicita a RR. HH. revisar la vinculación para registrar asistencia y presentar solicitudes propias.'}
                </p>
                {session.permissions.manageOrganization && (
                  <Link className={linkClass} to="/empleados">
                    Revisar vinculación en Empleados
                  </Link>
                )}
              </section>
            )}
            <section className={panelClass}>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Bell
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                Avisos
              </h2>
              <Metric
                title="Avisos sin leer"
                value={data.unreadNotifications}
              />
              <a className={linkClass} href="/avisos">
                Abrir mi bandeja
              </a>
            </section>
            {data.teamVisible && (
              <section className={`${panelClass} xl:col-span-2`}>
                <h2 className="text-xl font-semibold">
                  Asistencia en tu alcance
                </h2>
                <p>
                  Turnos publicados con fecha de inicio {data.date}. Los turnos
                  nocturnos conservan esa fecha.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric
                    title="Turnos programados"
                    value={data.attendance.shifts.length}
                  />
                  <Metric
                    title="Con entrada aceptada"
                    value={data.attendance.shifts.filter((s) => s.entry).length}
                  />
                  <Metric
                    title="Entrada y salida aceptadas"
                    value={
                      data.attendance.shifts.filter((s) => s.entry && s.exit)
                        .length
                    }
                  />
                  <Metric
                    title="Pendientes de evaluación"
                    value={
                      data.attendance.shifts.filter(
                        (s) => s.phase === 'AWAITING_EVALUATION',
                      ).length
                    }
                  />
                  <Metric
                    title="Faltas evaluadas · registro original"
                    value={
                      data.attendance.shifts.filter((s) =>
                        ['ABSENCE', 'LATE_ABSENCE'].includes(
                          s.evaluation ?? '',
                        ),
                      ).length
                    }
                  />
                  <Metric
                    title="Ausencias autorizadas"
                    value={
                      data.attendance.shifts.filter(
                        (s) =>
                          s.authorizedAbsence ||
                          s.evaluation === 'AUTHORIZED_ABSENCE',
                      ).length
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Una jornada sin entrada no se cuenta como falta hasta que
                  existe evaluación. Los indicadores de marcajes y evaluación
                  pueden describir el mismo turno.
                </p>
                <details>
                  <summary className="cursor-pointer font-medium">
                    Ver turnos que componen el resumen
                  </summary>
                  <div className="mt-4 grid gap-3">
                    {data.attendance.shifts.length ? (
                      data.attendance.shifts.map((s) => (
                        <Shift key={s.id} shift={s} />
                      ))
                    ) : (
                      <p>Sin turnos publicados para esta fecha.</p>
                    )}
                  </div>
                </details>
              </section>
            )}
            <section className={panelClass}>
              <h2 className="text-xl font-semibold">
                Incidencias pendientes en tu alcance
              </h2>
              <p>
                Todo el historial · sin resolución aprobada. Capturar un motivo
                no resuelve una incidencia.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric
                  title="Sin resolver"
                  value={data.attendance.incidents.length}
                />
                <Metric
                  title="Todavía requieren motivo"
                  value={
                    data.attendance.incidents.filter((i) => i.requiresReason)
                      .length
                  }
                />
              </div>
              <details>
                <summary className="cursor-pointer font-medium">
                  Ver incidencias pendientes
                </summary>
                <ul className="mt-3 space-y-3">
                  {data.attendance.incidents.map((i) => (
                    <li key={i.id} className="break-words">
                      {i.employeeName} · {i.workDate} · {label(i.kind)} ·{' '}
                      {i.requiresReason
                        ? 'Motivo requerido'
                        : 'Motivo capturado; pendiente de resolución'}{' '}
                      ·{' '}
                      <a
                        className={linkClass}
                        href={`/incidencias?from=${i.workDate}&to=${i.workDate}`}
                      >
                        Abrir incidencias de esta fecha
                      </a>
                    </li>
                  ))}
                </ul>
                {!data.attendance.incidents.length && (
                  <p className="mt-3">Sin incidencias pendientes.</p>
                )}
              </details>
            </section>
            <section className={panelClass}>
              <h2 className="text-xl font-semibold">
                Solicitudes pendientes en tu alcance
              </h2>
              <p>
                Todo el historial · {data.pendingRequests.length} pendientes. La
                visibilidad no concede facultad de aprobación.
              </p>
              <details>
                <summary className="cursor-pointer font-medium">
                  Ver solicitudes pendientes
                </summary>
                {data.pendingRequests.length ? (
                  <ul className="mt-3 space-y-2">
                    {data.pendingRequests.map((r) => (
                      <li key={r.id} className="break-words">
                        {r.employeeName} · {label(r.kind)} · {r.fromDate} a{' '}
                        {r.toDate} · {label(r.status)}
                        {r.canDecide ? ' · Puedes decidir este paso' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3">Sin solicitudes pendientes.</p>
                )}
              </details>
              <a className={linkClass} href="/solicitudes">
                Consultar solicitudes
              </a>
            </section>
          </div>
        </>
      )}
    </Page>
  );
}

function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Cargando tu resumen…" className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </SkeletonGroup>
  );
}
