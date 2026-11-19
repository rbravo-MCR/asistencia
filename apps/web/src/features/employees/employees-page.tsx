import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EmployeeListSchema,
  DepartmentListSchema,
  UserDirectorySchema,
  type EmployeeView,
  type SessionView,
} from '@asistencia/contracts';
import { ApiError, request, requestVoid } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Users, RefreshCw } from 'lucide-react';
import { SidePanel } from '@/components/ui/side-panel';
import { EmployeeForm } from './employee-form';
import { EmployeesDirectory } from './employees-directory';
import { EmployeeDeleteDialog } from './employee-delete-dialog';
import { ProtectedPage } from '../identity/protected-page';
import { categoryLabels, statusLabels } from './form-schema';
import { QueryFeedback } from './query-feedback';

export function EmployeesPage() {
  return (
    <ProtectedPage>
      {(session) => <EmployeesContent session={session} />}
    </ProtectedPage>
  );
}
function EmployeesContent({ session }: { session: SessionView }) {
  const canManage = session.permissions.manageOrganization;
  const query = useQuery({
    queryKey: ['employees'],
    queryFn: ({ signal }) =>
      request('/employees', EmployeeListSchema, { signal }),
    retry: false,
  });
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: ({ signal }) =>
      request('/departments', DepartmentListSchema, { signal }),
    retry: false,
  });
  const directory = useQuery({
    queryKey: ['user-directory'],
    queryFn: ({ signal }) =>
      request('/users/directory', UserDirectorySchema, { signal }),
    enabled: canManage,
    retry: false,
  });
  const [editing, setEditing] = useState<EmployeeView | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const scopeDenied =
    query.error instanceof ApiError &&
    [401, 403, 404].includes(query.error.status);
  const currentItems = scopeDenied ? [] : (query.data?.items ?? []);
  const viewing = currentItems.find((employee) => employee.id === viewingId);
  const editingAllowed =
    !editing || currentItems.some((employee) => employee.id === editing.id);
  const [deletePending, setDeletePending] = useState(false);
  const client = useQueryClient();
  const [deleting, setDeleting] = useState<EmployeeView | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const removal = useMutation({
    mutationFn: (employee: EmployeeView) =>
      requestVoid(`/employees/${employee.id}`, {
        method: 'DELETE',
        csrfToken: session.csrfToken,
      }),
    retry: false,
  });
  const confirmDelete = async () => {
    if (!deleting || removal.isPending || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    setNotice(null);
    try {
      await removal.mutateAsync(deleting);
      if (editing?.id === deleting.id) {
        setEditing(null);
        setEditorOpen(false);
      }
      setNotice(`Empleado eliminado: ${deleting.fullName}.`);
      await Promise.all(
        ['employees', 'assignments', 'users', 'user-directory', 'session'].map(
          (key) => client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setDeleting(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No se pudo confirmar la eliminación. Actualiza el listado antes de reintentar.',
      );
    } finally {
      setDeletePending(false);
    }
  };
  return (
    <main className="mcr-employees-workspace mx-auto min-h-[calc(100dvh-140px)] max-w-[1800px] px-4 pb-10 pt-8 sm:px-7 lg:px-10 lg:pt-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="hidden size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-foreground dark:text-primary sm:flex"
          >
            <Users className="size-7" />
          </span>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Equipo
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
              Empleados
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {canManage
                ? 'Consulta y administra los expedientes del equipo.'
                : 'Consulta los expedientes disponibles según tu alcance autorizado.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Actualizar listado
          </Button>
          {canManage && (
            <Button
              className="min-h-11 rounded-lg"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
                setNotice(null);
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuevo empleado
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-success/30 bg-card p-4 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {query.isPending && (
        <div role="status" className="min-h-80 rounded-2xl border bg-card p-6">
          <p className="mb-6 text-sm text-muted-foreground">
            Cargando empleados…
          </p>
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              aria-hidden="true"
              className="mb-4 flex items-center gap-4"
            >
              <span className="size-10 rounded-full bg-secondary" />
              <span className="h-4 w-1/2 rounded bg-secondary" />
            </div>
          ))}
        </div>
      )}
      {query.isError && <QueryFeedback query={query} />}
      {departments.isError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border bg-card p-4 text-sm"
        >
          No se pudieron cargar los departamentos.{' '}
          <Button variant="link" onClick={() => void departments.refetch()}>
            Reintentar departamentos
          </Button>
        </div>
      )}
      {query.data && !query.isError && (
        <EmployeesDirectory
          items={query.data.items}
          departments={departments.data?.items ?? []}
          busy={deletePending || removal.isPending}
          onView={(employee) => setViewingId(employee.id)}
          onEdit={
            canManage
              ? (employee) => {
                  setEditing(employee);
                  setEditorOpen(true);
                  setNotice(null);
                }
              : undefined
          }
          onDelete={
            canManage
              ? (employee) => {
                  setDeleting(employee);
                  setDeleteError(null);
                  setNotice(null);
                }
              : undefined
          }
        />
      )}
      {canManage && editorOpen && editingAllowed && (
        <>
          <EmployeeForm
            employee={editing}
            employees={query.data?.items ?? []}
            departments={departments.data?.items ?? []}
            users={directory.data?.items ?? []}
            csrfToken={session.csrfToken}
            optionsReady={
              departments.isSuccess && directory.isSuccess && query.isSuccess
            }
            onDone={(saved) => {
              setEditorOpen(false);
              setEditing(null);
              if (saved)
                setNotice(
                  editing ? 'Expediente actualizado.' : 'Empleado creado.',
                );
            }}
            optionsError={directory.isError}
            onRetryOptions={() => void directory.refetch()}
            departmentsError={departments.isError}
            onRetryDepartments={() => void departments.refetch()}
          />
        </>
      )}
      {canManage && deleting && (
        <EmployeeDeleteDialog
          employee={deleting}
          pending={deletePending || removal.isPending}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
        />
      )}
      {viewing && (
        <SidePanel
          open
          onOpenChange={(open) => {
            if (!open) setViewingId(null);
          }}
          title={`Expediente de ${viewing.fullName}`}
          description="Información disponible según tu alcance autorizado."
          returnFocusId="employees-search"
        >
          <dl className="mcr-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 text-sm">
            {[
              ['Nombre completo', viewing.fullName],
              ['Número interno', viewing.employeeNumber],
              [
                'Departamento',
                departments.data?.items.find(
                  (d) => d.id === viewing.departmentId,
                )?.name ?? 'No disponible',
              ],
              ['Puesto', viewing.position],
              [
                'Fecha de ingreso',
                viewing.joinedOn.split('-').reverse().join('/'),
              ],
              ['Categoría', categoryLabels[viewing.category]],
              ['Estado', statusLabels[viewing.status]],
              ['Celular', viewing.phoneNumber ?? 'No registrado'],
              ['Dirección', viewing.address ?? 'No registrada'],
              [
                'Superior',
                viewing.supervisorId
                  ? (query.data?.items.find(
                      (e) => e.id === viewing.supervisorId,
                    )?.fullName ?? 'Fuera de tu alcance')
                  : 'Sin superior',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
                <dd className="whitespace-pre-wrap break-words font-medium">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </SidePanel>
      )}
    </main>
  );
}
