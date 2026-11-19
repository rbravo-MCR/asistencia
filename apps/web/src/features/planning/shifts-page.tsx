import { Link, useBlocker } from '@tanstack/react-router';
import { PlanningCancel, PlanningEditor } from './planning-editor';
import { submit, useWrite } from './use-write';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShiftTemplateListSchema,
  HolidayListSchema,
  type ShiftTemplateView,
  type HolidayView,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass, FormError } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField, SelectField, Save, WriteFeedback } from './controls';
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export function ShiftsPage() {
  return (
    <ProtectedPage permission="manageOrganization">
      {(session) => <ShiftsContent session={session} />}
    </ProtectedPage>
  );
}
function ShiftsContent({ session }: { session: SessionView }) {
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
  const [editor, setEditor] = useState<'template' | 'holiday' | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShiftTemplateView | null>(null);
  const [holiday, setHoliday] = useState<HolidayView | null>(null);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const write = useWrite(
    session.csrfToken,
    ['shift-templates', 'holidays'],
    () => {
      setEditor(null);
      setEditing(null);
      setHoliday(null);
      setDeletePath(null);
    },
  );
  useBlocker({
    shouldBlockFn: () => write.isPending,
    enableBeforeUnload: write.isPending,
    disabled: !write.isPending,
  });
  return (
    <Page
      eyebrow="Planificación"
      actions={
        <Button
          type="button"
          id="planning-new-template"
          onClick={() => {
            setEditing(null);
            setTemplateError(null);
            write.reset();
            setEditor('template');
          }}
        >
          Nueva plantilla
        </Button>
      }
      title="Plantillas de turno"
      description="Define horarios reutilizables y días festivos. Para aplicarlos a una persona y fecha, ve a Asignar turnos."
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm">
        <p className="min-w-0 flex-1 text-muted-foreground">
          Crear una plantilla no asigna turnos. Las asignaciones publicadas
          conservan su versión aunque edites la plantilla.
        </p>
        <Button asChild variant="outline">
          <Link to="/calendario">Asignar turnos</Link>
        </Button>
      </div>
      <WriteFeedback mutation={write} />
      {deletePath && (
        <section className={panelClass}>
          <p>
            ¿Eliminar este registro? Las referencias e historial se validan en
            el servidor.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={write.isPending}
              onClick={() =>
                write.mutate({ path: deletePath, method: 'DELETE' })
              }
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={write.isPending}
              onClick={() => setDeletePath(null)}
            >
              Volver
            </Button>
          </div>
        </section>
      )}
      <div className="space-y-8">
        <section className={panelClass}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Directorio de jornadas
            </p>
            <h2 className="text-xl font-semibold">Plantillas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Horarios, modalidad y versión vigente. Las asignaciones publicadas
              conservan su configuración original.
            </p>
          </div>
          <QueryFeedback query={templates} />
          {templates.isSuccess && templates.data.items.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Aún no hay plantillas. Usa Nueva plantilla para definir el
              horario, la categoría y la modalidad; después podrás asignarla a
              una persona.
            </p>
          )}
          <ul className="grid gap-4 xl:grid-cols-2">
            {templates.data?.items.map((t) => (
              <li
                key={t.id}
                className="min-w-0 space-y-3 rounded-xl border bg-background p-4 break-words"
              >
                <h3 className="font-semibold">
                  {t.name} · v{t.version}
                </h3>
                <p>
                  {t.startTime}–{t.endTime}
                  {t.endTime <= t.startTime ? ' (+1 día)' : ''} · {t.timeZone}
                </p>
                <p className="text-sm">
                  {t.category === 'ADMINISTRATIVE'
                    ? 'Administrativo'
                    : 'Operativo'}{' '}
                  · {t.weekdays.map((d) => days[d - 1]).join(', ')} ·{' '}
                  {t.modality === 'ONSITE' ? 'Presencial' : 'Home office'} ·{' '}
                  {t.active ? 'Activa' : 'Inactiva'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Editar plantilla ${t.name}`}
                    onClick={() => {
                      setEditing(t);
                      setTemplateError(null);
                      setEditor('template');
                      write.reset();
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Eliminar plantilla ${t.name}`}
                    onClick={() => setDeletePath(`/shift-templates/${t.id}`)}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        {editor === 'template' && (
          <PlanningEditor
            initialFocusId="name"
            returnFocusId="planning-new-template"
            title={editing ? 'Editar plantilla' : 'Nueva plantilla'}
            pending={write.isPending}
            onClose={() => setEditor(null)}
          >
            <WriteFeedback mutation={write} />
            <form
              key={editing?.id ?? 'new'}
              className="space-y-5 [&>div:last-child]:sticky [&>div:last-child]:bottom-0 [&>div:last-child]:border-t [&>div:last-child]:bg-card [&>div:last-child]:py-4"
              onSubmit={(e) => {
                const d = submit(e);
                const weekdays = d.getAll('weekdays').map(Number);
                setTemplateError(null);
                if (!weekdays.length) {
                  setTemplateError('Selecciona al menos un día de trabajo.');
                  return;
                }
                write.mutate({
                  path: `/shift-templates${editing ? `/${editing.id}` : ''}`,
                  method: editing ? 'PUT' : 'POST',
                  body: {
                    name: String(d.get('name')).trim(),
                    startTime: d.get('startTime'),
                    endTime: d.get('endTime'),
                    timeZone: String(d.get('timeZone')).trim(),
                    category: d.get('category'),
                    modality: d.get('modality'),
                    weekdays,
                    active: d.get('active') === 'on',
                  },
                });
              }}
            >
              <FormError message={templateError ?? undefined} />
              <TextField
                name="name"
                label="Nombre de plantilla"
                value={editing?.name}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="startTime"
                  label="Inicio"
                  type="time"
                  value={editing?.startTime ?? '08:00'}
                />
                <TextField
                  name="endTime"
                  label="Fin"
                  type="time"
                  value={editing?.endTime ?? '17:00'}
                />
              </div>
              <TextField
                name="timeZone"
                label="Zona horaria IANA"
                value={editing?.timeZone ?? 'America/Merida'}
              />
              <SelectField
                name="category"
                label="Categoría"
                value={editing?.category}
              >
                <option value="ADMINISTRATIVE">Administrativo</option>
                <option value="OPERATIONAL">Operativo</option>
              </SelectField>
              <SelectField
                name="modality"
                label="Modalidad"
                value={editing?.modality}
              >
                <option value="ONSITE">Presencial</option>
                <option value="HOME_OFFICE">Home office</option>
              </SelectField>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">
                  Días de trabajo (al menos uno)
                </legend>
                <div className="flex flex-wrap gap-3">
                  {days.map((label, index) => (
                    <label key={label} className="flex gap-1">
                      <input
                        type="checkbox"
                        name="weekdays"
                        value={index + 1}
                        defaultChecked={(
                          editing?.weekdays ?? [1, 2, 3, 4, 5]
                        ).includes(index + 1)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-wrap gap-2">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing?.active ?? true}
                />
                Activa
              </label>
              <div className="flex flex-wrap gap-2">
                <Save pending={write.isPending} label="Guardar plantilla" />
                {editing && <PlanningCancel>Cancelar</PlanningCancel>}
              </div>
            </form>
          </PlanningEditor>
        )}
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Días festivos</h2>
            <Button
              type="button"
              variant="outline"
              id="planning-new-holiday"
              onClick={() => {
                setHoliday(null);
                write.reset();
                setEditor('holiday');
              }}
            >
              Nuevo festivo
            </Button>
          </div>
          <p className="text-sm">
            Calendario oficial entregado: México 2026–2027, descansos
            obligatorios de la LFT y jornada electoral federal ordinaria
            confirmada por el INE. Revisar las fuentes oficiales antes de
            ampliar a otros años.
          </p>
          <QueryFeedback
            query={holidays}
            empty={holidays.data?.items.length === 0}
          />
          <ul className="space-y-4">
            {holidays.data?.items.map((h) => (
              <li
                key={h.id}
                className="min-w-0 space-y-2 border-b pb-3 break-words"
              >
                <p>
                  {h.date} · {h.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Editar festivo ${h.name}`}
                    onClick={() => {
                      setHoliday(h);
                      write.reset();
                      setEditor('holiday');
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Eliminar festivo ${h.name}`}
                    onClick={() => setDeletePath(`/holidays/${h.id}`)}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        {editor === 'holiday' && (
          <PlanningEditor
            initialFocusId="holidayName"
            returnFocusId="planning-new-holiday"
            title={holiday ? 'Editar festivo' : 'Nuevo festivo'}
            pending={write.isPending}
            onClose={() => setEditor(null)}
          >
            <WriteFeedback mutation={write} />
            <form
              key={holiday?.id ?? 'holiday-new'}
              className="space-y-5 [&>div:last-child]:sticky [&>div:last-child]:bottom-0 [&>div:last-child]:border-t [&>div:last-child]:bg-card [&>div:last-child]:py-4"
              onSubmit={(e) => {
                const d = submit(e);
                write.mutate({
                  path: `/holidays${holiday ? `/${holiday.id}` : ''}`,
                  method: holiday ? 'PUT' : 'POST',
                  body: {
                    name: String(d.get('holidayName')).trim(),
                    date: d.get('holidayDate'),
                  },
                });
              }}
            >
              <TextField
                name="holidayName"
                label="Nombre del festivo"
                value={holiday?.name}
              />
              <TextField
                name="holidayDate"
                label="Fecha del festivo"
                type="date"
                value={holiday?.date}
              />
              <div className="flex flex-wrap gap-2">
                <Save pending={write.isPending} label="Guardar festivo" />
                {holiday && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('¿Descartar los cambios del festivo?'))
                        setEditor(null);
                    }}
                  >
                    Cancelar
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
