import {
  ArrowUpRight,
  Settings2,
  TriangleAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  ConfigurationStatusSchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
const groups = [
  {
    title: 'Organización',
    links: [
      ['Departamentos', '/departamentos'],
      ['Empleados y superiores', '/empleados'],
      ['Responsables y suplencias', '/responsables'],
    ],
  },
  {
    title: 'Asistencia',
    links: [
      ['Política de asistencia', '/configuracion/asistencia'],
      ['Asistencia e historial', '/asistencia'],
      ['Incidencias', '/incidencias'],
    ],
  },
  {
    title: 'Horarios',
    links: [
      ['Plantillas y festivos', '/turnos'],
      ['Calendario de turnos', '/calendario'],
    ],
  },
  {
    title: 'Ubicaciones',
    links: [['Centros y autorizaciones', '/ubicaciones']],
  },
  {
    title: 'Ausencias',
    links: [
      ['Políticas de vacaciones y permisos', '/politicas-ausencias'],
      ['Períodos y movimientos de vacaciones', '/vacaciones'],
    ],
  },
];
export function ConfigurationPage() {
  return (
    <ProtectedPage permission="manageOrganization">
      {(session) => <ConfigurationContent session={session} />}
    </ProtectedPage>
  );
}
function ConfigurationContent({ session }: { session: SessionView }) {
  const query = useQuery({
    queryKey: ['configuration', session.user.id],
    queryFn: ({ signal }) =>
      request('/configuration/status', ConfigurationStatusSchema, { signal }),
    retry: false,
    staleTime: 0,
  });
  return (
    <Page
      eyebrow="Administración"
      title="Configuración administrativa"
      description="Revisa los ajustes y completa los datos necesarios para operar. Cada sección conserva sus permisos e historial."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={panelClass}>
          <div className="flex items-center gap-3">
            <Settings2 aria-hidden="true" className="size-5" />
            <h2 className="text-xl font-semibold">Ajustes de operación</h2>
          </div>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {[
              ...groups,
              ...(session.permissions.manageUsers
                ? [
                    {
                      title: 'Acceso y auditoría',
                      links: [
                        ['Usuarios y roles', '/usuarios'],
                        ['Auditoría de operaciones', '/auditoria'],
                      ],
                    },
                  ]
                : []),
            ].map((group) => (
              <div key={group.title} className="min-w-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="divide-y">
                  {group.links.map(([name, href]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-lg py-3 text-sm font-medium hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span>{name}</span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Pendientes de configuración</h2>
          <p className="text-sm text-muted-foreground">
            Diagnóstico de lectura con los datos y el alcance actuales.
          </p>
          <QueryFeedback query={query} />
          {query.data && !query.isError && (
            <>
              <p className="text-xs leading-5 text-muted-foreground">
                Revisión {query.data.date} · {query.data.timeZone}. Turnos
                próximos: {query.data.date} a {query.data.throughDate}.
              </p>
              {query.data.issues.length ? (
                <ul className="space-y-3">
                  {query.data.issues.map((i) => (
                    <li
                      key={i.code}
                      className={`min-w-0 space-y-3 break-words rounded-xl border p-4 ${i.severity === 'WARNING' ? 'border-warning/40 bg-warning/5' : 'bg-secondary/40'}`}
                    >
                      <div className="flex items-start gap-2">
                        {i.severity === 'WARNING' ? (
                          <TriangleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-warning"
                          />
                        ) : (
                          <Info
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-info"
                          />
                        )}
                        <h3 className="font-semibold">
                          {i.title} · {i.count}
                        </h3>
                      </div>
                      <p className="text-sm leading-6">
                        <span className="font-medium">
                          {i.severity === 'INFO'
                            ? 'Para revisar'
                            : 'Requiere configuración'}
                        </span>{' '}
                        · {i.detail}
                      </p>
                      <a
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-link underline underline-offset-4"
                        href={i.href}
                      >
                        Revisar {i.title.toLowerCase()}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3 rounded-xl border p-4">
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-5 text-success"
                  />
                  <p className="text-sm leading-6">
                    No se detectaron faltantes en las comprobaciones
                    disponibles. Esto no sustituye la validación operativa de
                    RR. HH.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Page>
  );
}
