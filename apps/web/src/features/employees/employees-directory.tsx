import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import type { EmployeeView, DepartmentResponse } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categoryLabels, statusLabels } from './form-schema';
import { selectClass } from '../identity/form-fields';
import { EmployeeActions } from './employee-actions';

export function EmployeesDirectory({
  items,
  departments,
  busy,
  onView,
  onEdit,
  onDelete,
}: {
  items: EmployeeView[];
  departments: DepartmentResponse[];
  busy: boolean;
  onView: (employee: EmployeeView) => void;
  onEdit?: ((employee: EmployeeView) => void) | undefined;
  onDelete?: ((employee: EmployeeView) => void) | undefined;
}) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const departmentName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? 'No disponible';
  const text = search.trim().normalize('NFC').toLocaleLowerCase('es-MX');
  const filtered = items.filter(
    (e) =>
      (!department || e.departmentId === department) &&
      (!status || e.status === status) &&
      (!category || e.category === category) &&
      [
        e.fullName,
        e.employeeNumber,
        e.position,
        departmentName(e.departmentId),
      ].some((value) => value.toLocaleLowerCase('es-MX').includes(text)),
  );
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 10) - 1),
  );
  const visible = filtered.slice(current * 10, (current + 1) * 10);
  const clear = () => {
    setSearch('');
    setDepartment('');
    setStatus('');
    setCategory('');
    setPage(0);
  };
  return (
    <section aria-label="Directorio de empleados" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_240px_180px_190px]">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="employees-search"
            type="search"
            aria-label="Buscar empleados"
            placeholder="Buscar por nombre, número o puesto…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-11 bg-card pl-10"
          />
        </div>
        <select
          aria-label="Filtrar por departamento"
          className={`${selectClass} h-11`}
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          className={`${selectClass} h-11`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por categoría"
          className={`${selectClass} h-11`}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-5 sm:px-6">
          <h2 className="font-semibold">
            {filtered.length} {filtered.length === 1 ? 'empleado' : 'empleados'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Directorio autorizado ·{' '}
            {items.filter((e) => e.status === 'ACTIVE').length} activos
          </p>
        </div>
        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Empleados en tu alcance autorizado. Abre el expediente para
                consultar todos los datos.
              </caption>
              <thead className="border-b bg-secondary/45 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                    Empleado
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium md:table-cell"
                  >
                    Núm. interno
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium lg:table-cell"
                  >
                    Departamento
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium 2xl:table-cell"
                  >
                    Puesto
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium xl:table-cell"
                  >
                    Categoría
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium sm:table-cell"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium xl:table-cell"
                  >
                    Ingreso
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary/35">
                    <td className="max-w-64 px-4 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="hidden size-10 shrink-0 items-center justify-center rounded-full border bg-secondary text-xs font-semibold text-muted-foreground sm:flex"
                        >
                          {e.fullName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')}
                        </span>
                        <div className="min-w-0">
                          <h3 className="break-words font-medium">
                            {e.fullName}
                          </h3>
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {e.position}
                          </p>
                          <p className="mt-1 break-words text-xs text-muted-foreground md:hidden">
                            {e.employeeNumber} · {statusLabels[e.status]}
                          </p>
                          <p className="mt-1 break-words text-xs text-muted-foreground lg:hidden">
                            {departmentName(e.departmentId)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-4 tabular-nums md:table-cell">
                      {e.employeeNumber}
                    </td>
                    <td className="hidden max-w-48 break-words px-3 py-4 lg:table-cell">
                      {departmentName(e.departmentId)}
                    </td>
                    <td className="hidden max-w-44 break-words px-3 py-4 2xl:table-cell">
                      {e.position}
                    </td>
                    <td className="hidden px-3 py-4 xl:table-cell">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                        {categoryLabels[e.category]}
                      </span>
                    </td>
                    <td className="hidden px-3 py-4 sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${e.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-current"
                        />
                        {statusLabels[e.status]}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-4 text-xs tabular-nums text-muted-foreground xl:table-cell">
                      {e.joinedOn.split('-').reverse().join('/')}
                    </td>
                    <td className="w-12 px-2 py-3">
                      <EmployeeActions
                        employee={e}
                        busy={busy}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <Users
              className="mx-auto mb-4 size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="font-medium">
              {items.length || search || department || status || category
                ? 'No encontramos empleados.'
                : 'Aún no hay empleados.'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length
                ? 'Prueba otra búsqueda o limpia los filtros.'
                : 'Los expedientes de tu alcance aparecerán aquí.'}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p role="status">
            {filtered.length
              ? `${current * 10 + 1}–${Math.min((current + 1) * 10, filtered.length)} de ${filtered.length}`
              : '0'}{' '}
            en el listado autorizado
          </p>
          <div className="flex items-center gap-2">
            {(search || department || status || category) && (
              <Button
                variant="ghost"
                onClick={clear}
                className="min-h-11 text-xs"
              >
                Limpiar filtros
              </Button>
            )}
            {filtered.length > 10 && (
              <>
                <Button
                  variant="outline"
                  className="size-11 p-0"
                  aria-label="Página anterior"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span>
                  Página {current + 1} de {Math.ceil(filtered.length / 10)}
                </span>
                <Button
                  variant="outline"
                  className="size-11 p-0"
                  aria-label="Página siguiente"
                  disabled={(current + 1) * 10 >= filtered.length}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
