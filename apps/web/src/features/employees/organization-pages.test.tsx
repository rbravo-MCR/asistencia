import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/features/identity/session';
import type { SessionView, EmployeeView } from '@asistencia/contracts';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const employeeId = '6ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const session: SessionView = {
  user: {
    id,
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
const employee: EmployeeView = {
  id: employeeId,
  employeeNumber: 'E1',
  fullName: 'José Pérez',
  phoneNumber: null,
  address: null,
  departmentId: id,
  position: 'Analista',
  joinedOn: '2026-11-01',
  category: 'OPERATIONAL',
  status: 'ACTIVE',
  supervisorId: null,
  userId: null,
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};
const department = {
  id,
  name: 'Informática',
  createdAt: '2026-11-12T15:00:00.000Z',
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}
function api(actor = session) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/session') return json(actor);
    if (url === '/api/employees' && init?.method === 'POST')
      return json(employee, 201);
    if (url === '/api/employees') return json({ items: [employee] });
    if (url === '/api/departments') return json({ items: [department] });
    if (url === '/api/users/directory') return json({ items: [] });
    if (url === '/api/assignments' && init?.method === 'POST') {
      const data = JSON.parse(init.body as string);
      return json(
        {
          ...data,
          id,
          startsAt: data.startsAt ?? '2026-11-12T15:00:00.000Z',
          endsAt: data.endsAt ?? null,
          sourceAssignmentId: null,
          createdBy: id,
          revokedAt: null,
        },
        201,
      );
    }
    if (url === '/api/assignments') return json({ items: [] });
    return json({}, 404);
  });
}
async function mount(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}
async function employeeAction(action: 'Editar empleado' | 'Eliminar empleado') {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Acciones de José Pérez' }),
  );
  await userEvent.click(await screen.findByRole('menuitem', { name: action }));
}
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});
describe('expedientes y responsables', () => {
  it('retira el detalle privado si el expediente desaparece del listado vigente', async () => {
    let visible = true;
    const fallback = api();
    const scoped = {
      ...employee,
      address: 'Dirección privada QA',
      phoneNumber: '+529991234567',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) =>
        url === '/api/employees'
          ? json({ items: visible ? [scoped] : [] })
          : fallback(url, init),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ['/empleados'] }),
    );
    render(
      <QueryClientProvider client={client}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>,
    );
    // Wait for the authenticated scope before opening its private directory.
    await screen.findByRole('link', { name: 'Usuarios' });
    await waitFor(() =>
      expect(client.isFetching({ queryKey: ['employees'] })).toBe(0),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Acciones de José Pérez' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Ver expediente' }),
    );
    expect(await screen.findByText('Dirección privada QA')).toBeVisible();
    expect(screen.getByText('+529991234567')).toBeVisible();
    visible = false;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['employees'] });
    });
    expect(client.getQueryData(['employees'])).toEqual({ items: [] });
    // Query completion precedes its batched observer notification to React.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Dirección privada QA'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('+529991234567')).not.toBeInTheDocument();
    });
  });
  it('no abandona una revocación mientras la respuesta está pendiente', async () => {
    const fallback = api();
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let revoked = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/assignments' && init?.method === 'GET')
          return json({
            items: [
              {
                id,
                kind: 'HEAD',
                employeeId,
                departmentId: id,
                startsAt: '2026-11-12T15:00:00.000Z',
                endsAt: null,
                sourceAssignmentId: null,
                reason: 'Nombramiento',
                createdBy: id,
                revokedAt: revoked ? '2026-11-19T12:00:00.000Z' : null,
              },
            ],
          });
        if (url === `/api/assignments/${id}` && init?.method === 'DELETE') {
          await pending;
          revoked = true;
          return new Response(null, { status: 204 });
        }
        return fallback(url, init);
      }),
    );
    const router = await mount('/responsables');
    try {
      await userEvent.click(
        await screen.findByRole('button', { name: 'Revocar asignación' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Confirmar revocación' }),
      );
      await screen.findByRole('button', { name: 'Procesando…' });
      await act(async () => {
        void router.navigate({ to: '/' });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(router.state.location.pathname).toBe('/responsables');
      expect(screen.getByRole('alertdialog')).toBeVisible();
    } finally {
      release();
    }
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
  });
  it('abre la asignación de responsabilidades bajo demanda', async () => {
    vi.stubGlobal('fetch', api());
    await mount('/responsables');
    await screen.findByRole('heading', { name: 'Responsables' });
    expect(
      screen.queryByLabelText('Tipo de responsabilidad'),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nueva responsabilidad' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Asignar responsable' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Tipo de responsabilidad')).toHaveFocus();
  });
  it('mantiene bloqueado el formulario hasta terminar la actualización del directorio', async () => {
    const fallback = api();
    let saved = false;
    let refreshing = false;
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/employees' && init?.method === 'POST') saved = true;
        if (url === '/api/employees' && init?.method === 'GET' && saved) {
          refreshing = true;
          await pending;
        }
        return fallback(url, init);
      }),
    );
    try {
      await mount('/empleados');
      await userEvent.click(
        await screen.findByRole('button', { name: 'Nuevo empleado' }),
      );
      await userEvent.type(
        screen.getByLabelText('Nombre completo'),
        'Persona QA',
      );
      await userEvent.selectOptions(screen.getByLabelText('Departamento'), id);
      await userEvent.type(screen.getByLabelText('Puesto'), 'Analista');
      await userEvent.type(
        screen.getByLabelText('Fecha de ingreso'),
        '2026-11-01',
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Crear empleado' }),
      );
      await waitFor(() => expect(refreshing).toBe(true));
      expect(screen.getByLabelText('Nombre completo')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    } finally {
      release();
    }
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Nuevo empleado' }),
      ).not.toBeInTheDocument(),
    );
  });
  it('abre el alta bajo demanda y filtra sin perder el directorio', async () => {
    vi.stubGlobal('fetch', api());
    await mount('/empleados');
    await screen.findByRole('heading', { name: 'José Pérez' });
    expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Buscar empleados' });
    await userEvent.type(search, 'sin coincidencias');
    expect(screen.getByText('No encontramos empleados.')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(search).toHaveValue('');
    await userEvent.click(
      screen.getByRole('button', { name: 'Nuevo empleado' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Nuevo empleado' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Nombre completo')).toHaveFocus();
  });
  it('empleado consulta su expediente sin opciones de edición ni directorio de usuarios', async () => {
    const fetch = api({
      ...session,
      permissions: {
        manageUsers: false,
        manageOrganization: false,
        viewAllEmployees: false,
      },
    });
    vi.stubGlobal('fetch', fetch);
    await mount('/empleados');
    expect(
      await screen.findByRole('heading', { name: 'José Pérez' }),
    ).toBeVisible();
    expect(screen.getByText('01/11/2026')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Crear empleado' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar José Pérez' }),
    ).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([url]) => url === '/api/users/directory'),
    ).toBe(false);
  });
  it('crea expediente sin capturar número, con texto normalizado, fecha civil y CSRF', async () => {
    const fetch = api();
    vi.stubGlobal('fetch', fetch);
    await mount('/empleados');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nuevo empleado' }),
    );
    await screen.findByLabelText('Nombre completo');
    expect(screen.queryByLabelText('Número interno')).not.toBeInTheDocument();
    expect(
      screen.getByText(/se generará automáticamente al guardar/i),
    ).toBeVisible();
    await userEvent.type(
      screen.getByLabelText('Nombre completo'),
      '  Jose\u0301 Pérez  ',
    );
    await userEvent.type(
      screen.getByLabelText('Celular'),
      '+52 (999) 123-4567',
    );
    await userEvent.type(screen.getByLabelText('Dirección'), ' Calle 10 #20 ');
    await userEvent.selectOptions(screen.getByLabelText('Departamento'), id);
    await userEvent.type(screen.getByLabelText('Puesto'), ' Analista ');
    await userEvent.type(
      screen.getByLabelText('Fecha de ingreso'),
      '2026-11-01',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Categoría'),
      'OPERATIONAL',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear empleado' }),
    );
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([url, init]) => url === '/api/employees' && init?.method === 'POST',
        ),
      ).toBe(true),
    );
    const options = fetch.mock.calls.find(
      ([url, init]) => url === '/api/employees' && init?.method === 'POST',
    )?.[1];
    expect(options?.headers).toMatchObject({ 'x-csrf-token': 'csrf-test' });
    expect(JSON.parse(options?.body as string)).toEqual({
      fullName: 'José Pérez',
      phoneNumber: '+529991234567',
      address: 'Calle 10 #20',
      departmentId: id,
      position: 'Analista',
      joinedOn: '2026-11-01',
      category: 'OPERATIONAL',
      status: 'ACTIVE',
      supervisorId: null,
      userId: null,
    });
  });
  it('conserva el borrador del empleado si el servidor rechaza guardar', async () => {
    const fallback = api();
    const fetch = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json(
            {
              error: {
                code: 'EMPLOYEE_NUMBER_EXISTS',
                message: 'Ya existe el número interno.',
                requestId: 'test',
              },
            },
            409,
          )
        : fallback(url, init),
    );
    vi.stubGlobal('fetch', fetch);
    await mount('/empleados');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nuevo empleado' }),
    );
    await screen.findByLabelText('Nombre completo');
    await userEvent.type(
      screen.getByLabelText('Nombre completo'),
      'Nuevo Nombre',
    );
    await userEvent.selectOptions(screen.getByLabelText('Departamento'), id);
    await userEvent.type(screen.getByLabelText('Puesto'), 'Analista');
    await userEvent.type(
      screen.getByLabelText('Fecha de ingreso'),
      '2026-11-01',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear empleado' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe el número interno.',
    );
    expect(screen.getByLabelText('Nombre completo')).toHaveValue(
      'Nuevo Nombre',
    );
  });
  it('conserva el número existente al editar y lo envía en el PUT', async () => {
    const fallback = api();
    const fetch = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? json(employee) : fallback(url, init),
    );
    vi.stubGlobal('fetch', fetch);
    await mount('/empleados');
    await employeeAction('Editar empleado');
    expect(await screen.findByLabelText('Número interno')).toHaveValue('E1');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar empleado' }),
    );
    await waitFor(() =>
      expect(fetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(
        true,
      ),
    );
    const options = fetch.mock.calls.find(
      ([, init]) => init?.method === 'PUT',
    )?.[1];
    expect(JSON.parse(options?.body as string).employeeNumber).toBe('E1');
  });
  it('asigna dirección sin departamento ni fechas de suplencia', async () => {
    const fetch = api();
    vi.stubGlobal('fetch', fetch);
    await mount('/responsables');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva responsabilidad' }),
    );
    await userEvent.selectOptions(
      await screen.findByLabelText('Tipo de responsabilidad'),
      'DIRECTOR',
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText('Empleado').querySelectorAll('option'),
      ).toHaveLength(2),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado'),
      employeeId,
    );
    await userEvent.type(screen.getByLabelText('Motivo'), ' Nombramiento ');
    await userEvent.click(
      screen.getByRole('button', { name: 'Asignar responsable' }),
    );
    expect(await screen.findByText('Responsable asignado.')).toBeVisible();
    const options = fetch.mock.calls.find(
      ([url, init]) => url === '/api/assignments' && init?.method === 'POST',
    )?.[1];
    expect(JSON.parse(options?.body as string)).toEqual({
      kind: 'DIRECTOR',
      employeeId,
      departmentId: null,
      reason: 'Nombramiento',
    });
    expect(options?.headers).toMatchObject({ 'x-csrf-token': 'csrf-test' });
  });
  it('no envía una suplencia cuyo intervalo termina antes de iniciar', async () => {
    const fetch = api();
    vi.stubGlobal('fetch', fetch);
    await mount('/responsables');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva responsabilidad' }),
    );
    await userEvent.selectOptions(
      await screen.findByLabelText('Tipo de responsabilidad'),
      'SUBSTITUTE',
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText('Empleado').querySelectorAll('option'),
      ).toHaveLength(2),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado'),
      employeeId,
    );
    await userEvent.selectOptions(screen.getByLabelText('Departamento'), id);
    await userEvent.type(screen.getByLabelText('Motivo'), 'Ausencia');
    await userEvent.type(
      screen.getByLabelText('Inicio (UTC)'),
      '2026-11-13T16:00',
    );
    await userEvent.type(
      screen.getByLabelText('Fin (UTC)'),
      '2026-11-13T08:00',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Asignar responsable' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El fin debe ser posterior al inicio.',
    );
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(
      false,
    );
  });
});

