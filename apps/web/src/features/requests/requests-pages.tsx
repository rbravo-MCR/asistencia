import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Umbrella, Clock3, ClipboardList, ArrowUpRight } from 'lucide-react';
import type {
  RequestIntentSearch,
  RequestKindIntent,
} from '@/lib/request-intent';
import { CreateRequest } from './create-request';
import { useQuery } from '@tanstack/react-query';
import {
  LeaveRequestListSchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AsyncState } from '@/components/patterns/async-state';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { useRequestWrite } from './common';
import { WriteStatus, RequestPanel } from './controls';
import { RequestList } from './request-list';
export { VacationPage } from './vacation-page';
export { LeavePoliciesPage } from './policies-page';

export function RequestsPage() {
  return (
    <ProtectedPage>
      {(session) => <RequestsContent session={session} />}
    </ProtectedPage>
  );
}
export function ApprovalsPage() {
  return (
    <ProtectedPage>
      {(session) => <ApprovalsContent session={session} />}
    </ProtectedPage>
  );
}
function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: ({ signal }) =>
      request('/requests', LeaveRequestListSchema, { signal }),
    retry: false,
  });
}
function RequestsContent({ session }: { session: SessionView }) {
  const requests = useRequests();
  const write = useRequestWrite(session.csrfToken);
  const search = useSearch({ strict: false }) as RequestIntentSearch;
  const navigate = useNavigate();
  const [target, setTarget] = useState<{
    kind: RequestKindIntent;
    period?: number;
  } | null>(() =>
    session.employeeId && search.create
      ? {
          kind: search.create,
          ...(search.period ? { period: search.period } : {}),
        }
      : null,
  );
  const creating = target !== null;
  const openRequest = (kind: RequestKindIntent) => {
    if (write.blocked || !session.employeeId) return;
    write.resetFeedback();
    setTarget({ kind });
  };
  useEffect(() => {
    if (search.create)
      void navigate({ to: '/solicitudes', search: {}, replace: true });
  }, [navigate, search.create]);
  const [preparing, setPreparing] = useState(false);
  const own =
    requests.data?.items.filter(
      (item) => item.employeeId === session.employeeId,
    ) ?? [];
  return (
    <Page
      eyebrow="Ausencias y permisos"
      title="Solicitudes"
      actions={
        session.employeeId ? (
          <Button
            id="request-create"
            onClick={() => openRequest('VACATION')}
            disabled={write.blocked}
          >
            Nueva solicitud
          </Button>
        ) : undefined
      }
      description="Solicita vacaciones, permisos o revisión de incidencias. La aprobación de jefatura es definitiva."
    >
      {!creating && <WriteStatus write={write} />}
      {!session.employeeId && (
        <section className={panelClass}>
          <h2 className="font-semibold">
            Primero vincula tu cuenta a un empleado
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Tu rol permite consultar esta sección, pero una solicitud personal
            necesita un empleado activo asociado a tu cuenta.{' '}
            {session.permissions.manageOrganization
              ? 'En Empleados, selecciona tu cuenta en el expediente correspondiente.'
              : 'Pide a Recursos Humanos que revise el vínculo con tu expediente.'}
          </p>
          {session.permissions.manageOrganization && (
            <Link
              to="/empleados"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-link underline"
            >
              Revisar empleados{' '}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </section>
      )}
      {creating && (
        <RequestPanel
          title="Nueva solicitud"
          initialFocusId="requestKind"
          returnFocusId="request-create"
          description="Elige el tipo de ausencia, revisa sus condiciones y adjunta evidencia privada cuando corresponda."
          write={write}
          busy={preparing}
          onClose={() => setTarget(null)}
        >
          <CreateRequest
            session={session}
            write={write}
            preparing={preparing}
            setPreparing={setPreparing}
            initialKind={target.kind}
            {...(target.period ? { initialPeriod: target.period } : {})}
            onCreated={() => setTarget(null)}
          />
        </RequestPanel>
      )}
      {session.employeeId && (
        <section
          aria-label="¿Qué necesitas solicitar?"
          className="grid gap-3 md:grid-cols-3"
        >
          {(
            [
              {
                kind: 'VACATION',
                title: 'Pedir vacaciones',
                detail:
                  'Elige un período con días disponibles y las fechas de descanso.',
                icon: Umbrella,
              },
              {
                kind: 'PERMISSION',
                title: 'Solicitar un permiso',
                detail:
                  'Consulta los tipos disponibles y si necesitas indicar horas o adjuntar comprobantes.',
                icon: Clock3,
              },
              {
                kind: 'JUSTIFICATION',
                title: 'Justificar una incidencia',
                detail:
                  'Pide a la jefatura revisar una incidencia registrada en tu asistencia.',
                icon: ClipboardList,
              },
            ] as const
          ).map(({ kind, title, detail, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              disabled={write.blocked}
              onClick={() => openRequest(kind)}
              className="group flex min-w-0 items-start gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                  {detail}
                </span>
              </span>
            </button>
          ))}
        </section>
      )}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Mis solicitudes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta el estado, los documentos y las decisiones de cada envío.
            </p>
          </div>
          {requests.data && (
            <span className="rounded-full border bg-card px-3 py-1 text-sm">
              {own.length} en tu historial
            </span>
          )}
        </div>
        {(requests.isPending || requests.isError) && (
          <QueryFeedback query={requests} />
        )}
        {requests.isSuccess && !own.length && (
          <AsyncState
            kind="empty"
            title={
              session.employeeId
                ? 'Todavía no tienes solicitudes'
                : 'No hay solicitudes personales para mostrar'
            }
            description={
              session.employeeId
                ? 'Elige vacaciones, un permiso o una justificación. Podrás revisar los datos antes de enviar.'
                : 'Vincula tu cuenta a un empleado para consultar y crear sus solicitudes personales.'
            }
            action={
              session.employeeId ? (
                <Button
                  disabled={write.blocked}
                  onClick={() => openRequest('VACATION')}
                >
                  Crear mi primera solicitud
                </Button>
              ) : undefined
            }
          />
        )}
        <RequestList items={own} session={session} write={write} />
        {requests.isSuccess && (
          <Button
            variant="ghost"
            disabled={requests.isFetching}
            onClick={() => {
              void requests.refetch();
            }}
          >
            Actualizar mis solicitudes
          </Button>
        )}
      </section>
    </Page>
  );
}
function ApprovalsContent({ session }: { session: SessionView }) {
  const requests = useRequests();
  const write = useRequestWrite(session.csrfToken);
  const eligible =
    requests.data?.items.filter(
      (item) => item.canHeadDecide || item.canDirectorDecide,
    ) ?? [];
  const history =
    requests.data?.items.filter(
      (item) => !item.canHeadDecide && !item.canDirectorDecide,
    ) ?? [];
  return (
    <Page
      eyebrow="Revisión de ausencias"
      title="Aprobaciones"
      description="La decisión de jefatura es definitiva y conserva actor, fecha y motivo. Las solicitudes históricas mantienen el flujo con el que se crearon."
    >
      <WriteStatus write={write} />
      <QueryFeedback query={requests} />
      <section className="space-y-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Pendientes de mi decisión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aquí aparecen los pasos que tienes autorización para resolver.
            </p>
          </div>
          {requests.data && (
            <span className="rounded-full bg-card px-3 py-1 text-sm font-medium">
              {eligible.length} por revisar
            </span>
          )}
        </div>
        {requests.data && !eligible.length && (
          <p>No tienes solicitudes pendientes de tu decisión.</p>
        )}
        <RequestList
          items={eligible}
          session={session}
          write={write}
          approvals
        />
      </section>
      <section className="space-y-5 border-t pt-6">
        <h2 className="text-xl font-semibold">Historial en mi alcance</h2>
        {requests.data && !history.length && (
          <p>No hay solicitudes disponibles.</p>
        )}
        <RequestList
          items={history}
          session={session}
          write={write}
          approvals
        />
      </section>
    </Page>
  );
}
