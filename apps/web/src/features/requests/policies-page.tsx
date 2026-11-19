import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LeaveConfigurationSchema,
  type PermissionTypeView,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass, FormError } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField } from '../planning/controls';
import { useRequestWrite } from './common';
import { WriteStatus, RequestPanel, PanelActions } from './controls';
const weekdays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
export function LeavePoliciesPage() {
  return (
    <ProtectedPage permission="manageOrganization">
      {(session) => <PoliciesContent session={session} />}
    </ProtectedPage>
  );
}
function PoliciesContent({ session }: { session: SessionView }) {
  const config = useQuery({
    queryKey: ['leave-config'],
    queryFn: ({ signal }) =>
      request('/leave/configuration', LeaveConfigurationSchema, { signal }),
    retry: false,
  });
  const write = useRequestWrite(session.csrfToken);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PermissionTypeView | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const policy = config.data?.policy;
  return (
    <Page
      eyebrow="Configuración de ausencias"
      title="Políticas de ausencias"
      actions={
        <Button
          id="permission-create"
          disabled={!config.data || write.blocked}
          onClick={() => {
            setEditing(null);
            setTypeOpen(true);
          }}
        >
          Nuevo tipo de permiso
        </Button>
      }
      description="Configura los días de vacaciones y los tipos de permiso. Cada solicitud conserva la política con la que se envió."
    >
      {!policyOpen && !typeOpen && <WriteStatus write={write} />}
      <QueryFeedback query={config} />
      {config.data && (
        <>
          <section className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Política vigente{policy ? ` · v${policy.version}` : ''}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {policy?.name ?? 'Sin política configurada'}
                </h2>
              </div>
              <Button
                variant="outline"
                disabled={write.blocked}
                onClick={() => setPolicyOpen(true)}
              >
                {policy ? 'Editar política' : 'Configurar política'}
              </Button>
            </div>
            {policy ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {policy.entitlements.map((rule) => (
                    <div
                      key={rule.fromYear}
                      className="rounded-xl bg-secondary/60 p-4"
                    >
                      <dt className="text-sm text-muted-foreground">
                        Desde el año de servicio {rule.fromYear}
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {rule.days} días
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <p>
                    <span className="font-medium">Administrativos:</span>{' '}
                    {policy.administrativeWeekdays
                      .map((d) => weekdays[d - 1])
                      .join(', ')}
                  </p>
                  <p>
                    <span className="font-medium">Operativos:</span>{' '}
                    {policy.operationalWeekdays
                      .map((d) => weekdays[d - 1])
                      .join(', ')}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {policy.excludeHolidays
                    ? 'Excluye los festivos configurados.'
                    : 'Incluye festivos en el conteo.'}{' '}
                  Cada solicitud conserva su versión; los períodos existentes no
                  se recalculan.
                </p>
              </>
            ) : (
              <p>
                RR. HH. debe definir la primera política antes de conceder
                períodos o recibir solicitudes de vacaciones.
              </p>
            )}
          </section>
          {policyOpen && (
            <RequestPanel
              title={policy ? 'Editar política' : 'Configurar política'}
              description="Guardar publica una nueva versión para solicitudes futuras."
              write={write}
              initialFocusId="policyName"
              returnFocusId="permission-create"
              onClose={() => setPolicyOpen(false)}
            >
              <form
                id="leave-policy"
                key={policy?.id ?? 'initial'}
                className="mt-4 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  setError(null);
                  const entitlements = String(data.get('entitlements') ?? '')
                    .trim()
                    .split(/\n+/)
                    .map((row) => {
                      const match = /^(\d+)\s*:\s*(\d+)$/.exec(row.trim());
                      return {
                        fromYear: Number(match?.[1] ?? NaN),
                        days: Number(match?.[2] ?? NaN),
                      };
                    });
                  const administrativeWeekdays = data
                      .getAll('administrativeWeekdays')
                      .map(Number),
                    operationalWeekdays = data
                      .getAll('operationalWeekdays')
                      .map(Number);
                  if (
                    !entitlements.length ||
                    entitlements.some(
                      (v) =>
                        !Number.isInteger(v.fromYear) ||
                        v.fromYear < 1 ||
                        v.fromYear > 100 ||
                        !Number.isInteger(v.days) ||
                        v.days < 1 ||
                        v.days > 365,
                    ) ||
                    !administrativeWeekdays.length ||
                    !operationalWeekdays.length
                  ) {
                    setError(
                      'Indica una tabla válida y al menos un día laborable para cada categoría.',
                    );
                    return;
                  }
                  void write.run(
                    '/leave/policy',
                    {
                      name: String(data.get('policyName')).trim(),
                      entitlements,
                      administrativeWeekdays,
                      operationalWeekdays,
                      excludeHolidays: data.get('excludeHolidays') === 'on',
                    },
                    {
                      method: 'PUT',
                      message: 'Nueva versión de la política guardada.',
                      onSuccess: () => setPolicyOpen(false),
                    },
                  );
                }}
              >
                <h2 className="text-xl font-semibold">
                  {policy
                    ? `Política vigente · v${policy.version}`
                    : 'Configurar primera política'}
                </h2>
                {!policy && (
                  <p>
                    No hay política inicial. RR. HH. debe definirla antes de
                    conceder períodos o recibir solicitudes de vacaciones.
                  </p>
                )}
                <FormError message={error ?? undefined} />
                <fieldset
                  disabled={write.blocked}
                  className="min-w-0 space-y-4"
                >
                  <TextField
                    name="policyName"
                    label="Nombre de la política"
                    value={policy?.name}
                  />
                  <div className="space-y-2">
                    <label
                      htmlFor="entitlements"
                      className="block text-sm font-medium"
                    >
                      Días por antigüedad
                    </label>
                    <p className="text-sm">
                      Una regla por línea: año de servicio: días. Cada regla se
                      aplica desde ese año hasta la siguiente regla. La primera
                      debe comenzar en 1.
                    </p>
                    <textarea
                      id="entitlements"
                      name="entitlements"
                      required
                      className="block min-h-40 w-full rounded-md border p-2"
                      defaultValue={
                        policy?.entitlements
                          .map((e) => `${e.fromYear}: ${e.days}`)
                          .join('\n') ?? ''
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      ['administrativeWeekdays', 'operationalWeekdays'] as const
                    ).map((name) => (
                      <fieldset
                        key={name}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5"
                      >
                        <legend className="px-1 font-medium">
                          {name === 'administrativeWeekdays'
                            ? 'Días administrativos'
                            : 'Días operativos'}
                        </legend>
                        {weekdays.map((day, index) => (
                          <label key={day} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name={name}
                              value={index + 1}
                              defaultChecked={
                                policy?.[name].includes(index + 1) ?? false
                              }
                            />
                            {day}
                          </label>
                        ))}
                      </fieldset>
                    ))}
                  </div>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      name="excludeHolidays"
                      defaultChecked={policy?.excludeHolidays ?? false}
                    />
                    Excluir los festivos configurados del conteo de vacaciones
                  </label>
                  <p className="text-sm">
                    Los períodos existentes no se recalculan y no caducan
                    automáticamente al cambiar la política.
                  </p>
                  <PanelActions>
                    <Button
                      form="leave-policy"
                      type="submit"
                      disabled={write.blocked}
                    >
                      Guardar nueva versión
                    </Button>
                  </PanelActions>
                </fieldset>
              </form>
            </RequestPanel>
          )}
          <div className="space-y-6">
            <section className={panelClass}>
              <h2 className="text-xl font-semibold">Tipos de permiso</h2>
              {!config.data.permissionTypes.length && (
                <p>No hay tipos de permiso configurados.</p>
              )}
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {config.data.permissionTypes.map((p) => (
                  <li
                    key={p.id}
                    className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5"
                  >
                    <h3 className="font-semibold">
                      {p.name} · v{p.version}
                    </h3>
                    <p>
                      {p.paid ? 'Con goce de sueldo' : 'Sin goce de sueldo'} ·{' '}
                      {p.active ? 'Activo' : 'Inactivo'}
                    </p>
                    <p>
                      {p.evidenceRequired
                        ? 'Requiere evidencia'
                        : 'Evidencia opcional'}{' '}
                      ·{' '}
                      {p.allowPartial
                        ? 'Permite jornada parcial'
                        : 'Jornadas completas'}
                    </p>
                    <p>
                      Anticipación mínima: {p.minimumNoticeHours} horas ·{' '}
                      {!p.allowPartial
                        ? 'Sin intervalos por horas'
                        : p.partialOnly
                          ? 'Intervalo por horas obligatorio'
                          : 'Intervalo por horas opcional'}
                    </p>
                    <Button
                      variant="outline"
                      disabled={write.blocked}
                      onClick={() => {
                        setEditing(p);
                        setTypeOpen(true);
                      }}
                    >
                      Editar {p.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
            {typeOpen && (
              <RequestPanel
                title={
                  editing ? 'Editar tipo de permiso' : 'Nuevo tipo de permiso'
                }
                description="Estas condiciones se conservan en cada solicitud enviada."
                write={write}
                initialFocusId="permissionName"
                returnFocusId="permission-create"
                onClose={() => {
                  setTypeOpen(false);
                  setEditing(null);
                }}
              >
                <form
                  id="permission-type"
                  key={editing?.id ?? 'new-type'}
                  className="mt-4 space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    void write.run(
                      `/leave/permission-types${editing ? `/${editing.id}` : ''}`,
                      {
                        name: String(data.get('permissionName')).trim(),
                        paid: data.get('paid') === 'on',
                        evidenceRequired: data.get('evidenceRequired') === 'on',
                        allowPartial: data.get('allowPartial') === 'on',
                        minimumNoticeHours: Number(
                          data.get('minimumNoticeHours'),
                        ),
                        partialOnly: data.get('partialOnly') === 'on',
                        active: data.get('active') === 'on',
                      },
                      {
                        method: editing ? 'PUT' : 'POST',
                        message: 'Tipo de permiso guardado.',
                        onSuccess: () => {
                          setEditing(null);
                          setTypeOpen(false);
                        },
                      },
                    );
                  }}
                >
                  <h2 className="text-xl font-semibold">
                    {editing
                      ? 'Editar tipo de permiso'
                      : 'Nuevo tipo de permiso'}
                  </h2>
                  <fieldset
                    disabled={write.blocked}
                    className="min-w-0 space-y-4"
                  >
                    <TextField
                      name="permissionName"
                      label="Nombre del tipo de permiso"
                      value={editing?.name}
                    />
                    <TextField
                      name="minimumNoticeHours"
                      label="Anticipación mínima (horas)"
                      type="number"
                      min={0}
                      max={8760}
                      step="1"
                      value={editing?.minimumNoticeHours ?? 0}
                    />
                    <p className="text-sm">
                      Cambiar el goce de sueldo afecta únicamente a las
                      solicitudes nuevas. Las anteriores conservan sus
                      condiciones.
                    </p>
                    {[
                      {
                        name: 'paid',
                        title: 'Con goce de sueldo',
                        checked: editing?.paid ?? false,
                      },
                      {
                        name: 'evidenceRequired',
                        title: 'Evidencia obligatoria',
                        checked: editing?.evidenceRequired ?? false,
                      },
                      {
                        name: 'allowPartial',
                        title: 'Permitir jornada parcial',
                        checked: editing?.allowPartial ?? false,
                      },
                      {
                        name: 'partialOnly',
                        title: 'Exigir intervalo por horas',
                        checked: editing?.partialOnly ?? false,
                      },
                      {
                        name: 'active',
                        title: 'Tipo activo',
                        checked: editing?.active ?? true,
                      },
                    ].map((field) => (
                      <label key={field.name} className="flex gap-2">
                        <input
                          type="checkbox"
                          name={field.name}
                          defaultChecked={field.checked}
                        />
                        {field.title}
                      </label>
                    ))}
                    <div className="flex flex-wrap gap-3">
                      <PanelActions>
                        <Button
                          form="permission-type"
                          type="submit"
                          disabled={write.blocked}
                        >
                          Guardar tipo de permiso
                        </Button>
                      </PanelActions>
                    </div>
                  </fieldset>
                </form>
              </RequestPanel>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
