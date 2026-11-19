import { useState, type FunctionComponent } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  createMemoryHistory,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionProvider } from './session';
import { useSession } from './use-session';
import { request } from '@/lib/api';
import { DepartmentListSchema, type SessionView } from '@asistencia/contracts';
const session: SessionView = {
  user: {
    id: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
    name: 'Usuario',
    email: 'user@example.com',
    roles: ['EMPLOYEE'],
    active: true,
    createdAt: '2026-11-12T15:00:00.000Z',
  },
  csrfToken: 'csrf-test',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  employeeId: null,
  departmentIds: [],
  managedDepartmentIds: [],
  permissions: {
    manageUsers: false,
    manageOrganization: false,
    viewAllEmployees: false,
  },
};
function Probe() {
  const { session, login, logout } = useSession();
  return (
    <>
      <p>{session ? session.user.name : 'Sin sesión'}</p>
      <button
        onClick={() => void login('other@example.com', 'a-long-password')}
      >
        Ingresar otra cuenta
      </button>
      <button onClick={() => void logout()}>Salir</button>
    </>
  );
}
function mount(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}
function PrivateShellRoute() {
  const { session } = useSession();
  return (
    <AppShell session={session}>
      <Outlet />
    </AppShell>
  );
}
function mountPrivate(client: QueryClient, component: FunctionComponent) {
  vi.stubGlobal('scrollTo', vi.fn());
  const root = createRootRoute({ component: PrivateShellRoute });
  const route = createRoute({
    getParentRoute: () => root,
    path: '/empleados',
    component,
  });
  const history = createMemoryHistory({
    initialEntries: ['/empleados?estado=ACTIVE&busqueda=Ana'],
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history,
  });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return router;
}
describe('aislamiento de sesión', () => {
  it('borra datos privados al ingresar otra cuenta y al salir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/logout')
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify(session)),
      ),
    );
    const client = new QueryClient();
    mount(client);
    await screen.findByText('Usuario');
    client.setQueryData(['employees'], {
      items: [{ fullName: 'Datos privados anteriores' }],
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Ingresar otra cuenta' }),
    );
    await waitFor(() =>
      expect(client.getQueryData(['employees'])).toBeUndefined(),
    );
    expect(screen.getByText('Usuario')).toBeVisible();
    client.setQueryData(['users'], { items: ['Privado'] });
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    await screen.findByText('Sin sesión');
    expect(client.getQueryData(['users'])).toBeUndefined();
  });
  it('un 401 de dominio invalida sesión y datos privados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify(url.endsWith('/session') ? session : {}),
            { status: url.endsWith('/session') ? 200 : 401 },
          ),
      ),
    );
    const client = new QueryClient();
    mount(client);
    await screen.findByText('Usuario');
    client.setQueryData(['employees'], { items: ['Privado'] });
    await act(async () => {
      await expect(
        request('/departments', DepartmentListSchema),
      ).rejects.toThrow();
    });
    await screen.findByText('Sin sesión');
    expect(client.getQueryData(['employees'])).toBeUndefined();
  });
  it('al perder la cookie en revalidación de sesión descarta los datos previos', async () => {
    let revoked = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(revoked ? {} : session), {
            status: revoked ? 401 : 200,
          }),
      ),
    );
    const client = new QueryClient();
    mount(client);
    await screen.findByText('Usuario');
    client.setQueryData(['employees'], { items: ['Privado'] });
    revoked = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['session'] });
    });
    await screen.findByText('Sin sesión');
    await waitFor(() =>
      expect(client.getQueryData(['employees'])).toBeUndefined(),
    );
  });
  it.each([
    [
      'usuario',
      { user: { ...session.user, id: '6ff93c1e-33a0-4f04-b5d1-503f339d0c61' } },
    ],
    ['roles', { user: { ...session.user, roles: ['ADMIN'] } }],
    ['empleado', { employeeId: '6ff93c1e-33a0-4f04-b5d1-503f339d0c61' }],
    ['departamentos', { departmentIds: [] }],
    ['jefaturas', { managedDepartmentIds: [] }],
    [
      'permisos',
      { permissions: { ...session.permissions, viewAllEmployees: true } },
    ],
  ] as const)(
    'limpia caché y expediente local antes de exponer otro alcance: %s',
    async (_name, change) => {
      const initial: SessionView = {
        ...session,
        departmentIds: ['7ff93c1e-33a0-4f04-b5d1-503f339d0c61'],
        managedDepartmentIds: ['7ff93c1e-33a0-4f04-b5d1-503f339d0c61'],
      };
      let current = initial;
      const client = new QueryClient();
      const observedPrivate: unknown[] = [];
      let observingChange = false;
      function PrivateProbe() {
        const { session: visible } = useSession();
        const [detail, setDetail] = useState(false);
        if (
          visible &&
          observingChange &&
          JSON.stringify(visible) === JSON.stringify(current)
        )
          observedPrivate.push(client.getQueryData(['employees']));
        return (
          <>
            <p>{visible ? 'Sesión privada' : 'Sin sesión'}</p>
            <button onClick={() => setDetail(true)}>Abrir expediente</button>
            {detail && <p>Dirección privada anterior</p>}
          </>
        );
      }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(current))),
      );
      mountPrivate(client, PrivateProbe);
      await screen.findByText('Sesión privada');
      client.setQueryData(['employees'], { items: ['Privado anterior'] });
      let privateSignal: AbortSignal | undefined;
      const oldRequest = client
        .fetchQuery({
          queryKey: ['private-in-flight'],
          queryFn: ({ signal }) => {
            privateSignal = signal;
            return new Promise((_, reject) =>
              signal.addEventListener('abort', () =>
                reject(new Error('cancelled')),
              ),
            );
          },
        })
        .catch(() => undefined);
      await userEvent.click(
        screen.getByRole('button', { name: 'Abrir expediente' }),
      );
      expect(screen.getByText('Dirección privada anterior')).toBeVisible();
      current = { ...initial, ...change } as SessionView;
      observingChange = true;
      await act(async () => {
        await client.invalidateQueries({ queryKey: ['session'] });
      });
      await waitFor(() =>
        expect(
          screen.queryByText('Dirección privada anterior'),
        ).not.toBeInTheDocument(),
      );
      await oldRequest;
      expect(privateSignal?.aborted).toBe(true);
      expect(client.getQueryData(['private-in-flight'])).toBeUndefined();
      expect(observedPrivate.length).toBeGreaterThan(0);
      expect(client.getQueryData(['employees'])).toBeUndefined();
      expect(observedPrivate.every((value) => value === undefined)).toBe(true);
    },
  );
  it('mantiene estado local y caché al revalidar alcance equivalente con arrays reordenados', async () => {
    const departmentA = '7ff93c1e-33a0-4f04-b5d1-503f339d0c61';
    const departmentB = '8ff93c1e-33a0-4f04-b5d1-503f339d0c61';
    let current: SessionView = {
      ...session,
      user: { ...session.user, roles: ['ADMIN', 'EMPLOYEE'] },
      departmentIds: [departmentA, departmentB],
      managedDepartmentIds: [departmentA, departmentB],
    };
    const client = new QueryClient();
    function PrivateProbe() {
      const { session: visible } = useSession();
      const [detail, setDetail] = useState(false);
      return (
        <>
          <p>{visible ? 'Sesión privada' : 'Sin sesión'}</p>
          <button onClick={() => setDetail(true)}>Abrir expediente</button>
          {detail && <p>Expediente vigente</p>}
        </>
      );
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(current))),
    );
    mountPrivate(client, PrivateProbe);
    await screen.findByText('Sesión privada');
    client.setQueryData(['employees'], { items: ['Vigente'] });
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir expediente' }),
    );
    current = {
      ...current,
      user: { ...current.user, roles: ['EMPLOYEE', 'ADMIN'] },
      departmentIds: [departmentB, departmentA],
      managedDepartmentIds: [departmentB, departmentA],
      csrfToken: 'refreshed-token',
    };
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['session'] });
    });
    expect(screen.getByText('Expediente vigente')).toBeVisible();
    expect(client.getQueryData(['employees'])).toEqual({ items: ['Vigente'] });
  });
  it('descarta caché y estado local al vencer la sesión', async () => {
    vi.useFakeTimers();
    try {
      const expiring = {
        ...session,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(expiring))),
      );
      const client = new QueryClient();
      function ExpiryProbe() {
        const { session: visible } = useSession();
        const [detail, setDetail] = useState(false);
        return (
          <>
            <p>{visible ? 'Sesión vigente' : 'Sin sesión'}</p>
            <button onClick={() => setDetail(true)}>Abrir expediente</button>
            {detail && <p>Expediente privado</p>}
          </>
        );
      }
      mountPrivate(client, ExpiryProbe);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(screen.getByText('Sesión vigente')).toBeVisible();
      client.setQueryData(['employees'], { items: ['Privado'] });
      fireEvent.click(screen.getByRole('button', { name: 'Abrir expediente' }));
      expect(screen.getByText('Expediente privado')).toBeVisible();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      expect(screen.getByText('Sin sesión')).toBeVisible();
      expect(screen.queryByText('Expediente privado')).not.toBeInTheDocument();
      expect(client.getQueryData(['employees'])).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
  it('conserva URL y filtros del router al desmontar contenido privado por alcance', async () => {
    vi.stubGlobal('scrollTo', vi.fn());
    let current = {
      ...session,
      managedDepartmentIds: ['7ff93c1e-33a0-4f04-b5d1-503f339d0c61'],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(current))),
    );
    const client = new QueryClient();
    function PrivateRoute() {
      const { session: visible } = useSession();
      const [detail, setDetail] = useState(false);
      return (
        <>
          <p>{visible ? 'Ruta privada' : 'Sin sesión'}</p>
          <button onClick={() => setDetail(true)}>Abrir expediente</button>
          {detail && <p>Selección previa</p>}
        </>
      );
    }
    const router = mountPrivate(client, PrivateRoute);
    await screen.findByText('Ruta privada');
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir expediente' }),
    );
    current = { ...current, managedDepartmentIds: [] };
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['session'] });
    });
    await waitFor(() =>
      expect(screen.queryByText('Selección previa')).not.toBeInTheDocument(),
    );
    expect(router.state.location.href).toBe(
      '/empleados?estado=ACTIVE&busqueda=Ana',
    );
    expect(screen.getByText('Ruta privada')).toBeVisible();
  });
  it('conserva la confirmación de un flujo público después de limpiar sesión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(session))),
    );
    const client = new QueryClient();
    function PublicProbe() {
      const { session: visible, clear } = useSession();
      const [done, setDone] = useState(false);
      return (
        <>
          <p>{visible ? 'Acceso activo' : 'Sin sesión'}</p>
          <button
            onClick={async () => {
              await clear();
              setDone(true);
            }}
          >
            Completar recuperación
          </button>
          {done && <p>Contraseña actualizada</p>}
        </>
      );
    }
    render(
      <QueryClientProvider client={client}>
        <SessionProvider>
          <PublicProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('Acceso activo');
    await userEvent.click(
      screen.getByRole('button', { name: 'Completar recuperación' }),
    );
    expect(await screen.findByText('Contraseña actualizada')).toBeVisible();
    expect(screen.getByText('Sin sesión')).toBeVisible();
  });
});
