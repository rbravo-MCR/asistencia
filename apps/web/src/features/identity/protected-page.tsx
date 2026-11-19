import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { SessionView } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';
import { useSession } from './use-session';
import { PageHeader } from '@/components/patterns/page-header';
import { AsyncState } from '@/components/patterns/async-state';
import { InlineNotice } from '@/components/patterns/inline-notice';

export function ProtectedPage({
  children,
  permission,
}: {
  children: (session: SessionView) => ReactNode;
  permission?: 'manageUsers' | 'manageOrganization';
}) {
  const { session, loading, error, retry } = useSession();
  if (loading)
    return (
      <main className="mx-auto max-w-[1600px] p-6">
        <AsyncState kind="loading" title="Verificando sesión…" />
      </main>
    );
  if (error)
    return (
      <main className="mx-auto max-w-[1600px] space-y-6 p-6">
        <PageHeader title="Revisa tu acceso" eyebrow="Sesión" />
        <InlineNotice tone="danger">
          No se pudo verificar la sesión.
        </InlineNotice>
        <Button onClick={retry}>Reintentar</Button>
      </main>
    );
  if (!session) return <Navigate to="/ingresar" replace />;
  if (permission && !session.permissions[permission])
    return (
      <main className="mx-auto max-w-[1600px] space-y-6 p-6">
        <PageHeader
          title="Acceso restringido"
          eyebrow="Permisos de tu cuenta"
        />
        <InlineNotice tone="danger">
          No tienes permiso para acceder a esta sección.
        </InlineNotice>
      </main>
    );
  return children(session);
}
