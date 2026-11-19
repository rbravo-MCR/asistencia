import { useForm } from 'react-hook-form';
import { useBlocker } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { UserSchema, type UserView } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidePanel } from '@/components/ui/side-panel';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { request } from '@/lib/api';
import { Field, FormError } from './form-fields';
import {
  userSchema,
  userUpdateSchema,
  roleOptions,
  roleLabels,
} from './form-schema';

export function UserForm({
  user,
  csrfToken,
  isSuperAdmin,
  onDone,
}: {
  user: UserView | null;
  csrfToken: string;
  isSuperAdmin: boolean;
  onDone: (saved?: boolean) => void;
}) {
  const client = useQueryClient();
  const schema = user
    ? userUpdateSchema.extend({ password: z.string() })
    : userSchema;
  const form = useForm<
    z.input<typeof userSchema>,
    unknown,
    z.output<typeof userSchema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email ?? '',
      name: user?.name ?? '',
      roles: user?.roles ?? ['EMPLOYEE'],
      active: user?.active ?? true,
      password: '',
    },
  });
  const { isDirty, isSubmitting } = form.formState;
  const discard = useDiscardConfirm();
  useBlocker({
    shouldBlockFn: async () => isDirty && !(await discard.confirm()),
    enableBeforeUnload: isDirty && !isSubmitting,
    disabled: !isDirty || isSubmitting,
  });
  const submit = form.handleSubmit(async (input) => {
    form.clearErrors('root');
    const { password, ...updated } = input;
    try {
      await request(user ? `/users/${user.id}` : '/users', UserSchema, {
        method: user ? 'PUT' : 'POST',
        csrfToken,
        body: user ? updated : { ...updated, password },
      });
      await client.invalidateQueries({ queryKey: ['users'] });
      await client.invalidateQueries({ queryKey: ['user-directory'] });
      await client.invalidateQueries({ queryKey: ['session'] });
      onDone(true);
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el usuario.',
      });
    }
  });
  const close = async () => {
    if (isSubmitting) return;
    if (!isDirty || (await discard.confirm())) onDone();
  };
  return (
    <SidePanel
      open
      initialFocusId="user-name"
      returnFocusId="users-search"
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title={user ? 'Editar usuario' : 'Crear usuario'}
      description="Identidad, roles globales y acceso a la plataforma."
    >
      {discard.dialog}
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => void submit(e)}
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {user && (
            <p className="text-sm text-muted-foreground">
              Guardar cambios cerrará las sesiones de este usuario. Tendrá que
              ingresar de nuevo.
            </p>
          )}
          <Field
            id="user-name"
            label="Nombre"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="user-name"
              autoComplete="name"
              {...form.register('name')}
            />
          </Field>
          <Field
            id="user-email"
            label="Correo electrónico"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
          </Field>
          {!user && (
            <Field
              id="user-password"
              label="Contraseña inicial (6 a 128 caracteres)"
              error={form.formState.errors.password?.message}
            >
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
            </Field>
          )}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Roles globales</legend>
            {roleOptions
              .filter((role) => isSuperAdmin || role !== 'SUPER_ADMIN')
              .map((role) => (
                <label
                  key={role}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    value={role}
                    {...form.register('roles')}
                  />
                  {roleLabels[role]}
                </label>
              ))}
            <FormError message={form.formState.errors.roles?.message} />
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm">
            <input type="checkbox" {...form.register('active')} />
            Cuenta activa
          </label>
          {user && (
            <p className="text-sm text-muted-foreground">
              Cambiar roles o desactivar revoca sus sesiones. El último
              administrador activo y el último superadministrador activo están
              protegidos.
            </p>
          )}
          <FormError message={form.formState.errors.root?.message} />
        </div>
        <div className="flex flex-wrap gap-3 border-t bg-card px-6 py-4">
          <Button disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando…'
              : user
                ? 'Guardar usuario'
                : 'Crear usuario'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void close()}
          >
            {user ? 'Cancelar edición' : 'Cancelar'}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
