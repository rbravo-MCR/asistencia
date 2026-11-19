import type { DepartmentResponse } from '@asistencia/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus, LoaderCircle, RefreshCw } from 'lucide-react';
import { DepartmentMark } from './department-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidePanel } from '@/components/ui/side-panel';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { DepartmentApiError, postDepartment, putDepartment } from './api';
import { departmentFormSchema, type DepartmentFormValues } from './form-schema';

export function DepartmentForm({
  csrfToken,
  department,
  onCancel,
  onSaved,
}: {
  csrfToken: string;
  department?: DepartmentResponse | undefined;
  onCancel: () => void;
  onSaved: (department: DepartmentResponse) => void;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: DepartmentFormValues) =>
      department
        ? putDepartment(department.id, input, csrfToken)
        : postDepartment(input, csrfToken),
    retry: false,
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: department?.name ?? '' },
  });
  const saving = isSubmitting || mutation.isPending;
  const discard = useDiscardConfirm();
  useBlocker({
    shouldBlockFn: async () =>
      saving || (isDirty && !(await discard.confirm())),
    enableBeforeUnload: isDirty || saving,
    disabled: !isDirty && !saving,
  });
  const submit = handleSubmit(async (input) => {
    clearErrors('root');
    try {
      const confirmed = await mutation.mutateAsync(input);
      reset({ name: confirmed.name });
      await client.invalidateQueries({ queryKey: ['departments'] });
      onSaved(confirmed);
    } catch (error) {
      if (
        error instanceof DepartmentApiError &&
        (error.status === 409 || error.status === 400)
      ) {
        setError(
          'name',
          {
            message:
              error.code === 'DEPARTMENT_NAME_EXISTS'
                ? 'Ya existe un departamento con ese nombre.'
                : 'Revisa el nombre del departamento.',
          },
          { shouldFocus: true },
        );
      } else {
        setError('root', {
          message: department
            ? 'No se pudo confirmar la actualización. Actualiza el listado antes de intentarlo otra vez.'
            : 'No se pudo confirmar la creación. Actualiza el listado antes de intentarlo otra vez.',
        });
      }
    }
  });
  const close = async () => {
    if (saving) return;
    if (!isDirty || (await discard.confirm())) onCancel();
  };
  return (
    <SidePanel
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title={department ? 'Editar departamento' : 'Crear departamento'}
      description="Define el nombre de esta área de la organización."
      initialFocusId="department-name"
      returnFocusId="departments-search"
      className="max-w-[480px] [&>div:first-child]:border-border/50 [&>div:first-child]:py-6"
    >
      {discard.dialog}
      <form
        onSubmit={(event) => void submit(event)}
        noValidate
        aria-busy={saving}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-7">
          <div className="flex items-center gap-3 text-sm">
            <DepartmentMark className="size-11" />
            <div>
              <p className="font-medium">Datos del departamento</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Organización / Directorio
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="department-name">Nombre del departamento</Label>
            <Input
              id="department-name"
              autoComplete="off"
              placeholder="Escribe el nombre del área"
              className="h-12 bg-background/50 focus-visible:ring-0"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={`department-name-hint${errors.name ? ' department-name-error' : ''}`}
              disabled={saving}
              {...register('name')}
            />
            <p
              id="department-name-hint"
              className="text-xs leading-5 text-muted-foreground"
            >
              Entre 1 y 100 caracteres. El nombre debe ser único dentro de la
              empresa.
            </p>
            {errors.name && (
              <p
                id="department-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.name.message}
              </p>
            )}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            Las responsabilidades de jefatura, dirección y suplencia se
            administran en Responsables.
          </p>
          {errors.root && (
            <div className="space-y-3 rounded-xl bg-destructive/5 p-4">
              <p role="alert" className="text-sm leading-6 text-destructive">
                {errors.root.message}
              </p>
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() =>
                  void client.invalidateQueries({ queryKey: ['departments'] })
                }
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Actualizar listado
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/50 bg-card px-6 py-5">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={saving}
            onClick={() => void close()}
          >
            {department ? 'Cancelar edición' : 'Cancelar'}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="min-h-11 min-w-40 rounded-lg"
          >
            {saving ? (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : department ? (
              <Check className="size-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            )}
            {saving
              ? 'Guardando…'
              : department
                ? 'Guardar cambios'
                : 'Crear departamento'}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
