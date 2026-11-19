import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  UserListSchema,
  RecoveryTokenSchema,
  type UserView,
  type RecoveryToken,
} from '@asistencia/contracts';
import { UserPlus, ShieldCheck, KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api';
import { ProtectedPage } from './protected-page';
import { FormError } from './form-fields';
import { UserForm } from './user-form';
import { UsersDirectory } from './users-directory';

export function UsersPage() {
  return (
    <ProtectedPage permission="manageUsers">
      {(session) => (
        <UsersContent
          csrfToken={session.csrfToken}
          isSuperAdmin={session.user.roles.includes('SUPER_ADMIN')}
        />
      )}
    </ProtectedPage>
  );
}
function UsersContent({
  csrfToken,
  isSuperAdmin,
}: {
  csrfToken: string;
  isSuperAdmin: boolean;
}) {
  const query = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => request('/users', UserListSchema, { signal }),
    retry: false,
  });
  const [editor, setEditor] = useState<{ user: UserView | null } | null>(null);
  const [recovery, setRecovery] = useState<{
    name: string;
    value: RecoveryToken;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const recoveryMutation = useMutation({
    retry: false,
    mutationFn: async (user: UserView) => {
      setRecovery(null);
      return {
        name: user.name,
        value: await request(
          `/users/${user.id}/recovery`,
          RecoveryTokenSchema,
          { method: 'POST', csrfToken },
        ),
      };
    },
    onSuccess: setRecovery,
  });
  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Administración / Identidad y acceso
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Gestiona las cuentas de tu equipo y sus permisos de acceso a México
            Car Rental.
          </p>
        </div>
        <Button
          className="min-h-11 rounded-xl px-5 shadow-sm"
          onClick={() => {
            setEditor({ user: null });
            setRecovery(null);
            setNotice('');
          }}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-success/35 bg-success/5 px-4 py-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {recovery && (
        <section
          aria-label="Código temporal"
          className="relative space-y-3 rounded-xl border border-warning/40 bg-card p-5 pr-14"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-warning" aria-hidden="true" />
            <h2 className="font-semibold">Recuperación de {recovery.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Entrega este código por un medio seguro. Se muestra una vez y vence
            el {new Date(recovery.value.expiresAt).toLocaleString('es-MX')}.
          </p>
          <p
            className="break-all rounded-lg border bg-secondary p-3 font-mono text-sm"
            role="status"
          >
            {recovery.value.token}
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setRecovery(null)}
          >
            Ocultar código
          </Button>
          <button
            aria-label="Cerrar código temporal"
            onClick={() => setRecovery(null)}
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-lg hover:bg-secondary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </section>
      )}
      {recoveryMutation.isError && (
        <FormError message="No se pudo generar el código. Revisa el estado antes de reintentar." />
      )}
      <UsersDirectory
        users={query.data?.items ?? []}
        isPending={query.isPending}
        isError={query.isError}
        isFetching={query.isFetching}
        refetch={query.refetch}
        isSuperAdmin={isSuperAdmin}
        recoveryPendingId={
          recoveryMutation.isPending
            ? recoveryMutation.variables?.id
            : undefined
        }
        onEdit={(user) => {
          setEditor({ user });
          setRecovery(null);
          setNotice('');
        }}
        onRecovery={(user) => recoveryMutation.mutate(user)}
      />
      <p className="flex max-w-3xl items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Los roles globales controlan el acceso. Las responsabilidades de
        jefatura, dirección y suplencia se asignan en Responsables; no se
        conceden desde esta vista.
      </p>
      {editor && (
        <UserForm
          user={editor.user}
          csrfToken={csrfToken}
          isSuperAdmin={isSuperAdmin}
          onDone={(saved?: boolean) => {
            if (saved)
              setNotice(
                editor.user
                  ? 'Usuario actualizado correctamente.'
                  : 'Usuario creado correctamente.',
              );
            setEditor(null);
          }}
        />
      )}
    </main>
  );
}
