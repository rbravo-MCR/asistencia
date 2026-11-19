import { PlanningCancel, PlanningEditor } from './planning-editor';
import { Link, useBlocker, useSearch } from '@tanstack/react-router';
import { submit, useWrite } from './use-write';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EmployeeListSchema,
  ShiftTemplateListSchema,
  ScheduleAssignmentListSchema,
  HolidayListSchema,
  LocationListSchema,
  LocationAuthorizationListSchema,
  type SessionView,
  type ScheduleAssignmentView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass, Field } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField, SelectField, Save, WriteFeedback } from './controls';
const statusLabels = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  CANCELLED: 'Cancelado',
};
function civil(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function CalendarPage() {
  return (
    <ProtectedPage>
      {(session) => <CalendarContent session={session} />}
    </ProtectedPage>
  );
}
function CalendarContent({ session }: { session: SessionView }) {
  const search = useSearch({ strict: false }) as { from?: string; to?: string };
  const [linkedRange, setLinkedRange] = useState(
    search.from && search.to ? { from: search.from, to: search.to } : null,
  );
  const [month, setMonth] = useState(
    () =>
      search.from?.slice(0, 7) ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [preview, setPreview] = useState({
    employeeId: '',
    templateId: '',
    workDate: '',
  });
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [publishing, setPublishing] = useState<ScheduleAssignmentView | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleAssignmentView | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [move, setMove] = useState<{
    item: ScheduleAssignmentView;
    date: string;
  } | null>(null);
  const [year, number] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, number - 1, 1));
  const last = new Date(Date.UTC(year, number, 0));
  const from = linkedRange?.from ?? civil(first),
    to = linkedRange?.to ?? civil(last);
  const query = useQuery({
    queryKey: ['schedule-assignments', from, to],
    queryFn: ({ signal }) =>
      request(
        `/schedule-assignments?from=${from}&to=${to}`,
        ScheduleAssignmentListSchema,
        { signal },
      ),
    retry: false,
  });
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: ({ signal }) =>
      request('/employees', EmployeeListSchema, { signal }),
    retry: false,
  });
  const templates = useQuery({
    queryKey: ['shift-templates'],
    queryFn: ({ signal }) =>
      request('/shift-templates', ShiftTemplateListSchema, { signal }),
    retry: false,
  });
  const holidays = useQuery({
    queryKey: ['holidays'],
    queryFn: ({ signal }) =>
      request('/holidays', HolidayListSchema, { signal }),
    retry: false,
  });
  const manager = session.permissions.manageOrganization;
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: ({ signal }) =>
      request('/locations', LocationListSchema, { signal }),
    enabled: manager,
    retry: false,
  });
  const authorizations = useQuery({
    queryKey: ['location-authorizations'],
    queryFn: ({ signal }) =>
      request('/location-authorizations', LocationAuthorizationListSchema, {
        signal,
      }),
    enabled: manager,
    retry: false,
  });
  const authorizedLocations = (employeeId: string, workDate: string) =>
    (locations.data?.items ?? []).filter(
      (location) =>
        location.active &&
        (authorizations.data?.items ?? []).some(
          (authorization) =>
            authorization.employeeId === employeeId &&
            authorization.locationId === location.id &&
            authorization.revokedAt === null &&
            authorization.startsOn <= workDate &&
            (authorization.endsOn === null || authorization.endsOn >= workDate),
        ),
    );
  const write = useWrite(session.csrfToken, ['schedule-assignments'], () => {
    setEditorOpen(false);
    setEditing(null);
    setPublishing(null);
    setCancelling(null);
    setMove(null);
  });
  useBlocker({
    shouldBlockFn: () => write.isPending,
    enableBeforeUnload: write.isPending,
    disabled: !write.isPending,
  });
  const visible = (query.data?.items ?? []).filter(
    (i) => !employeeFilter || i.employeeId === employeeFilter,
  );
  const previewTemplate = templates.data?.items.find(
    (t) => t.id === preview.templateId,
  );
  const previewEmployee = employees.data?.items.find(
    (employee) => employee.id === preview.employeeId,
  );
  const isOnsite = previewTemplate?.modality === 'ONSITE';
  const availableLocations =
    preview.employeeId && preview.workDate
      ? authorizedLocations(preview.employeeId, preview.workDate)
      : [];
  const employeeName = (id: string) =>
    employees.data?.items.find((e) => e.id === id)?.fullName ??
    'Empleado no disponible';
  const days = Array.from(
    {
      length: linkedRange
        ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1
        : last.getUTCDate(),
    },
    (_, i) =>
      linkedRange
        ? new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10)
        : `${month}-${String(i + 1).padStart(2, '0')}`,
  );
  return (
    <Page
      eyebrow="Planificación"
      actions={
        manager ? (
          <Button
            type="button"
            id="planning-new-draft"
            onClick={() => {
              setEditing(null);
              setPreview({
                employeeId: '',
                templateId: '',
                workDate: selected ?? from,
              });
              write.reset();
              setEditorOpen(true);
            }}
          >
            Asignar turno
          </Button>
        ) : undefined
      }
      title={manager ? 'Asignar turnos' : 'Mis horarios'}
      description={
        manager
          ? 'Asigna un horario a cada persona y publica cuando esté listo. Aquí también consultas jornadas, guardias y festivos.'
          : 'Consulta tus jornadas, guardias y festivos. Cada fecha corresponde al inicio del turno, en la zona horaria indicada.'
      }
    >
      {manager && (
        <section
          className="rounded-xl border bg-card px-4 py-3 text-sm"
          aria-label="Cómo asignar un turno"
        >
          <ol className="grid gap-2 sm:grid-cols-3">
            <li>
              <span className="font-semibold">1. Persona y plantilla</span>
              <p className="text-muted-foreground">
                Elige quién trabajará, su horario y la fecha.
              </p>
            </li>
            <li>
              <span className="font-semibold">2. Guarda el borrador</span>
              <p className="text-muted-foreground">
                Revisa y ajusta antes de publicar.
              </p>
            </li>
            <li>
              <span className="font-semibold">3. Publica el turno</span>
              <p className="text-muted-foreground">
                Confirma Publicar desde su tarjeta en la agenda.
              </p>
            </li>
          </ol>
          <p className="mt-3 border-t pt-3 text-muted-foreground">
            Una plantilla define el horario; asignarla lo aplica a una persona y
            fecha.{' '}
            <Link
              to="/turnos"
              className="font-medium text-link underline underline-offset-4"
            >
              Ver plantillas de turno
            </Link>
          </p>
        </section>
      )}
      {linkedRange && (
        <p>
          Intervalo seleccionado: {from} a {to}. Cambiar el mes vuelve a la
          vista mensual.
        </p>
      )}
      <div
        className={`${panelClass} !space-y-0 flex flex-wrap items-end gap-4`}
      >
        <Field id="month" label="Mes">
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setLinkedRange(null);
                setSelected(null);
              }
            }}
          />
        </Field>
        <div className="min-w-0 flex-1 basis-44">
          <label htmlFor="employee-filter" className="text-sm">
            Empleado
          </label>
          <select
            id="employee-filter"
            className="h-10 w-full rounded-md border bg-card px-3"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="">Todos en mi alcance</option>
            {employees.data?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Vista del calendario"
        >
          <Button
            type="button"
            variant={view === 'month' ? 'default' : 'outline'}
            aria-pressed={view === 'month'}
            onClick={() => setView('month')}
          >
            Mes
          </Button>
          <Button
            type="button"
            variant={view === 'agenda' ? 'default' : 'outline'}
            aria-pressed={view === 'agenda'}
            onClick={() => setView('agenda')}
          >
            Agenda
          </Button>
        </div>
      </div>
      <WriteFeedback mutation={write} />
      {!employees.isSuccess && <QueryFeedback query={employees} />}
      {!templates.isSuccess && <QueryFeedback query={templates} />}
      {!holidays.isSuccess && <QueryFeedback query={holidays} />}
      {manager && !locations.isSuccess && <QueryFeedback query={locations} />}
      <QueryFeedback query={query} />
      {view === 'month' && (
        <section className={panelClass}>
          <h2 className="text-xl font-semibold">
            {linkedRange ? 'Vista del intervalo seleccionado' : 'Vista mensual'}
          </h2>

          <div
            className="grid grid-cols-7 gap-1 text-center text-xs sm:gap-2"
            role="group"
            aria-label="Días del mes"
          >
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <span key={d} className="py-2 font-medium">
                {d}
              </span>
            ))}
            {Array.from(
              {
                length:
                  ((linkedRange ? new Date(from) : first).getUTCDay() + 6) % 7,
              },
              (_, i) => (
                <span key={`blank-${i}`} />
              ),
            )}
            {days.map((date) => {
              const slots = visible.filter((i) => i.workDate === date);
              const holiday = holidays.data?.items.find((h) => h.date === date);
              return (
                <button
                  type="button"
                  key={date}
                  aria-pressed={selected === date}
                  aria-label={`${date}, ${slots.length} turnos${holiday ? `, ${holiday.name}` : ''}`}
                  className={`min-h-20 min-w-0 rounded-lg border bg-background p-1 text-left transition-colors hover:bg-secondary sm:min-h-24 sm:p-2 focus-visible:outline-2 focus-visible:outline-ring ${selected === date ? 'border-ring bg-secondary' : ''}`}
                  onClick={() => {
                    setSelected(selected === date ? null : date);
                    setEditing(null);
                  }}
                  onDragOver={manager ? (e) => e.preventDefault() : undefined}
                  onDrop={
                    manager
                      ? (e) => {
                          e.preventDefault();
                          const item = visible.find(
                            (i) =>
                              i.id === e.dataTransfer.getData('text/plain'),
                          );
                          if (item?.status === 'DRAFT') setMove({ item, date });
                        }
                      : undefined
                  }
                >
                  <span className="font-semibold">
                    {Number(date.slice(-2))}
                  </span>
                  {holiday && (
                    <span
                      className="block truncate text-link"
                      title={holiday.name}
                    >
                      Festivo
                    </span>
                  )}
                  {slots.length > 0 && (
                    <span className="block">
                      {slots.length}
                      <span className="sr-only"> turnos</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selected && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
            >
              Ver todo el mes
            </Button>
          )}
        </section>
      )}
      {move && (
        <section className={panelClass}>
          <p>
            Mover borrador de {employeeName(move.item.employeeId)} al{' '}
            {move.date}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={write.isPending}
              onClick={() =>
                write.mutate({
                  path: `/schedule-assignments/${move.item.id}`,
                  method: 'PUT',
                  body: {
                    employeeId: move.item.employeeId,
                    templateId: move.item.templateId,
                    workDate: move.date,
                    kind: move.item.kind,
                    locationId: move.item.locationId,
                  },
                })
              }
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={write.isPending}
              onClick={() => setMove(null)}
            >
              Volver
            </Button>
          </div>
        </section>
      )}
      {publishing && (
        <section className={panelClass} aria-label="Confirmar publicación">
          <h2 className="text-lg font-semibold">Publicar turno</h2>
          <p className="break-words">
            {employeeName(publishing.employeeId)} · {publishing.workDate} ·{' '}
            {publishing.templateName}
          </p>
          <p className="text-sm text-muted-foreground">
            Al publicar se conserva esta versión del turno. Para sustituirlo
            después, cancélalo y crea otro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={write.isPending}
              onClick={() =>
                write.mutate({
                  path: `/schedule-assignments/${publishing.id}/publish`,
                })
              }
            >
              Confirmar publicación
            </Button>
            <Button
              variant="outline"
              disabled={write.isPending}
              onClick={() => setPublishing(null)}
            >
              Volver
            </Button>
          </div>
        </section>
      )}
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jornadas y guardias
          </p>
          <h2 className="text-xl font-semibold">
            Agenda{selected ? ` · ${selected}` : ''}
          </h2>
          {visible.filter((i) => !selected || i.workDate === selected)
            .length === 0 &&
            query.isSuccess && (
              <div className="rounded-xl border border-dashed p-4 text-sm">
                <p className="font-medium">
                  {manager
                    ? 'No hay turnos en esta selección.'
                    : 'No tienes turnos en esta selección.'}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {manager
                    ? employeeFilter || selected
                      ? 'Cambia el empleado o la fecha para consultar otros turnos, o usa Asignar turno para agregar uno.'
                      : 'Usa Asignar turno para elegir una persona, guardar el borrador y publicarlo.'
                    : 'Prueba otro mes o consulta con la persona responsable de tu planificación.'}
                </p>
                {manager &&
                  templates.isSuccess &&
                  !templates.data.items.some((t) => t.active) && (
                    <p className="mt-2">
                      Primero necesitas una plantilla activa.{' '}
                      <Link
                        to="/turnos"
                        className="text-link underline underline-offset-4"
                      >
                        Crear una plantilla de turno
                      </Link>
                    </p>
                  )}
              </div>
            )}
          <ul className="grid gap-4 xl:grid-cols-2">
            {visible
              .filter((i) => !selected || i.workDate === selected)
              .map((item) => (
                <li
                  key={item.id}
                  draggable={manager && item.status === 'DRAFT'}
                  onDragStart={(e) =>
                    e.dataTransfer.setData('text/plain', item.id)
                  }
                  className="min-w-0 space-y-3 rounded-xl border bg-background p-4 break-words"
                >
                  <h3 className="font-semibold">
                    {employeeName(item.employeeId)}
                  </h3>
                  <p>
                    {item.workDate} · {item.templateName} ·{' '}
                    {item.kind === 'DUTY' ? 'Guardia' : 'Jornada regular'}
                  </p>
                  <p className="text-sm">
                    {item.snapshot.startTime}–{item.snapshot.endTime}
                    {item.snapshot.endTime <= item.snapshot.startTime
                      ? ' (+1 día)'
                      : ''}{' '}
                    · {item.timeZone}
                  </p>
                  <p className="text-sm">
                    {statusLabels[item.status]} ·{' '}
                    {item.modality === 'ONSITE' ? 'Presencial' : 'Home office'}{' '}
                    · v{item.templateVersion}
                  </p>
                  {item.cancellationReason && (
                    <p className="break-words text-sm">
                      Motivo: {item.cancellationReason}
                    </p>
                  )}
                  {manager && item.status !== 'CANCELLED' && (
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'DRAFT' && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            aria-label={`Editar turno de ${employeeName(item.employeeId)} del ${item.workDate}`}
                            onClick={() => {
                              setEditing(item);
                              setPreview({
                                employeeId: item.employeeId,
                                templateId: item.templateId,
                                workDate: item.workDate,
                              });
                              setEditorOpen(true);
                              setSelected(item.workDate);
                              write.reset();
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            disabled={write.isPending}
                            aria-label={`Publicar turno de ${employeeName(item.employeeId)} del ${item.workDate}`}
                            onClick={() => {
                              write.reset();
                              setPublishing(item);
                            }}
                          >
                            Publicar
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Cancelar turno de ${employeeName(item.employeeId)} del ${item.workDate}`}
                        onClick={() => {
                          write.reset();
                          setCancelling(item.id);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                  {cancelling === item.id && (
                    <PlanningEditor
                      initialFocusId="reason"
                      returnFocusId="planning-new-draft"
                      title="Cancelar turno"
                      pending={write.isPending}
                      onClose={() => setCancelling(null)}
                    >
                      <WriteFeedback mutation={write} />
                      <p className="mb-4 break-words text-sm">
                        {employeeName(item.employeeId)} · {item.workDate} ·{' '}
                        {item.templateName}
                      </p>
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          const d = submit(e);
                          write.mutate({
                            path: `/schedule-assignments/${item.id}/cancel`,
                            body: { reason: String(d.get('reason')).trim() },
                          });
                        }}
                      >
                        <fieldset
                          disabled={write.isPending}
                          className="space-y-3"
                        >
                          <TextField
                            name="reason"
                            label="Motivo de cancelación"
                          />
                          <Save
                            pending={write.isPending}
                            label="Confirmar cancelación"
                          />
                          <PlanningCancel>Volver</PlanningCancel>
                        </fieldset>
                      </form>
                    </PlanningEditor>
                  )}
                </li>
              ))}
          </ul>
        </section>
        {manager && editorOpen && (
          <PlanningEditor
            initialFocusId="employeeId"
            returnFocusId="planning-new-draft"
            title={editing ? 'Editar borrador' : 'Asignar turno'}
            description="Elige persona, horario y fecha. Guardar crea un borrador; después debes publicarlo desde la agenda."
            pending={write.isPending}
            onClose={() => setEditorOpen(false)}
          >
            <WriteFeedback mutation={write} />
            <form
              key={`${editing?.id ?? 'new'}-${selected ?? ''}`}
              onChange={(event) => {
                const data = new FormData(event.currentTarget);
                const employeeId = String(data.get('employeeId') ?? '');
                const employee = employees.data?.items.find(
                  (item) => item.id === employeeId,
                );
                const workDate = String(data.get('workDate') ?? '');
                const templateControl = event.currentTarget.elements.namedItem(
                  'templateId',
                ) as HTMLSelectElement;
                const template = templates.data?.items.find(
                  (item) =>
                    item.id === templateControl.value &&
                    item.active &&
                    item.category === employee?.category,
                );
                if (!template) templateControl.value = '';
                const center = event.currentTarget.elements.namedItem(
                  'locationId',
                ) as HTMLSelectElement;
                if (
                  template?.modality !== 'ONSITE' ||
                  !authorizedLocations(employeeId, workDate).some(
                    (location) => location.id === center.value,
                  )
                )
                  center.value = '';
                setPreview({
                  employeeId,
                  templateId: template?.id ?? '',
                  workDate,
                });
              }}
              className="space-y-5 [&>div:last-child]:sticky [&>div:last-child]:bottom-0 [&>div:last-child]:border-t [&>div:last-child]:bg-card [&>div:last-child]:py-4"
              onSubmit={(e) => {
                const d = submit(e);
                write.mutate({
                  path: `/schedule-assignments${editing ? `/${editing.id}` : ''}`,
                  method: editing ? 'PUT' : 'POST',
                  body: {
                    employeeId: d.get('employeeId'),
                    templateId: d.get('templateId'),
                    workDate: d.get('workDate'),
                    kind: d.get('kind'),
                    locationId:
                      templates.data?.items.find(
                        (template) => template.id === d.get('templateId'),
                      )?.modality === 'HOME_OFFICE'
                        ? null
                        : d.get('locationId') || null,
                  },
                });
              }}
            >
              <fieldset className="space-y-4">
                <legend className="mb-3 text-sm font-semibold">
                  Persona y horario
                </legend>
                <SelectField
                  name="employeeId"
                  label="Empleado del turno"
                  value={editing?.employeeId}
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.data?.items
                    .filter((e) => e.status === 'ACTIVE')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                </SelectField>
                <SelectField
                  name="templateId"
                  label="Plantilla"
                  value={editing?.templateId}
                >
                  <option value="">Selecciona una plantilla</option>
                  {templates.data?.items
                    .filter(
                      (t) =>
                        t.active && t.category === previewEmployee?.category,
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </SelectField>
                <p className="text-sm text-muted-foreground">
                  {previewEmployee
                    ? `Plantillas activas para categoría ${previewEmployee.category === 'ADMINISTRATIVE' ? 'administrativa' : 'operativa'}.`
                    : 'Elige una persona para ver las plantillas de su categoría.'}
                </p>
                {previewEmployee &&
                  templates.isSuccess &&
                  !templates.data.items.some(
                    (template) =>
                      template.active &&
                      template.category === previewEmployee.category,
                  ) && (
                    <p className="text-sm">
                      No hay plantillas activas para esta categoría.{' '}
                      <Link
                        to="/turnos"
                        className="text-link underline underline-offset-4"
                      >
                        Revisar plantillas de turno
                      </Link>
                    </p>
                  )}
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="mb-3 text-sm font-semibold">
                  Fecha y lugar de trabajo
                </legend>
                <TextField
                  name="workDate"
                  label="Fecha de inicio"
                  type="date"
                  value={editing?.workDate ?? selected ?? from}
                />
                <SelectField
                  name="kind"
                  label="Tipo de jornada"
                  value={editing?.kind}
                >
                  <option value="REGULAR">Regular</option>
                  <option value="DUTY">Guardia</option>
                </SelectField>
                <Field id="locationId" label="Centro para trabajo presencial">
                  <select
                    id="locationId"
                    name="locationId"
                    defaultValue={editing?.locationId ?? ''}
                    required={isOnsite}
                    disabled={
                      !isOnsite ||
                      !authorizations.isSuccess ||
                      !locations.isSuccess
                    }
                    className="h-10 w-full rounded-md border bg-card px-3"
                  >
                    <option value="">
                      {isOnsite
                        ? 'Selecciona un centro autorizado'
                        : 'Sin centro presencial'}
                    </option>
                    {availableLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {isOnsite && !authorizations.isSuccess && (
                  <QueryFeedback query={authorizations} />
                )}
                {isOnsite &&
                  locations.isSuccess &&
                  authorizations.isSuccess &&
                  availableLocations.length === 0 && (
                    <p className="text-sm">
                      {authorizations.data.items.some(
                        (authorization) =>
                          authorization.employeeId === preview.employeeId,
                      )
                        ? `No hay centros activos autorizados para esta persona en ${preview.workDate || 'la fecha elegida'}. Revisa la vigencia o elige otra fecha.`
                        : 'Esta persona no tiene autorizaciones de centro. Autoriza un centro con la vigencia que corresponda antes de asignar trabajo presencial.'}{' '}
                      <Link
                        to="/ubicaciones"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link underline underline-offset-4"
                      >
                        Revisar autorizaciones en Ubicaciones
                      </Link>{' '}
                      Se abre en otra pestaña para conservar este borrador.
                      Después de autorizar el centro, vuelve aquí.
                    </p>
                  )}
                {isOnsite && availableLocations.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Solo se muestran centros activos con autorización vigente
                    para esta persona y fecha. Las fechas de inicio y fin están
                    incluidas.
                  </p>
                )}
              </fieldset>
              <section
                aria-label="Resumen de la asignación"
                className="space-y-2 rounded-xl border bg-secondary/40 p-4 text-sm"
              >
                <h3 className="font-semibold">Resumen de la asignación</h3>
                <p>
                  {preview.employeeId
                    ? employeeName(preview.employeeId)
                    : 'Selecciona una persona'}{' '}
                  · {preview.workDate || 'Selecciona una fecha'}
                </p>
                {previewTemplate ? (
                  <>
                    <p className="font-medium">
                      {previewTemplate.name} · v{previewTemplate.version}
                    </p>
                    <p>
                      {previewTemplate.startTime}–{previewTemplate.endTime}
                      {previewTemplate.endTime <= previewTemplate.startTime
                        ? ' (+1 día)'
                        : ''}{' '}
                      · {previewTemplate.timeZone}
                    </p>
                    <p>
                      {previewTemplate.category === 'ADMINISTRATIVE'
                        ? 'Administrativo'
                        : 'Operativo'}{' '}
                      ·{' '}
                      {previewTemplate.modality === 'ONSITE'
                        ? 'Presencial'
                        : 'Home office'}
                    </p>
                    <p className="text-muted-foreground">
                      {previewTemplate.modality === 'ONSITE'
                        ? 'Elige un centro de trabajo. La comprobación de ubicación corresponde al trabajo presencial.'
                        : 'Home office no requiere centro ni comprobación GPS.'}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Selecciona una plantilla para revisar su horario, categoría
                    y modalidad.
                  </p>
                )}
              </section>
              <p className="text-sm text-muted-foreground">
                Al guardar se comprueban la categoría del empleado, las
                autorizaciones, los festivos y los horarios superpuestos,
                también en turnos nocturnos. Un turno publicado conserva su
                versión; para sustituirlo, cancélalo y crea otro.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    write.isPending ||
                    (isOnsite &&
                      (!authorizations.isSuccess ||
                        !locations.isSuccess ||
                        availableLocations.length === 0))
                  }
                >
                  {write.isPending ? 'Guardando…' : 'Guardar borrador'}
                </Button>
                <PlanningCancel>Volver</PlanningCancel>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('¿Descartar la edición del borrador?'))
                        setEditorOpen(false);
                    }}
                  >
                    Descartar edición
                  </Button>
                )}
              </div>
            </form>
          </PlanningEditor>
        )}
      </div>
    </Page>
  );
}
