import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from './router';
import { Providers } from './providers';

export const session = {
  user: {
    id: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
    email: 'admin@example.com',
    name: 'Administración',
    roles: ['ADMIN'],
    active: true,
    createdAt: '2026-11-12T15:00:00.000Z',
  },
  csrfToken: 'csrf-test',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  employeeId: null,
  departmentIds: [],
  managedDepartmentIds: [],
  permissions: {
    manageUsers: true,
    manageOrganization: true,
    viewAllEmployees: true,
  },
};

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url === '/api/auth/session'
              ? session
              : url === '/api/dashboard'
                ? {
                    generatedAt: new Date().toISOString(),
                    date: '2026-11-17',
                    timeZone: 'America/Merida',
                    teamVisible: true,
                    unreadNotifications: 0,
                    attendance: { shifts: [], incidents: [] },
                    personal: null,
                    pendingRequests: [],
                  }
                : { status: 'ok', database: 'ok' },
          ),
        ),
    ),
  );
});
async function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createAppRouter(history);
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { history, router };
}

describe('navegación de la aplicación', () => {
  it('ofrece solicitudes, aprobaciones, vacaciones y configuración al administrador', async () => {
    await mount('/');
    expect(
      await screen.findByRole('link', { name: 'Solicitudes' }),
    ).toHaveAttribute('href', '/solicitudes');
    expect(screen.getByRole('link', { name: 'Aprobaciones' })).toHaveAttribute(
      'href',
      '/aprobaciones',
    );
    expect(
      screen.getByRole('link', { name: 'Mis vacaciones' }),
    ).toHaveAttribute('href', '/vacaciones');
    expect(
      screen.getByRole('link', { name: 'Políticas de ausencias' }),
    ).toHaveAttribute('href', '/politicas-ausencias');
  });
  it('conserva el inicio dentro del layout común', async () => {
    await mount('/');
    expect(
      await screen.findByRole('heading', {
        name: 'Hola, Administración',
      }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
  it('permite navegación y retroceso sin recargar la aplicación', async () => {
    const { history } = await mount('/');
    await userEvent.click(
      await screen.findByRole('link', { name: 'Estado del sistema' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Estado del sistema' }),
    ).toBeVisible();
    await waitFor(() => expect(history.location.pathname).toBe('/estado'));
    history.back();
    expect(
      await screen.findByRole('heading', {
        name: 'Hola, Administración',
      }),
    ).toBeVisible();
  });
  it('admite acceso directo a una ruta interna', async () => {
    await mount('/estado');
    // Public content can mount before session resolution replaces the private scope.
    await screen.findByRole('link', { name: 'Usuarios' });
    expect(
      await screen.findByRole('heading', { name: 'Estado del sistema' }),
    ).toBeVisible();
    expect(await screen.findByText('Servicios disponibles')).toBeVisible();
  });
  it('muestra 404 con regreso al inicio conservando navegación', async () => {
    await mount('/no-existe');
    await screen.findByRole('link', { name: 'Usuarios' });
    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('link', { name: 'Volver al inicio' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Hola, Administración',
      }),
    ).toBeVisible();
  });
});

describe('sesión y permisos', () => {
  it('redirige acceso anónimo a empleados al formulario de ingreso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    const { history } = await mount('/empleados');
    expect(
      await screen.findByRole('heading', { name: 'Ingresar' }),
    ).toBeVisible();
    await waitFor(() => expect(history.location.pathname).toBe('/ingresar'));
  });
  it('no concede administración de usuarios a un empleado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ...session,
              permissions: {
                manageUsers: false,
                manageOrganization: false,
                viewAllEmployees: false,
              },
            }),
          ),
      ),
    );
    await mount('/usuarios');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso',
    );
    expect(
      screen.queryByRole('button', { name: 'Crear usuario' }),
    ).not.toBeInTheDocument();
  });
  it('ingresa con cookie, abre la cuenta y cierra sesión con CSRF', async () => {
    let signedIn = false;
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      if (url === '/api/auth/login') {
        signedIn = true;
        return new Response(JSON.stringify(session));
      }
      if (url === '/api/auth/logout') {
        signedIn = false;
        return new Response(null, { status: 204 });
      }
      if (url === '/api/auth/session')
        return new Response(JSON.stringify(signedIn ? session : {}), {
          status: signedIn ? 200 : 401,
        });
      return new Response(JSON.stringify({ status: 'ok', database: 'ok' }));
    });
    vi.stubGlobal('fetch', fetch);
    await mount('/ingresar');
    await userEvent.type(
      await screen.findByLabelText('Número de usuario o correo'),
      'admin@example.com',
    );
    await userEvent.type(
      screen.getByLabelText('Contraseña'),
      'contraseña-larga',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(
      await screen.findByRole('heading', { name: 'Hola, Administración' }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('link', { name: 'Mi cuenta' }));
    expect(
      await screen.findByRole('heading', { name: 'Mi cuenta' }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Ingresar' }),
    ).toBeVisible();
    expect(
      fetch.mock.calls.find(([url]) => url === '/api/auth/logout')?.[1]
        ?.headers,
    ).toMatchObject({ 'x-csrf-token': 'csrf-test' });
  });
});

it('mantiene la consulta pública de estado cuando no hay sesión', async () => {
  let resolveHealth: ((response: Response) => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/auth/session'
        ? new Response('{}', { status: 401 })
        : new Promise<Response>((resolve) => {
            resolveHealth = resolve;
          }),
    ),
  );
  await mount('/estado');
  await screen.findByRole('heading', { name: 'Estado del sistema' });
  await screen.findByRole('link', { name: 'Ingresar' });
  await new Promise((resolve) => setTimeout(resolve, 30));
  resolveHealth?.(
    new Response(JSON.stringify({ status: 'ok', database: 'ok' })),
  );
  expect(await screen.findByText('Servicios disponibles')).toBeVisible();
});

it('distingue un rechazo del origen de una contraseña incorrecta', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url === '/api/auth/login'
              ? {
                  error: {
                    code: 'CSRF_INVALID',
                    message: 'Origen no permitido.',
                    requestId: 'test',
                  },
                }
              : {},
          ),
          { status: url === '/api/auth/login' ? 403 : 401 },
        ),
    ),
  );
  await mount('/ingresar');
  await userEvent.type(
    await screen.findByLabelText('Número de usuario o correo'),
    'admin@example.com',
  );
  await userEvent.type(screen.getByLabelText('Contraseña'), 'contraseña-larga');
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo validar esta página',
  );
  expect(screen.getByRole('alert')).not.toHaveTextContent(
    'Revisa tu usuario y contraseña',
  );
});
