import { useRef } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  EmployeeSchema,
  type EmployeeView,
  type DepartmentResponse,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { SidePanel } from '@/components/ui/side-panel';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormError, selectClass } from '../identity/form-fields';
import {
  employeeSchema,
  employeeCreateSchema,
  categoryLabels,
  statusLabels,
} from './form-schema';

export function EmployeeForm({
  employee,
  employees,
  departments,
  users,
  csrfToken,
  optionsReady,
  optionsError,
  onRetryOptions,
  departmentsError,
  onRetryDepartments,
  onDone,
}: {
  employee: EmployeeView | null;
  employees: EmployeeView[];
  departments: DepartmentResponse[];
  users: { id: string; name: string; email: string; active: boolean }[];
  csrfToken: string;
  optionsReady: boolean;
  optionsError: boolean;
  onRetryOptions: () => void;
  departmentsError: boolean;
  onRetryDepartments: () => void;
  onDone: (saved?: boolean) => void;
}) {
  const client = useQueryClient();
  const schema = employee ? employeeSchema : employeeCreateSchema;
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: employee
      ? {
          ...employee,
          phoneNumber: employee.phoneNumber ?? '',
          address: employee.address ?? '',
          supervisorId: employee.supervisorId ?? '',
          userId: employee.userId ?? '',
        }
      : {
          fullName: '',
          phoneNumber: '',
          address: '',
          departmentId: '',
          position: '',
          joinedOn: '',
          category: 'ADMINISTRATIVE',
          status: 'ACTIVE',
          supervisorId: '',
          userId: '',
        },
  });
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
  const submit = async (input: z.output<typeof schema>) => {
    if (saving.current) return;
    form.clearErrors('root');
    if (employee && input.supervisorId === employee.id) {
      form.setError('supervisorId', {
        message: 'El empleado no puede ser su propio superior.',
      });
      return;
    }
    saving.current = true;
    try {
      await request(
        employee ? `/employees/${employee.id}` : '/employees',
        EmployeeSchema,
        { method: employee ? 'PUT' : 'POST', csrfToken, body: input },
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ['employees'] }),
        client.invalidateQueries({ queryKey: ['assignments'] }),
        client.invalidateQueries({ queryKey: ['users'] }),
        client.invalidateQueries({ queryKey: ['user-directory'] }),
        client.invalidateQueries({ queryKey: ['session'] }),
      ]);
      form.reset(form.getValues());
      onDone(true);
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el expediente.',
      });
    } finally {
      saving.current = false;
    }
  };
  const errors = form.formState.errors;
  return (
    <SidePanel
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title={employee ? 'Editar empleado' : 'Nuevo empleado'}
      description="Datos personales, organización y acceso del empleado."
      initialFocusId="employee-name"
      returnFocusId="employees-search"
    >
      {discard.dialog}
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => void form.handleSubmit(submit)(e)}
      >
        <div className="mcr-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
            {!optionsReady && !optionsError && !departmentsError && (
              <p role="status" className="text-sm text-muted-foreground">
                Cargando las opciones del expediente…
              </p>
            )}
            {departmentsError && (
              <div role="alert" className="rounded-lg border p-3 text-sm">
                No se pudieron cargar los departamentos.{' '}
                <Button
                  type="button"
                  variant="link"
                  onClick={onRetryDepartments}
                >
                  Reintentar departamentos
                </Button>
              </div>
            )}
            {optionsError && (
              <div role="alert" className="rounded-lg border p-3 text-sm">
                No se pudieron cargar los usuarios vinculables.{' '}
                <Button type="button" variant="link" onClick={onRetryOptions}>
                  Reintentar usuarios
                </Button>
              </div>
            )}
            {employee ? (
              <Field
                id="employee-number"
                label="Número interno"
                error={errors.employeeNumber?.message}
              >
                <Input
                  id="employee-number"
                  autoComplete="off"
                  {...form.register('employeeNumber')}
                />
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">
                El número interno se generará automáticamente al guardar.
              </p>
            )}
            <Field
              id="employee-name"
              label="Nombre completo"
              error={errors.fullName?.message}
            >
              <Input
                id="employee-name"
                autoComplete="name"
                {...form.register('fullName')}
              />
            </Field>
            <Field
              id="employee-phone"
              label="Celular"
              error={errors.phoneNumber?.message}
            >
              <Input
                id="employee-phone"
                type="tel"
                autoComplete="tel"
                maxLength={64}
                {...form.register('phoneNumber')}
              />
            </Field>
            <Field
              id="employee-address"
              label="Dirección"
              error={errors.address?.message}
            >
              <textarea
                id="employee-address"
                autoComplete="street-address"
                rows={3}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring"
                {...form.register('address')}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              Celular y dirección son opcionales.
            </p>
            <Field
              id="employee-department"
              label="Departamento"
              error={errors.departmentId?.message}
            >
              <select
                id="employee-department"
                className={selectClass}
                {...form.register('departmentId')}
              >
                <option value="">Selecciona departamento</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="employee-position"
              label="Puesto"
              error={errors.position?.message}
            >
              <Input id="employee-position" {...form.register('position')} />
            </Field>
            <Field
              id="employee-joined"
              label="Fecha de ingreso"
              error={errors.joinedOn?.message}
            >
              <Input
                id="employee-joined"
                type="date"
                {...form.register('joinedOn')}
              />
            </Field>
            <Field
              id="employee-category"
              label="Categoría"
              error={errors.category?.message}
            >
              <select
                id="employee-category"
                className={selectClass}
                {...form.register('category')}
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="employee-status"
              label="Estado"
              error={errors.status?.message}
            >
              <select
                id="employee-status"
                className={selectClass}
                {...form.register('status')}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-muted-foreground">
              Inactivar el expediente desactiva también el acceso de su usuario
              vinculado. Reactivar el expediente no restablece ese acceso.
            </p>
            <Field
              id="employee-supervisor"
              label="Superior"
              error={errors.supervisorId?.message}
            >
              <select
                id="employee-supervisor"
                className={selectClass}
                {...form.register('supervisorId')}
              >
                <option value="">Sin superior</option>
                {employees
                  .filter((item) => item.id !== employee?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              id="employee-user"
              label="Usuario vinculado"
              error={errors.userId?.message}
            >
              <select
                id="employee-user"
                className={selectClass}
                {...form.register('userId')}
              >
                <option value="">Sin usuario</option>
                {users
                  .filter((item) => item.active || item.id === employee?.userId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.email})
                      {item.active ? '' : ' · Inactivo'}
                    </option>
                  ))}
              </select>
            </Field>
            <p className="text-sm text-muted-foreground">
              Inactivar el expediente desactiva su cuenta vinculada y cierra
              responsabilidades incompatibles. Reactivar el expediente no
              reactiva la cuenta.
            </p>
            <FormError message={errors.root?.message} />
          </fieldset>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-card px-6 py-4">
          <Button disabled={form.formState.isSubmitting || !optionsReady}>
            {isSubmitting
              ? 'Guardando…'
              : employee
                ? 'Guardar empleado'
                : 'Crear empleado'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void close()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
