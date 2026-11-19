import { useState } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { AsyncState } from '@/components/patterns/async-state';
import { InlineNotice } from '@/components/patterns/inline-notice';
import { ArrowRight, LogOut, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestVoid, ApiError } from '@/lib/api';
import { useSession } from './use-session';
import { ProtectedPage } from './protected-page';
import { Field, Page, FormError, panelClass } from './form-fields';
import {
  loginSchema,
  recoverSchema,
  changePasswordSchema,
  roleLabels,
} from './form-schema';

export function LoginPage() {
  const { session, loading, login } = useSession();
  const form = useForm<
    z.input<typeof loginSchema>,
    unknown,
    z.output<typeof loginSchema>
  >({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });
  const submit = form.handleSubmit(async (input) => {
    form.clearErrors('root');
    try {
      await login(input.identifier, input.password);
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof ApiError && error.status === 429
            ? 'Demasiados intentos. Espera unos minutos antes de ingresar.'
            : error instanceof ApiError && error.code === 'CSRF_INVALID'
              ? 'No se pudo validar esta página. Actualízala y vuelve a ingresar desde la dirección del sistema.'
              : 'No se pudo ingresar. Revisa tu usuario y contraseña o inténtalo más tarde.',
      });
    }
  });
  if (loading)
    return (
      <AuthLayout title="Ingresar" description="Accede con tu cuenta de MCR.">
        <AsyncState kind="loading" title="Verificando sesión…" />
      </AuthLayout>
    );
  if (session) return <Navigate to="/" replace />;
  return (
    <AuthLayout title="Ingresar" description="Accede con tu cuenta de MCR.">
      <form
        noValidate
        onSubmit={(e) => void submit(e)}
        className="space-y-5 rounded-xl bg-card"
      >
        <Field
          id="login-identifier"
          label="Número de usuario o correo"
          error={form.formState.errors.identifier?.message}
        >
          <Input
            id="login-identifier"
            className="h-11"
            type="text"
            autoComplete="username"
            {...form.register('identifier')}
          />
        </Field>
        <Field
          id="login-password"
          label="Contraseña"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        </Field>
        <FormError message={form.formState.errors.root?.message} />
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <p>
          <Link to="/recuperar" className="text-sm text-link underline">
            Recuperar acceso
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
export function RecoverPage() {
  const [done, setDone] = useState(false);
  const { clear } = useSession();
  const form = useForm<
    z.input<typeof recoverSchema>,
    unknown,
    z.output<typeof recoverSchema>
  >({
    resolver: zodResolver(recoverSchema),
    defaultValues: { token: '', password: '' },
  });
  const submit = form.handleSubmit(async (input) => {
    form.clearErrors('root');
    try {
      await requestVoid('/auth/recover', {
        method: 'POST',
        body: input,
        public: true,
      });
      await clear();
      form.reset();
      setDone(true);
    } catch {
      form.setError('root', {
        message:
          'No se pudo recuperar el acceso. Revisa el código con Administración y vuelve a intentarlo.',
      });
    }
  });
  return (
    <AuthLayout
      title="Recuperar acceso"
      description="Solicita a Administración un código temporal. Vence a los 30 minutos y solo se puede utilizar una vez."
    >
      {done ? (
        <InlineNotice tone="success">
          Contraseña actualizada.{' '}
          <Link to="/ingresar" className="text-link underline">
            Ingresar
          </Link>
        </InlineNotice>
      ) : (
        <form
          noValidate
          onSubmit={(e) => void submit(e)}
          className="space-y-5 rounded-xl bg-card"
        >
          <Field
            id="recover-token"
            label="Código de recuperación"
            error={form.formState.errors.token?.message}
          >
            <Input
              id="recover-token"
              className="h-11"
              autoComplete="off"
              {...form.register('token')}
            />
          </Field>
          <Field
            id="recover-password"
            label="Nueva contraseña"
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              id="recover-password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
          <p className="text-sm text-muted-foreground">
            Entre 6 y 128 caracteres. Se conservan los espacios.
          </p>
          <FormError message={form.formState.errors.root?.message} />
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Restableciendo…'
              : 'Restablecer contraseña'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
export function AccountPage() {
  return (
    <ProtectedPage>
      {(session) => (
        <AccountContent
          name={session.user.name}
          email={session.user.email}
          roles={session.user.roles}
          csrfToken={session.csrfToken}
        />
      )}
    </ProtectedPage>
  );
}
function AccountContent({
  name,
  email,
  roles,
  csrfToken,
}: {
  name: string;
  email: string;
  roles: ('SUPER_ADMIN' | 'ADMIN' | 'HR' | 'EMPLOYEE')[];
  csrfToken: string;
}) {
  const { logout, clear } = useSession();
  const [logoutError, setLogoutError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const form = useForm<z.input<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '' },
  });
  const submit = form.handleSubmit(async (input) => {
    form.clearErrors('root');
    try {
      await requestVoid('/auth/change-password', {
        method: 'POST',
        body: input,
        csrfToken,
      });
      await clear();
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'No se pudo cambiar la contraseña.',
      });
    }
  });
  return (
    <Page
      title="Mi cuenta"
      eyebrow="Identidad y acceso"
      description="Tu perfil y las opciones de seguridad de esta cuenta."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={panelClass}>
          <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold">Perfil de acceso</h2>
          <p className="font-medium">{name}</p>
          <p>{email}</p>
          <p>{roles.map((role) => roleLabels[role]).join(', ')}</p>
          <Button
            variant="outline"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              setLogoutError('');
              void logout()
                .catch(() =>
                  setLogoutError(
                    'No se pudo cerrar la sesión. Inténtalo otra vez.',
                  ),
                )
                .finally(() => setLeaving(false));
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
          <FormError message={logoutError} />
        </div>
        <form
          noValidate
          onSubmit={(e) => void submit(e)}
          className={panelClass}
        >
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <LockKeyhole
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            Cambiar contraseña
          </h2>
          <p className="text-sm text-muted-foreground">
            Entre 6 y 128 caracteres. Al cambiarla tendrás que ingresar
            nuevamente.
          </p>
          <Field
            id="current-password"
            label="Contraseña actual"
            error={form.formState.errors.currentPassword?.message}
          >
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
          </Field>
          <Field
            id="new-password"
            label="Nueva contraseña"
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
          <FormError message={form.formState.errors.root?.message} />
          <Button disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Cambiando contraseña…'
              : 'Cambiar contraseña'}
          </Button>
        </form>
      </div>
    </Page>
  );
}
