import { submit } from '../planning/use-write';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AuditEventListSchema,
  type AuditEventView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { SidePanel } from '@/components/ui/side-panel';
import { History, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField } from '../planning/controls';
export function AuditPage() {
  return (
    <ProtectedPage permission="manageUsers">
      {() => <AuditContent />}
    </ProtectedPage>
  );
}
function AuditContent() {
  const [selected, setSelected] = useState<AuditEventView | null>(null);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    offset: 0,
  });
  const params = new URLSearchParams({
    limit: '50',
    offset: String(filters.offset),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  });
  const query = useQuery({
    queryKey: ['audit-events', filters],
    queryFn: ({ signal }) =>
      request(`/audit-events?${params}`, AuditEventListSchema, { signal }),
    retry: false,
  });
  return (
    <Page
      eyebrow="Administración"
      title="Auditoría"
      description="Historial de cambios y su responsable. Fechas mostradas en la zona horaria del dispositivo."
    >
      <form
        className={`${panelClass} grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]`}
        onSubmit={(e) => {
          const data = submit(e);
          setFilters({
            entityType: String(data.get('entityType')).trim(),
            action: String(data.get('action')).trim(),
            offset: 0,
          });
        }}
      >
        <TextField name="entityType" label="Entidad" required={false} />
        <TextField name="action" label="Acción" required={false} />
        <Button type="submit">
          <SlidersHorizontal aria-hidden="true" />
          Filtrar
        </Button>
      </form>
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <History className="size-5" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Registro de operaciones</h2>
          </div>
          {query.data && !query.isError && (
            <p className="text-sm text-muted-foreground">
              {query.data.total} eventos
            </p>
          )}
        </div>
        <QueryFeedback query={query} empty={query.data?.items.length === 0} />
        {!query.isError && !!query.data?.items.length && (
          <div className="space-y-3">
            <p
              id="audit-scroll-help"
              className="text-xs leading-5 text-muted-foreground xl:hidden"
            >
              Desliza la tabla para ver todas las columnas. Con teclado, enfoca
              la tabla y usa las flechas.
            </p>
            <div
              role="region"
              aria-label="Eventos de auditoría"
              aria-describedby="audit-scroll-help"
              tabIndex={0}
              className="overflow-x-auto rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">
                  Eventos de auditoría, del más reciente al más antiguo
                </caption>
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Responsable</th>
                    <th className="px-4 py-3 font-medium">Operación</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {query.data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="align-top hover:bg-secondary/40"
                    >
                      <td className="px-4 py-4">
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleString('es-MX')}
                        </time>
                      </td>
                      <td className="max-w-52 break-words px-4 py-4">
                        {item.actorName ?? 'Sistema'}
                      </td>
                      <td className="max-w-72 break-words px-4 py-4">
                        <span className="font-medium">{item.action}</span>
                        <p className="mt-1 text-muted-foreground">
                          {item.entityType}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {item.entityId}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          onClick={() => setSelected(item)}
                          aria-label={`Ver cambios: ${item.action} · ${item.entityType}`}
                        >
                          Ver cambios
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {query.data && !query.isError && (
          <p className="text-sm text-muted-foreground">
            {query.data.items.length === 0
              ? 'Sin resultados en esta página'
              : `Mostrando ${filters.offset + 1}–${filters.offset + query.data.items.length} de ${query.data.total}`}
            . Hasta 50 eventos por página.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={filters.offset === 0 || query.isFetching}
            onClick={() =>
              setFilters({
                ...filters,
                offset: Math.max(0, filters.offset - 50),
              })
            }
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              query.isFetching ||
              filters.offset + 50 >= (query.data?.total ?? 0)
            }
            onClick={() =>
              setFilters({ ...filters, offset: filters.offset + 50 })
            }
          >
            Siguiente
          </Button>
        </div>
      </section>
      {selected && (
        <SidePanel
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title="Detalle de auditoría"
          description="Consulta los datos disponibles antes y después del cambio."
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="space-y-2 break-words">
              <h2 className="text-lg font-semibold">
                {selected.action} · {selected.entityType}
              </h2>
              <p className="text-sm">
                {selected.actorName ?? 'Sistema'} ·{' '}
                {new Date(selected.createdAt).toLocaleString('es-MX')}
              </p>
            </div>
            <dl className="space-y-3 rounded-xl border p-4 text-xs">
              <div>
                <dt className="font-semibold text-muted-foreground">Entidad</dt>
                <dd className="mt-1 break-all">{selected.entityId}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">
                  Solicitud
                </dt>
                <dd className="mt-1 break-all">{selected.requestId}</dd>
              </div>
            </dl>
            {[
              ['Antes', selected.before],
              ['Después', selected.after],
            ].map(([label, data]) => (
              <section key={String(label)} className="min-w-0 space-y-2">
                <h3 className="font-semibold">{String(label)}</h3>
                <pre className="overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-secondary/40 p-4 text-xs leading-6">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </section>
            ))}
          </div>
        </SidePanel>
      )}
    </Page>
  );
}
