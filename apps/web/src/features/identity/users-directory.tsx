import { useState } from 'react';
import type { UserView } from '@asistencia/contracts';
import {
  Search,
  SlidersHorizontal,
  Pencil,
  KeyRound,
  ShieldCheck,
  Users,
  Check,
  CircleOff,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { roleOptions, roleLabels } from './form-schema';

export function UsersDirectory({
  users,
  isPending,
  isError,
  isFetching,
  refetch,
  isSuperAdmin,
  recoveryPendingId,
  onEdit,
  onRecovery,
}: {
  users: UserView[];
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
  isSuperAdmin: boolean;
  recoveryPendingId: string | undefined;
  onEdit: (user: UserView) => void;
  onRecovery: (user: UserView) => void;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const text = search.trim().toLocaleLowerCase('es-MX');
  const filtered = users.filter(
    (user) =>
      (!text ||
        `${user.name} ${user.email}`
          .toLocaleLowerCase('es-MX')
          .includes(text)) &&
      (status === 'all' || user.active === (status === 'active')) &&
      (role === 'all' || user.roles.some((r) => r === role)),
  );
  const hasFilters = Boolean(search) || status !== 'all' || role !== 'all';
  const clear = () => {
    setSearch('');
    setStatus('all');
    setRole('all');
  };
  return (
    <>
      <dl className="grid grid-cols-3 divide-x divide-border border-y py-5">
        {[
          { label: 'Cuentas registradas', value: users.length, icon: Users },
          {
            label: 'Cuentas activas',
            value: users.filter((u) => u.active).length,
            icon: Check,
          },
          {
            label: 'Cuentas inactivas',
            value: users.filter((u) => !u.active).length,
            icon: CircleOff,
          },
        ].map(({ label, value, icon: Icon }, i) => (
          <div key={label} className={`min-w-0 ${i ? 'pl-4 sm:pl-8' : 'pr-4'}`}>
            <dt className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <Icon className="hidden size-4 sm:block" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {isPending || isError ? '—' : value}
            </dd>
          </div>
        ))}
      </dl>
      <section
        aria-label="Directorio de usuarios"
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold">Directorio de cuentas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Listado autorizado · filtros aplicados en esta vista
            </p>
          </div>
          <Button
            variant="ghost"
            className="min-h-11"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Actualizar listado
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-b bg-secondary/35 p-4 sm:px-6">
          <label className="min-w-0 basis-full text-xs font-medium sm:min-w-60 sm:flex-1 sm:basis-0">
            Buscar usuarios
            <span className="relative mt-2 block">
              <Search
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="users-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o correo electrónico"
                className="h-11 bg-card pl-10"
              />
            </span>
          </label>
          <label className="min-w-0 basis-full text-xs font-medium sm:min-w-44 sm:flex-1 sm:basis-0 sm:max-w-44">
            Estado de cuenta
            <select
              aria-label="Estado de cuenta"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border bg-card px-3 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </label>
          <label className="min-w-0 basis-full text-xs font-medium sm:min-w-52 sm:flex-1 sm:basis-0 sm:max-w-52">
            Rol global
            <select
              aria-label="Rol global"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border bg-card px-3 text-sm"
            >
              <option value="all">Todos los roles</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <Button variant="ghost" className="min-h-11" onClick={clear}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </div>
        {isPending ? (
          <div role="status" className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">Cargando cuentas…</p>
            <div className="h-20 rounded-lg bg-secondary" />
          </div>
        ) : isError ? (
          <div className="space-y-3 p-6">
            <p role="alert">No se pudo cargar la información.</p>
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar carga
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">
                Usuarios, roles globales, estado de cuenta y acciones permitidas
              </caption>
              <thead className="sr-only text-[11px] uppercase tracking-wider text-muted-foreground md:not-sr-only md:table-header-group">
                <tr className="border-b bg-secondary/35">
                  <th scope="col" className="w-[36%] px-6 py-3 font-medium">
                    Usuario
                  </th>
                  <th scope="col" className="w-[27%] px-4 py-3 font-medium">
                    Roles globales
                  </th>
                  <th scope="col" className="w-[14%] px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="w-[23%] px-4 py-3 text-right font-medium"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="block divide-y md:table-row-group">
                {filtered.map((user) => {
                  const protectedAccount =
                    user.roles.includes('SUPER_ADMIN') && !isSuperAdmin;
                  return (
                    <tr
                      key={user.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-5 hover:bg-secondary/35 md:table-row md:p-0"
                    >
                      <th
                        scope="row"
                        className="col-span-2 min-w-0 text-left font-normal md:px-6 md:py-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-secondary text-xs font-semibold"
                          >
                            {user.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')}
                          </span>
                          <div className="min-w-0">
                            <span className="block break-words font-semibold">
                              {user.name}
                            </span>
                            <span className="mt-1 block break-all text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </th>
                      <td className="min-w-0 md:px-4 md:py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 rounded-md border bg-secondary/60 px-2 py-1 text-[11px] font-medium"
                            >
                              {r === 'SUPER_ADMIN' && (
                                <ShieldCheck
                                  className="size-3"
                                  aria-hidden="true"
                                />
                              )}
                              {roleLabels[r]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="md:px-4 md:py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${user.active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}
                        >
                          <span
                            className="size-1.5 rounded-full bg-current"
                            aria-hidden="true"
                          />
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="col-span-2 md:px-4 md:py-5">
                        {protectedAccount ? (
                          <p className="flex max-w-64 items-start gap-2 text-xs text-muted-foreground md:ml-auto">
                            <ShieldCheck
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              Cuenta protegida: solo un superadministrador puede
                              modificarla o recuperar su acceso.
                            </span>
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <Button
                              variant="ghost"
                              className="min-h-11 px-2 text-xs"
                              aria-label={`Editar ${user.name}`}
                              onClick={() => onEdit(user)}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              className="min-h-11 px-2 text-xs"
                              aria-label={`Generar código para ${user.name}`}
                              disabled={
                                !user.active || Boolean(recoveryPendingId)
                              }
                              onClick={() => onRecovery(user)}
                            >
                              <KeyRound
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              {recoveryPendingId === user.id
                                ? 'Generando…'
                                : 'Recuperar'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="px-6 py-14 text-center">
                <Users
                  className="mx-auto mb-3 size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="font-semibold">
                  {hasFilters
                    ? 'No hay usuarios con estos filtros.'
                    : 'No hay cuentas registradas en tu alcance.'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasFilters
                    ? 'Prueba otro nombre, correo, estado o rol.'
                    : 'Las cuentas que puedas administrar aparecerán aquí.'}
                </p>
              </div>
            )}
            <div
              role="status"
              className="border-t px-6 py-3 text-xs text-muted-foreground"
            >
              Mostrando {filtered.length} de {users.length} cuentas del listado
              autorizado
            </div>
          </>
        )}
      </section>
    </>
  );
}