it('confirma eliminar empleado, permite cancelar y actualiza el listado', async () => {
  let removed = false;
  const fallback = api();
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      removed = true;
      return new Response(null, { status: 204 });
    }
    if (url === '/api/employees')
      return json({ items: removed ? [] : [employee] });
    return fallback(url, init);
  });
  vi.stubGlobal('fetch', fetch);
  await mount('/empleados');
  await employeeAction('Eliminar empleado');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(
    false,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancelar eliminación' }),
  );
  await employeeAction('Eliminar empleado');
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar eliminación' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'José Pérez' }),
    ).not.toBeInTheDocument(),
  );
  const sent = fetch.mock.calls.find(
    ([, init]) => init?.method === 'DELETE',
  )?.[1];
  expect(sent?.headers).toMatchObject({ 'x-csrf-token': 'csrf-test' });
});

it('muestra bloqueo y conserva el expediente si no se puede eliminar', async () => {
  const fallback = api();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? json(
            {
              error: {
                code: 'EMPLOYEE_IN_USE',
                message:
                  'El empleado tiene responsabilidades o subordinados vinculados.',
                requestId: 'test',
              },
            },
            409,
          )
        : fallback(url, init),
    ),
  );
  await mount('/empleados');
  await employeeAction('Eliminar empleado');
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar eliminación' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'responsabilidades o subordinados',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancelar eliminación' }),
  );
  expect(screen.getByRole('heading', { name: 'José Pérez' })).toBeVisible();
});
