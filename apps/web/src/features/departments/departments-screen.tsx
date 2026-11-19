import { useState } from 'react';
import type { DepartmentResponse } from '@asistencia/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, RefreshCw, Search, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchDepartments, deleteDepartment, DepartmentApiError } from './api';
import { DepartmentMark } from './department-mark';
import { DepartmentForm } from './department-form';
import { DepartmentList } from './department-list';
import { DepartmentDeleteDialog } from './department-delete-dialog';

export function DepartmentsScreen({
  canManage,
  csrfToken,
}: {
  canManage: boolean;
  csrfToken: string;
}) {
  const query = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    retry: false,
  });
  const client = useQueryClient();
  const [editor, setEditor] = useState<{
    department?: DepartmentResponse;
  } | null>(null);
  const [deleting, setDeleting] = useState<DepartmentResponse | undefined>();
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const removal = useMutation({
    mutationFn: (department: DepartmentResponse) =>
      deleteDepartment(department.id, csrfToken),
    retry: false,
  });
  const text = search.trim().normalize('NFC').toLocaleLowerCase('es-MX');
  const items = query.data?.items ?? [];
  const filtered = items.filter((department) =>
    department.name.toLocaleLowerCase('es-MX').includes(text),
  );
  const confirmDelete = async () => {
    if (!deleting || deletePending || removal.isPending) return;
    setDeletePending(true);
    setDeleteError(null);
    setNotice(null);
    try {
      await removal.mutateAsync(deleting);
      await client.invalidateQueries({ queryKey: ['departments'] });
      setNotice(`Departamento eliminado: ${deleting.name}.`);
      setDeleting(undefined);
    } catch (error) {
      setDeleteError(
        error instanceof DepartmentApiError &&
          error.code === 'DEPARTMENT_IN_USE'
          ? 'No se puede eliminar: el departamento tiene empleados o responsabilidades vinculadas.'
          : error instanceof DepartmentApiError && error.status === 404
            ? 'El departamento ya no existe. Actualiza el listado.'
            : 'No se pudo confirmar la eliminación. Actualiza el listado antes de reintentar.',
      );
    } finally {
      setDeletePending(false);
    }
  };
  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-8 sm:px-7 lg:px-10 lg:pt-11">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Organización
          </p>
          <h1 className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[32px]">
            Departamentos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Una estructura clara para tu equipo. Consulta y organiza las áreas
            de la empresa según tu alcance.
          </p>
        </div>
        {canManage && (
          <Button
            className="min-h-11 rounded-lg px-4"
            onClick={() => {
              setEditor({});
              setNotice(null);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuevo departamento
          </Button>
        )}
      </div>
      <section aria-label="Directorio de departamentos" className="mt-9">
        <div className="flex items-center gap-2.5 border-b border-border/60">
          <h2 className="relative py-3.5 text-sm font-medium after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-primary">
            Directorio
          </h2>
          {query.data && !query.isError && (
            <span
              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              aria-label={`${items.length} departamentos en el listado autorizado`}
            >
              {items.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="departments-search"
              type="search"
              aria-label="Buscar departamentos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre…"
              className="h-11 rounded-lg border-input bg-secondary/35 pl-10 shadow-none focus-visible:ring-0 focus-visible:border-ring"
            />
          </div>
          <Button
            variant="ghost"
            className="min-h-11 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="text-xs">Actualizar listado</span>
          </Button>
        </div>
        {query.isPending ? (
          <div role="status" className="space-y-5 py-8">
            <p className="text-sm text-muted-foreground">
              Cargando departamentos…
            </p>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                aria-hidden="true"
                className="flex items-center gap-4 px-4"
              >
                <span className="size-10 rounded-xl bg-secondary" />
                <span className="h-3 w-44 max-w-[60%] rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <h3 className="font-medium">No pudimos cargar los departamentos</h3>
            <p
              role="alert"
              className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground"
            >
              No se pudo cargar el listado. Revisa tu conexión e inténtalo de
              nuevo.
            </p>
            <Button
              variant="outline"
              className="mt-5 min-h-11 rounded-lg"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Reintentar carga
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            {text ? (
              <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Search
                  className="size-6"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
            ) : (
              <DepartmentMark className="mb-5 size-14 [&>svg]:size-8" />
            )}
            <h3 className="text-base font-medium tracking-tight">
              {text
                ? 'No encontramos departamentos.'
                : 'Aún no hay departamentos.'}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {text
                ? 'Prueba con otro nombre o limpia la búsqueda.'
                : canManage
                  ? 'Crea el primero para comenzar a organizar tu equipo.'
                  : 'Los departamentos disponibles en tu alcance aparecerán aquí.'}
            </p>
            {text && (
              <Button
                variant="ghost"
                className="mt-4 min-h-11"
                onClick={() => setSearch('')}
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <DepartmentList
            items={filtered}
            busy={deletePending || removal.isPending}
            onEdit={
              canManage
                ? (department) => {
                    setEditor({ department });
                    setNotice(null);
                  }
                : undefined
            }
            onDelete={
              canManage
                ? (department) => {
                    setDeleting(department);
                    setDeleteError(null);
                    setNotice(null);
                  }
                : undefined
            }
          />
        )}
        {query.data && !query.isError && (
          <p className="mt-4 px-4 text-xs text-muted-foreground">
            {text
              ? `${filtered.length} de ${items.length} departamentos en el listado autorizado`
              : `${items.length} ${items.length === 1 ? 'departamento' : 'departamentos'} en el listado autorizado`}
          </p>
        )}
      </section>
      {notice && (
        <div
          role="status"
          className="mcr-floating-surface fixed inset-x-4 bottom-24 z-40 flex items-start gap-3 rounded-xl p-4 shadow-lg sm:left-auto sm:right-6 sm:max-w-md xl:bottom-6"
        >
          <Check
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 break-words text-sm leading-6">
            {notice}
          </p>
          <button
            aria-label="Ocultar confirmación"
            className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-secondary"
            onClick={() => setNotice(null)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {canManage && editor && (
        <DepartmentForm
          department={editor.department}
          csrfToken={csrfToken}
          onCancel={() => setEditor(null)}
          onSaved={(department) => {
            setNotice(
              `Departamento ${editor.department ? 'actualizado' : 'creado'}: ${department.name}.`,
            );
            setEditor(null);
          }}
        />
      )}
      {canManage && deleting && (
        <DepartmentDeleteDialog
          department={deleting}
          pending={deletePending || removal.isPending}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleting(undefined);
            setDeleteError(null);
          }}
        />
      )}
    </main>
  );
}
