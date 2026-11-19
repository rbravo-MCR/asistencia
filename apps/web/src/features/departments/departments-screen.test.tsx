import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { DepartmentsScreen } from './departments-screen';

const department = {
  id: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  name: 'Administración',
  createdAt: '2026-11-12T15:00:00.000Z',
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
function mount(canManage = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const root = createRootRoute({
    component: () => (
      <DepartmentsScreen canManage={canManage} csrfToken="csrf-test" />
    ),
  });
  const route = createRoute({ getParentRoute: () => root, path: '/' });
  const history = createMemoryHistory({ initialEntries: ['/'] });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history,
  });
  return {
    history,
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
async function createDrawer() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nuevo departamento' }),
  );
}
async function action(name: string, item: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Acciones de ${name}` }),
  );
  await userEvent.click(await screen.findByRole('menuitem', { name: item }));
}

describe('pantalla de Departamentos', () => {
  it('muestra carga mientras consulta el listado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    mount();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cargando departamentos',
    );
  });
  it('muestra vacío sin formulario permanente y abre drawer accesible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => json({ items: [] })),
    );
    mount();
    expect(await screen.findByText('Aún no hay departamentos.')).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: 'Nombre del departamento' }),
    ).not.toBeInTheDocument();
    await createDrawer();
    expect(
      screen.getByRole('dialog', { name: 'Crear departamento' }),
    ).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
    ).toBeVisible();
  });
  it('muestra departamentos recibidos de la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => json({ items: [department] })),
    );
    mount();
    expect(
      await screen.findByText('Administración', { exact: true }),
    ).toBeVisible();
  });
  it('permite recuperar un fallo de consulta', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({ items: [] }));
    vi.stubGlobal('fetch', fetch);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el listado',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reintentar carga' }),
    );
    expect(await screen.findByText('Aún no hay departamentos.')).toBeVisible();
  });
  it('rechaza un nombre en blanco sin enviar un POST', async () => {
    const fetch = vi.fn().mockImplementation(async () => json({ items: [] }));
    vi.stubGlobal('fetch', fetch);
    mount();
    await screen.findByText('Aún no hay departamentos.');
    await createDrawer();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
      '   ',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear departamento' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El nombre es obligatorio',
    );
    expect(fetch.mock.calls.every((call) => call[1]?.method !== 'POST')).toBe(
      true,
    );
  });
  it('confirma creación, normaliza el nombre y actualiza el listado', async () => {
    let saved = false;
    const fetch = vi
      .fn()
      .mockImplementation(async (_url: unknown, init?: RequestInit) => {
        if (init?.method === 'POST') {
          saved = true;
          return json(department, 201);
        }
        return json({ items: saved ? [department] : [] });
      });
    vi.stubGlobal('fetch', fetch);
    mount();
    await screen.findByText('Aún no hay departamentos.');
    await createDrawer();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
      '  Administración  ',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear departamento' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Departamento creado: Administración',
    );
    expect(
      await screen.findByText('Administración', { exact: true }),
    ).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: 'Nombre del departamento' }),
    ).not.toBeInTheDocument();
    const posted = fetch.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(JSON.parse(posted?.[1]?.body as string)).toEqual({
      name: 'Administración',
    });
  });
  it('bloquea el envío duplicado mientras espera confirmación', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async (_url: unknown, init?: RequestInit) =>
        init?.method === 'POST' ? new Promise(() => {}) : json({ items: [] }),
      );
    vi.stubGlobal('fetch', fetch);
    mount();
    await screen.findByText('Aún no hay departamentos.');
    await createDrawer();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
      'Informática',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear departamento' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Guardando…' }),
    ).toBeDisabled();
    expect(
      fetch.mock.calls.filter((call) => call[1]?.method === 'POST'),
    ).toHaveLength(1);
  });
  it('muestra duplicado en el campo y conserva el nombre escrito', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: unknown, init?: RequestInit) =>
        init?.method === 'POST'
          ? json(
              {
                error: {
                  code: 'DEPARTMENT_NAME_EXISTS',
                  message: 'Ya existe un departamento con ese nombre.',
                  requestId: 'test',
                },
              },
              409,
            )
          : json({ items: [department] }),
      ),
    );
    mount();
    await screen.findByText('Administración', { exact: true });
    await createDrawer();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
      'Administración',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear departamento' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un departamento con ese nombre',
    );
    expect(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
    ).toHaveValue('Administración');
  });
  it('no reintenta un POST fallido y permite revisar el listado', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async (_url: unknown, init?: RequestInit) => {
        if (init?.method === 'POST') throw new TypeError('Network failure');
        return json({ items: [] });
      });
    vi.stubGlobal('fetch', fetch);
    mount();
    await screen.findByText('Aún no hay departamentos.');
    await createDrawer();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
      'Informática',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear departamento' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo confirmar la creación',
    );
    expect(
      screen.getByRole('textbox', { name: 'Nombre del departamento' }),
    ).toHaveValue('Informática');
    await waitFor(() =>
      expect(
        fetch.mock.calls.filter((call) => call[1]?.method === 'POST'),
      ).toHaveLength(1),
    );
    expect(
      screen.getByRole('button', { name: 'Actualizar listado' }),
    ).toBeEnabled();
  });
});

it('edita un departamento y actualiza el listado con CSRF', async () => {
  let record = department;
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      record = { ...department, name: JSON.parse(init.body as string).name };
      return json(record);
    }
    return json({ items: [record] });
  });
  vi.stubGlobal('fetch', fetch);
  mount();
  await action('Administración', 'Editar departamento');
  const input = screen.getByRole('textbox', {
    name: 'Nombre del departamento',
  });
  expect(input).toHaveValue('Administración');
  await userEvent.clear(input);
  await userEvent.type(input, ' Nueva área ');
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar cambios' }),
  );
  expect(await screen.findByText('Nueva área', { exact: true })).toBeVisible();
  const sent = fetch.mock.calls.find(([, init]) => init?.method === 'PUT')?.[1];
  expect(sent?.headers).toMatchObject({ 'x-csrf-token': 'csrf-test' });
  expect(JSON.parse(sent?.body as string)).toEqual({ name: 'Nueva área' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Nuevo departamento' }),
  ).toBeVisible();
});

it('confirma eliminar, permite cancelar y retira solo el registro confirmado', async () => {
  let removed = false;
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      removed = true;
      return new Response(null, { status: 204 });
    }
    return json({ items: removed ? [] : [department] });
  });
  vi.stubGlobal('fetch', fetch);
  mount();
  await action('Administración', 'Eliminar departamento');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(
    false,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancelar eliminación' }),
  );
  expect(
    screen.queryByRole('button', { name: 'Confirmar eliminación' }),
  ).not.toBeInTheDocument();
  await action('Administración', 'Eliminar departamento');
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar eliminación' }),
  );
  expect(await screen.findByText('Aún no hay departamentos.')).toBeVisible();
  const sent = fetch.mock.calls.find(
    ([, init]) => init?.method === 'DELETE',
  )?.[1];
  expect(sent?.headers).toMatchObject({ 'x-csrf-token': 'csrf-test' });
});

it('muestra el bloqueo de eliminación por referencias y conserva el departamento', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? json(
            {
              error: {
                code: 'DEPARTMENT_IN_USE',
                message: 'En uso',
                requestId: 'test',
              },
            },
            409,
          )
        : json({ items: [department] }),
    ),
  );
  mount();
  await action('Administración', 'Eliminar departamento');
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar eliminación' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'empleados o responsabilidades',
  );
  expect(screen.getByText('Administración', { exact: true })).toBeVisible();
});

it('no ofrece acciones de escritura al consultar sin permisos de gestión', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json({ items: [department] })),
  );
  mount(false);
  await screen.findByText('Administración', { exact: true });
  expect(
    screen.queryByRole('button', { name: 'Acciones de Administración' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Eliminar Administración' }),
  ).not.toBeInTheDocument();
});

it('filtra departamentos sin crear datos o consultar otra API y conserva búsqueda', async () => {
  const fetch = vi.fn(async () =>
    json({
      items: [
        department,
        {
          ...department,
          id: '7ff93c1e-33a0-4f04-b5d1-503f339d0c61',
          name: 'Operaciones',
        },
      ],
    }),
  );
  vi.stubGlobal('fetch', fetch);
  mount();
  await screen.findByText('Administración', { exact: true });
  const input = screen.getByRole('searchbox', { name: 'Buscar departamentos' });
  await userEvent.type(input, 'opera');
  expect(screen.getByText('Operaciones', { exact: true })).toBeVisible();
  expect(
    screen.queryByText('Administración', { exact: true }),
  ).not.toBeInTheDocument();
  await userEvent.clear(input);
  await userEvent.type(input, 'sin coincidencia');
  expect(screen.getByText('No encontramos departamentos.')).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Limpiar búsqueda' }),
  );
  expect(input).toHaveValue('');
  expect(screen.getByText('Administración', { exact: true })).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('bloquea navegación mientras espera una escritura sin confirmar', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Promise<Response>(() => {})
        : json({ items: [] }),
    ),
  );
  const { history } = mount();
  await screen.findByText('Aún no hay departamentos.');
  await createDrawer();
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Nombre del departamento' }),
    'Área pendiente',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Crear departamento' }),
  );
  expect(
    await screen.findByRole('button', { name: 'Guardando…' }),
  ).toBeDisabled();
  history.push('/fuera');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(history.location.pathname).toBe('/');
});

it('mantiene confirmación pendiente hasta recargar y devuelve foco a búsqueda al eliminar', async () => {
  let removed = false;
  let finishGet: ((response: Response) => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        removed = true;
        return new Response(null, { status: 204 });
      }
      if (removed)
        return new Promise<Response>((resolve) => {
          finishGet = resolve;
        });
      return json({ items: [department] });
    }),
  );
  mount();
  await action('Administración', 'Eliminar departamento');
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar eliminación' }),
  );
  await waitFor(() => expect(finishGet).toBeTypeOf('function'));
  try {
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Cancelar eliminación' }),
    ).toBeDisabled();
  } finally {
    finishGet?.(json({ items: [] }));
  }
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole('searchbox', { name: 'Buscar departamentos' }),
  ).toHaveFocus();
});
