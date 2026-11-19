import { useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { Plus, Network, Search } from 'lucide-react';
import { SidePanel } from '@/components/ui/side-panel';
import { ConfirmAction } from '@/components/patterns/confirm-action';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { InlineNotice } from '@/components/patterns/inline-notice';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AssignmentListSchema,
  AssignmentSchema,
  EmployeeListSchema,
  DepartmentListSchema,
  type SessionView,
  type EmployeeView,
  type DepartmentResponse,
} from '@asistencia/contracts';
import { request, requestVoid } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import {
  Field,
  Page,
  FormError,
  panelClass,
  selectClass,
} from '../identity/form-fields';
import { assignmentSchema, assignmentLabels } from './form-schema';
import { QueryFeedback } from './query-feedback';

export function AssignmentsPage() {
  return (
    <ProtectedPage>
      {(session) => <AssignmentsContent session={session} />}
    </ProtectedPage>
  );
}
function AssignmentsContent({ session }: { session: SessionView }) {
  const client = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ['assignments'],
    queryFn: ({ signal }) =>
      request('/assignments', AssignmentListSchema, { signal }),
    retry: false,
  });
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: ({ signal }) =>
      request('/employees', EmployeeListSchema, { signal }),
    retry: false,
  });
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: ({ signal }) =>
      request('/departments', DepartmentListSchema, { signal }),
    retry: false,
  });
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [search, setSearch] = useState('');
  const revoke = useMutation({
    retry: false,
    mutationFn: (id: string) =>
      requestVoid(`/assignments/${id}`, {
        method: 'DELETE',
        csrfToken: session.csrfToken,
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['assignments'] }),
        client.invalidateQueries({ queryKey: ['session'] }),
      ]);
      setConfirming(null);
    },
  });
  const canManage = session.permissions.manageOrganization;
  const date = (instant: string) =>
    new Date(instant).toLocaleString('es-MX', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const visible =
    query.data?.items.filter((item) =>
      `${assignmentLabels[item.kind]} ${employees.data?.items.find((e) => e.id === item.employeeId)?.fullName ?? ''} ${departments.data?.items.find((d) => d.id === item.departmentId)?.name ?? 'Toda la organización'}`
        .toLocaleLowerCase('es-MX')
        .includes(search.trim().normalize('NFC').toLocaleLowerCase('es-MX')),
    ) ?? [];
  return (
    <Page
      title="Responsables"
      eyebrow="Organización · Responsabilidades"
      actions={
        canManage && (
          <Button
            className="min-h-11"
            disabled={!employees.isSuccess || !departments.isSuccess}
            onClick={() => {
              setNotice(false);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Nueva responsabilidad
          </Button>
        )
      }
      description="Consulta el historial de jefaturas, dirección y suplencias. El alcance autorizado depende de las asignaciones vigentes."
    >
      {notice && (
        <InlineNotice tone="success">Responsable asignado.</InlineNotice>
      )}
      <div className="space-y-5">
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">Historial de asignaciones</h2>
          <QueryFeedback query={query} empty={query.data?.items.length === 0} />
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="assignments-search"
              type="search"
              aria-label="Buscar responsabilidades"
              placeholder="Buscar por persona o departamento…"
              className="h-11 pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {query.data &&
            query.data.items.length > 0 &&
            visible.length === 0 && (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No encontramos responsabilidades.
                </p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => setSearch('')}
                >
                  Limpiar búsqueda
                </Button>
              </div>
            )}
          <ul className="grid gap-4 lg:grid-cols-2">
            {visible.map((item) => (
              <li
                key={item.id}
                className="min-w-0 space-y-3 break-words rounded-2xl border bg-card p-5"
              >
                <h3 className="flex items-start gap-2 font-semibold">
                  <Network
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  {assignmentLabels[item.kind]} ·{' '}
                  {employees.data?.items.find(
                    (employee) => employee.id === item.employeeId,
                  )?.fullName ?? 'Empleado no disponible'}
                </h3>
                <p className="text-sm">
                  {item.departmentId
                    ? (departments.data?.items.find(
                        (department) => department.id === item.departmentId,
                      )?.name ?? 'Departamento no disponible')
                    : 'Toda la organización'}
                </p>
                <p className="text-sm">
                  Inicio: {date(item.startsAt)} UTC
                  <br />
                  Fin:{' '}
                  {item.endsAt
                    ? `${date(item.endsAt)} UTC`
                    : 'Sin fecha de fin'}
                </p>
                <p className="text-sm">
                  {item.revokedAt
                    ? `Revocada el ${date(item.revokedAt)} UTC`
                    : item.endsAt && Date.parse(item.endsAt) <= now
                      ? 'Finalizada'
                      : Date.parse(item.startsAt) > now
                        ? 'Programada'
                        : 'Vigente'}
                </p>
                <p className="break-words text-sm">Motivo: {item.reason}</p>
                {item.sourceAssignmentId && (
                  <p className="text-xs text-muted-foreground">
                    Suplencia vinculada a la jefatura original.
                  </p>
                )}
                {canManage &&
                  !item.revokedAt &&
                  (!item.endsAt || Date.parse(item.endsAt) > now) && (
                    <Button
                      variant="outline"
                      disabled={revoke.isPending}
                      onClick={() => {
                        revoke.reset();
                        setConfirming(item.id);
                      }}
                    >
                      Revocar asignación
                    </Button>
                  )}
              </li>
            ))}
          </ul>
          {!confirming && revoke.isError && (
            <FormError message={revoke.error.message} />
          )}
        </section>
        {canManage && (
          <div className="space-y-4">
            {(employees.isError || departments.isError) && (
              <div className={panelClass}>
                <p role="alert">No se pudieron cargar las opciones.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void employees.refetch();
                    void departments.refetch();
                  }}
                >
                  Reintentar opciones
                </Button>
              </div>
            )}
            {editorOpen && (
              <AssignmentForm
                csrfToken={session.csrfToken}
                employees={employees.data?.items ?? []}
                departments={departments.data?.items ?? []}
                ready={employees.isSuccess && departments.isSuccess}
                onDone={(saved) => {
                  setEditorOpen(false);
                  if (saved) setNotice(true);
                }}
              />
            )}
          </div>
        )}
      </div>
      {confirming && (
        <ConfirmAction
          title="¿Revocar esta asignación?"
          description="Se conservará el historial. Esta responsabilidad dejará de conceder su alcance autorizado."
          pending={revoke.isPending}
          error={revoke.isError ? revoke.error.message : undefined}
          confirmLabel="Confirmar revocación"
          returnFocusId="assignments-search"
          onConfirm={() => revoke.mutate(confirming)}
          onCancel={() => {
            setConfirming(null);
            revoke.reset();
          }}
        />
      )}
    </Page>
  );
}
function AssignmentForm({
  csrfToken,
  employees,
  departments,
  ready,
  onDone,
}: {
  csrfToken: string;
  employees: EmployeeView[];
  departments: DepartmentResponse[];
  ready: boolean;
  onDone: (saved?: boolean) => void;
}) {
  const client = useQueryClient();
  const form = useForm<
    z.input<typeof assignmentSchema>,
    unknown,
    z.output<typeof assignmentSchema>
  >({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      kind: 'HEAD',
      employeeId: '',
      departmentId: '',
      startsAt: '',
      endsAt: '',
      reason: '',
    },
  });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const errors = form.formState.errors;
  const { isDirty, isSubmitting } = form.formState;
  const saving = useRef(false);
  const discard = useDiscardConfirm();
  const close = async () => {
    if (saving.current || isSubmitting) return;
    if (!isDirty || (await discard.confirm())) onDone();
  };
  useBlocker({
    shouldBlockFn: async () =>
      saving.current ||
      isSubmitting ||
      (isDirty && !(await discard.confirm())),
    enableBeforeUnload: isDirty || isSubmitting,
    disabled: !isDirty && !isSubmitting,
  });
  const submit = async (input: z.output<typeof assignmentSchema>) => {
    if (saving.current) return;
    saving.current = true;
    form.clearErrors('root');
    try {
      await request('/assignments', AssignmentSchema, {
        method: 'POST',
        csrfToken,
        body: input,
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['assignments'] }),
        client.invalidateQueries({ queryKey: ['session'] }),
      ]);
      form.reset();
      onDone(true);
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la asignación.',
      });
    } finally {
      saving.current = false;
    }
  };
  return (
    <SidePanel
      open
      title="Asignar responsable"
      description="Define el alcance y la vigencia de la responsabilidad."
      initialFocusId="assignment-kind"
      returnFocusId="assignments-search"
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      {discard.dialog}
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => void form.handleSubmit(submit)(e)}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
            <Field
              id="assignment-kind"
              label="Tipo de responsabilidad"
              error={errors.kind?.message}
            >
              <select
                id="assignment-kind"
                className={selectClass}
                {...form.register('kind')}
              >
                {Object.entries(assignmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="assignment-employee"
              label="Empleado"
              error={errors.employeeId?.message}
            >
              <select
                id="assignment-employee"
                className={selectClass}
                {...form.register('employeeId')}
              >
                <option value="">Selecciona empleado activo</option>
                {employees
                  .filter((employee) => employee.status === 'ACTIVE')
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
              </select>
            </Field>
            {kind !== 'DIRECTOR' && (
              <Field
                id="assignment-department"
                label="Departamento"
                error={errors.departmentId?.message}
              >
                <select
                  id="assignment-department"
                  className={selectClass}
                  {...form.register('departmentId')}
                >
                  <option value="">Selecciona departamento</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {kind === 'SUBSTITUTE' ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Se vincula con la jefatura vigente del departamento. Introduce
                  inicio y fin en UTC; el intervalo excluye la hora final.
                </p>
                <Field
                  id="assignment-start"
                  label="Inicio (UTC)"
                  error={errors.startsAt?.message}
                >
                  <Input
                    id="assignment-start"
                    type="datetime-local"
                    {...form.register('startsAt')}
                  />
                </Field>
                <Field
                  id="assignment-end"
                  label="Fin (UTC)"
                  error={errors.endsAt?.message}
                >
                  <Input
                    id="assignment-end"
                    type="datetime-local"
                    {...form.register('endsAt')}
                  />
                </Field>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                La asignación inicia al guardarse y cierra al titular anterior
                conservando su historial.
              </p>
            )}
            <Field
              id="assignment-reason"
              label="Motivo"
              error={errors.reason?.message}
            >
              <Input id="assignment-reason" {...form.register('reason')} />
            </Field>
            <FormError message={errors.root?.message} />
          </fieldset>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-card px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isSubmitting}
            onClick={() => void close()}
          >
            Cancelar
          </Button>
          <Button className="min-h-11" disabled={isSubmitting || !ready}>
            {isSubmitting ? 'Asignando…' : 'Asignar responsable'}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
